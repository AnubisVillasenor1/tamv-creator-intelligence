const MAX_BEARER_TOKEN_LENGTH = 8192;

const SUPABASE_USER_ID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

/** Validate untrusted JSON from the identity provider before property access. */
export function isValidSupabaseIdentityPayload(value: unknown): value is { id: string } {
  return value !== null
    && typeof value === "object"
    && !Array.isArray(value)
    && "id" in value
    && typeof value.id === "string"
    && SUPABASE_USER_ID_PATTERN.test(value.id);
}

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


/**
 * Reads a response body with a hard UTF-8 byte ceiling. Use for all remote
 * providers, including identity and persistence services; Content-Length is
 * advisory and never substitutes for counting streamed bytes.
 */
export async function readBoundedResponseText(
  response: Response,
  maxBytes: number,
): Promise<string> {
  if (!Number.isSafeInteger(maxBytes) || maxBytes < 1) {
    throw new Error("Invalid response size limit");
  }
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
        await reader.cancel("Response body exceeds configured size limit").catch(() => undefined);
        throw new Error("Response body exceeds configured size limit");
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
