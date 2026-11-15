import { describe, expect, it, beforeEach } from "vitest";
import {
  __resetReviewGuard,
  beginReview,
  checkReviewQuota,
  currentInFlight,
  endReview,
  endReviewWhenSettled,
  REVIEW_BURST,
  REVIEW_DAILY_CAP,
  REVIEW_MAX_IN_FLIGHT,
  REVIEW_MAX_TRACKED_USERS,
  REVIEW_REFILL_PER_HOUR,
  ReviewTimeoutError,
  withReviewTimeout,
} from "./review-guard";

describe("creator review runtime guard", () => {
  beforeEach(() => __resetReviewGuard());

  it("enforces the burst bucket and reports a bounded retry interval", () => {
    const now = Date.parse("2026-11-15T12:00:00.000Z");
    for (let index = 0; index < REVIEW_BURST; index += 1) {
      expect(checkReviewQuota("user-1", now).allowed).toBe(true);
    }
    const denied = checkReviewQuota("user-1", now);
    expect(denied.allowed).toBe(false);
    expect(denied.reason).toBe("rate-limited");
    expect(denied.retryAfterSeconds).toBe(Math.ceil(3600 / REVIEW_REFILL_PER_HOUR));
  });

  it("refills tokens without exceeding the configured burst", () => {
    const now = Date.parse("2026-11-15T12:00:00.000Z");
    for (let index = 0; index < REVIEW_BURST; index += 1) checkReviewQuota("user-1", now);
    expect(checkReviewQuota("user-1", now + 3_600_000).allowed).toBe(true);
    for (let index = 0; index < REVIEW_BURST - 1; index += 1) {
      expect(checkReviewQuota("user-1", now + 3_600_000).allowed).toBe(true);
    }
    expect(checkReviewQuota("user-1", now + 3_600_000).reason).toBe("rate-limited");
  });

  it("enforces the daily cap independently of the token bucket", () => {
    const start = Date.parse("2026-11-15T00:00:00.000Z");
    for (let index = 0; index < REVIEW_DAILY_CAP; index += 1) {
      const now = start + index * 10 * 60_000;
      expect(checkReviewQuota("user-1", now).allowed).toBe(true);
    }
    const denied = checkReviewQuota("user-1", start + REVIEW_DAILY_CAP * 10 * 60_000);
    expect(denied.allowed).toBe(false);
    expect(denied.reason).toBe("daily-cap");
    expect(denied.remainingToday).toBe(0);
  });

  it("bounds memory growth from unique user identifiers", () => {
    const now = Date.parse("2026-11-15T12:00:00.000Z");
    for (let index = 0; index < REVIEW_MAX_TRACKED_USERS; index += 1) {
      expect(checkReviewQuota(`user-${index}`, now).allowed).toBe(true);
    }
    const denied = checkReviewQuota("overflow-user", now);
    expect(denied.allowed).toBe(false);
    expect(denied.reason).toBe("server-busy");
    expect(denied.retryAfterSeconds).toBe(60);
  });

  it("enforces the process concurrency ceiling and never underflows", () => {
    for (let index = 0; index < REVIEW_MAX_IN_FLIGHT; index += 1) expect(beginReview()).toBe(true);
    expect(beginReview()).toBe(false);
    expect(currentInFlight()).toBe(REVIEW_MAX_IN_FLIGHT);
    for (let index = 0; index < REVIEW_MAX_IN_FLIGHT + 2; index += 1) endReview();
    expect(currentInFlight()).toBe(0);
  });

  it("keeps the concurrency slot reserved until timed-out upstream work settles", async () => {
    let settle!: () => void;
    const upstream = new Promise<void>((resolve) => { settle = resolve; });
    let error: unknown;
    try {
      await withReviewTimeout(upstream, 5);
    } catch (caught) {
      error = caught;
    }
    expect(error).toBeInstanceOf(ReviewTimeoutError);
    const timeout = error as ReviewTimeoutError;
    expect(beginReview()).toBe(true);
    endReviewWhenSettled(timeout.workSettled);
    expect(currentInFlight()).toBe(1);
    settle();
    await timeout.workSettled;
    await Promise.resolve();
    expect(currentInFlight()).toBe(0);
  });
});
