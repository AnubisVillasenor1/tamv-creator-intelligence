import { beforeEach, describe, expect, it } from "vitest";
import { evaluateTamvRuntime } from "../lib/hypercore-turbo/runtime";
import { resetVelocityMetricsForTests, renderPrometheusMetrics, velocityMetrics } from "../lib/hypercore-turbo/metrics";

describe("HyperCore unified runtime", () => {
  it("fails closed while the official release signature or certification is missing", async () => {
    const result = await evaluateTamvRuntime({
      userId: "test-user", federationId: "test-federation",
      capability: "agent.orchestration", consentGranted: true,
    });
    expect(result.allowed).toBe(false);
    expect(result.httpStatus).toBe(403);
    expect(["TAMV_ATTRIBUTION_INTEGRITY_FAILED", "TAMV_PROVENANCE_UNVERIFIED"]).toContain(result.code);
  });
});

describe("Velocity Core metrics", () => {
  beforeEach(() => resetVelocityMetricsForTests());
  it("exposes bounded-label counters, gauges and histogram samples", () => {
    const labels = { capability: "music.generation", queue: "audio", federation: "test" };
    velocityMetrics.queued(labels);
    velocityMetrics.started(labels);
    velocityMetrics.observeDuration(labels, 0.25);
    velocityMetrics.observeQueueLatency(labels, 0.1);
    velocityMetrics.completed(labels);
    const exposition = renderPrometheusMetrics();
    expect(exposition).toContain("tamv_velocity_jobs_queued_total");
    expect(exposition).toContain("tamv_velocity_jobs_active");
    expect(exposition).toContain("tamv_velocity_job_duration_seconds_bucket");
    expect(exposition).toContain("tamv_velocity_queue_latency_seconds_count");
  });
  it("does not allow active gauge to go below zero after repeated completion", () => {
    const labels = { capability: "voice.generation", queue: "voice", federation: "test" };
    velocityMetrics.completed(labels);
    expect(renderPrometheusMetrics()).toContain('tamv_velocity_jobs_active{capability="voice.generation",queue="voice",federation="test"} 0');
  });
});
