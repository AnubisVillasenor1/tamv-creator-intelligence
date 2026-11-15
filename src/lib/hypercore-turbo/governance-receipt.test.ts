import { describe, expect, it } from "vitest";
import {
  canTransitionOperation,
  validateGovernanceReceipt,
  validateResumeBinding,
  type GovernanceOperationReceipt,
} from "./governance-receipt";

const digest = "a".repeat(64);
const receipt: GovernanceOperationReceipt = {
  schema: "tamv.governance.receipt.v1",
  receiptId: "receipt-00000001",
  operationId: "operation-0000001",
  operation: "update",
  phase: "postflight",
  status: "succeeded",
  actorRef: "actor-opaque-0001",
  targetRef: "target-opaque-001",
  sourceCommitSha: "b".repeat(40),
  artifactSha256: digest,
  policyVersion: "1.0.0",
  idempotencyKey: "idem-000000001",
  startedAt: "2026-11-15T12:00:00Z",
  recordedAt: "2026-11-15T12:00:05Z",
  evidence: [{ kind: "test", sha256: digest, reference: "evidence-000001" }],
  resultCode: "VERIFIED",
};

describe("governance operation receipts", () => {
  it("accepts a metadata-only receipt with evidence for success", () => {
    expect(validateGovernanceReceipt(receipt)).toEqual({ valid: true, errors: [] });
  });

  it("rejects malformed runtime payloads without throwing", () => {
    expect(validateGovernanceReceipt(null as unknown as GovernanceOperationReceipt).errors)
      .toContain("RECEIPT_NOT_OBJECT");
    expect(validateGovernanceReceipt({ ...receipt, evidence: [null] as unknown as GovernanceOperationReceipt["evidence"] }).errors)
      .toContain("EVIDENCE_ITEM_INVALID");
    expect(validateGovernanceReceipt({ ...receipt, actorRef: 12345678 as unknown as string }).errors)
      .toContain("ACTOR_REF_NOT_OPAQUE");
  });

  it("rejects success without evidence", () => {
    expect(validateGovernanceReceipt({ ...receipt, evidence: [] }).errors)
      .toContain("SUCCESS_WITHOUT_EVIDENCE");
  });

  it("rejects non-opaque actor and target references", () => {
    const result = validateGovernanceReceipt({
      ...receipt,
      actorRef: "person@example.com",
      targetRef: "https://example.com/private",
    });
    expect(result.errors).toContain("ACTOR_REF_NOT_OPAQUE");
    expect(result.errors).toContain("TARGET_REF_NOT_OPAQUE");
  });

  it("rejects timestamps recorded before the operation started", () => {
    expect(validateGovernanceReceipt({
      ...receipt,
      recordedAt: "2026-11-15T11:59:59Z",
    }).errors).toContain("TIMESTAMP_ORDER_INVALID");
  });

  it("prevents reopening terminal operations", () => {
    expect(canTransitionOperation("succeeded", "running")).toBe(false);
    expect(canTransitionOperation("failed", "succeeded")).toBe(false);
    expect(canTransitionOperation("running", "recovery_required")).toBe(true);
  });

  it("permits resume only when operation, source, artifact, target and key are unchanged", () => {
    const binding = {
      operationId: receipt.operationId,
      sourceCommitSha: receipt.sourceCommitSha,
      artifactSha256: receipt.artifactSha256,
      targetRef: receipt.targetRef,
      idempotencyKey: receipt.idempotencyKey,
    };
    expect(validateResumeBinding({ ...receipt, status: "recovery_required" }, binding))
      .toEqual({ valid: true, errors: [] });
    expect(validateResumeBinding({ ...receipt, status: "running" }, {
      ...binding,
      sourceCommitSha: "c".repeat(40),
    }).errors).toContain("SOURCE_REVISION_CHANGED");
  });

  it("rejects resume of a terminal operation", () => {
    expect(validateResumeBinding(receipt, {
      operationId: receipt.operationId,
      sourceCommitSha: receipt.sourceCommitSha,
      artifactSha256: receipt.artifactSha256,
      targetRef: receipt.targetRef,
      idempotencyKey: receipt.idempotencyKey,
    }).errors).toContain("OPERATION_TERMINAL");
  });
});
