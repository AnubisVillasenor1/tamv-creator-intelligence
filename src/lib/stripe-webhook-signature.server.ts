import { createHmac, timingSafeEqual } from "node:crypto";

export const STRIPE_WEBHOOK_TOLERANCE_SECONDS = 300;
export const STRIPE_WEBHOOK_MAX_BODY_BYTES = 256 * 1024;

export type StripeSignatureResult =
  | { ok: true; timestamp: number }
  | { ok: false; reason: "missing" | "malformed" | "stale" | "invalid" };

function safeHex(value: string): Buffer | null {
  if (!/^[a-f0-9]{64}$/i.test(value)) return null;
  return Buffer.from(value, "hex");
}

/** Verify Stripe's timestamped HMAC over the exact raw request body. */
export function verifyStripeWebhookSignature(
  rawBody: string,
  signatureHeader: string | null,
  secret: string,
  nowSeconds = Math.floor(Date.now() / 1000),
  toleranceSeconds = STRIPE_WEBHOOK_TOLERANCE_SECONDS,
): StripeSignatureResult {
  if (!signatureHeader || !secret) return { ok: false, reason: "missing" };
  if (!Number.isSafeInteger(nowSeconds) || !Number.isSafeInteger(toleranceSeconds) || toleranceSeconds < 1) {
    return { ok: false, reason: "malformed" };
  }

  const parts = signatureHeader.split(",").map((part) => part.trim().split("=", 2));
  const timestamps = parts.filter(([key]) => key === "t").map(([, value]) => value);
  const signatures = parts.filter(([key]) => key === "v1").map(([, value]) => value);
  if (timestamps.length !== 1 || !/^[0-9]{1,12}$/.test(timestamps[0] ?? "") || signatures.length < 1) {
    return { ok: false, reason: "malformed" };
  }

  const timestamp = Number(timestamps[0]);
  if (!Number.isSafeInteger(timestamp) || Math.abs(nowSeconds - timestamp) > toleranceSeconds) {
    return { ok: false, reason: "stale" };
  }

  const expected = createHmac("sha256", secret).update(`${timestamp}.${rawBody}`, "utf8").digest();
  const valid = signatures.some((signature) => {
    const supplied = safeHex(signature ?? "");
    return supplied !== null && supplied.length === expected.length && timingSafeEqual(supplied, expected);
  });
  return valid ? { ok: true, timestamp } : { ok: false, reason: "invalid" };
}
