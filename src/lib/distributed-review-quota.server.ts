/* global process */
import { createHash } from "node:crypto";
import {
  checkReviewQuota as checkLocalReviewQuota,
  REVIEW_BURST,
  REVIEW_DAILY_CAP,
  REVIEW_REFILL_PER_HOUR,
  type ReviewQuotaDecision,
} from "./review-guard";

const REDIS_TIMEOUT_MS = 2_000;
const REDIS_KEY_TTL_MS = 172_800_000;
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

export interface DistributedReviewQuotaConfig {
  readonly redisRestUrl: string;
  readonly redisRestToken: string;
  readonly keySalt: string;
  readonly fetcher?: typeof fetch;
  readonly now?: () => number;
}

export interface DistributedReviewQuotaResult extends ReviewQuotaDecision {
  readonly source: "redis" | "local-development" | "fail-closed";
}

function denied(reason: "server-busy" = "server-busy"): DistributedReviewQuotaResult {
  return {
    allowed: false,
    reason,
    retryAfterSeconds: 5,
    remainingToday: 0,
    source: "fail-closed",
  };
}

function utcDay(timestamp: number): string {
  return new Date(timestamp).toISOString().slice(0, 10);
}

function parseDecision(value: unknown): ReviewQuotaDecision | null {
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
    remainingToday: Math.max(0, Math.min(REVIEW_DAILY_CAP, Math.floor(Number(remainingToday)))),
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

function isConfigured(config: DistributedReviewQuotaConfig): boolean {
  try {
    return new URL(config.redisRestUrl).protocol === "https:"
      && config.redisRestToken.length > 0
      && config.keySalt.length >= 32;
  } catch {
    return false;
  }
}

/**
 * Local quota is a developer convenience, never a platform fallback.
 * An explicit local/test classification is required and must agree with the
 * absence of Vercel deployment markers. NODE_ENV by itself is not sufficient
 * to authorize an in-memory quota.
 */
export function permitsLocalQuotaFallback(
  env: Record<string, string | undefined> | undefined,
): boolean {
  if (!env) return false;

  const nodeEnv = (env["NODE_ENV"] ?? "").trim().toLowerCase();
  const deploymentEnv = (env["TAMV_DEPLOYMENT_ENV"] ?? "").trim().toLowerCase();
  const hasVercelMarker = Boolean((env["VERCEL"] ?? "").trim())
    || Boolean((env["VERCEL_ENV"] ?? "").trim())
    || Boolean((env["VERCEL_URL"] ?? "").trim());

  if (hasVercelMarker || nodeEnv === "production") return false;

  if (!deploymentEnv) return false;
  return ["local", "development", "test"].includes(deploymentEnv);
}

/**
 * Atomic, cross-instance creator-review quota using Upstash-compatible Redis REST.
 * In production, missing configuration or backend failure denies the request.
 * Process-local fallback is allowed only in non-production environments with no
 * Redis configuration; it is never represented as a distributed decision.
 */
async function checkDistributedReviewQuotaInternal(
  userId: string,
  input: Partial<DistributedReviewQuotaConfig> = {},
): Promise<DistributedReviewQuotaResult> {
  if (!userId || userId.length > 512) return denied();

  const env = typeof process === "undefined" ? undefined : process.env;
  const config: DistributedReviewQuotaConfig = {
    redisRestUrl: input.redisRestUrl ?? env?.["UPSTASH_REDIS_REST_URL"] ?? "",
    redisRestToken: input.redisRestToken ?? env?.["UPSTASH_REDIS_REST_TOKEN"] ?? "",
    keySalt: input.keySalt ?? env?.["TAMV_REVIEW_QUOTA_KEY_SALT"] ?? "",
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
      return { ...checkLocalReviewQuota(userId, config.now?.() ?? Date.now()), source: "local-development" };
    }
    return denied();
  }

  const now = config.now?.() ?? Date.now();
  const actorDigest = createHash("sha256").update(config.keySalt).update(":").update(userId).digest("hex");
  const key = `tamv:review:quota:${actorDigest}`;
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
        String(REVIEW_BURST),
        String(REVIEW_REFILL_PER_HOUR),
        String(REVIEW_DAILY_CAP),
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
  const decision = parseDecision((payload as { result: unknown }).result);
  return decision ? { ...decision, source: "redis" } : denied();
}


/**
 * Fail closed for unexpected errors outside the Redis transport boundary too.
 * Callers reserve a local review slot before awaiting this result; returning a
 * normal denial ensures their existing rejection path releases that slot.
 */
export async function checkDistributedReviewQuota(
  userId: string,
  input: Partial<DistributedReviewQuotaConfig> = {},
): Promise<DistributedReviewQuotaResult> {
  try {
    return await checkDistributedReviewQuotaInternal(userId, input);
  } catch {
    return denied();
  }
}
