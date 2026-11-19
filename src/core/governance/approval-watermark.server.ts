/* global process */
/**
 * Cryptographic approval watermark for human decisions.
 *
 * The platform derives a distinct HMAC key per user from one server-only
 * master secret using HKDF. The resulting watermark binds the human actor,
 * the exact artifact digest, the contract digest, the action and the autonomy
 * level. It answers "which human ordered this AI action, and was the evidence
 * altered afterwards?".
 *
 * Limits, stated explicitly: an HMAC is symmetric, so verification requires
 * the server secret. This provides integrity and attribution inside TAMV, not
 * public non-repudiation before a third party; that would require a key held
 * by the approver and is outside this implementation. It is one control in a
 * defence-in-depth design, not a guarantee of absolute security.
 */

import { digest } from "./engine";

const SCHEMA = "tamv.human.approval.v1" as const;
const WATERMARK_INFO = "tamv.approval.watermark.v1";
const APPROVER_TAG_INFO = "tamv.approval.approver-tag.v1";
const MASTER_SECRET_ENV = "TAMV_APPROVAL_WATERMARK_SECRET";
export const HUMAN_SUPERVISION_LEVELS = [3, 4, 5] as const;
export const GOVERNANCE_APPROVAL_ACTION = "governance.project.approve" as const;
export const WATERMARK_EVIDENCE_ACTION = "human.approval.watermark" as const;

export type AutonomyLevel = 0 | 1 | 2 | 3 | 4 | 5;
export type TerminalNode = "autonomous" | "human_resolved";

export interface ApprovalSubject {
  decisionId: string;
  actorId: string;
  action: string;
  artifactDigest: string;
  contractDigest: string;
  autonomyLevel: AutonomyLevel;
  terminalNode: TerminalNode;
  issuedAt: string;
  /** Optional execution window in seconds; evidence itself never expires. */
  validForSeconds?: number;
  /** Delegation chain (who delegated what), longest-lived link first. */
  delegationChain?: string[];
  amountMinor?: string;
  currency?: string;
}

export interface ApprovalWatermarkReceipt {
  schema: typeof SCHEMA;
  algorithm: "HMAC-SHA256";
  keyDerivation: "HKDF-SHA256";
  subject: ApprovalSubject;
  subjectDigest: string;
  watermark: string;
  approverTag: string;
}

const encoder = new TextEncoder();
const HEX_64 = /^[0-9a-f]{64}$/;

function stableStringify(value: unknown): string {
  if (value === null || typeof value !== "object") return JSON.stringify(value);
  if (Array.isArray(value)) return `[${value.map(stableStringify).join(",")}]`;
  const record = value as Record<string, unknown>;
  const keys = Object.keys(record).sort();
  return `{${keys.map((key) => `${JSON.stringify(key)}:${stableStringify(record[key])}`).join(",")}}`;
}

function canonicalSubject(subject: ApprovalSubject): string {
  return stableStringify({
    action: subject.action,
    actorId: subject.actorId,
    amountMinor: subject.amountMinor ?? null,
    artifactDigest: subject.artifactDigest,
    autonomyLevel: subject.autonomyLevel,
    contractDigest: subject.contractDigest,
    currency: subject.currency ?? null,
    decisionId: subject.decisionId,
    delegationChain: subject.delegationChain ?? [],
    issuedAt: subject.issuedAt,
    terminalNode: subject.terminalNode,
    validForSeconds: subject.validForSeconds ?? null,
  });
}

async function sha256Hex(text: string): Promise<string> {
  const bytes = await crypto.subtle.digest("SHA-256", encoder.encode(text));
  return Array.from(new Uint8Array(bytes), (byte) => byte.toString(16).padStart(2, "0")).join("");
}

function requireMasterKey(): Uint8Array<ArrayBuffer> {
  const secret = process.env[MASTER_SECRET_ENV];
  // Fail closed: never derive a watermark from a short, default or missing key.
  if (!secret || secret.length < 32) {
    throw new Error(`${MASTER_SECRET_ENV} no está configurado o es demasiado corto.`);
  }
  const encoded = encoder.encode(secret);
  const buffer = new ArrayBuffer(encoded.byteLength);
  new Uint8Array(buffer).set(encoded);
  return new Uint8Array(buffer);
}

async function deriveUserKey(actorId: string, info: string): Promise<CryptoKey> {
  const master = await crypto.subtle.importKey("raw", requireMasterKey(), "HKDF", false, [
    "deriveKey",
  ]);
  return crypto.subtle.deriveKey(
    { name: "HKDF", hash: "SHA-256", salt: encoder.encode(actorId), info: encoder.encode(info) },
    master,
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign", "verify"],
  );
}

async function macHex(key: CryptoKey, text: string): Promise<string> {
  const bytes = await crypto.subtle.sign("HMAC", key, encoder.encode(text));
  return Array.from(new Uint8Array(bytes), (byte) => byte.toString(16).padStart(2, "0")).join("");
}

function timingSafeEqualHex(left: string, right: string): boolean {
  if (!HEX_64.test(left) || !HEX_64.test(right)) return false;
  let difference = 0;
  for (let index = 0; index < left.length; index += 1) {
    difference |= left.charCodeAt(index) ^ right.charCodeAt(index);
  }
  return difference === 0;
}

function assertValidSubject(subject: ApprovalSubject): void {
  const level = subject.autonomyLevel;
  if (!Number.isInteger(level) || level < 0 || level > 5) throw new Error("Autonomy level inválido.");
  if (!subject.decisionId.trim() || !subject.actorId.trim() || !subject.action.trim()) {
    throw new Error("La aprobación requiere decisionId, actorId y action.");
  }
  if (!HEX_64.test(subject.artifactDigest) || !HEX_64.test(subject.contractDigest)) {
    throw new Error("Los digests de artefacto y contrato deben ser SHA-256.");
  }
  if (subject.terminalNode !== "autonomous" && subject.terminalNode !== "human_resolved") {
    throw new Error("terminalNode inválido.");
  }
  if (Number.isNaN(Date.parse(subject.issuedAt))) throw new Error("issuedAt inválido.");
  if (
    subject.validForSeconds !== undefined &&
    (!Number.isInteger(subject.validForSeconds) || subject.validForSeconds < 1)
  ) {
    throw new Error("validForSeconds inválido.");
  }
}

/** Issues a receipt. Throws on malformed input or missing server secret. */
export async function issueApprovalWatermark(
  subject: ApprovalSubject,
): Promise<ApprovalWatermarkReceipt> {
  assertValidSubject(subject);
  const canonical = canonicalSubject(subject);
  const [subjectDigest, watermark, approverTag] = await Promise.all([
    sha256Hex(canonical),
    macHex(await deriveUserKey(subject.actorId, WATERMARK_INFO), canonical),
    macHex(await deriveUserKey(subject.actorId, APPROVER_TAG_INFO), subject.actorId),
  ]);
  return {
    schema: SCHEMA,
    algorithm: "HMAC-SHA256",
    keyDerivation: "HKDF-SHA256",
    subject,
    subjectDigest,
    watermark,
    approverTag,
  };
}

/** Pure integrity check. Never throws; never grants authority by itself. */
export async function verifyApprovalWatermark(receipt: ApprovalWatermarkReceipt): Promise<boolean> {
  try {
    if (receipt.schema !== SCHEMA || receipt.algorithm !== "HMAC-SHA256" || receipt.keyDerivation !== "HKDF-SHA256") return false;
    assertValidSubject(receipt.subject);
    const canonical = canonicalSubject(receipt.subject);
    const [subjectDigest, watermark, approverTag] = await Promise.all([
      sha256Hex(canonical),
      macHex(await deriveUserKey(receipt.subject.actorId, WATERMARK_INFO), canonical),
      macHex(await deriveUserKey(receipt.subject.actorId, APPROVER_TAG_INFO), receipt.subject.actorId),
    ]);
    if (!timingSafeEqualHex(receipt.subjectDigest, subjectDigest)) return false;
    if (!timingSafeEqualHex(receipt.watermark, watermark)) return false;
    if (!timingSafeEqualHex(receipt.approverTag, approverTag)) return false;
    // L3+ decisions must terminate in a human node, cryptographically linked.
    if (HUMAN_SUPERVISION_LEVELS.includes(receipt.subject.autonomyLevel as 3 | 4 | 5)) {
      return receipt.subject.terminalNode === "human_resolved";
    }
    return true;
  } catch {
    return false;
  }
}

/**
 * Time-window check for execution. Separated from integrity so old evidence
 * remains verifiable after its execution window has closed.
 */
export function isApprovalCurrentlyValid(receipt: ApprovalWatermarkReceipt, now = Date.now()): boolean {
  const issued = Date.parse(receipt.subject.issuedAt);
  if (Number.isNaN(issued) || issued > now + 60_000) return false;
  const window = receipt.subject.validForSeconds;
  return window === undefined || now <= issued + window * 1000;
}

/** Contract digest for the existing human approval of a local governance artifact. */
export async function governanceApprovalContractDigest(): Promise<string> {
  return digest({
    schema: "tamv.human.approval.contract.v1",
    action: GOVERNANCE_APPROVAL_ACTION,
    autonomyLevel: 3,
    terminalNode: "human_resolved",
    humanApprovalRequired: true,
  });
}

/** Binds an authenticated user's approval to one exact artifact version. */
export async function issueGovernanceApprovalWatermark(input: {
  projectId: string;
  artifactDigest: string;
  actorId: string;
  issuedAt?: string;
}): Promise<ApprovalWatermarkReceipt> {
  if (!HEX_64.test(input.artifactDigest)) throw new Error("Digest del entregable inválido.");
  return issueApprovalWatermark({
    decisionId: `${input.projectId}:${input.artifactDigest}:approve`,
    actorId: input.actorId,
    action: GOVERNANCE_APPROVAL_ACTION,
    artifactDigest: input.artifactDigest,
    contractDigest: await governanceApprovalContractDigest(),
    autonomyLevel: 3,
    terminalNode: "human_resolved",
    issuedAt: input.issuedAt ?? new Date().toISOString(),
  });
}

function isReceiptShape(value: unknown): value is ApprovalWatermarkReceipt {
  if (!value || typeof value !== "object") return false;
  const receipt = value as Record<string, unknown>;
  const subject = receipt["subject"];
  if (!subject || typeof subject !== "object") return false;
  const subjectDigest = receipt["subjectDigest"];
  const watermark = receipt["watermark"];
  const approverTag = receipt["approverTag"];
  return (
    receipt["schema"] === SCHEMA &&
    receipt["algorithm"] === "HMAC-SHA256" &&
    receipt["keyDerivation"] === "HKDF-SHA256" &&
    typeof subjectDigest === "string" &&
    HEX_64.test(subjectDigest) &&
    typeof watermark === "string" &&
    HEX_64.test(watermark) &&
    typeof approverTag === "string" &&
    HEX_64.test(approverTag)
  );
}

/**
 * Reads a receipt from the existing JSON evidence column. Structural only:
 * cryptographic verification is a separate step and never implied here.
 */
export function receiptFromReasonCodes(reasonCodes: unknown): ApprovalWatermarkReceipt | null {
  if (!Array.isArray(reasonCodes)) return null;
  for (const entry of reasonCodes) {
    if (!entry || typeof entry !== "object") continue;
    const receipt = (entry as { receipt?: unknown }).receipt;
    if (isReceiptShape(receipt)) return receipt;
  }
  return null;
}
