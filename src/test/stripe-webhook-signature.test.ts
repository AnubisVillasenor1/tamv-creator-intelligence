import { createHmac } from "node:crypto";
import { describe, expect, it } from "vitest";
import { verifyStripeWebhookSignature } from "../lib/stripe-webhook-signature.server";

const secret = "whsec_test_secret_not_for_production";

function signature(body: string, timestamp: number, signingSecret = secret): string {
  const digest = createHmac("sha256", signingSecret).update(`${timestamp}.${body}`, "utf8").digest("hex");
  return `t=${timestamp},v1=${digest}`;
}

describe("verifyStripeWebhookSignature", () => {
  const now = 1_800_000_000;
  const body = JSON.stringify({ id: "evt_123ABC", object: "event", type: "checkout.session.completed" });

  it("accepts an authentic signature for the exact raw body", () => {
    expect(verifyStripeWebhookSignature(body, signature(body, now), secret, now)).toEqual({ ok: true, timestamp: now });
  });

  it("rejects tampered bodies", () => {
    expect(verifyStripeWebhookSignature(body + " ", signature(body, now), secret, now)).toEqual({ ok: false, reason: "invalid" });
  });

  it("rejects signatures created with another secret", () => {
    expect(verifyStripeWebhookSignature(body, signature(body, now, "wrong-secret"), secret, now)).toEqual({ ok: false, reason: "invalid" });
  });

  it("rejects timestamps outside the tolerance window", () => {
    expect(verifyStripeWebhookSignature(body, signature(body, now - 301), secret, now)).toEqual({ ok: false, reason: "stale" });
  });

  it("rejects missing or malformed signature headers", () => {
    expect(verifyStripeWebhookSignature(body, null, secret, now)).toEqual({ ok: false, reason: "missing" });
    expect(verifyStripeWebhookSignature(body, "t=abc,v1=bad", secret, now)).toEqual({ ok: false, reason: "malformed" });
  });

  it("accepts any valid v1 among rotated signature values", () => {
    expect(verifyStripeWebhookSignature(body, `t=${now},v1=${"0".repeat(64)},${signature(body, now).split(",")[1]}`, secret, now)).toEqual({ ok: true, timestamp: now });
  });
});
