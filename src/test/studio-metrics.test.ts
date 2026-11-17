import { describe, expect, it } from "vitest";
import { handleStudioMetrics, studioMetrics } from "@/lib/studio-metrics.server";
import { AudioMetricsRegistry } from "../../tamv-genesis/src/audio/metrics.ts";
import { handleAgentOrchestration } from "@/lib/agent-orchestration.server";

const token = "metrics-test-only-".repeat(3);
const certify = async () => null;
const request = () =>
  new Request("http://localhost/api/studio/metrics", {
    headers: { Authorization: `Bearer ${token}` },
  });

describe("operator metrics", () => {
  it("fails closed without configuration", async () => {
    expect((await handleStudioMetrics(request(), { token: "", certify })).status).toBe(503);
  });
  it("rejects normal user tokens and oversized credentials", async () => {
    for (const supplied of ["user-jwt", "x".repeat(9000)]) {
      const response = await handleStudioMetrics(
        new Request(request(), { headers: { Authorization: `Bearer ${supplied}` } }),
        { token, certify },
      );
      expect(response.status).toBe(401);
      expect(await response.text()).not.toContain(token);
    }
  });
  it("preserves the certification gate", async () => {
    expect(
      (
        await handleStudioMetrics(request(), {
          token,
          certify: async () => new Response(null, { status: 403 }),
        })
      ).status,
    ).toBe(403);
  });
  it("exports only observations and labels process-local scope", async () => {
    const registry = new AudioMetricsRegistry();
    const empty = await handleStudioMetrics(request(), { token, certify, registry });
    expect(await empty.text()).toBe("");
    registry.inc("tamv_audio_jobs_succeeded_total");
    const response = await handleStudioMetrics(request(), { token, certify, registry });
    expect(response.headers.get("Content-Type")).toContain("version=0.0.4");
    expect(response.headers.get("Cache-Control")).toContain("no-store");
    expect(response.headers.get("X-TAMV-Metrics-Scope")).toBe("process-local");
    expect(await response.text()).toContain("tamv_audio_jobs_succeeded_total 1");
  });
  it("records real agent executions in the shared registry without input labels", async () => {
    const before = studioMetrics.render();
    const result = await handleAgentOrchestration(
      new Request("http://localhost/api/agent", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          schema: "tamv.agent.plan.v1",
          consent: { granted: true, subject: "private-creator", scope: "agent.orchestration" },
          steps: [{ id: "digest", tool: "digest.sha256", input: { text: "private-prompt" } }],
        }),
      }),
      {
        certify,
        authenticate: async () => ({ actorRef: "actor-private" }),
        quotaConfig: {
          redisRestUrl: "https://quota.example",
          redisRestToken: "test",
          keySalt: "s".repeat(32),
          fetcher: async () => Response.json({ result: [1, "ok", 0, 59] }),
        },
      },
    );
    expect(result.status).toBe(200);
    const after = studioMetrics.render();
    expect(after).not.toBe(before);
    expect(after).toContain('tamv_agent_plans_total{status="succeeded"}');
    expect(after).not.toMatch(/private-prompt|private-creator|actor-private/);
  });
});
