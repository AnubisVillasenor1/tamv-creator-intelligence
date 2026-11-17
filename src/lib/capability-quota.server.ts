/* global process */
import { createHash } from "node:crypto";
import { permitsLocalQuotaFallback } from "./distributed-review-quota.server";

/**
 * Per-actor capability quota with the same atomic fixed-day token bucket used
 * by creator review. Production decisions come from Upstash-compatible Redis
 * REST; without configuration or on backend failure the request is denied.
 * The process-local bucket is a development convenience and is always
 * labelled `local-development`, never a distributed decision.
 */

export type QuotaCapability = "audiocore.advanced" | "agent.orchestration";

export interface CapabilityQuotaLimits {
  readonly burst: number;
  readonly refillPerHour: number;
  readonly dailyCap: number;
  readonly maxInFlight: number;
}

export const CAPABILITY_QUOTA_LIMITS: Record<QuotaCapability, CapabilityQuotaLimits> = {
  "audiocore.advanced": { burst: 4, refillPerHour: 6, dailyCap: 30, maxInFlight: 2 },
  "agent.orchestration": { burst: 6, refillPerHour: 12, dailyCap: 60, maxInFlight: 4 },
};

const REDIS_TIMEOUT_MS = 2_000;
const REDIS_KEY_TTL_MS = 172_800_000;
const MAX_TRACKED_ACTORS = 5_000;

const LUA_FIXED_DAY_TOKEN_BUCKET = `
local now = tonumber(ARGV[1])
local day = ARGV[2]
local burst = tonumber(ARGV[3])
local refillPerHour = tonumber(ARGV[4])
local dailyCap = tonumber(ARGV[5])
local storedDay = redis.call('HGET', KEYS[1], 'day')
local tokens = tonumber(redis.call('HGET', KEYS[1], 'tokens'))
local updatedAt = tonumber(redis.call('HGET', KEYS[1], 'updatedAt'))
local usedToday = tonumber(redis.call('HGET', KEYS[1], 'usedToday'))

if not storedDay or storedDay ~= day or not tokens or not updatedAt or not usedToday then
  tokens = burst
  updatedAt = now
  usedToday = 0
else
  local elapsedHours = math.max(0, now - updatedAt) / 3600000
  tokens = math.min(burst, tokens + elapsedHours * refillPerHour)
  updatedAt = now
end

local allowed = 0
local reason = 'ok'
local retryAfter = 0

if usedToday >= dailyCap then
  reason = 'daily-cap'
  retryAfter = math.max(1, math.ceil((86400000 - (now % 86400000)) / 1000))
elseif tokens < 1 then
  reason = 'rate-limited'
  retryAfter = math.max(1, math.ceil(((1 - tokens) / refillPerHour) * 3600))
else
  allowed = 1
  tokens = tokens - 1
  usedToday = usedToday + 1
end

redis.call('HSET', KEYS[1],
  'day', day,
  'tokens', tokens,
  'updatedAt', updatedAt,
  'usedToday', usedToday)
redis.call('PEXPIRE', KEYS[1], tonumber(ARGV[6]))
local remaining = math.max(0, dailyCap - usedToday)
return { allowed, reason, retryAfter, remaining }
`;

export interface CapabilityQuotaConfig {
  readonly redisRestUrl: string;
  readonly redisRestToken: string;
  readonly keySalt: string;
  readonly fetcher?: typeof fetch;
  readonly now?: () => number;
}

export interface CapabilityQuotaDecision {
  readonly allowed: boolean;
  readonly reason: "ok" | "daily-cap" | "rate-limited" | "server-busy";
  readonly retryAfterSeconds: number;
  readonly remainingToday: number;
  readonly source: "redis" | "local-development" | "fail-closed";
}

function denied(): CapabilityQuotaDecision {
  return { allowed: false, reason: "server-busy", retryAfterSeconds: 5, remainingToday: 0, source: "fail-closed" };
}

function utcDay(timestamp: number): string {
  return new Date(timestamp).toISOString().slice(0, 10);
}

function isConfigured(config: CapabilityQuotaConfig): boolean {
  try {
    return new URL(config.redisRestUrl).protocol === "https:"
      && config.redisRestToken.length > 0
      && config.keySalt.length >= 32;
  } catch {
    return false;
  }
}

interface LocalBucket {
  tokens: number;
  updatedAt: number;
  day: string;
  usedToday: number;
}

const localBuckets = new Map<string, LocalBucket>();
const inFlight = new Map<QuotaCapability, number>();

function pruneLocalBuckets(now: number): void {
  for (const [key, bucket] of localBuckets) {
    if (bucket.day !== utcDay(now)) localBuckets.delete(key);
  }
}

function checkLocalBucket(
  capability: QuotaCapability,
  actorRef: string,
  limits: CapabilityQuotaLimits,
  now: number,
): CapabilityQuotaDecision {
  const key = `${capability}|${actorRef}`;
  const day = utcDay(now);
  let bucket = localBuckets.get(key);
  if (!bucket) {
    if (localBuckets.size >= MAX_TRACKED_ACTORS) pruneLocalBuckets(now);
    if (localBuckets.size >= MAX_TRACKED_ACTORS) {
      return { allowed: false, reason: "server-busy", retryAfterSeconds: 60, remainingToday: 0, source: "local-development" };
    }
    bucket = { tokens: limits.burst, updatedAt: now, day, usedToday: 0 };
    localBuckets.set(key, bucket);
  } else if (bucket.day !== day) {
    bucket = { tokens: limits.burst, updatedAt: now, day, usedToday: 0 };
    localBuckets.set(key, bucket);
  } else {
    const elapsedHours = Math.max(0, now - bucket.updatedAt) / 3_600_000;
    bucket.tokens = Math.min(limits.burst, bucket.tokens + elapsedHours * limits.refillPerHour);
    bucket.updatedAt = now;
  }

  if (bucket.usedToday >= limits.dailyCap) {
    return { allowed: false, reason: "daily-cap", retryAfterSeconds: 3600, remainingToday: 0, source: "local-development" };
  }
  if (bucket.tokens < 1) {
    const seconds = Math.ceil(((1 - bucket.tokens) / limits.refillPerHour) * 3600);
    return {
      allowed: false,
      reason: "rate-limited",
      retryAfterSeconds: Math.max(1, seconds),
      remainingToday: limits.dailyCap - bucket.usedToday,
      source: "local-development",
    };
  }
  bucket.tokens -= 1;
  bucket.usedToday += 1;
  return {
    allowed: true,
    reason: "ok",
    retryAfterSeconds: 0,
    remainingToday: limits.dailyCap - bucket.usedToday,
    source: "local-development",
  };
}

function parseDecision(value: unknown, limits: CapabilityQuotaLimits): Omit<CapabilityQuotaDecision, "source"> | null {
  if (!Array.isArray(value) || value.length !== 4) return null;
  const [allowed, reason, retryAfterSeconds, remainingToday] = value;
  if ((allowed !== 0 && allowed !== 1 && allowed !== false && allowed !== true)
    || !["ok", "daily-cap", "rate-limited"].includes(String(reason))
    || !Number.isFinite(Number(retryAfterSeconds))
    || !Number.isFinite(Number(remainingToday))) return null;

  const isAllowed = allowed === 1 || allowed === true;
  const normalizedReason = String(reason) as "ok" | "daily-cap" | "rate-limited";
  if (isAllowed !== (normalizedReason === "ok")) return null;
  return {
    allowed: isAllowed,
    reason: normalizedReason,
    retryAfterSeconds: Math.max(0, Math.min(86_400, Math.ceil(Number(retryAfterSeconds)))),
    remainingToday: Math.max(0, Math.min(limits.dailyCap, Math.floor(Number(remainingToday)))),
  };
}

async function readBoundedResponseText(response: Response, maxBytes: number): Promise<string> {
  if (!response.body) return "";
  const reader = response.body.getReader();
  const chunks: Uint8Array[] = [];
  let totalBytes = 0;
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      if (!value) continue;
      totalBytes += value.byteLength;
      if (totalBytes > maxBytes) {
        await reader.cancel("Quota response exceeds limit").catch(() => undefined);
        throw new Error("Quota response exceeds limit");
      }
      chunks.push(value);
    }
    const bytes = new Uint8Array(totalBytes);
    let offset = 0;
    for (const chunk of chunks) {
      bytes.set(chunk, offset);
      offset += chunk.byteLength;
    }
    return new TextDecoder("utf-8", { fatal: true }).decode(bytes);
  } catch (error) {
    await reader.cancel().catch(() => undefined);
    throw error;
  } finally {
    reader.releaseLock();
  }
}

async function checkCapabilityQuotaInternal(
  capability: QuotaCapability,
  actorRef: string,
  input: Partial<CapabilityQuotaConfig> = {},
): Promise<CapabilityQuotaDecision> {
  if (!actorRef || actorRef.length > 512) return denied();
  const limits = CAPABILITY_QUOTA_LIMITS[capability];

  const env = typeof process === "undefined" ? undefined : process.env;
  const config: CapabilityQuotaConfig = {
    redisRestUrl: input.redisRestUrl ?? env?.["UPSTASH_REDIS_REST_URL"] ?? "",
    redisRestToken: input.redisRestToken ?? env?.["UPSTASH_REDIS_REST_TOKEN"] ?? "",
    keySalt: input.keySalt ?? env?.["TAMV_CAPABILITY_QUOTA_KEY_SALT"] ?? "",
    ...(input.fetcher ? { fetcher: input.fetcher } : {}),
    ...(input.now ? { now: input.now } : {}),
  };

  if (!isConfigured(config)) {
    if (
      permitsLocalQuotaFallback(env)
      && !config.redisRestUrl
      && !config.redisRestToken
      && !config.keySalt
    ) {
      return checkLocalBucket(capability, actorRef, limits, config.now?.() ?? Date.now());
    }
    return denied();
  }

  const now = config.now?.() ?? Date.now();
  const actorDigest = createHash("sha256").update(config.keySalt).update(":").update(actorRef).digest("hex");
  const key = `tamv:capability:quota:${capability}:${actorDigest}`;
  const endpoint = config.redisRestUrl.replace(/\/+$/, "");
  let response: Response;

  try {
    response = await (config.fetcher ?? fetch)(endpoint, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${config.redisRestToken}`,
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: JSON.stringify([
        "EVAL",
        LUA_FIXED_DAY_TOKEN_BUCKET,
        "1",
        key,
        String(now),
        utcDay(now),
        String(limits.burst),
        String(limits.refillPerHour),
        String(limits.dailyCap),
        String(REDIS_KEY_TTL_MS),
      ]),
      cache: "no-store",
      signal: AbortSignal.timeout(REDIS_TIMEOUT_MS),
    });
  } catch {
    return denied();
  }

  if (!response.ok) {
    await response.body?.cancel().catch(() => undefined);
    return denied();
  }

  let payload: unknown;
  try {
    const text = await readBoundedResponseText(response, 4096);
    payload = JSON.parse(text);
  } catch {
    return denied();
  }

  if (!payload || typeof payload !== "object" || !("result" in payload)) return denied();
  const decision = parseDecision((payload as { result: unknown }).result, limits);
  return decision ? { ...decision, source: "redis" } : denied();
}

export async function checkCapabilityQuota(
  capability: QuotaCapability,
  actorRef: string,
  input: Partial<CapabilityQuotaConfig> = {},
): Promise<CapabilityQuotaDecision> {
  try {
    return await checkCapabilityQuotaInternal(capability, actorRef, input);
  } catch {
    return denied();
  }
}

/** Process-local concurrency ceiling; independent of the distributed quota. */
export function acquireCapabilitySlot(capability: QuotaCapability): boolean {
  const current = inFlight.get(capability) ?? 0;
  if (current >= CAPABILITY_QUOTA_LIMITS[capability].maxInFlight) return false;
  inFlight.set(capability, current + 1);
  return true;
}

export function releaseCapabilitySlot(capability: QuotaCapability): void {
  const current = inFlight.get(capability) ?? 0;
  inFlight.set(capability, Math.max(0, current - 1));
}

export function capabilityQuotaResponse(decision: CapabilityQuotaDecision): Response {
  return Response.json(
    {
      error: "Capability quota exceeded or unavailable",
      code: "TAMV_CAPABILITY_QUOTA_DENIED",
      reason: decision.reason,
      quotaSource: decision.source,
      retryAfterSeconds: decision.retryAfterSeconds,
    },
    {
      status: decision.reason === "server-busy" && decision.source === "fail-closed" ? 503 : 429,
      headers: {
        "Cache-Control": "no-store, max-age=0",
        "Retry-After": String(Math.max(1, decision.retryAfterSeconds)),
      },
    },
  );
}