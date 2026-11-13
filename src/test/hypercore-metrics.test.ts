import { beforeEach, describe, expect, it } from "vitest";
import {
  renderPrometheusMetrics,
  resetVelocityMetricsForTests,
  velocityMetrics,
} from "../lib/hypercore-turbo/metrics";

beforeEach(() => {
  resetVelocityMetricsForTests();
});

describe("HyperCore metrics hardening", () => {
  it("bounds each metric to 256 label series and collapses excess cardinality", () => {
    for (let index = 0; index < 1000; index += 1) {
      velocityMetrics.queued({
        capability: "capability-" + index,
        queue: "queue-" + index,
        federation: "federation-" + index,
      });
    }

    const rows = renderPrometheusMetrics()
      .split("\n")
      .filter((line) => line.startsWith("tamv_velocity_jobs_queued_total{"));
    expect(rows).toHaveLength(256);
    expect(rows.some((line) => line.includes('capability="overflow"'))).toBe(true);
  });

  it("keeps distinct label tuples distinct even when values contain separators", () => {
    velocityMetrics.queued({
      capability: "alpha,federation=beta",
      federation: "gamma",
      queue: "queue",
    });
    velocityMetrics.queued({
      capability: "alpha",
      federation: "beta,federation=gamma",
      queue: "queue",
    });

    const rows = renderPrometheusMetrics()
      .split("\n")
      .filter((line) => line.startsWith("tamv_velocity_jobs_queued_total{"));
    expect(rows).toHaveLength(2);
  });

  it("escapes line breaks, carriage returns, tabs, quotes and backslashes in labels", () => {
    velocityMetrics.queued({
      capability: "creator.review",
      queue: 'q\\\r\n"\t',
      federation: "test",
    });
    const output = renderPrometheusMetrics();
    expect(output).not.toContain("\r");
    expect(output).toContain("\\r");
    expect(output).toContain("\\n");
    expect(output).toContain("\\t");
    expect(output).toContain('\\"');
    expect(output).toContain("\\\\");
  });
});
