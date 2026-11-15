/**
 * Metadata-only governance receipts and resumable operation invariants.
 *
 * This module validates evidence envelopes; it does not persist receipts,
 * authenticate the actor, authorize a cloud operation, or sign evidence.
 * Those responsibilities belong to trusted server-side adapters.
 */

export type GovernanceOperation = "install" | "resume" | "update" | "redeploy" | "rollback";
export type GovernanceOperationStatus =
  | "pending"
  | "running"
  | "succeeded"
  | "failed"
  | "blocked"
  | "recovery_required";

export interface GovernanceEvidenceReference {
  readonly kind: "test" | "approval" | "artifact" | "deployment" | "audit";
  /** SHA-256 digest of the evidence object; never the evidence payload itself. */
  readonly sha256: string;
  /** Optional opaque reference to a protected evidence store. No signed URLs. */
  readonly reference?: string;
}

export interface GovernanceOperationReceipt {
  readonly schema: "tamv.governance.receipt.v1";
  readonly receiptId: string;
  readonly operationId: string;
  readonly operation: GovernanceOperation;
  readonly phase: string;
  readonly status: GovernanceOperationStatus;
  /** Opaque, non-PII actor reference issued by the trusted identity layer. */
  readonly actorRef: string;
  /** Opaque, non-secret identifier for the exact destination. */
  readonly targetRef: string;
  /** Immutable source revision and artifact digest pinned for this operation. */
  readonly sourceCommitSha: string;
  readonly artifactSha256: string;
  readonly policyVersion: string;
  readonly idempotencyKey: string;
  readonly startedAt: string;
  readonly recordedAt: string;
  readonly evidence: readonly GovernanceEvidenceReference[];
  readonly resultCode?: string;
}

export type ReceiptValidation = Readonly<{ valid: boolean; errors: readonly string[] }>;

const ID_PATTERN = /^[A-Za-z0-9][A-Za-z0-9._:-]{7,127}$/;
const SHA256_PATTERN = /^[a-f0-9]{64}$/i;
const COMMIT_PATTERN = /^[a-f0-9]{40}$/i;
const VERSION_PATTERN = /^[A-Za-z0-9][A-Za-z0-9.+_-]{0,63}$/;
const ISO_DATE_PATTERN = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{1,3})?Z$/;

function isIsoUtc(value: string): boolean {
  return ISO_DATE_PATTERN.test(value) && Number.isFinite(Date.parse(value));
}

function isOpaqueReference(value: string): boolean {
  return ID_PATTERN.test(value) && !value.includes("@") && !value.includes("/");
}

/**
 * Strict shape validation for a metadata-only receipt. Never put prompts,
 * user content, email addresses, tokens, private URLs or credentials here.
 */
export function validateGovernanceReceipt(
  receipt: GovernanceOperationReceipt,
): ReceiptValidation {
  const errors: string[] = [];
  if (receipt.schema !== "tamv.governance.receipt.v1") errors.push("SCHEMA_UNSUPPORTED");
  if (!ID_PATTERN.test(receipt.receiptId)) errors.push("RECEIPT_ID_INVALID");
  if (!ID_PATTERN.test(receipt.operationId)) errors.push("OPERATION_ID_INVALID");
  if (!ID_PATTERN.test(receipt.idempotencyKey)) errors.push("IDEMPOTENCY_KEY_INVALID");
  if (!isOpaqueReference(receipt.actorRef)) errors.push("ACTOR_REF_NOT_OPAQUE");
  if (!isOpaqueReference(receipt.targetRef)) errors.push("TARGET_REF_NOT_OPAQUE");
  if (!COMMIT_PATTERN.test(receipt.sourceCommitSha)) errors.push("SOURCE_COMMIT_INVALID");
  if (!SHA256_PATTERN.test(receipt.artifactSha256)) errors.push("ARTIFACT_DIGEST_INVALID");
  if (!VERSION_PATTERN.test(receipt.policyVersion)) errors.push("POLICY_VERSION_INVALID");
  if (!VERSION_PATTERN.test(receipt.phase)) errors.push("PHASE_INVALID");
  if (!isIsoUtc(receipt.startedAt) || !isIsoUtc(receipt.recordedAt)) errors.push("TIMESTAMP_INVALID");
  else if (Date.parse(receipt.recordedAt) < Date.parse(receipt.startedAt)) errors.push("TIMESTAMP_ORDER_INVALID");

  const operations: readonly string[] = ["install", "resume", "update", "redeploy", "rollback"];
  const statuses: readonly string[] = [
    "pending", "running", "succeeded", "failed", "blocked", "recovery_required",
  ];
  if (!operations.includes(receipt.operation)) errors.push("OPERATION_UNSUPPORTED");
  if (!statuses.includes(receipt.status)) errors.push("STATUS_UNSUPPORTED");
  if (!Array.isArray(receipt.evidence)) errors.push("EVIDENCE_NOT_ARRAY");
  else {
    for (const item of receipt.evidence) {
      if (!["test", "approval", "artifact", "deployment", "audit"].includes(item.kind)) {
        errors.push("EVIDENCE_KIND_UNSUPPORTED");
      }
      if (!SHA256_PATTERN.test(item.sha256)) errors.push("EVIDENCE_DIGEST_INVALID");
      if (item.reference !== undefined && !isOpaqueReference(item.reference)) {
        errors.push("EVIDENCE_REFERENCE_NOT_OPAQUE");
      }
    }
    if (receipt.status === "succeeded" && receipt.evidence.length === 0) {
      errors.push("SUCCESS_WITHOUT_EVIDENCE");
    }
  }
  if (receipt.resultCode !== undefined && !VERSION_PATTERN.test(receipt.resultCode)) {
    errors.push("RESULT_CODE_INVALID");
  }
  return { valid: errors.length === 0, errors: [...new Set(errors)] };
}

const TRANSITIONS: Readonly<Record<GovernanceOperationStatus, readonly GovernanceOperationStatus[]>> = {
  pending: ["running", "blocked", "failed"],
  running: ["succeeded", "failed", "blocked", "recovery_required"],
  succeeded: [],
  failed: [],
  blocked: ["running", "failed"],
  recovery_required: ["running", "failed", "blocked"],
};

/** Terminal states cannot be reopened or rewritten as a successful retry. */
export function canTransitionOperation(
  from: GovernanceOperationStatus,
  to: GovernanceOperationStatus,
): boolean {
  return TRANSITIONS[from].includes(to);
}

export interface ResumeBinding {
  readonly operationId: string;
  readonly sourceCommitSha: string;
  readonly artifactSha256: string;
  readonly targetRef: string;
  readonly idempotencyKey: string;
}

/**
 * Resume is allowed only for the same operation, source, artifact, target and
 * idempotency key. A new candidate must be an explicit update operation.
 */
export function validateResumeBinding(
  previous: GovernanceOperationReceipt,
  requested: ResumeBinding,
): ReceiptValidation {
  const errors: string[] = [];
  if (!["pending", "running", "blocked", "recovery_required"].includes(previous.status)) {
    errors.push("OPERATION_TERMINAL");
  }
  if (requested.operationId !== previous.operationId) errors.push("OPERATION_ID_CHANGED");
  if (requested.sourceCommitSha !== previous.sourceCommitSha) errors.push("SOURCE_REVISION_CHANGED");
  if (requested.artifactSha256 !== previous.artifactSha256) errors.push("ARTIFACT_CHANGED");
  if (requested.targetRef !== previous.targetRef) errors.push("TARGET_CHANGED");
  if (requested.idempotencyKey !== previous.idempotencyKey) errors.push("IDEMPOTENCY_KEY_CHANGED");
  return { valid: errors.length === 0, errors };
}
