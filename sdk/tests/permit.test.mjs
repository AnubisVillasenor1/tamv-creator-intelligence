import test from "node:test";
import assert from "node:assert/strict";
import { evaluateExecutionPermit, createPermitGovernance } from "../permit.mjs";
const digest = "a".repeat(64);
function context() {
  return {
    actor: { id: "alice", tenantId: "A", active: true },
    asset: { id: "asset-a", tenantId: "A", ownerId: "alice" },
    reviewer: { id: "reviewer", tenantId: "A", active: true, role: "reviewer" },
    permit: { id: "p1", tenantId: "A", actorId: "alice", assetId: "asset-a", reviewerId: "reviewer", status: "APPROVED", expiresAt: Date.now() + 300_000, digest, policyVersion: "v1", costUnits: 100, consumed: false, revoked: false },
    digest, policyVersion: "v1", reservedUnits: 100,
  };
}
test("valid trusted snapshots permit execution", () => assert.equal(evaluateExecutionPermit(context()).allowed, true));
test("absent evidence fails closed", () => assert.equal(evaluateExecutionPermit({}).allowed, false));
test("tenant isolation", () => { const c = context(); c.asset.tenantId = "B"; assert.ok(evaluateExecutionPermit(c).reasons.includes("ownership")); });
test("asset ownership revalidated", () => { const c = context(); c.asset.ownerId = "bob"; assert.ok(evaluateExecutionPermit(c).reasons.includes("ownership")); });
test("independent review forbids self-approval", () => { const c = context(); c.reviewer.id = "alice"; c.permit.reviewerId = "alice"; assert.ok(evaluateExecutionPermit(c).reasons.includes("independent-reviewer")); });
test("reviewer revocation denies", () => { const c = context(); c.reviewer.active = false; assert.equal(evaluateExecutionPermit(c).allowed, false); });
test("expiry denies at exact boundary", () => { const c = context(); assert.ok(evaluateExecutionPermit(c, c.permit.expiresAt).reasons.includes("expiry")); });
test("digest binds the operation", () => { const c = context(); c.digest = "b".repeat(64); assert.ok(evaluateExecutionPermit(c).reasons.includes("digest")); });
test("policy version mismatch denies", () => { const c = context(); c.policyVersion = "v2"; assert.ok(evaluateExecutionPermit(c).reasons.includes("policy")); });
test("reservation must cover 100 cost units", () => { const c = context(); c.reservedUnits = 99; assert.ok(evaluateExecutionPermit(c).reasons.includes("budget")); });
test("consumed permit denies replay", () => { const c = context(); c.permit.consumed = true; assert.ok(evaluateExecutionPermit(c).reasons.includes("consumed")); });
test("revoked permit denies", () => { const c = context(); c.permit.revoked = true; assert.ok(evaluateExecutionPermit(c).reasons.includes("revoked")); });
test("atomic host claim prevents concurrent execution", async () => {
  let consumed = false; let executions = 0;
  const gov = createPermitGovernance({ resolve: async () => context(), claim: async () => { if (consumed) return { claimed: false }; consumed = true; return { claimed: true, claimId: "claim1" }; }, execute: async () => ++executions, settle: async () => {} });
  const results = await Promise.allSettled(Array.from({ length: 8 }, () => gov.run({ permitId: "p1", digest })));
  assert.equal(executions, 1); assert.equal(results.filter(r => r.status === "fulfilled").length, 1);
});
test("claim failure blocks side effects", async () => {
  let executions = 0;
  const gov = createPermitGovernance({ resolve: async () => context(), claim: async () => { throw new Error("store offline"); }, execute: async () => ++executions, settle: async () => {} });
  await assert.rejects(gov.run({ permitId: "p1", digest }), /store offline/); assert.equal(executions, 0);
});
test("external failure is unknown, never retried", async () => {
  const receipts = []; let attempts = 0;
  const gov = createPermitGovernance({ resolve: async () => context(), claim: async () => ({ claimed: true, claimId: "c1" }), execute: async () => { attempts++; throw new Error("transport failed"); }, settle: async event => receipts.push(event) });
  await assert.rejects(gov.run({ permitId: "p1", digest }), /transport failed/); assert.equal(attempts, 1); assert.equal(receipts[0].status, "unknown");
});
test("receipt failure does not mislabel completed effects", async () => {
  const receipts = []; let executions = 0;
  const gov = createPermitGovernance({ resolve: async () => context(), claim: async () => ({ claimed: true, claimId: "c1" }), execute: async () => ++executions, settle: async event => { receipts.push(event); throw new Error("receipt offline"); } });
  await assert.rejects(gov.run({ permitId: "p1", digest }), /receipt offline/); assert.equal(executions, 1); assert.deepEqual(receipts.map(e => e.status), ["succeeded"]);
});