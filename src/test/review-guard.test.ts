import { afterEach, beforeEach, describe, expect, it } from "vitest";
import {
  __resetReviewGuard,
  beginReview,
  checkReviewQuota,
  currentInFlight,
  endReview,
  endReviewWhenSettled,
  REVIEW_DAILY_CAP,
  REVIEW_MAX_IN_FLIGHT,
  ReviewTimeoutError,
  withReviewTimeout,
} from "../lib/review-guard";

beforeEach(() => {
  __resetReviewGuard();
});

afterEach(() => {
  __resetReviewGuard();
});

describe("creator-review runtime guard", () => {
  it("keeps an in-flight slot reserved until timed-out provider work settles", async () => {
    expect(beginReview()).toBe(true);

    let resolveWork!: (value: string) => void;
    const work = new Promise<string>((resolve) => {
      resolveWork = resolve;
    });

    const result = await withReviewTimeout(work, 5).then(
      () => null,
      (error: unknown) => error,
    );
    expect(result).toBeInstanceOf(ReviewTimeoutError);
    const timeout = result as ReviewTimeoutError;
    endReviewWhenSettled(timeout.workSettled);

    expect(currentInFlight()).toBe(1);
    resolveWork("settled");
    await timeout.workSettled;
    await Promise.resolve();
    expect(currentInFlight()).toBe(0);
  });

  it("never admits more concurrent review slots than configured", () => {
    for (let index = 0; index < REVIEW_MAX_IN_FLIGHT; index += 1) {
      expect(beginReview()).toBe(true);
    }
    expect(beginReview()).toBe(false);
    expect(currentInFlight()).toBe(REVIEW_MAX_IN_FLIGHT);

    for (let index = 0; index < REVIEW_MAX_IN_FLIGHT + 2; index += 1) endReview();
    expect(currentInFlight()).toBe(0);
  });

  it("enforces the daily cap even when burst tokens refill", () => {
    const start = Date.UTC(2026, 0, 1, 0, 0, 0);
    for (let index = 0; index < REVIEW_DAILY_CAP; index += 1) {
      const decision = checkReviewQuota("daily-cap-user", start + index * 10 * 60 * 1000);
      expect(decision.allowed).toBe(true);
    }
    const capped = checkReviewQuota("daily-cap-user", start + REVIEW_DAILY_CAP * 10 * 60 * 1000);
    expect(capped.allowed).toBe(false);
    expect(capped.reason).toBe("daily-cap");
  });
});
