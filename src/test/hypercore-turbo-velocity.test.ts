import { describe, expect, it } from "vitest";
import { runTurboParallel } from "../lib/hypercore-turbo/velocity";

describe("Velocity Core bounded async runner", () => {
  it("returns results in input order despite concurrent completion", async () => {
    const results = await runTurboParallel([
      { id: "slow", run: async () => { await new Promise((resolve) => setTimeout(resolve, 15)); return 1; } },
      { id: "fast", run: async () => 2 },
    ], { maxConcurrency: 2 });
    expect(results.map((result) => result.id)).toEqual(["slow", "fast"]);
    expect(results.every((result) => result.status === "fulfilled")).toBe(true);
  });

  it("rejects duplicate task identifiers", async () => {
    await expect(runTurboParallel([
      { id: "duplicate", run: async () => 1 },
      { id: "duplicate", run: async () => 2 },
    ])).rejects.toThrow("unique");
  });

  it("rejects an invalid concurrency limit", async () => {
    await expect(runTurboParallel([], { maxConcurrency: 0 })).rejects.toThrow("maxConcurrency");
  });

  it("stops scheduling pending tasks after a critical failure", async () => {
    const started: string[] = [];
    const results = await runTurboParallel([
      { id: "critical", critical: true, run: async () => { started.push("critical"); throw new Error("fail"); } },
      { id: "pending", run: async () => { started.push("pending"); return true; } },
    ], { maxConcurrency: 1, failFast: true });
    expect(results[0]?.status).toBe("rejected");
    expect(results[1]?.status).toBe("skipped");
    expect(started).toEqual(["critical"]);
  });
});
