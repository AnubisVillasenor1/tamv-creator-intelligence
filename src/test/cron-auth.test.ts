import { afterEach, describe, expect, it, vi } from "vitest";
import { authenticateCronRequest } from "../integrations/supabase/cron-auth";

const CURRENT_SECRET = "current-secret-" + "a".repeat(48);
const PREVIOUS_SECRET = "previous-secret-" + "b".repeat(48);

function request(authorization?: string): Request {
  return new Request("https://example.test/api/cron/run", {
    method: "POST",
    headers: authorization ? { authorization } : {},
  });
}

afterEach(() => {
  vi.unstubAllEnvs();
});

describe("authenticateCronRequest", () => {
  it("fails closed when the required cron secret is absent", async () => {
    vi.stubEnv("LOVABLE_CRON_SECRET", "");
    vi.stubEnv("LOVABLE_CRON_SECRET_PREVIOUS", "");
    const response = await authenticateCronRequest(request("Bearer " + CURRENT_SECRET));
    expect(response?.status).toBe(500);
    expect(response?.headers.get("cache-control")).toContain("no-store");
    expect(response?.headers.get("x-content-type-options")).toBe("nosniff");
  });

  it("rejects absent, malformed, or oversized bearer credentials", async () => {
    vi.stubEnv("LOVABLE_CRON_SECRET", CURRENT_SECRET);
    vi.stubEnv("LOVABLE_CRON_SECRET_PREVIOUS", "");
    expect((await authenticateCronRequest(request()))?.status).toBe(401);
    expect((await authenticateCronRequest(request("Basic " + CURRENT_SECRET)))?.status).toBe(401);
    expect((await authenticateCronRequest(request("Bearer " + "x".repeat(5000))))?.status).toBe(401);
  });

  it("accepts the active secret without returning a response", async () => {
    vi.stubEnv("LOVABLE_CRON_SECRET", CURRENT_SECRET);
    vi.stubEnv("LOVABLE_CRON_SECRET_PREVIOUS", "");
    expect(await authenticateCronRequest(request("Bearer " + CURRENT_SECRET))).toBeNull();
  });

  it("accepts the previous secret during a configured rotation window", async () => {
    vi.stubEnv("LOVABLE_CRON_SECRET", CURRENT_SECRET);
    vi.stubEnv("LOVABLE_CRON_SECRET_PREVIOUS", PREVIOUS_SECRET);
    expect(await authenticateCronRequest(request("Bearer " + PREVIOUS_SECRET))).toBeNull();
  });

  it("rejects a credential that does not match either secret", async () => {
    vi.stubEnv("LOVABLE_CRON_SECRET", CURRENT_SECRET);
    vi.stubEnv("LOVABLE_CRON_SECRET_PREVIOUS", PREVIOUS_SECRET);
    expect((await authenticateCronRequest(request("Bearer " + "z".repeat(64))))?.status).toBe(401);
  });

  it("rejects weak or whitespace-bearing server secrets as configuration errors", async () => {
    vi.stubEnv("LOVABLE_CRON_SECRET", "too-short");
    vi.stubEnv("LOVABLE_CRON_SECRET_PREVIOUS", "");
    expect((await authenticateCronRequest(request("Bearer too-short")))?.status).toBe(500);

    vi.stubEnv("LOVABLE_CRON_SECRET", CURRENT_SECRET);
    vi.stubEnv("LOVABLE_CRON_SECRET_PREVIOUS", "weak previous");
    expect((await authenticateCronRequest(request("Bearer " + CURRENT_SECRET)))?.status).toBe(500);
  });

  it("accepts case-insensitive Bearer scheme tokens per HTTP authentication syntax", async () => {
    vi.stubEnv("LOVABLE_CRON_SECRET", CURRENT_SECRET);
    vi.stubEnv("LOVABLE_CRON_SECRET_PREVIOUS", "");
    expect(await authenticateCronRequest(request("bEaReR " + CURRENT_SECRET))).toBeNull();
  });
});
