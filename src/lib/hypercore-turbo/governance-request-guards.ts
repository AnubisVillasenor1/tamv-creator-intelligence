const MAX_BEARER_TOKEN_LENGTH = 8192;

/** Accept application/json, optionally followed by valid media-type parameters. */
export function isJsonContentType(value: string | null): boolean {
  if (!value) return false;
  const mediaType = value.split(";", 1)[0].trim().toLowerCase();
  return mediaType === "application/json";
}

/** Bound auth-header work before forwarding a bearer token to the identity provider. */
export function isBearerTokenWithinLimit(token: string | undefined): boolean {
  return typeof token === "string"
    && token.length > 0
    && token.length <= MAX_BEARER_TOKEN_LENGTH;
}

/**
 * Validate a declared Content-Length without trusting it as the actual body
 * size. A missing header is allowed; the streaming reader remains authoritative.
 */
export function isDeclaredContentLengthWithinLimit(
  value: string | null,
  maxBytes: number,
): boolean {
  if (!Number.isSafeInteger(maxBytes) || maxBytes < 1) return false;
  if (value === null) return true;
  if (!/^(0|[1-9]\d*)$/.test(value)) return false;
  const declared = Number(value);
  return Number.isSafeInteger(declared) && declared <= maxBytes;
}

export type BoundedBodyResult =
  | { readonly ok: true; readonly text: string }
  | { readonly ok: false; readonly reason: "too-large" | "unreadable" };

/**
 * Reads a request body without buffering beyond the configured byte limit.
 * The platform may deliver a single oversized chunk, but this function never
 * retains or decodes more than the accepted limit.
 */
export async function readBoundedRequestBody(
  request: Request,
  maxBytes: number,
): Promise<BoundedBodyResult> {
  if (!Number.isSafeInteger(maxBytes) || maxBytes < 1) {
    return { ok: false, reason: "unreadable" };
  }
  if (!request.body) return { ok: true, text: "" };

  const reader = request.body.getReader();
  const chunks: Uint8Array[] = [];
  let totalBytes = 0;

  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      if (!value) continue;
      totalBytes += value.byteLength;
      if (totalBytes > maxBytes) {
        await reader.cancel("Request body exceeds configured size limit").catch(() => undefined);
        return { ok: false, reason: "too-large" };
      }
      chunks.push(value);
    }
    const bytes = new Uint8Array(totalBytes);
    let offset = 0;
    for (const chunk of chunks) {
      bytes.set(chunk, offset);
      offset += chunk.byteLength;
    }
    return { ok: true, text: new TextDecoder("utf-8", { fatal: true }).decode(bytes) };
  } catch {
    await reader.cancel().catch(() => undefined);
    return { ok: false, reason: "unreadable" };
  } finally {
    reader.releaseLock();
  }
}
