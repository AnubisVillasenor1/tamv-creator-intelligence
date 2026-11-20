import { canonicalizeTamvJson } from "./tamv-canonical-json";
import { decodeSpkiPem, isValidKeyId, normalizeKeyId, spkiKeyId } from "./tamv-trust-anchors";

/**
 * Package integrity and premium authorization are deliberately separate.
 * A valid Ed25519 release signature only proves that the bytes are unchanged.
 * Premium capabilities additionally require an externally issued, short-lived
 * receipt that names the exact approved manifest digest and key id.
 */

export const TAMV_PREMIUM_FEATURES = ["audiocore.advanced", "agent.orchestration"] as const;
export type TamvPremiumFeature = (typeof TAMV_PREMIUM_FEATURES)[number];

export type FeatureApprovalStatus =
  | "approved"
  | "receipt-missing"
  | "receipt-invalid"
  | "approval-key-missing"
  | "approval-anchor-missing"
  | "approval-key-mismatch"
  | "digest-not-approved"
  | "crypto-unavailable";

export interface FeatureApprovalReceipt {
  schema: "tamv.feature.approval.v1";
  manifestDigest: string;
  features: string[];
  keyId: string;
  issuedAt: string;
  expiresAt: string;
  signature: string;
}

export interface FeatureApproval {
  status: FeatureApprovalStatus;
  approved: boolean;
  features: TamvPremiumFeature[];
  reason: string;
  checkedAt: string;
}

export interface VerifyFeatureApprovalOptions {
  manifestDigest: string;
  receipt?: unknown;
  publicKeyPem?: string | undefined;
  expectedKeyId?: string | undefined;
  cryptoProvider?: Crypto | undefined;
  now?: Date | undefined;
  encoder?: TextEncoder | undefined;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function decodeBase64Url(value: string): Uint8Array<ArrayBuffer> {
  if (!/^[A-Za-z0-9_-]+$/.test(value) || value.length % 4 === 1) {
    throw new Error("Codificación base64url inválida en el recibo.");
  }
  const base64 = value.replace(/-/g, "+").replace(/_/g, "/");
  const padded = base64 + "=".repeat((4 - (base64.length % 4)) % 4);
  return Uint8Array.from(atob(padded), (character) => character.charCodeAt(0));
}

function configValue(serverKey: string, clientKey: string): string {
  const server = typeof process !== "undefined" ? process.env?.[serverKey] : undefined;
  return String(server ?? import.meta.env?.[clientKey] ?? "");
}

function result(
  status: FeatureApprovalStatus,
  reason: string,
  checkedAt: string,
  features: TamvPremiumFeature[] = [],
): FeatureApproval {
  return { status, approved: status === "approved", features, reason, checkedAt };
}

function asReceipt(value: unknown): FeatureApprovalReceipt | null {
  if (!isRecord(value)) return null;
  const { schema, manifestDigest, features, keyId, issuedAt, expiresAt, signature } = value;
  if (
    schema !== "tamv.feature.approval.v1" ||
    typeof manifestDigest !== "string" ||
    !/^sha256:[a-f0-9]{64}$/.test(manifestDigest) ||
    !Array.isArray(features) ||
    !features.every((feature) => typeof feature === "string") ||
    typeof keyId !== "string" ||
    typeof issuedAt !== "string" ||
    typeof expiresAt !== "string" ||
    typeof signature !== "string" ||
    Number.isNaN(Date.parse(issuedAt)) ||
    Number.isNaN(Date.parse(expiresAt))
  ) {
    return null;
  }
  return {
    schema,
    manifestDigest,
    features: features as string[],
    keyId,
    issuedAt,
    expiresAt,
    signature,
  } as FeatureApprovalReceipt;
}

export async function verifyFeatureApproval(
  options: VerifyFeatureApprovalOptions,
): Promise<FeatureApproval> {
  const checkedAt = (options.now ?? new Date()).toISOString();
  const receiptValue =
    options.receipt ?? configValue("TAMV_FEATURE_APPROVAL_RECEIPT", "VITE_TAMV_FEATURE_APPROVAL_RECEIPT");
  if (!receiptValue || (typeof receiptValue === "string" && !receiptValue.trim())) {
    return result("receipt-missing", "No hay recibo externo de aprobación premium.", checkedAt);
  }

  let receipt: FeatureApprovalReceipt | null;
  try {
    receipt = asReceipt(typeof receiptValue === "string" ? JSON.parse(receiptValue) : receiptValue);
  } catch {
    receipt = null;
  }
  if (!receipt) {
    return result("receipt-invalid", "El recibo de aprobación no cumple el contrato firmado.", checkedAt);
  }

  const publicKeyPem = String(
    options.publicKeyPem ?? configValue("TAMV_FEATURE_APPROVAL_PUBLIC_KEY", "VITE_TAMV_FEATURE_APPROVAL_PUBLIC_KEY"),
  ).trim();
  if (!publicKeyPem) {
    return result("approval-key-missing", "No está configurada la clave pública de gobernanza.", checkedAt);
  }

  const expectedKeyId = normalizeKeyId(
    options.expectedKeyId ?? configValue("TAMV_FEATURE_APPROVAL_EXPECTED_KEY_ID", "VITE_TAMV_FEATURE_APPROVAL_EXPECTED_KEY_ID"),
  );
  if (!isValidKeyId(expectedKeyId)) {
    return result("approval-anchor-missing", "No está configurado el ancla de la clave de gobernanza.", checkedAt);
  }

  const provider = options.cryptoProvider ?? globalThis.crypto;
  if (!provider?.subtle) {
    return result("crypto-unavailable", "Web Crypto no está disponible para verificar el recibo.", checkedAt);
  }

  try {
    const actualKeyId = await spkiKeyId(publicKeyPem, provider);
    if (actualKeyId !== expectedKeyId) {
      return result("approval-key-mismatch", "La clave de gobernanza no coincide con el ancla configurada.", checkedAt);
    }
    if (receipt.keyId.toLowerCase().replace(/^sha256:/, "") !== expectedKeyId) {
      return result("receipt-invalid", "El recibo no identifica la clave de gobernanza anclada.", checkedAt);
    }
    if (receipt.manifestDigest !== options.manifestDigest) {
      return result("digest-not-approved", "El recibo no corresponde al manifest firmado actual.", checkedAt);
    }
    const nowMs = (options.now ?? new Date()).getTime();
    if (nowMs < Date.parse(receipt.issuedAt) || nowMs > Date.parse(receipt.expiresAt)) {
      return result("receipt-invalid", "El recibo de aprobación está fuera de su ventana de vigencia.", checkedAt);
    }
    const approvedFeatures = receipt.features.filter((feature): feature is TamvPremiumFeature =>
      (TAMV_PREMIUM_FEATURES as readonly string[]).includes(feature),
    );
    if (approvedFeatures.length === 0) {
      return result("receipt-invalid", "El recibo no habilita ninguna capacidad premium conocida.", checkedAt);
    }
    const { signature, ...signedPart } = receipt;
    const key = await provider.subtle.importKey("spki", decodeSpkiPem(publicKeyPem), { name: "Ed25519" }, false, ["verify"]);
    const encoder = options.encoder ?? new TextEncoder();
    const verified = await provider.subtle.verify(
      { name: "Ed25519" },
      key,
      decodeBase64Url(signature),
      encoder.encode(canonicalizeTamvJson(signedPart)),
    );
    if (!verified) {
      return result("receipt-invalid", "La firma del recibo de aprobación no es válida.", checkedAt);
    }
    return result("approved", "Recibo externo verificado para el manifest y las capacidades solicitadas.", checkedAt, [
      ...new Set(approvedFeatures),
    ]);
  } catch {
    return result("receipt-invalid", "No se pudo verificar el recibo de aprobación.", checkedAt);
  }
}
