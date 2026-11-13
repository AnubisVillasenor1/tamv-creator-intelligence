import { describe, expect, it } from "vitest";
import { runTurboParallel } from "../lib/hypercore-turbo/parallel-runner";
import { validateGovernCorePolicy } from "../lib/hypercore-turbo/policy";

describe("TAMV HyperCore Turbo", () => {
  it("validates the Govern Core policy", () => {
    expect(validateGovernCorePolicy()).toEqual({ valid: true, errors: [] });
  });

  it("runs independent asynchronous checks with bounded concurrency", async () => {
    const results = await runTurboParallel<number>([
      { id: "a", run: async () => 1 },
      { id: "b", run: async () => 2 },
      { id: "c", run: async () => 3 },
    ], { maxConcurrency: 2 });
    expect(results.map((result) => result.status)).toEqual(["fulfilled", "fulfilled", "fulfilled"]);
    expect(results.map((result) => result.value)).toEqual([1, 2, 3]);
  });

  it("does not retry operations that are not explicitly idempotent", async () => {
    let attempts = 0;
    const results = await runTurboParallel<number>([
      {
        id: "non-idempotent",
        run: async () => {
          attempts += 1;
          throw Object.assign(new Error("temporary"), { retryable: true });
        },
      },
    ], { maxConcurrency: 1, failFast: false });
    expect(attempts).toBe(1);
    expect(results[0]?.status).toBe("rejected");
  });

  it("fails closed and stops scheduling after a critical failure", async () => {
    let secondaryRan = false;
    const results = await runTurboParallel<number>([
      {
        id: "critical",
        critical: true,
        run: async () => {
          throw new Error("integrity failed");
        },
      },
      {
        id: "secondary",
        run: async () => {
          secondaryRan = true;
          return 2;
        },
      },
    ], { maxConcurrency: 1, failFast: true });
    expect(results[0]?.status).toBe("rejected");
    expect(results[1]?.status).toBe("skipped");
    expect(secondaryRan).toBe(false);
  });
});