/**
 * Append-only transparency log over pack-seal roots.
 *
 * Each release appends one entry whose hash chains to the previous entry, so a
 * publisher cannot quietly rewrite or drop a past release without breaking the
 * chain. A Merkle tree (RFC 6962 domain separation) over the entry hashes lets
 * any third party verify that a given seal root belongs to the published log
 * with a short inclusion proof, without trusting the publisher. Checkpoints are
 * signable with Ed25519 and fail closed while unsigned, exactly like the seal.
 *
 * This is an audit trail, not encryption: every value here is public.
 */

import { canonicalJson } from "./canonical.ts";
import {
  bytesToHex,
  hexToBytes,
  isSha256Digest,
  sha256Hex,
  timingSafeEqualHex,
  type Sha256Digest,
} from "./digest.ts";
import { keyId, signEd25519, verifyEd25519 } from "./keys.ts";

export const TRANSPARENCY_SCHEMA = "tamv.seal-transparency.v1";
export const TRANSPARENCY_GENESIS_HASH: Sha256Digest = `sha256:${"0".repeat(64)}`;

export type TransparencyEntry = {
  seq: number;
  pack: string;
  version: string;
  sealRoot: Sha256Digest;
  issuedAt: string;
  prevHash: Sha256Digest;
  entryHash: Sha256Digest;
};

export type TransparencyEntryInput = {
  pack: string;
  version: string;
  sealRoot: Sha256Digest;
  issuedAt: string;
};

export type TransparencyLog = {
  schema: typeof TRANSPARENCY_SCHEMA;
  entries: TransparencyEntry[];
};

export type InclusionProofNode = { hash: string; side: "left" | "right" };

export type CheckpointSignature =
  | { alg: "Ed25519"; keyId: Sha256Digest; value: string }
  | { alg: "Ed25519"; state: "UNSIGNED_RELEASE_PENDING" };

export type TransparencyCheckpoint = {
  schema: typeof TRANSPARENCY_SCHEMA;
  size: number;
  rootHash: Sha256Digest;
  chainHead: Sha256Digest;
  signature: CheckpointSignature;
};

export type TransparencyCode =
  | "TAMV_TRANSPARENCY_VALID"
  | "TAMV_TRANSPARENCY_MALFORMED"
  | "TAMV_TRANSPARENCY_CHAIN_BROKEN"
  | "TAMV_TRANSPARENCY_ROOT_MISMATCH"
  | "TAMV_TRANSPARENCY_UNSIGNED"
  | "TAMV_TRANSPARENCY_KEY_MISSING"
  | "TAMV_TRANSPARENCY_SIGNATURE_INVALID";

export type TransparencyResult = {
  ok: boolean;
  code: TransparencyCode;
  detail: string;
  size: number;
};

function subtle(provider?: Crypto): SubtleCrypto {
  const selected = provider ?? globalThis.crypto;
  if (!selected?.subtle) throw new Error("Web Crypto is required for TAMV transparency logs.");
  return selected.subtle;
}

async function digestBytes(bytes: Uint8Array, provider?: Crypto): Promise<Uint8Array> {
  return new Uint8Array(await subtle(provider).digest("SHA-256", bytes));
}

async function leafHash(leaf: Uint8Array, provider?: Crypto): Promise<Uint8Array> {
  const prefixed = new Uint8Array(leaf.length + 1);
  prefixed[0] = 0x00;
  prefixed.set(leaf, 1);
  return digestBytes(prefixed, provider);
}

async function nodeHash(left: Uint8Array, right: Uint8Array, provider?: Crypto): Promise<Uint8Array> {
  const prefixed = new Uint8Array(1 + left.length + right.length);
  prefixed[0] = 0x01;
  prefixed.set(left, 1);
  prefixed.set(right, 1 + left.length);
  return digestBytes(prefixed, provider);
}

/** Largest power of two strictly below n (n > 1), per RFC 6962 splitting. */
function largestPowerOfTwoBelow(n: number): number {
  let k = 1;
  while (k * 2 < n) k *= 2;
  return k;
}

async function merkleTreeHash(leaves: Uint8Array[], provider?: Crypto): Promise<Uint8Array> {
  if (leaves.length === 0) return digestBytes(new Uint8Array(0), provider);
  if (leaves.length === 1) return leafHash(leaves[0], provider);
  const split = largestPowerOfTwoBelow(leaves.length);
  const left = await merkleTreeHash(leaves.slice(0, split), provider);
  const right = await merkleTreeHash(leaves.slice(split), provider);
  return nodeHash(left, right, provider);
}

async function inclusionPath(leaves: Uint8Array[], index: number, provider?: Crypto): Promise<InclusionProofNode[]> {
  const size = leaves.length;
  if (size <= 1) return [];
  const split = largestPowerOfTwoBelow(size);
  if (index < split) {
    const rest = await inclusionPath(leaves.slice(0, split), index, provider);
    const sibling = await merkleTreeHash(leaves.slice(split), provider);
    return [...rest, { hash: bytesToHex(sibling), side: "right" }];
  }
  const rest = await inclusionPath(leaves.slice(split), index - split, provider);
  const sibling = await merkleTreeHash(leaves.slice(0, split), provider);
  return [...rest, { hash: bytesToHex(sibling), side: "left" }];
}

export function emptyLog(): TransparencyLog {
  return { schema: TRANSPARENCY_SCHEMA, entries: [] };
}

function entryDigestInput(entry: TransparencyEntry): string {
  return canonicalJson({
    seq: entry.seq,
    pack: entry.pack,
    version: entry.version,
    sealRoot: entry.sealRoot,
    issuedAt: entry.issuedAt,
    prevHash: entry.prevHash,
  });
}

function assertEntry(value: unknown): asserts value is TransparencyEntry {
  if (!value || typeof value !== "object") throw new Error("A transparency entry must be an object.");
  const entry = value as Record<string, unknown>;
  if (
    typeof entry.seq !== "number" ||
    !Number.isInteger(entry.seq) ||
    entry.seq < 0 ||
    typeof entry.pack !== "string" ||
    typeof entry.version !== "string" ||
    typeof entry.issuedAt !== "string" ||
    !isSha256Digest(entry.sealRoot) ||
    !isSha256Digest(entry.prevHash) ||
    !isSha256Digest(entry.entryHash)
  ) {
    throw new Error("The transparency entry does not match the TAMV contract.");
  }
}

export function assertLog(value: unknown): asserts value is TransparencyLog {
  if (!value || typeof value !== "object") throw new Error("A transparency log must be an object.");
  const log = value as Record<string, unknown>;
  if (log.schema !== TRANSPARENCY_SCHEMA || !Array.isArray(log.entries)) {
    throw new Error("The transparency log does not match the TAMV contract.");
  }
  for (const entry of log.entries) assertEntry(entry);
}

export async function appendEntry(
  log: TransparencyLog,
  input: TransparencyEntryInput,
  provider?: Crypto,
): Promise<TransparencyLog> {
  assertLog(log);
  if (typeof input.pack !== "string" || input.pack.length === 0) {
    throw new Error("A transparency entry requires a non-empty pack identifier.");
  }
  if (typeof input.version !== "string" || input.version.length === 0) {
    throw new Error("A transparency entry requires a non-empty version.");
  }
  if (!isSha256Digest(input.sealRoot)) {
    throw new Error("A transparency entry requires a sha256 seal root.");
  }
  if (typeof input.issuedAt !== "string" || Number.isNaN(Date.parse(input.issuedAt))) {
    throw new Error("A transparency entry requires a parseable issuedAt timestamp.");
  }
  const seq = log.entries.length;
  const prevHash = seq === 0 ? TRANSPARENCY_GENESIS_HASH : log.entries[seq - 1].entryHash;
  const base = {
    seq,
    pack: input.pack,
    version: input.version,
    sealRoot: input.sealRoot,
    issuedAt: input.issuedAt,
    prevHash,
  };
  const entryHash = await sha256Hex(canonicalJson(base), provider);
  return { schema: TRANSPARENCY_SCHEMA, entries: [...log.entries, { ...base, entryHash }] };
}

export async function verifyChain(log: TransparencyLog, provider?: Crypto): Promise<TransparencyResult> {
  const size = Array.isArray((log as TransparencyLog)?.entries) ? log.entries.length : 0;
  try {
    assertLog(log);
  } catch (error) {
    return { ok: false, code: "TAMV_TRANSPARENCY_MALFORMED", detail: errorMessage(error), size };
  }
  let previous = TRANSPARENCY_GENESIS_HASH;
  for (let index = 0; index < log.entries.length; index += 1) {
    const entry = log.entries[index];
    if (entry.seq !== index) {
      return broken(size, `entry ${index} has sequence ${entry.seq}.`);
    }
    if (entry.prevHash !== previous) {
      return broken(size, `entry ${index} does not chain to the previous entry.`);
    }
    const recomputed = await sha256Hex(entryDigestInput(entry), provider);
    if (recomputed !== entry.entryHash) {
      return broken(size, `entry ${index} hash does not match its contents.`);
    }
    previous = entry.entryHash;
  }
  return { ok: true, code: "TAMV_TRANSPARENCY_VALID", detail: `${log.entries.length} entries chained.`, size };
}

function leavesOf(log: TransparencyLog): Uint8Array[] {
  return log.entries.map((entry) => hexToBytes(entry.entryHash.slice(7)));
}

export async function logMerkleRoot(log: TransparencyLog, provider?: Crypto): Promise<Sha256Digest> {
  assertLog(log);
  return `sha256:${bytesToHex(await merkleTreeHash(leavesOf(log), provider))}`;
}

export async function entryInclusionProof(
  log: TransparencyLog,
  index: number,
  provider?: Crypto,
): Promise<{ leaf: Sha256Digest; root: Sha256Digest; proof: InclusionProofNode[] }> {
  assertLog(log);
  if (!Number.isInteger(index) || index < 0 || index >= log.entries.length) {
    throw new Error("The inclusion proof index is outside the log.");
  }
  const leaves = leavesOf(log);
  const root = `sha256:${bytesToHex(await merkleTreeHash(leaves, provider))}`;
  const proof = await inclusionPath(leaves, index, provider);
  return { leaf: log.entries[index].entryHash, root, proof };
}

export async function verifyInclusion(
  leaf: Uint8Array,
  proof: InclusionProofNode[],
  root: Uint8Array,
  provider?: Crypto,
): Promise<boolean> {
  if (!Array.isArray(proof)) return false;
  let running = await leafHash(leaf, provider);
  for (const node of proof) {
    if (!node || (node.side !== "left" && node.side !== "right")) return false;
    let sibling: Uint8Array;
    try {
      sibling = hexToBytes(node.hash);
    } catch {
      return false;
    }
    if (sibling.length !== 32) return false;
    running =
      node.side === "right"
        ? await nodeHash(running, sibling, provider)
        : await nodeHash(sibling, running, provider);
  }
  return timingSafeEqualHex(bytesToHex(running), bytesToHex(root));
}

export async function verifyEntryInclusion(
  entryHash: Sha256Digest,
  proof: InclusionProofNode[],
  root: Sha256Digest,
  provider?: Crypto,
): Promise<boolean> {
  if (!isSha256Digest(entryHash) || !isSha256Digest(root)) return false;
  return verifyInclusion(hexToBytes(entryHash.slice(7)), proof, hexToBytes(root.slice(7)), provider);
}

function checkpointSigningInput(checkpoint: TransparencyCheckpoint): string {
  return canonicalJson({
    schema: checkpoint.schema,
    size: checkpoint.size,
    rootHash: checkpoint.rootHash,
    chainHead: checkpoint.chainHead,
  });
}

function chainHeadOf(log: TransparencyLog): Sha256Digest {
  return log.entries.length ? log.entries[log.entries.length - 1].entryHash : TRANSPARENCY_GENESIS_HASH;
}

export async function buildCheckpoint(log: TransparencyLog, provider?: Crypto): Promise<TransparencyCheckpoint> {
  const chain = await verifyChain(log, provider);
  if (!chain.ok) throw new Error(`Cannot checkpoint a broken transparency log: ${chain.code}.`);
  return {
    schema: TRANSPARENCY_SCHEMA,
    size: log.entries.length,
    rootHash: await logMerkleRoot(log, provider),
    chainHead: chainHeadOf(log),
    signature: { alg: "Ed25519", state: "UNSIGNED_RELEASE_PENDING" },
  };
}

export async function signCheckpoint(
  checkpoint: TransparencyCheckpoint,
  privateKey: CryptoKey,
  publicKey: CryptoKey,
  provider?: Crypto,
): Promise<TransparencyCheckpoint> {
  const id = await keyId(publicKey, provider);
  const value = await signEd25519(privateKey, checkpointSigningInput(checkpoint), provider);
  return { ...checkpoint, signature: { alg: "Ed25519", keyId: id, value } };
}

export async function verifyCheckpoint(
  options: {
    checkpoint: TransparencyCheckpoint;
    log: TransparencyLog;
    publicKey?: CryptoKey;
    requireSignature?: boolean;
  },
  provider?: Crypto,
): Promise<TransparencyResult> {
  const { checkpoint, log, publicKey, requireSignature = true } = options;
  const size = Array.isArray(log?.entries) ? log.entries.length : 0;
  if (
    !checkpoint ||
    typeof checkpoint !== "object" ||
    checkpoint.schema !== TRANSPARENCY_SCHEMA ||
    typeof checkpoint.size !== "number" ||
    !isSha256Digest(checkpoint.rootHash) ||
    !isSha256Digest(checkpoint.chainHead)
  ) {
    return { ok: false, code: "TAMV_TRANSPARENCY_MALFORMED", detail: "The checkpoint does not match the TAMV contract.", size };
  }
  const chain = await verifyChain(log, provider);
  if (!chain.ok) return chain;
  if (checkpoint.size !== log.entries.length) {
    return { ok: false, code: "TAMV_TRANSPARENCY_ROOT_MISMATCH", detail: "The checkpoint size does not match the log.", size };
  }
  if ((await logMerkleRoot(log, provider)) !== checkpoint.rootHash) {
    return { ok: false, code: "TAMV_TRANSPARENCY_ROOT_MISMATCH", detail: "The Merkle root does not match the log.", size };
  }
  if (chainHeadOf(log) !== checkpoint.chainHead) {
    return { ok: false, code: "TAMV_TRANSPARENCY_ROOT_MISMATCH", detail: "The chain head does not match the log.", size };
  }
  const signature = checkpoint.signature;
  if (!signature || signature.alg !== "Ed25519") {
    return { ok: false, code: "TAMV_TRANSPARENCY_MALFORMED", detail: "The checkpoint signature block is malformed.", size };
  }
  if ("state" in signature) {
    return requireSignature
      ? { ok: false, code: "TAMV_TRANSPARENCY_UNSIGNED", detail: "The checkpoint is unsigned; certification is denied.", size }
      : { ok: true, code: "TAMV_TRANSPARENCY_VALID", detail: "Unsigned checkpoint; structure and root verified, not certified.", size };
  }
  if (typeof signature.value !== "string" || !isSha256Digest(signature.keyId)) {
    return { ok: false, code: "TAMV_TRANSPARENCY_MALFORMED", detail: "The checkpoint signature block is malformed.", size };
  }
  if (!publicKey) {
    return { ok: false, code: "TAMV_TRANSPARENCY_KEY_MISSING", detail: "A public key is required to verify the checkpoint.", size };
  }
  if ((await keyId(publicKey, provider)) !== signature.keyId) {
    return { ok: false, code: "TAMV_TRANSPARENCY_SIGNATURE_INVALID", detail: "The public key does not match the checkpoint key id.", size };
  }
  const valid = await verifyEd25519(publicKey, checkpointSigningInput(checkpoint), signature.value, provider);
  return valid
    ? { ok: true, code: "TAMV_TRANSPARENCY_VALID", detail: "The checkpoint is signed and matches the log.", size }
    : { ok: false, code: "TAMV_TRANSPARENCY_SIGNATURE_INVALID", detail: "The checkpoint signature is invalid.", size };
}

function broken(size: number, detail: string): TransparencyResult {
  return { ok: false, code: "TAMV_TRANSPARENCY_CHAIN_BROKEN", detail, size };
}

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}