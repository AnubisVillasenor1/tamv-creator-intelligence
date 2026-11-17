import assert from "node:assert/strict";
import test from "node:test";
import { createGovernance, evaluateGovernance, GovernanceDeniedError } from "../index.mjs";

const safeContext = {
  consent: true, rightsCleared: true, containsSensitiveData: false,
  disclosure: true, humanApproved: true, certified: true,
};
const uncertifiedContext = { ...safeContext, certified: false };

test("certified mode is the default and records lifecycle events", async () => {
  const events = [];
  const governance = createGovernance({ audit: async (event) => events.push(event) });
  const result = await governance.run({ projectId: "p1", context: safeContext, execute: async () => "ok" });
  assert.equal(result, "ok");
  assert.deepEqual(events.map((event) => event.kind), [
    "policy.evaluated", "execution.started", "execution.succeeded",
  ]);
  assert.equal(events[0].outcome, "allowed_certified");
});

test("uncertified release is permitted only in explicit draft/local mode", async () => {
  const events = [];
  const governance = createGovernance({ audit: async (event) => events.push(event) });
  await assert.rejects(
    governance.run({ projectId: "p1", context: uncertifiedContext, execute: async () => "unsafe" }),
    GovernanceDeniedError,
  );
  assert.equal(events.length, 1);
  assert.equal(events[0].executionAllowed, false);
  const result = await governance.run({
    projectId: "p1", mode: "draft", context: uncertifiedContext, execute: async () => "draft",
  });
  assert.equal(result, "draft");
  assert.equal(events.at(-3).outcome, "allowed_uncertified");
});

test("draft mode cannot bypass consent, rights, privacy, disclosure, or human approval", async () => {
  for (const field of ["consent", "rightsCleared", "disclosure", "humanApproved"]) {
    const context = { ...uncertifiedContext, [field]: false };
    const governance = createGovernance({ audit: async () => {} });
    await assert.rejects(
      governance.run({ projectId: "p1", mode: "draft", context, execute: async () => "no" }),
      GovernanceDeniedError,
    );
  }
  const privacy = { ...uncertifiedContext, containsSensitiveData: true };
  const governance = createGovernance({ audit: async () => {} });
  await assert.rejects(
    governance.run({ projectId: "p1", mode: "local", context: privacy, execute: async () => "no" }),
    GovernanceDeniedError,
  );
});

test("audit failure before execution fails closed", async () => {
  let invoked = false;
  const governance = createGovernance({ audit: async () => { throw new Error("ledger unavailable"); } });
  await assert.rejects(
    governance.run({ projectId: "p1", context: safeContext, execute: async () => { invoked = true; } }),
    /ledger unavailable/,
  );
  assert.equal(invoked, false);
});

test("execution failure emits a failure event and preserves the original error", async () => {
  const events = [];
  const governance = createGovernance({ audit: async (event) => events.push(event) });
  await assert.rejects(
    governance.run({ projectId: "p1", context: safeContext, execute: async () => { throw new Error("provider failed"); } }),
    /provider failed/,
  );
  assert.equal(events.at(-1).kind, "execution.failed");
});

test("governance evaluation denies missing controls by default", () => {
  const decision = evaluateGovernance({});
  assert.equal(decision.allowed, false);
  assert.deepEqual(decision.reasons, ["consent", "rights", "privacy", "transparency", "oversight", "integrity"]);
});

test("success-receipt failure does not mislabel a completed action as execution failure", async () => {
  const events = [];
  const governance = createGovernance({
    audit: async (event) => {
      events.push(event);
      if (event.kind === "execution.succeeded") throw new Error("success receipt unavailable");
    },
  });
  let invoked = false;
  await assert.rejects(
    governance.run({
      projectId: "p1",
      context: safeContext,
      execute: async () => { invoked = true; return "completed"; },
    }),
    /success receipt unavailable/,
  );
  assert.equal(invoked, true);
  assert.equal(events.some((event) => event.kind === "execution.failed"), false);
});
