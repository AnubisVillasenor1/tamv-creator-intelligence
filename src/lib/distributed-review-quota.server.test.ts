import { beforeEach, afterEach, describe, expect, it, vi } from "vitest";
import { checkDistributedReviewQuota } from "./distributed-review-quota.server";

const config = {
  redisRestUrl: "https://redis.example.test",
  redisRestToken: "test-token",
  keySalt: "test-salt-that-is-longer-than-thirty-two-characters",
  now: () => Date.parse("2026-11-15T12:00:00.000Z"),
};

describe("distributed creator-review quota", () => {
  beforeEach(() => {
    vi.stubEnv("NODE_ENV", "test");
    vi.stubEnv("UPSTASH_REDIS_REST_URL", "");
    vi.stubEnv("UPSTASH_REDIS_REST_TOKEN", "");
    vi.stubEnv("TAMV_REVIEW_QUOTA_KEY_SALT", "");
  });

  afterEach(() => vi.unstubAllEnvs());

  it("uses an atomic Redis EVAL request and returns the shared decision", async () => {
    const fetcher = vi.fn(async () => new Response(JSON.stringify({
      result: [1, "ok", 0, 39],
    }), { status: 200, headers: { "Content-Type": "application/json" } }));

    const result = await checkDistributedReviewQuota("user-private-id", { ...config, fetcher });

    expect(result).toEqual({
      allowed: true,
      reason: "ok",
      retryAfterSeconds: 0,
      remainingToday: 39,
      source: "redis",
    });
    expect(fetcher).toHaveBeenCalledOnce();
    const [url, init] = fetcher.mock.calls[0];
    expect(url).toBe("https://redis.example.test");
    expect(init?.method).toBe("POST");
    expect(init?.signal).toBeDefined();
    const command = JSON.parse(String(init?.body)) as string[];
    expect(command[0]).toBe("EVAL");
    expect(command[2]).toBe("1");
    expect(command[3]).toMatch(/^tamv:review:quota:[a-f0-9]{64}$/);
    expect(command[3]).not.toContain("user-private-id");
    expect(command[4]).toBe(String(config.now()));
  });

  it("fails closed in production when Redis configuration is absent", async () => {
    vi.stubEnv("NODE_ENV", "production");

    await expect(checkDistributedReviewQuota("user-1")).resolves.toEqual({
      allowed: false,
      reason: "server-busy",
      retryAfterSeconds: 5,
      remainingToday: 0,
      source: "fail-closed",
    });
  });

  it("allows process-local fallback only outside production when Redis is not configured", async () => {
    vi.stubEnv("NODE_ENV", "development");

    const result = await checkDistributedReviewQuota("dev-user", { now: config.now });

    expect(result.allowed).toBe(true);
    expect(result.source).toBe("local-development");
  });

  it("fails closed when Redis transport throws", async () => {
    const fetcher = vi.fn(async () => {
      throw new Error("secret-bearing transport error");
    });

    const result = await checkDistributedReviewQuota("user-1", { ...config, fetcher });

    expect(result).toMatchObject({
      allowed: false,
      reason: "server-busy",
      source: "fail-closed",
    });
    expect(JSON.stringify(result)).not.toContain("secret-bearing");
  });

  it("fails closed on malformed Redis payloads", async () => {
    const fetcher = vi.fn(async () => new Response(JSON.stringify({ result: [1, "maybe", 0, 39] })));
    const result = await checkDistributedReviewQuota("user-1", { ...config, fetcher });

    expect(result.source).toBe("fail-closed");
    expect(result.allowed).toBe(false);
  });

  it("bounds the streamed Redis response before parsing", async () => {
    const body = new ReadableStream<Uint8Array>({
      start(controller) {
        controller.enqueue(new Uint8Array(4097).fill(65));
        controller.close();
      },
    });
    const fetcher = vi.fn(async () => new Response(body, { status: 200 }));
    const result = await checkDistributedReviewQuota("user-1", { ...config, fetcher });

    expect(result.source).toBe("fail-closed");
    expect(result.allowed).toBe(false);
  });

  it("fails closed when Redis returns an HTTP error", async () => {
    const fetcher = vi.fn(async () => new Response("backend unavailable", { status: 503 }));
    const result = await checkDistributedReviewQuota("user-1", { ...config, fetcher });

    expect(result.source).toBe("fail-closed");
    expect(result.allowed).toBe(false);
  });
});
