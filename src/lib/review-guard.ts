/**
 * Runtime guard for the creator-review server function.
 *
 * Three controls that the audit found missing:
 *  1. a ceiling on in-flight reviews per process,
 *  2. a per-user token bucket plus a daily cap,
 *  3. a bounded response time so a stalled gateway cannot hold a request open.
 *
 * The counters live in process memory. That is deliberate and documented: it
 * is enough for a single instance and it is honest about not being a durable
 * distributed quota. Moving to Postgres/Redis is gate G2b in the audit plan.
 */

export const REVIEW_TIMEOUT_MS = 45_000;
/** Burst size per user. */
export const REVIEW_BURST = 6;
/** Tokens restored per hour, per user. */
export const REVIEW_REFILL_PER_HOUR = 6;
/** Hard daily ceiling per user, independent of the bucket. */
export const REVIEW_DAILY_CAP = 40;
/** Concurrent reviews allowed per process. */
export const REVIEW_MAX_IN_FLIGHT = 4;

interface Bucket {
  tokens: number;
  updatedAt: number;
  day: string;
  usedToday: number;
}

const buckets = new Map<string, Bucket>();
let inFlight = 0;

export interface ReviewQuotaDecision {
  readonly allowed: boolean;
  readonly reason: "ok" | "daily-cap" | "rate-limited" | "server-busy";
  readonly retryAfterSeconds: number;
  readonly remainingToday: number;
}

function dayKey(now: number): string {
  return new Date(now).toISOString().slice(0, 10);
}

export function checkReviewQuota(userId: string, now = Date.now()): ReviewQuotaDecision {
  if (!userId) {
    return { allowed: false, reason: "rate-limited", retryAfterSeconds: 60, remainingToday: 0 };
  }
  if (inFlight >= REVIEW_MAX_IN_FLIGHT) {
    return { allowed: false, reason: "server-busy", retryAfterSeconds: 5, remainingToday: 0 };
  }

  const day = dayKey(now);
  let bucket = buckets.get(userId);
  if (!bucket || bucket.day !== day) {
    bucket = { tokens: REVIEW_BURST, updatedAt: now, day, usedToday: 0 };
    buckets.set(userId, bucket);
  } else {
    const elapsedHours = Math.max(0, now - bucket.updatedAt) / 3_600_000;
    bucket.tokens = Math.min(REVIEW_BURST, bucket.tokens + elapsedHours * REVIEW_REFILL_PER_HOUR);
    bucket.updatedAt = now;
  }

  if (bucket.usedToday >= REVIEW_DAILY_CAP) {
    return { allowed: false, reason: "daily-cap", retryAfterSeconds: 3600, remainingToday: 0 };
  }
  if (bucket.tokens < 1) {
    const seconds = Math.ceil(((1 - bucket.tokens) / REVIEW_REFILL_PER_HOUR) * 3600);
    return { allowed: false, reason: "rate-limited", retryAfterSeconds: seconds, remainingToday: REVIEW_DAILY_CAP - bucket.usedToday };
  }

  bucket.tokens -= 1;
  bucket.usedToday += 1;
  prune(now);
  return {
    allowed: true,
    reason: "ok",
    retryAfterSeconds: 0,
    remainingToday: REVIEW_DAILY_CAP - bucket.usedToday,
  };
}

export function beginReview(): boolean {
  if (inFlight >= REVIEW_MAX_IN_FLIGHT) return false;
  inFlight += 1;
  return true;
}

export function endReview(): void {
  inFlight = Math.max(0, inFlight - 1);
}

export function currentInFlight(): number {
  return inFlight;
}

/** Race the gateway against a hard deadline. The response is bounded, not cancelled. */
export async function withReviewTimeout<T>(work: Promise<T>, timeoutMs = REVIEW_TIMEOUT_MS): Promise<T> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  try {
    return await Promise.race([
      work,
      new Promise<never>((_, reject) => {
        timer = setTimeout(() => reject(new ReviewTimeoutError(timeoutMs)), timeoutMs);
      }),
    ]);
  } finally {
    if (timer !== undefined) clearTimeout(timer);
  }
}

export class ReviewTimeoutError extends Error {
  readonly code = "TAMV_REVIEW_TIMEOUT";
  constructor(timeoutMs: number) {
    super(`La revisión excedió ${Math.round(timeoutMs / 1000)} s.`);
    this.name = "ReviewTimeoutError";
  }
}

function prune(now: number): void {
  if (buckets.size < 5_000) return;
  for (const [key, bucket] of buckets) {
    if (now - bucket.updatedAt > 86_400_000) buckets.delete(key);
  }
}

/** Test helper. Not exported from the package surface. */
export function __resetReviewGuard(): void {
  buckets.clear();
  inFlight = 0;
}
