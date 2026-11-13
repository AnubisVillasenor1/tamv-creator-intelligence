import { describe, expect, it, vi } from "vitest";
import {
  createHyperCoreOrchestrator, HyperCoreError,
  type AuditEvent, type HyperCoreRequest, type StandbyCheckpoint,
} from "../lib/hyper-core-orchestrator";

const request: HyperCoreRequest<{ value: number }> = {
  traceId: "trace-test-001", idempotencyKey: "idem-test-001",
  inputHash: "a".repeat(64), input: { value: 21 }, idempotent: true,
};

function harness(options: {
  hot?: () => Promise<number>; cold?: () => Promise<number>;
  allowed?: boolean; verified?: boolean; auditFails?: boolean; standbyFails?: boolean;
} = {}) {
  const events: AuditEvent[] = [];
  const checkpoints: StandbyCheckpoint[] = [];
  const hotExecute = vi.fn(options.hot ?? (async () => 42));
  const coldExecute = vi.fn(options.cold ?? (async () => 43));
  const orchestrator = createHyperCoreOrchestrator({
    governance: { authorize: vi.fn(async () => ({ allowed: options.allowed ?? true })) },
    hot: { name: "hot-primary", execute: hotExecute },
    cold: { name: "cold-secondary", execute: coldExecute },
    verification: { verify: vi.fn(async () => ({ valid: options.verified ?? true })) },
    audit: { append: vi.fn(async (event: AuditEvent) => {
      if (options.auditFails) throw new Error("audit unavailable");
      events.push(event);
    }) },
    standby: { checkpoint: vi.fn(async (snapshot: StandbyCheckpoint) => {
      if (options.standbyFails) throw new Error("standby unavailable");
      checkpoints.push(snapshot);
    }) },
  }, {
    id: (() => { let id = 0; return () => "event-" + (++id); })(),
    timestamp: () => "2026-11-13T12:00:00.000Z",
    now: (() => { let tick = 0; return () => ++tick; })(),
  });
  return { orchestrator, events, checkpoints, hotExecute, coldExecute };
}

describe("TAMV Hyper-Core Ω governed orchestration", () => {
  it("authorizes, checkpoints, executes hot, verifies, audits and returns a trace", async () => {
    const h = harness();
    const result = await h.orchestrator.run(request);
    expect(result).toMatchObject({ traceId: request.traceId, output: 42, lane: "hot", verified: true });
    expect(h.hotExecute).toHaveBeenCalledOnce();
    expect(h.coldExecute).not.toHaveBeenCalled();
    expect(h.events.map((event) => event.event)).toEqual([
      "operation.authorized", "pipeline.started", "output.verified",
    ]);
    expect(h.checkpoints.map((snapshot) => snapshot.phase)).toEqual([
      "accepted", "executing", "completed",
    ]);
  });
  it("fails closed when governance denies the operation", async () => {
    const h = harness({ allowed: false });
    await expect(h.orchestrator.run(request)).rejects.toMatchObject({ code: "POLICY_DENIED" });
    expect(h.hotExecute).not.toHaveBeenCalled();
    expect(h.coldExecute).not.toHaveBeenCalled();
  });
  it("fails over to cold only for retryable, idempotent work", async () => {
    const error = Object.assign(new Error("temporary"), { retryable: true });
    const h = harness({ hot: async () => { throw error; }, cold: async () => 84 });
    const result = await h.orchestrator.run(request);
    expect(result).toMatchObject({ output: 84, lane: "cold", verified: true });
    expect(h.coldExecute).toHaveBeenCalledOnce();
    expect(h.events.some((event) => event.event === "pipeline.failover")).toBe(true);
  });
  it("does not retry a non-idempotent operation", async () => {
    const h = harness({ hot: async () => { throw Object.assign(new Error("temporary"), { retryable: true }); } });
    await expect(h.orchestrator.run({ ...request, idempotent: false })).rejects.toMatchObject({ code: "EXECUTION_FAILED" });
    expect(h.coldExecute).not.toHaveBeenCalled();
  });
  it("rejects output that fails the verification core", async () => {
    const h = harness({ verified: false });
    await expect(h.orchestrator.run(request)).rejects.toMatchObject({ code: "VERIFICATION_FAILED" });
  });
  it("stops before execution if the audit ledger is unavailable", async () => {
    const h = harness({ auditFails: true });
    await expect(h.orchestrator.run(request)).rejects.toMatchObject({ code: "AUDIT_UNAVAILABLE" });
    expect(h.hotExecute).not.toHaveBeenCalled();
  });
  it("stops before execution if standby cannot persist the accepted checkpoint", async () => {
    const h = harness({ standbyFails: true });
    await expect(h.orchestrator.run(request)).rejects.toMatchObject({ code: "STANDBY_UNAVAILABLE" });
    expect(h.hotExecute).not.toHaveBeenCalled();
  });
  it("rejects malformed input hashes", async () => {
    const h = harness();
    await expect(h.orchestrator.run({ ...request, inputHash: "not-a-hash" })).rejects.toMatchObject({ code: "INVALID_REQUEST" });
    expect(h.hotExecute).not.toHaveBeenCalled();
  });
});
