/**
 * TAMV pack seal: the fail-closed contract between a signed pack and its skills.
 *
 * A skill is not "certified" because its folder exists. It is certified only
 * when every byte of every public skill, its capability metadata and the pack
 * root match a payload signed with the TAMV Ed25519 release key. Removing one
 * skill, editing one line or copying one folder into another project breaks the
 * root and the verifier denies execution.
 *
 * What this cannot do: stop a recipient of the complete, unencrypted pack from
 * copying it. Public text is public. The seal prevents *partial* or *modified*
 * copies from passing as certified and makes sloppy redistribution obvious.
 * Protected payloads must additionally use `sealHybrid` and stay encrypted.
 */

import { assertSafeRelativePath, canonicalJson } from "./canonical.ts";
import { isSha256Digest, sha256Hex, type Sha256Digest } from "./digest.ts";
import { keyId, signEd25519, verifyEd25519 } from "./keys.ts";

export const PACK_SEAL_SCHEMA = "tamv.pack-seal.v2";
export const UNSIGNED_STATE = "UNSIGNED_RELEASE_PENDING";
/**
 * Signatures are domain separated: a seal signature can never be replayed as a
 * transparency checkpoint signature (or any other Ed25519 payload) because the
 * signed bytes always include this context string.
 */
export const SEAL_SIGNING_DOMAIN = "tamv.pack-seal.ed25519.v2";

export type SkillFileDigest = {
  path: string;
  sha256: Sha256Digest;
  bytes: number;
};

export type SkillSealEntry = {
  id: string;
  path: string;
  root: Sha256Digest;
  requiresConsent: boolean;
  capabilities: string[];
  files: SkillFileDigest[];
};

export type ManifestBinding = {
  /** Path of the manifest relative to the pack root. */
  path: string;
  /** SHA-256 of the manifest's canonical JSON, not of its formatting. */
  canonicalSha256: Sha256Digest;
};

export type PackSealPayload = {
  schema: typeof PACK_SEAL_SCHEMA;
  pack: string;
  version: string;
  issuedAt: string;
  root: Sha256Digest;
  /** Binds the manifest that consumers must evaluate, so it cannot be swapped. */
  manifest: ManifestBinding;
  /** Sorted union of every capability of every public skill. */
  capabilities: string[];
  policy: {
    failClosed: true;
    hash: "SHA-256";
    signature: "Ed25519";
    unsignedBehavior: "deny";
  };
  skills: SkillSealEntry[];
  internalContracts?: { path: string; count: number };
};

export type PackSignature =
  | { alg: "Ed25519"; keyId: Sha256Digest; value: string }
  | { alg: "Ed25519"; state: typeof UNSIGNED_STATE };

export type PackSeal = PackSealPayload & { signature: PackSignature };

export type SkillSource = {
  id: string;
  path: string;
  requiresConsent: boolean;
  capabilities: string[];
  files: { path: string; content: string }[];
};

export type SealBuildInput = {
  pack: string;
  version: string;
  issuedAt: string;
  manifest: { path: string; content: string };
  skills: SkillSource[];
  internalContracts?: { path: string; count: number };
};

export type SealCode =
  | "TAMV_SEAL_VALID"
  | "TAMV_SEAL_UNSIGNED"
  | "TAMV_SEAL_KEY_MISSING"
  | "TAMV_SEAL_SIGNATURE_INVALID"
  | "TAMV_SEAL_CONTENT_MISMATCH"
  | "TAMV_SEAL_MANIFEST_MISMATCH"
  | "TAMV_SEAL_MANIFEST_MISSING"
  | "TAMV_SEAL_SKILL_MISSING"
  | "TAMV_SEAL_CAPABILITY_DENIED"
  | "TAMV_SEAL_CONSENT_REQUIRED"
  | "TAMV_SEAL_MALFORMED";

export type SealVerification = {
  allowed: boolean;
  code: SealCode;
  detail: string;
};

export type CapabilityGrant = {
  capability: string;
  skillId: string;
  requiresConsent: boolean;
};

const encoder = new TextEncoder();

function assertIdentifier(value: unknown, label: string): asserts value is string {
  if (typeof value !== "string" || !/^[a-z0-9][a-z0-9-]{2,80}$/.test(value)) {
    throw new Error(`Invalid ${label}.`);
  }
}

function assertSemver(value: unknown): asserts value is string {
  if (typeof value !== "string" || !/^\d+\.\d+\.\d+(?:-[a-z0-9.-]+)?$/i.test(value)) {
    throw new Error("Invalid pack version.");
  }
}

function assertCapability(value: unknown): asserts value is string {
  if (typeof value !== "string" || !/^[a-z0-9][a-z0-9.-]{2,80}$/.test(value)) {
    throw new Error("Invalid capability id.");
  }
}

function normalizeCapabilities(capabilities: string[]): string[] {
  if (!Array.isArray(capabilities)) throw new Error("Capabilities must be an array.");
  const seen = new Set<string>();
  for (const capability of capabilities) {
    assertCapability(capability);
    seen.add(capability);
  }
  return [...seen].sort();
}

/** Digest of the manifest's canonical JSON, so formatting and newlines do not matter. */
export async function canonicalManifestDigest(content: string): Promise<Sha256Digest> {
  let parsed: unknown;
  try {
    parsed = JSON.parse(content.replace(/^\uFEFF/, ""));
  } catch {
    throw new Error("The bound manifest is not valid JSON.");
  }
  if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
    throw new Error("The bound manifest must be a JSON object.");
  }
  return sha256Hex(canonicalJson(parsed));
}

function capabilityRegistry(skills: SkillSealEntry[]): string[] {
  return [...new Set(skills.flatMap((skill) => skill.capabilities))].sort();
}

async function digestFiles(files: SkillSource["files"]): Promise<SkillFileDigest[]> {
  if (!Array.isArray(files) || files.length === 0) throw new Error("A skill must contain at least one file.");
  const seen = new Set<string>();
  const output: SkillFileDigest[] = [];
  for (const file of files) {
    assertSafeRelativePath(file.path);
    if (seen.has(file.path)) throw new Error(`Duplicate skill file: ${file.path}`);
    seen.add(file.path);
    if (typeof file.content !== "string") throw new Error(`Skill file ${file.path} has no content.`);
    output.push({
      path: file.path,
      sha256: await sha256Hex(file.content),
      bytes: encoder.encode(file.content).byteLength,
    });
  }
  return output.sort((left, right) => left.path.localeCompare(right.path));
}

async function skillRoot(entry: Omit<SkillSealEntry, "root">): Promise<Sha256Digest> {
  return sha256Hex(
    canonicalJson({
      id: entry.id,
      path: entry.path,
      requiresConsent: entry.requiresConsent,
      capabilities: entry.capabilities,
      files: entry.files,
    }),
  );
}

async function packRoot(payload: Omit<PackSealPayload, "root">): Promise<Sha256Digest> {
  return sha256Hex(
    canonicalJson({
      schema: payload.schema,
      pack: payload.pack,
      version: payload.version,
      issuedAt: payload.issuedAt,
      manifest: payload.manifest,
      capabilities: payload.capabilities,
      skills: payload.skills.map(({ id, path, root }) => ({ id, path, root })),
      internalContracts: payload.internalContracts ?? null,
    }),
  );
}

export async function buildPackSeal(input: SealBuildInput): Promise<PackSeal> {
  assertIdentifier(input.pack, "pack name");
  assertSemver(input.version);
  if (!Array.isArray(input.skills) || input.skills.length === 0) throw new Error("A pack needs at least one public skill.");
  if (Number.isNaN(Date.parse(input.issuedAt))) throw new Error("issuedAt must be an ISO timestamp.");
  if (!input.manifest || typeof input.manifest.content !== "string") {
    throw new Error("A v2 pack seal must bind the pack manifest.");
  }
  assertSafeRelativePath(input.manifest.path);
  const manifest: ManifestBinding = {
    path: input.manifest.path,
    canonicalSha256: await canonicalManifestDigest(input.manifest.content),
  };
  const ids = new Set<string>();
  const paths = new Set<string>();
  const claimed = new Map<string, string>();
  const entries: SkillSealEntry[] = [];
  for (const skill of [...input.skills].sort((left, right) => left.id.localeCompare(right.id))) {
    assertIdentifier(skill.id, "skill id");
    if (ids.has(skill.id)) throw new Error(`Duplicate skill id: ${skill.id}`);
    if (paths.has(skill.path)) throw new Error(`Duplicate skill path: ${skill.path}`);
    ids.add(skill.id);
    paths.add(skill.path);
    assertSafeRelativePath(skill.path);
    const files = await digestFiles(skill.files);
    const withoutRoot = {
      id: skill.id,
      path: skill.path,
      requiresConsent: skill.requiresConsent === true,
      capabilities: normalizeCapabilities(skill.capabilities),
      files,
    };
    for (const capability of withoutRoot.capabilities) {
      const owner = claimed.get(capability);
      if (owner) {
        throw new Error(`Capability ${capability} is claimed by both ${owner} and ${skill.id}.`);
      }
      claimed.set(capability, skill.id);
    }
    entries.push({ ...withoutRoot, root: await skillRoot(withoutRoot) });
  }
  const payloadBase: Omit<PackSealPayload, "root"> = {
    schema: PACK_SEAL_SCHEMA,
    pack: input.pack,
    version: input.version,
    issuedAt: input.issuedAt,
    manifest,
    capabilities: capabilityRegistry(entries),
    policy: { failClosed: true, hash: "SHA-256", signature: "Ed25519", unsignedBehavior: "deny" },
    skills: entries,
    ...(input.internalContracts ? { internalContracts: input.internalContracts } : {}),
  };
  return {
    ...payloadBase,
    root: await packRoot(payloadBase),
    signature: { alg: "Ed25519", state: UNSIGNED_STATE },
  };
}

/** Bytes covered by the Ed25519 seal signature, including the anti-replay domain. */
export function packSealSigningPayload(seal: PackSeal | PackSealPayload): string {
  const { signature: _signature, ...payload } = seal as PackSeal;
  return canonicalJson({ domain: SEAL_SIGNING_DOMAIN, payload });
}

const signingPayload = packSealSigningPayload;

export async function signPackSeal(
  seal: PackSeal,
  privateKey: CryptoKey,
  publicKey: CryptoKey,
): Promise<PackSeal> {
  if (seal.signature.alg !== "Ed25519") throw new Error("Only Ed25519 pack seals can be signed.");
  const payload = signingPayload(seal);
  return {
    ...seal,
    signature: {
      alg: "Ed25519",
      keyId: await keyId(publicKey),
      value: await signEd25519(privateKey, payload),
    },
  };
}

/** Reject malformed files that claim to be a seal. */
export function assertPackSeal(value: unknown): asserts value is PackSeal {
  if (!value || typeof value !== "object") throw new Error("A pack seal must be an object.");
  const seal = value as Record<string, unknown>;
  if (
    seal.schema !== PACK_SEAL_SCHEMA ||
    typeof seal.pack !== "string" ||
    typeof seal.version !== "string" ||
    typeof seal.issuedAt !== "string" ||
    !isSha256Digest(seal.root) ||
    !seal.manifest ||
    typeof seal.manifest !== "object" ||
    !isSha256Digest((seal.manifest as Record<string, unknown>).canonicalSha256) ||
    !Array.isArray(seal.capabilities) ||
    !Array.isArray(seal.skills) ||
    !seal.policy ||
    typeof seal.policy !== "object"
  ) {
    throw new Error("The pack seal does not match the TAMV contract.");
  }
  const manifest = seal.manifest as Record<string, unknown>;
  if (typeof manifest.path !== "string") throw new Error("The pack seal manifest path is missing.");
  assertSafeRelativePath(manifest.path);

  const capabilities = seal.capabilities as unknown[];
  for (const capability of capabilities) assertCapability(capability);
  if (new Set(capabilities).size !== capabilities.length) {
    throw new Error("The pack seal capability registry contains duplicates.");
  }
  for (const entry of seal.skills as unknown[]) {
    if (!entry || typeof entry !== "object") throw new Error("Invalid skill entry in the pack seal.");
    const skill = entry as Record<string, unknown>;
    assertIdentifier(skill.id, "skill id");
    assertSafeRelativePath(String(skill.path));
    if (!isSha256Digest(skill.root) || !Array.isArray(skill.files)) {
      throw new Error(`Invalid digest data for ${String(skill.id)}.`);
    }
    for (const file of skill.files as unknown[]) {
      const record = file as Record<string, unknown>;
      assertSafeRelativePath(String(record.path));
      if (!isSha256Digest(record.sha256) || typeof record.bytes !== "number") {
        throw new Error(`Invalid file digest for ${String(skill.id)}.`);
      }
    }
  }
  const signature = seal.signature as Record<string, unknown> | undefined;
  if (!signature || signature.alg !== "Ed25519") throw new Error("The pack seal has no Ed25519 signature block.");
  if (signature.state !== UNSIGNED_STATE && typeof signature.value !== "string") {
    throw new Error("The pack seal signature is neither signed nor explicitly unsigned.");
  }
}

/**
 * Fail-closed verification. `requireSignature` defaults to true: an unsigned
 * seal is never enough to enable certified skills.
 */
export async function verifyPackSeal(input: {
  seal: PackSeal;
  sources: SkillSource[];
  manifest?: { path: string; content: string };
  publicKey?: CryptoKey;
  requireSignature?: boolean;
}): Promise<SealVerification> {
  try {
    assertPackSeal(input.seal);
  } catch (error) {
    return { allowed: false, code: "TAMV_SEAL_MALFORMED", detail: (error as Error).message };
  }
  if (input.seal.signature.state === UNSIGNED_STATE) {
    if (input.requireSignature ?? true) {
      return {
        allowed: false,
        code: "TAMV_SEAL_UNSIGNED",
        detail: "The pack seal is explicitly unsigned; fail-closed policy denies certified skills.",
      };
    }
  }

  let computedPackRoot: Sha256Digest;
  let computedRegistry: string[];
  try {
    computedPackRoot = await packRoot(input.seal);
    computedRegistry = capabilityRegistry(input.seal.skills);
  } catch (error) {
    return { allowed: false, code: "TAMV_SEAL_MALFORMED", detail: (error as Error).message };
  }
  if (computedPackRoot !== input.seal.root) {
    return {
      allowed: false,
      code: "TAMV_SEAL_CONTENT_MISMATCH",
      detail: "The pack root does not match the signed payload.",
    };
  }
  if (JSON.stringify(computedRegistry) !== JSON.stringify(input.seal.capabilities)) {
    return {
      allowed: false,
      code: "TAMV_SEAL_CONTENT_MISMATCH",
      detail: "The capability registry does not match the sealed skills.",
    };
  }

  if (!input.manifest) {
    return {
      allowed: false,
      code: "TAMV_SEAL_MANIFEST_MISSING",
      detail: "The seal binds a manifest; verification requires the manifest content.",
    };
  }
  if (input.manifest.path !== input.seal.manifest.path) {
    return {
      allowed: false,
      code: "TAMV_SEAL_MANIFEST_MISMATCH",
      detail: "The supplied manifest path differs from the sealed path.",
    };
  }
  let manifestDigest: Sha256Digest;
  try {
    manifestDigest = await canonicalManifestDigest(input.manifest.content);
  } catch (error) {
    return { allowed: false, code: "TAMV_SEAL_MALFORMED", detail: (error as Error).message };
  }
  if (manifestDigest !== input.seal.manifest.canonicalSha256) {
    return {
      allowed: false,
      code: "TAMV_SEAL_MANIFEST_MISMATCH",
      detail: "The supplied manifest differs from the manifest bound into the seal.",
    };
  }

  const provided = new Map(input.sources.map((skill) => [skill.id, skill]));
  for (const entry of input.seal.skills) {
    const source = provided.get(entry.id);
    if (!source) {
      return {
        allowed: false,
        code: "TAMV_SEAL_SKILL_MISSING",
        detail: `The certified skill ${entry.id} is missing.`,
      };
    }
    if (source.path !== entry.path) {
      return {
        allowed: false,
        code: "TAMV_SEAL_CONTENT_MISMATCH",
        detail: `The skill ${entry.id} was moved from its certified path.`,
      };
    }
    let files: SkillFileDigest[];
    try {
      files = await digestFiles(source.files);
    } catch (error) {
      return { allowed: false, code: "TAMV_SEAL_MALFORMED", detail: (error as Error).message };
    }
    const withoutRoot = {
      id: entry.id,
      path: entry.path,
      requiresConsent: source.requiresConsent === true,
      capabilities: normalizeCapabilities(source.capabilities),
      files,
    };
    if ((await skillRoot(withoutRoot)) !== entry.root) {
      return {
        allowed: false,
        code: "TAMV_SEAL_CONTENT_MISMATCH",
        detail: `The content of ${entry.id} does not match its sealed root.`,
      };
    }
  }
  for (const source of input.sources) {
    if (!input.seal.skills.some((entry) => entry.id === source.id)) {
      return {
        allowed: false,
        code: "TAMV_SEAL_CONTENT_MISMATCH",
        detail: `Uncertified skill ${source.id} was added to the pack.`,
      };
    }
  }

  if (!input.publicKey) {
    return {
      allowed: false,
      code: "TAMV_SEAL_KEY_MISSING",
      detail: "No TAMV release public key is configured; certified execution is denied.",
    };
  }
  if (input.seal.signature.state === UNSIGNED_STATE) {
    return {
      allowed: false,
      code: "TAMV_SEAL_UNSIGNED",
      detail: "An unsigned seal cannot authenticate a pack.",
    };
  }
  if ((await keyId(input.publicKey)) !== input.seal.signature.keyId) {
    return {
      allowed: false,
      code: "TAMV_SEAL_SIGNATURE_INVALID",
      detail: "The configured public key does not match the seal key id.",
    };
  }
  const valid = await verifyEd25519(input.publicKey, signingPayload(input.seal), input.seal.signature.value);
  if (!valid) {
    return {
      allowed: false,
      code: "TAMV_SEAL_SIGNATURE_INVALID",
      detail: "The Ed25519 signature does not authenticate this pack seal.",
    };
  }
  return { allowed: true, code: "TAMV_SEAL_VALID", detail: "Every public skill and the pack root match the signed seal." };
}

export async function assertPackSealValid(input: {
  seal: PackSeal;
  sources: SkillSource[];
  manifest?: { path: string; content: string };
  publicKey?: CryptoKey;
  requireSignature?: boolean;
}): Promise<void> {
  const result = await verifyPackSeal(input);
  if (!result.allowed) throw new Error(`${result.code}: ${result.detail}`);
}

export class TamvSealDeniedError extends Error {
  readonly code: SealCode;

  constructor(code: SealCode, detail: string) {
    super(`${code}: ${detail}`);
    this.name = "TamvSealDeniedError";
    this.code = code;
  }
}

/** Runtime guard used by capabilities that must not run without certification. */
export async function requireCertifiedPack(input: {
  seal: PackSeal;
  sources: SkillSource[];
  manifest?: { path: string; content: string };
  publicKey?: CryptoKey;
  requireSignature?: boolean;
}): Promise<void> {
  const result = await verifyPackSeal(input);
  if (!result.allowed) throw new TamvSealDeniedError(result.code, result.detail);
}

/**
 * Capability gate: the pack must be certified *and* the requested capability
 * must belong to a sealed skill, *and* consent must be granted when that skill
 * declares it. Knowing a capability name is not authorization.
 */
export async function requireCapability(input: {
  capability: string;
  seal: PackSeal;
  sources: SkillSource[];
  manifest?: { path: string; content: string };
  publicKey?: CryptoKey;
  requireSignature?: boolean;
  consentGranted?: boolean;
}): Promise<CapabilityGrant> {
  assertCapability(input.capability);
  const verified = await verifyPackSeal(input);
  if (!verified.allowed) throw new TamvSealDeniedError(verified.code, verified.detail);
  const entry = input.seal.skills.find((skill) => skill.capabilities.includes(input.capability));
  if (!entry) {
    throw new TamvSealDeniedError(
      "TAMV_SEAL_CAPABILITY_DENIED",
      `The capability ${input.capability} is not certified by this pack.`,
    );
  }
  if (entry.requiresConsent && input.consentGranted !== true) {
    throw new TamvSealDeniedError(
      "TAMV_SEAL_CONSENT_REQUIRED",
      `The capability ${input.capability} requires explicit consent before execution.`,
    );
  }
  return { capability: input.capability, skillId: entry.id, requiresConsent: entry.requiresConsent };
}
