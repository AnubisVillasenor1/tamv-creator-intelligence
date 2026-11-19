/* global process */
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { webcrypto } from "node:crypto";
import {
  GOVERNANCE_APPROVAL_ACTION,
  governanceApprovalContractDigest,
  isApprovalCurrentlyValid,
  issueApprovalWatermark,
  issueGovernanceApprovalWatermark,
  receiptFromReasonCodes,
  verifyApprovalWatermark,
  type ApprovalSubject,
} from "@/core/governance/approval-watermark.server";

vi.stubGlobal("crypto", webcrypto);

const secret = "t".repeat(48);
const actorId = "00000000-0000-4000-8000-0000000000a1";
const now = Date.parse("2026-11-19T12:00:00.000Z");

const subject: ApprovalSubject = {
  decisionId: "00000000-0000-4000-8000-0000000000b1",
  actorId,
  action: "financial.charge",
  artifactDigest: "a".repeat(64),
  contractDigest: "b".repeat(64),
  autonomyLevel: 3,
  terminalNode: "human_resolved",
  issuedAt: new Date(now).toISOString(),
  validForSeconds: 600,
  delegationChain: ["board", "creator"],
  amountMinor: "19900",
  currency: "MXN",
};

beforeEach(() => {
  process.env["TAMV_APPROVAL_WATERMARK_SECRET"] = secret;
});
afterEach(() => {
  delete process.env["TAMV_APPROVAL_WATERMARK_SECRET"];
});

describe("per-user approval watermark", () => {
  it("issues a verifiable receipt that identifies the approving human", async () => {
    const receipt = await issueApprovalWatermark(subject);
    expect(receipt.schema).toBe("tamv.human.approval.v1");
    expect(receipt.subject.actorId).toBe(actorId);
    expect(receipt.watermark).toMatch(/^[0-9a-f]{64}$/);
    expect(receipt.approverTag).toMatch(/^[0-9a-f]{64}$/);
    expect(await verifyApprovalWatermark(receipt)).toBe(true);
  });

  it("invalidates the receipt when any approved field is altered", async () => {
    const receipt = await issueApprovalWatermark(subject);
    const tampered = {
      ...receipt,
      subject: { ...receipt.subject, amountMinor: "99900" },
    };
    expect(await verifyApprovalWatermark(tampered)).toBe(false);
  });

  it("derives a distinct key for each user", async () => {
    const first = await issueApprovalWatermark(subject);
    const second = await issueApprovalWatermark({
      ...subject,
      actorId: "00000000-0000-4000-8000-0000000000a2",
    });
    expect(first.watermark).not.toBe(second.watermark);
    expect(first.approverTag).not.toBe(second.approverTag);
    expect(await verifyApprovalWatermark(first)).toBe(true);
    expect(await verifyApprovalWatermark(second)).toBe(true);
  });

  it("rejects L3+ decisions that did not terminate in a human node", async () => {
    const receipt = await issueApprovalWatermark({ ...subject, terminalNode: "autonomous" });
    expect(await verifyApprovalWatermark(receipt)).toBe(false);
  });

  it("fails closed when the server secret is missing", async () => {
    delete process.env["TAMV_APPROVAL_WATERMARK_SECRET"];
    await expect(issueApprovalWatermark(subject)).rejects.toThrow(/configurado/);
    const receipt = await issueApprovalWatermark(subject).catch(() => null);
    expect(receipt).toBeNull();
  });

  it("keeps evidence verifiable after its execution window closes", async () => {
    const receipt = await issueApprovalWatermark(subject);
    expect(isApprovalCurrentlyValid(receipt, now)).toBe(true);
    expect(isApprovalCurrentlyValid(receipt, now + 601_000)).toBe(false);
    expect(await verifyApprovalWatermark(receipt)).toBe(true);
  });

  it("binds a governance approval to one project and exact artifact digest", async () => {
    const projectId = "00000000-0000-4000-8000-0000000000f1";
    const receipt = await issueGovernanceApprovalWatermark({
      projectId,
      artifactDigest: "a".repeat(64),
      actorId,
      issuedAt: new Date(now).toISOString(),
    });
    expect(receipt.subject.action).toBe(GOVERNANCE_APPROVAL_ACTION);
    expect(receipt.subject.decisionId).toBe(`${projectId}:${"a".repeat(64)}:approve`);
    expect(receipt.subject.contractDigest).toBe(await governanceApprovalContractDigest());
    expect(receipt.subject.autonomyLevel).toBe(3);
    expect(receipt.subject.terminalNode).toBe("human_resolved");
    expect(await verifyApprovalWatermark(receipt)).toBe(true);
  });

  it("extracts and validates the receipt stored in governance evidence", async () => {
    const receipt = await issueGovernanceApprovalWatermark({
      projectId: "00000000-0000-4000-8000-0000000000f2",
      artifactDigest: "b".repeat(64),
      actorId,
      issuedAt: new Date(now).toISOString(),
    });
    const stored = [{ code: "HUMAN_APPROVAL_WATERMARK", receipt }];
    const recovered = receiptFromReasonCodes(stored);
    expect(recovered).toEqual(receipt);
    expect(recovered && (await verifyApprovalWatermark(recovered))).toBe(true);
    expect(receiptFromReasonCodes(["unrelated"])).toBeNull();
  });

  it("rejects an invalid artifact digest before issuing an approval", async () => {
    await expect(
      issueGovernanceApprovalWatermark({
        projectId: "00000000-0000-4000-8000-0000000000f3",
        artifactDigest: "not-a-digest",
        actorId,
      }),
    ).rejects.toThrow(/Digest/);
  });
});
