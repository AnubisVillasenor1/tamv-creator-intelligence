import attributionManifest from "../../tamv-attribution.json";
import attributionSignature from "../../tamv-attribution.sig?raw";
import attributionDocument from "../../ATTRIBUTION.md?raw";
import readmeSource from "../../README.md?raw";
import attributionConstantSource from "./tamv-attribution.ts?raw";
import attributionComponentSource from "../components/branding/TamvAttribution.tsx?raw";
import rootLayoutSource from "../routes/__root.tsx?raw";
import reviewFunctionSource from "./content.functions.ts?raw";
import statusRouteSource from "../routes/api.tamv.status.ts?raw";
import generationRouteSource from "../routes/api.generation.ts?raw";
import voiceRouteSource from "../routes/api.voice.generate.ts?raw";
import audioCoreRouteSource from "../routes/api.audiocore.advanced.ts?raw";
import agentRouteSource from "../routes/api.agent.ts?raw";
import certificationRuntimeSource from "./tamv-certification.ts?raw";
import certificationToolSource from "../../scripts/tamv-certification.mjs?raw";
import sovereignCoreSource from "../../tamv-pack/core/tamv-sovereign-core.ts?raw";
import hyperCorePolicySource from "./hypercore-turbo/policy.ts?raw";
import hyperCoreVelocitySource from "./hypercore-turbo/velocity.ts?raw";
import hyperCorePolicyJson from "../../hypercore/govern-core/policy.json?raw";
import hyperCoreVelocityConfig from "../../hypercore/velocity-core/turbo-config.json?raw";
import hyperCoreAuditRouteSource from "../routes/api.tamv.hypercore.audit.ts?raw";
import hyperCoreParallelRunnerSource from "./hypercore-turbo/parallel-runner.ts?raw";
import verifySlsaScriptSource from "../../scripts/verify-slsa.sh?raw";
import hyperCorePageSource from "../routes/hypercore.tsx?raw";
import { TAMV_CANONICAL_ATTRIBUTION } from "./tamv-attribution";
import { canonicalizeTamvJson } from "./tamv-canonical-json";
import {
  configuredAttributionKeyId,
  decodeSpkiPem,
  isValidKeyId,
  normalizeKeyId,
  spkiKeyId,
} from "./tamv-trust-anchors";
import {
  TAMV_PREMIUM_FEATURES,
  verifyFeatureApproval,
  type FeatureApprovalStatus,
  type TamvPremiumFeature,
} from "./tamv-feature-approval";

export const TAMV_EXPECTED_ATTRIBUTION =
  "Proyecto impulsado con colaboración de tecnología latinoamericana TAMV ONLINE NETWORK Orgullosamente Realmontenses.";

export const TAMV_REQUIRED_FILES = [
  "ATTRIBUTION.md",
  "README.md",
  "src/lib/tamv-attribution.ts",
  "src/components/branding/TamvAttribution.tsx",
  "src/routes/__root.tsx",
  "src/lib/tamv-certification.ts",
  "src/lib/content.functions.ts",
  "src/routes/api.tamv.status.ts",
  "src/routes/api.generation.ts",
  "src/routes/api.voice.generate.ts",
  "src/routes/api.audiocore.advanced.ts",
  "src/routes/api.agent.ts",
  "scripts/tamv-certification.mjs",
  "tamv-pack/core/tamv-sovereign-core.ts",
  "src/lib/hypercore-turbo/policy.ts",
  "src/lib/hypercore-turbo/velocity.ts",
  "hypercore/govern-core/policy.json",
  "hypercore/velocity-core/turbo-config.json",
  "src/routes/api.tamv.hypercore.audit.ts",
  "src/routes/hypercore.tsx",
  "src/lib/hypercore-turbo/parallel-runner.ts",
  "scripts/verify-slsa.sh",
] as const;

export type TamvCertificationStatus =
  | "certified"
  | "attribution-missing"
  | "attribution-modified"
  | "required-file-missing"
  | "source-integrity-mismatch"
  | "manifest-invalid"
  | "signature-missing"
  | "signing-key-missing"
  | "signature-invalid"
  | "release-not-approved"
  | "trust-anchor-missing"
  | "crypto-unavailable";

export interface TamvCertification {
  status: TamvCertificationStatus;
  certified: boolean;
  premiumFeaturesEnabled: boolean;
  approvedFeatures: TamvPremiumFeature[];
  featureApprovalStatus: FeatureApprovalStatus | "not-evaluated";
  reason: string;
  checkedAt: string;
}

export interface TamvAttributionManifest {
  schema: "tamv.attribution.manifest.v1";
  issuer: "TAMV ONLINE NETWORK";
  product: "PLAY & GO";
  pack: "tamv-online-network-creator-intelligence-pack";
  packVersion: string;
  attribution: {
    canonicalText: string;
    required: true;
    visibility: "public";
    enforcement: "fail-closed-premium";
  };
  requiredFiles: string[];
  integrity: {
    algorithm: "sha256";
    canonicalTextSha256: string;
    files: Record<string, string>;
  };
  governance: {
    policy: "tamv-algorithmic-governance-v1";
    consentRequired: true;
    audit: true;
    rightsProtection: true;
  };
  license: {
    core: "AGPL-3.0-only";
    commercial: "TAMV-Commercial-1.0";
    features: string[];
  };
}

export const TAMV_ATTRIBUTION_MANIFEST = attributionManifest as TamvAttributionManifest;

export const TAMV_CERTIFICATION_SOURCE_FILES: Record<string, string> = {
  "ATTRIBUTION.md": attributionDocument,
  "README.md": readmeSource,
  "src/lib/tamv-attribution.ts": attributionConstantSource,
  "src/components/branding/TamvAttribution.tsx": attributionComponentSource,
  "src/routes/__root.tsx": rootLayoutSource,
  "src/lib/tamv-certification.ts": certificationRuntimeSource,
  "src/lib/content.functions.ts": reviewFunctionSource,
  "src/routes/api.tamv.status.ts": statusRouteSource,
  "src/routes/api.generation.ts": generationRouteSource,
  "src/routes/api.voice.generate.ts": voiceRouteSource,
  "src/routes/api.audiocore.advanced.ts": audioCoreRouteSource,
  "src/routes/api.agent.ts": agentRouteSource,
  "scripts/tamv-certification.mjs": certificationToolSource,
  "tamv-pack/core/tamv-sovereign-core.ts": sovereignCoreSource,
  "src/lib/hypercore-turbo/policy.ts": hyperCorePolicySource,
  "src/lib/hypercore-turbo/velocity.ts": hyperCoreVelocitySource,
  "hypercore/govern-core/policy.json": hyperCorePolicyJson,
  "hypercore/velocity-core/turbo-config.json": hyperCoreVelocityConfig,
  "src/routes/api.tamv.hypercore.audit.ts": hyperCoreAuditRouteSource,
  "src/lib/hypercore-turbo/parallel-runner.ts": hyperCoreParallelRunnerSource,
  "scripts/verify-slsa.sh": verifySlsaScriptSource,
  "src/routes/hypercore.tsx": hyperCorePageSource,
};

const HEX_SHA256 = /^sha256:[a-f0-9]{64}$/;
const encoder = new TextEncoder();

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function asManifest(value: unknown): TamvAttributionManifest | null {
  if (!isRecord(value)) return null;
  const attribution = value["attribution"];
  const integrity = value["integrity"];
  const governance = value["governance"];
  const license = value["license"];
  if (
    value["schema"] !== "tamv.attribution.manifest.v1" ||
    value["issuer"] !== "TAMV ONLINE NETWORK" ||
    value["product"] !== "PLAY & GO" ||
    value["pack"] !== "tamv-online-network-creator-intelligence-pack" ||
    typeof value["packVersion"] !== "string" ||
    !isRecord(attribution) ||
    typeof attribution["canonicalText"] !== "string" ||
    attribution["required"] !== true ||
    attribution["visibility"] !== "public" ||
    attribution["enforcement"] !== "fail-closed-premium" ||
    !Array.isArray(value["requiredFiles"]) ||
    !value["requiredFiles"].every((entry) => typeof entry === "string") ||
    !isRecord(integrity) ||
    integrity["algorithm"] !== "sha256" ||
    typeof integrity["canonicalTextSha256"] !== "string" ||
    !isRecord(integrity["files"]) ||
    !Object.values(integrity["files"]).every((entry) => typeof entry === "string") ||
    !isRecord(governance) ||
    governance["policy"] !== "tamv-algorithmic-governance-v1" ||
    governance["consentRequired"] !== true ||
    governance["audit"] !== true ||
    governance["rightsProtection"] !== true ||
    !isRecord(license) ||
    license["core"] !== "AGPL-3.0-only" ||
    license["commercial"] !== "TAMV-Commercial-1.0" ||
    !Array.isArray(license["features"]) ||
    !license["features"].every((entry) => typeof entry === "string")
  ) {
    return null;
  }
  return value as unknown as TamvAttributionManifest;
}

export function canonicalizeTamvManifest(value: unknown): string {
  return canonicalizeTamvJson(value);
}

function bytesToHex(bytes: Uint8Array): string {
  return Array.from(bytes, (byte) => byte.toString(16).padStart(2, "0")).join("");
}

function decodeBase64Url(value: string): Uint8Array<ArrayBuffer> {
  if (!/^[A-Za-z0-9_-]+$/.test(value) || value.length % 4 === 1) {
    throw new Error("Codificación base64url inválida.");
  }
  const base64 = value.replace(/-/g, "+").replace(/_/g, "/");
  const padded = base64 + "=".repeat((4 - (base64.length % 4)) % 4);
  const binary = atob(padded);
  return Uint8Array.from(binary, (character) => character.charCodeAt(0));
}

async function sha256Hex(value: string, provider: Crypto): Promise<string> {
  const digest = await provider.subtle.digest("SHA-256", encoder.encode(value));
  return bytesToHex(new Uint8Array(digest));
}

function fail(
  status: TamvCertificationStatus,
  reason: string,
  checkedAt: string,
): TamvCertification {
  return {
    status,
    certified: false,
    premiumFeaturesEnabled: false,
    approvedFeatures: [],
    featureApprovalStatus: "not-evaluated",
    reason,
    checkedAt,
  };
}

export interface VerifyTamvCertificationOptions {
  manifest?: unknown;
  signature?: string;
  publicKeyPem?: string;
  expectedKeyId?: string;
  approvedManifestSha256?: string;
  approvalReceipt?: unknown;
  approvalPublicKeyPem?: string;
  approvalExpectedKeyId?: string;
  sourceFiles?: Record<string, string>;
  cryptoProvider?: Crypto;
  now?: Date;
}

export async function verifyTamvCertification(
  options: VerifyTamvCertificationOptions = {},
): Promise<TamvCertification> {
  const checkedAt = (options.now ?? new Date()).toISOString();
  const candidate = options.manifest === undefined ? TAMV_ATTRIBUTION_MANIFEST : options.manifest;
  const manifest = asManifest(candidate);
  if (!manifest) {
    return fail("manifest-invalid", "El manifest TAMV no cumple el esquema firmado.", checkedAt);
  }

  if (
    manifest.attribution.canonicalText !== TAMV_EXPECTED_ATTRIBUTION ||
    TAMV_CANONICAL_ATTRIBUTION !== TAMV_EXPECTED_ATTRIBUTION
  ) {
    return fail("attribution-modified", "El texto canónico de atribución fue alterado.", checkedAt);
  }

  const requiredFiles = [...TAMV_REQUIRED_FILES];
  if (
    manifest.requiredFiles.length !== requiredFiles.length ||
    manifest.requiredFiles.some((file, index) => file !== requiredFiles[index])
  ) {
    return fail(
      "manifest-invalid",
      "La lista de archivos obligatorios no coincide con la política.",
      checkedAt,
    );
  }

  const manifestPaths = Object.keys(manifest.integrity.files).sort();
  const expectedPaths = [...requiredFiles].sort();
  if (
    manifestPaths.length !== expectedPaths.length ||
    manifestPaths.some((path, index) => path !== expectedPaths[index])
  ) {
    return fail(
      "manifest-invalid",
      "El manifest no cubre exactamente los archivos obligatorios.",
      checkedAt,
    );
  }

  const sourceFiles = options.sourceFiles ?? TAMV_CERTIFICATION_SOURCE_FILES;
  for (const path of requiredFiles) {
    if (typeof sourceFiles[path] !== "string") {
      return fail(
        "required-file-missing",
        "Falta un archivo requerido por la certificación: " + path,
        checkedAt,
      );
    }
  }

  if (
    !sourceFiles["ATTRIBUTION.md"]?.includes(TAMV_EXPECTED_ATTRIBUTION) ||
    !sourceFiles["README.md"]?.includes(TAMV_EXPECTED_ATTRIBUTION) ||
    !sourceFiles["src/lib/tamv-attribution.ts"]?.includes(TAMV_EXPECTED_ATTRIBUTION) ||
    !sourceFiles["src/components/branding/TamvAttribution.tsx"]?.includes(
      "TAMV_CANONICAL_ATTRIBUTION",
    ) ||
    !sourceFiles["src/routes/__root.tsx"]?.includes("<TamvAttribution />") ||
    !sourceFiles["src/lib/content.functions.ts"]?.includes("requireTamvCertification") ||
    !sourceFiles["src/routes/api.tamv.status.ts"]?.includes("getTamvCertification") ||
    !sourceFiles["src/routes/api.generation.ts"]?.includes(
      'unavailableTamvCapabilityResponse("music.generation")',
    ) ||
    !sourceFiles["src/routes/api.voice.generate.ts"]?.includes(
      'unavailableTamvCapabilityResponse("voice.generation")',
    ) ||
    !sourceFiles["src/routes/api.audiocore.advanced.ts"]?.includes(
      'unavailableTamvCapabilityResponse("audiocore.advanced")',
    ) ||
    !sourceFiles["src/routes/api.agent.ts"]?.includes(
      'unavailableTamvCapabilityResponse("agent.orchestration")',
    ) ||
    !sourceFiles["src/lib/hypercore-turbo/policy.ts"]?.includes("tamv.govern.policy.v2") ||
    !sourceFiles["src/lib/hypercore-turbo/velocity.ts"]?.includes("runTurboParallel") ||
    !sourceFiles["hypercore/govern-core/policy.json"]?.includes("NIST-CSF-2.0") ||
    !sourceFiles["hypercore/velocity-core/turbo-config.json"]?.includes("maxConcurrency") ||
    !sourceFiles["src/routes/api.tamv.hypercore.audit.ts"]?.includes(
      'createFileRoute("/api/tamv/hypercore/audit")',
    ) ||
    !sourceFiles["src/lib/hypercore-turbo/parallel-runner.ts"]?.includes("runTurboParallel") ||
    !sourceFiles["scripts/verify-slsa.sh"]?.includes("slsa-verifier") ||
    !sourceFiles["src/routes/hypercore.tsx"]?.includes('createFileRoute("/hypercore")')
  ) {
    return fail(
      "attribution-modified",
      "La atribución visible o uno de sus puntos de control fue alterado.",
      checkedAt,
    );
  }

  const provider = options.cryptoProvider ?? globalThis.crypto;
  if (!provider?.subtle) {
    return fail(
      "crypto-unavailable",
      "Web Crypto no está disponible para verificar la certificación.",
      checkedAt,
    );
  }

  const expectedCanonicalHash = manifest.integrity.canonicalTextSha256;
  if (!HEX_SHA256.test(expectedCanonicalHash)) {
    return fail(
      "manifest-invalid",
      "El hash de la atribución canónica no es SHA-256 válido.",
      checkedAt,
    );
  }
  const actualCanonicalHash = "sha256:" + (await sha256Hex(TAMV_EXPECTED_ATTRIBUTION, provider));
  if (actualCanonicalHash !== expectedCanonicalHash) {
    return fail(
      "attribution-modified",
      "La huella SHA-256 del texto canónico no coincide.",
      checkedAt,
    );
  }

  for (const path of requiredFiles) {
    const expectedHash = manifest.integrity.files[path];
    if (typeof expectedHash !== "string" || !HEX_SHA256.test(expectedHash)) {
      return fail("manifest-invalid", "Hash SHA-256 inválido para " + path, checkedAt);
    }
    const source = sourceFiles[path];
    if (typeof source !== "string") {
      return fail(
        "required-file-missing",
        "Falta un archivo requerido por la certificación: " + path,
        checkedAt,
      );
    }
    const actualHash = "sha256:" + (await sha256Hex(source, provider));
    if (actualHash !== expectedHash) {
      return fail(
        "source-integrity-mismatch",
        "La integridad de origen no coincide en " + path,
        checkedAt,
      );
    }
  }

  if (!manifest.license.features.includes("creator.review")) {
    return fail(
      "manifest-invalid",
      "El manifest no autoriza la capacidad creator.review.",
      checkedAt,
    );
  }

  const signature = (options.signature ?? attributionSignature).trim();
  if (!signature || signature === "UNSIGNED_RELEASE_PENDING") {
    return fail(
      "signature-missing",
      "La firma Ed25519 del release aún no ha sido emitida.",
      checkedAt,
    );
  }

  const publicKeyPem = (
    options.publicKeyPem ??
    (typeof process !== "undefined" ? process.env?.["TAMV_ATTRIBUTION_PUBLIC_KEY"] : undefined) ??
    import.meta.env?.["VITE_TAMV_ATTRIBUTION_PUBLIC_KEY"] ??
    ""
  )
    .replace(/\\n/g, "\n")
    .trim();
  if (!publicKeyPem) {
    return fail(
      "signing-key-missing",
      "No está configurada TAMV_ATTRIBUTION_PUBLIC_KEY.",
      checkedAt,
    );
  }

  const expectedKeyId = normalizeKeyId(options.expectedKeyId ?? configuredAttributionKeyId());
  if (!isValidKeyId(expectedKeyId)) {
    return fail(
      "trust-anchor-missing",
      "No está configurado TAMV_ATTRIBUTION_EXPECTED_KEY_ID; una clave cambiada no puede detectarse.",
      checkedAt,
    );
  }

  try {
    const signatureBytes = decodeBase64Url(signature);
    if (signatureBytes.byteLength !== 64) {
      return fail(
        "signature-invalid",
        "La firma Ed25519 debe contener exactamente 64 bytes.",
        checkedAt,
      );
    }
    if ((await spkiKeyId(publicKeyPem, provider)) !== expectedKeyId) {
      return fail(
        "signature-invalid",
        "La clave pública no coincide con el ancla de confianza TAMV anclada.",
        checkedAt,
      );
    }
    const publicKey = await provider.subtle.importKey(
      "spki",
      decodeSpkiPem(publicKeyPem),
      { name: "Ed25519" },
      false,
      ["verify"],
    );
    const verified = await provider.subtle.verify(
      { name: "Ed25519" },
      publicKey,
      signatureBytes,
      encoder.encode(canonicalizeTamvJson(manifest)),
    );
    if (!verified) {
      return fail(
        "signature-invalid",
        "La firma Ed25519 no autentica el manifest actual.",
        checkedAt,
      );
    }
  } catch {
    return fail(
      "signature-invalid",
      "No se pudo verificar la firma Ed25519 de la distribución.",
      checkedAt,
    );
  }

  const manifestDigest = "sha256:" + (await sha256Hex(canonicalizeTamvJson(manifest), provider));
  const approvedDigest =
    options.approvedManifestSha256 ??
    (typeof process !== "undefined" ? process.env?.["TAMV_RELEASE_MANIFEST_SHA256"] : undefined) ??
    import.meta.env?.["VITE_TAMV_RELEASE_MANIFEST_SHA256"] ??
    "";
  if (!HEX_SHA256.test(approvedDigest) || approvedDigest !== manifestDigest) {
    return fail(
      "release-not-approved",
      "El manifiesto firmado no coincide con el digest aprobado fuera del paquete.",
      checkedAt,
    );
  }

  const approval = await verifyFeatureApproval({
    manifestDigest,
    receipt: options.approvalReceipt,
    publicKeyPem: options.approvalPublicKeyPem,
    expectedKeyId: options.approvalExpectedKeyId,
    cryptoProvider: provider,
    now: options.now,
    encoder,
  });

  return {
    status: "certified",
    certified: true,
    premiumFeaturesEnabled: approval.approved,
    approvedFeatures: approval.features,
    featureApprovalStatus: approval.status,
    reason:
      approval.status === "approved"
        ? "Hashes, firma, ancla de clave, digest aprobado y recibo premium verificados; no es certificación normativa."
        : "Integridad y firma verificadas, pero no hay aprobación externa de capacidades premium: " + approval.reason,
    checkedAt,
  };
}

export async function getTamvCertification(): Promise<TamvCertification> {
  return verifyTamvCertification();
}

export function buildUnavailableCapabilityResponse(
  feature: string,
  certification: TamvCertification,
  manifest: TamvAttributionManifest = TAMV_ATTRIBUTION_MANIFEST,
): Response {
  const headers = { "Cache-Control": "no-store, max-age=0" };
  if (!certification.certified) {
    return Response.json(
      {
        error: "Distribución TAMV no certificada",
        code: "TAMV_ATTRIBUTION_INTEGRITY_FAILED",
        status: certification.status,
        reason: certification.reason,
        feature,
        action: "Restaura la distribución íntegra y firma el release con la clave oficial de TAMV.",
      },
      { status: 403, headers },
    );
  }

  if (!manifest.license.features.includes(feature)) {
    return Response.json(
      {
        error: "La capacidad no está habilitada en el manifest TAMV",
        code: "TAMV_FEATURE_NOT_LICENSED",
        feature,
      },
      { status: 403, headers },
    );
  }

  if (
    (TAMV_PREMIUM_FEATURES as readonly string[]).includes(feature) &&
    !certification.premiumFeaturesEnabled
  ) {
    return Response.json(
      {
        error: "La capacidad premium no cuenta con un recibo externo de aprobación vigente.",
        code: "TAMV_PREMIUM_APPROVAL_MISSING",
        feature,
        approvalStatus: certification.featureApprovalStatus,
      },
      { status: 403, headers },
    );
  }

  return Response.json(
    {
      error:
        "La distribución está certificada, pero el gateway de esta capacidad todavía no está conectado.",
      code: "TAMV_CAPABILITY_NOT_IMPLEMENTED",
      feature,
      action:
        "Conecta y prueba el gateway correspondiente antes de habilitar esta capacidad en un release.",
    },
    { status: 501, headers },
  );
}

export async function unavailableTamvCapabilityResponse(feature: string): Promise<Response> {
  return buildUnavailableCapabilityResponse(feature, await getTamvCertification());
}

export async function requireTamvCertification(feature: string): Promise<Response | null> {
  const certification = await getTamvCertification();
  if (!certification.certified) {
    return Response.json(
      {
        error: "Distribución TAMV no certificada",
        code: "TAMV_ATTRIBUTION_INTEGRITY_FAILED",
        status: certification.status,
        reason: certification.reason,
        feature,
        action: "Restaura la distribución íntegra y firma el release con la clave oficial de TAMV.",
      },
      { status: 403, headers: { "Cache-Control": "no-store, max-age=0" } },
    );
  }
  if (!TAMV_ATTRIBUTION_MANIFEST.license.features.includes(feature)) {
    return Response.json(
      {
        error: "La capacidad no está habilitada en el manifest TAMV",
        code: "TAMV_FEATURE_NOT_LICENSED",
        feature,
      },
      { status: 403, headers: { "Cache-Control": "no-store, max-age=0" } },
    );
  }
  if (
    (TAMV_PREMIUM_FEATURES as readonly string[]).includes(feature) &&
    !certification.premiumFeaturesEnabled
  ) {
    return Response.json(
      {
        error: "La capacidad premium no cuenta con un recibo externo de aprobación vigente.",
        code: "TAMV_PREMIUM_APPROVAL_MISSING",
        feature,
        approvalStatus: certification.featureApprovalStatus,
      },
      { status: 403, headers: { "Cache-Control": "no-store, max-age=0" } },
    );
  }
  return null;
}
