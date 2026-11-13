import { afterEach, describe, expect, it, vi } from "vitest";
import { authorizeMetricsRequest } from "../lib/hypercore-turbo/metrics-auth";

const TOKEN = "metrics-secret-" + "x".repeat(48);

function request(authorization?: string): Request {
  return new Request("https://example.test/api/tamv/hypercore/metrics", {
    method: "GET",
    headers: authorization ? { authorization } : {},
  });
}

afterEach(() => {
  vi.unstubAllEnvs();
});

describe("metrics endpoint authorization", () => {
  it("fails closed when no strong server-only token is configured", () => {
    for (const configured of ["", "short", "white space " + "x".repeat(40)]) {
      const denied = authorizeMetricsRequest(request("Bearer " + TOKEN), configured);
      expect(denied?.status).toBe(503);
      expect(denied?.headers.get("cache-control")).toContain("no-store");
      expect(denied?.headers.get("x-content-type-options")).toBe("nosniff");
    }
  });

  it("rejects absent, malformed and oversized bearer credentials", () => {
    expect(authorizeMetricsRequest(request(), TOKEN)?.status).toBe(401);
    expect(authorizeMetricsRequest(request("Basic " + TOKEN), TOKEN)?.status).toBe(401);
    expect(authorizeMetricsRequest(request("Bearer " + "x".repeat(5000)), TOKEN)?.status).toBe(401);
  });

  it("accepts the correct token with a case-insensitive Bearer scheme", () => {
    expect(authorizeMetricsRequest(request("bEaReR " + TOKEN), TOKEN)).toBeNull();
  });

  it("rejects a mismatched token without exposing the expected secret", async () => {
    const denied = authorizeMetricsRequest(request("Bearer " + "y".repeat(48)), TOKEN);
    expect(denied?.status).toBe(401);
    expect(await denied?.text()).not.toContain(TOKEN);
    expect(denied?.headers.get("www-authenticate")).toContain("Bearer");
  });

  it("uses server configuration when no explicit token is passed", () => {
    vi.stubEnv("TAMV_METRICS_TOKEN", TOKEN);
    expect(authorizeMetricsRequest(request("Bearer " + TOKEN))).toBeNull();
  });
});
