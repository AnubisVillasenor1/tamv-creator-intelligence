import { describe, expect, it } from "vitest";
import { runGovernedTurbo, type GovernedAuditEvent } from "./governed-scheduler";

const approved = {
  actorId: "user-1",
  capability: "agent.orchestration" as const,
  consentGranted: true,
  certificationValid: true,
};

function auditLog(events: GovernedAuditEvent[]) {
  return async (event: GovernedAuditEvent) => { events.push(event); };
}

describe("HyperCore governed adaptive scheduler", () => {
  it("denies by default and emits a metadata-only denial receipt", async () => {
    const events: GovernedAuditEvent[] = [];
    const result = await runGovernedTurbo({
      ...approved,
      consentGranted: false,
      runId: "run-denied",
      tasks: [{ id: "write", run: async () => "must not run" }],
      audit: auditLog(events),
    });
    expect(result.status).toBe("denied");
    expect(result.results).toEqual([]);
    expect(events.map((event) => event.type)).toEqual(["policy.denied"]);
  });

  it("preflights audit intents for a whole wave before executing any task", async () => {
    const events: GovernedAuditEvent[] = [];
    let executions = 0;
    const result = await runGovernedTurbo({
      ...approved,
      initialConcurrency: 2,
      audit: async (event) => {
        events.push(event);
        if (event.type === "execution.intent" && event.taskId === "b") throw new Error("audit unavailable");
      },
      tasks: [
        { id: "a", run: async () => { executions += 1; return 1; } },
        { id: "b", run: async () => { executions += 1; return 2; } },
      ],
    });
    expect(result.status).toBe("audit-incomplete");
    expect(executions).toBe(0);
  });

  it("schedules dependency waves, prioritizes ready work, and records only bounded metadata", async () => {
    const events: GovernedAuditEvent[] = [];
    const executionOrder: string[] = [];
    const result = await runGovernedTurbo({
      ...approved,
      runId: "run-dag",
      initialConcurrency: 2,
      maxConcurrency: 3,
      audit: auditLog(events),
      tasks: [
        { id: "root", priority: 0, run: async () => { executionOrder.push("root"); return 1; } },
        { id: "low", dependsOn: ["root"], priority: 1, run: async () => { executionOrder.push("low"); return 2; } },
        { id: "high", dependsOn: ["root"], priority: 9, run: async () => { executionOrder.push("high"); return 3; } },
      ],
    });
    expect(result.status).toBe("completed");
    expect(executionOrder).toEqual(["root", "high", "low"]);
    expect(result.metrics.waves).toBe(2);
    expect(events.every((event) => !("payload" in event))).toBe(true);
  });

  it("skips dependents after failure and never retries a non-idempotent task", async () => {
    let attempts = 0;
    const result = await runGovernedTurbo({
      ...approved,
      audit: async () => {},
      tasks: [
        { id: "source", run: async () => { attempts += 1; throw new Error("failure"); } },
        { id: "dependent", dependsOn: ["source"], run: async () => 2 },
      ],
    });
    expect(attempts).toBe(1);
    expect(result.status).toBe("partial");
    expect(result.results.find((item) => item.id === "dependent")?.status).toBe("skipped");
  });

  it("rejects cycles and unknown dependencies before audit or execution", async () => {
    let auditCalls = 0;
    const common = { ...approved, audit: async () => { auditCalls += 1; } };
    await expect(runGovernedTurbo({
      ...common,
      tasks: [
        { id: "a", dependsOn: ["b"], run: async () => 1 },
        { id: "b", dependsOn: ["a"], run: async () => 2 },
      ],
    })).rejects.toThrow("cycle");
    await expect(runGovernedTurbo({
      ...common,
      tasks: [{ id: "a", dependsOn: ["missing"], run: async () => 1 }],
    })).rejects.toThrow("unknown dependency");
    expect(auditCalls).toBe(0);
  });

  it("bounds task count and adapts concurrency down after a failed sample", async () => {
    const result = await runGovernedTurbo({
      ...approved,
      initialConcurrency: 4,
      maxConcurrency: 4,
      audit: async () => {},
      tasks: [
        { id: "bad", run: async () => { throw new Error("failure"); } },
        { id: "dependent", dependsOn: ["bad"], run: async () => 1 },
      ],
    });
    expect(result.metrics.finalConcurrency).toBeLessThan(4);
    await expect(runGovernedTurbo({
      ...approved,
      maxTasks: 1,
      audit: async () => {},
      tasks: [
        { id: "a", run: async () => 1 },
        { id: "b", run: async () => 2 },
      ],
    })).rejects.toThrow("task limit");
  });
});
