import { createHash, timingSafeEqual } from "node:crypto";

const MIN_TOKEN_LENGTH = 32;
const MAX_TOKEN_LENGTH = 4096;
const BASE_HEADERS = {
  "Cache-Control": "no-store, max-age=0",
  "Content-Type": "application/json; charset=utf-8",
  "X-Content-Type-Options": "nosniff",
};

function response(status: 401 | 503, code: string, message: string): Response {
  const headers = new Headers(BASE_HEADERS);
  if (status === 401) headers.set("WWW-Authenticate", 'Bearer realm="TAMV metrics"');
  return new Response(JSON.stringify({ code, error: message }), { status, headers });
}

function isStrongToken(value: string | undefined): value is string {
  return typeof value === "string" &&
    value.length >= MIN_TOKEN_LENGTH &&
    value.length <= MAX_TOKEN_LENGTH &&
    !/\s/.test(value);
}

/**
 * Protects operational metrics from anonymous scraping and label-based
 * information disclosure. This function is server-only; never pass the token
 * through a VITE_ variable or into client bundles.
 *
 * An unset/weak token disables the endpoint (503) instead of silently making
 * telemetry public. Valid credentials are compared using fixed-size digests.
 */
export function authorizeMetricsRequest(
  request: Request,
  expectedToken = process.env["TAMV_METRICS_TOKEN"],
): Response | null {
  if (!isStrongToken(expectedToken)) {
    return response(503, "TAMV_METRICS_AUTH_UNAVAILABLE", "Metrics authentication is not configured.");
  }

  const match = /^Bearer ([^\s,]+)$/i.exec(request.headers.get("authorization") ?? "");
  const supplied = match?.[1];
  if (!supplied || supplied.length > MAX_TOKEN_LENGTH) {
    return response(401, "TAMV_METRICS_UNAUTHORIZED", "Unauthorized.");
  }

  const digest = (value: string) => createHash("sha256").update(value, "utf8").digest();
  if (!timingSafeEqual(digest(supplied), digest(expectedToken))) {
    return response(401, "TAMV_METRICS_UNAUTHORIZED", "Unauthorized.");
  }

  return null;
}
