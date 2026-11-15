import { describe, expect, it } from "vitest";
import { runTurboParallel, type TurboTask } from "./parallel-runner";

describe("runTurboParallel", () => {
  it("rejects invalid concurrency and duplicate task identifiers", async () => {
    await expect(runTurboParallel([], { maxConcurrency: 0 })).rejects.toThrow(
      "maxConcurrency must be an integer between 1 and 64",
    );
    const duplicate: TurboTask<number>[] = [
      { id: "same", run: async () => 1 },
      { id: "same", run: async () => 2 },
    ];
    await expect(runTurboParallel(duplicate)).rejects.toThrow(
      "Task IDs must be unique and non-empty",
    );
  });

  it("does not exceed the configured worker concurrency", async () => {
    let active = 0;
    let peak = 0;
    const tasks: TurboTask<number>[] = Array.from({ length: 8 }, (_, index) => ({
      id: `task-${index}`,
      run: async () => {
        active += 1;
        peak = Math.max(peak, active);
        await new Promise((resolve) => setTimeout(resolve, 2));
        active -= 1;
        return index;
      },
    }));
    const results = await runTurboParallel(tasks, { maxConcurrency: 2, timeoutMs: 1000 });
    expect(peak).toBeLessThanOrEqual(2);
    expect(peak).toBe(2);
    expect(results.every((result) => result.status === "fulfilled")).toBe(true);
    expect(results.map((result) => result.value)).toEqual([0, 1, 2, 3, 4, 5, 6, 7]);
  });

  it("retries only explicitly idempotent tasks with explicitly retryable errors", async () => {
    let attempts = 0;
    const task: TurboTask<string> = {
      id: "retryable-idempotent",
      idempotent: true,
      maxAttempts: 3,
      run: async () => {
        attempts += 1;
        if (attempts < 3) {
          throw Object.assign(new Error("temporary"), { retryable: true });
        }
        return "ok";
      },
    };
    const [result] = await runTurboParallel([task], { retryBaseDelayMs: 0 });
    expect(result?.status).toBe("fulfilled");
    expect(result?.attempts).toBe(3);
    expect(attempts).toBe(3);
  });

  it("never retries a non-idempotent task even when its error is retryable", async () => {
    let attempts = 0;
    const task: TurboTask<string> = {
      id: "non-idempotent",
      run: async () => {
        attempts += 1;
        throw Object.assign(new Error("temporary"), { retryable: true });
      },
    };
    const [result] = await runTurboParallel([task], { retryBaseDelayMs: 0 });
    expect(result?.status).toBe("rejected");
    expect(result?.attempts).toBe(1);
    expect(attempts).toBe(1);
  });

  it("marks unscheduled tasks skipped after a critical failure in fail-fast mode", async () => {
    const tasks: TurboTask<string>[] = [
      {
        id: "critical-failure",
        critical: true,
        run: async () => {
          throw new Error("critical");
        },
      },
      { id: "must-not-run", run: async () => "unexpected" },
    ];
    const results = await runTurboParallel(tasks, { maxConcurrency: 1, failFast: true });
    expect(results[0]?.status).toBe("rejected");
    expect(results[1]?.status).toBe("skipped");
    expect(results[1]?.attempts).toBe(0);
  });

  it("returns a bounded timeout result when a task ignores cancellation", async () => {
    const task: TurboTask<string> = {
      id: "timeout",
      run: async () => new Promise<string>(() => undefined),
    };
    const startedAt = Date.now();
    const [result] = await runTurboParallel([task], { timeoutMs: 10 });
    expect(result?.status).toBe("rejected");
    expect(result?.error).toBe("Task timeout");
    expect(Date.now() - startedAt).toBeLessThan(1000);
  });
});
