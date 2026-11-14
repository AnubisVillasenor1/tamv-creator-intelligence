/**
 * Deterministic digests and URL-safe base64 helpers.
 *
 * SHA-256 is used for content addressing because it is available in Web
 * Crypto everywhere and because the seal format is public and verifiable
 * offline. It is not a secret and must never be described as encryption.
 */

export type Sha256Digest = `sha256:${string}`;

const encoder = new TextEncoder();
const HEX_256 = /^[0-9a-f]{64}$/;

function subtle(provider?: Crypto): SubtleCrypto {
  const selected = provider ?? globalThis.crypto;
  if (!selected?.subtle) throw new Error("Web Crypto is required to compute TAMV digests.");
  return selected.subtle;
}

export function bytesToHex(bytes: Uint8Array): string {
  return Array.from(bytes, (byte) => byte.toString(16).padStart(2, "0")).join("");
}

export function hexToBytes(hex: string): Uint8Array {
  if (!/^(?:[0-9a-f]{2})*$/i.test(hex)) throw new Error("Invalid hexadecimal value.");
  const output = new Uint8Array(hex.length / 2);
  for (let index = 0; index < output.length; index += 1) {
    output[index] = Number.parseInt(hex.slice(index * 2, index * 2 + 2), 16);
  }
  return output;
}

export function bytesToBase64Url(bytes: Uint8Array): string {
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
}

export function base64UrlToBytes(value: string): Uint8Array {
  if (typeof value !== "string" || !/^[A-Za-z0-9_-]*$/.test(value)) {
    throw new Error("Invalid base64url value.");
  }
  const padded = value.replace(/-/g, "+").replace(/_/g, "/") + "=".repeat((4 - (value.length % 4)) % 4);
  const binary = atob(padded);
  const output = new Uint8Array(binary.length);
  for (let index = 0; index < binary.length; index += 1) output[index] = binary.charCodeAt(index);
  return output;
}

export async function sha256Hex(input: string | Uint8Array, provider?: Crypto): Promise<Sha256Digest> {
  const bytes = typeof input === "string" ? encoder.encode(input) : input;
  const digest = await subtle(provider).digest("SHA-256", bytes);
  return `sha256:${bytesToHex(new Uint8Array(digest))}`;
}

export function isSha256Digest(value: unknown): value is Sha256Digest {
  return typeof value === "string" && value.startsWith("sha256:") && HEX_256.test(value.slice(7));
}

export async function hmacSha256Hex(secret: string, message: string, provider?: Crypto): Promise<string> {
  if (typeof secret !== "string" || secret.length < 32) throw new Error("HMAC secrets must contain at least 32 characters.");
  const key = await subtle(provider).importKey(
    "raw",
    encoder.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const signature = await subtle(provider).sign("HMAC", key, encoder.encode(message));
  return bytesToHex(new Uint8Array(signature));
}

/** Constant-time comparison for equal-length hex strings. */
export function timingSafeEqualHex(left: string, right: string): boolean {
  if (left.length !== right.length) return false;
  let mismatch = 0;
  for (let index = 0; index < left.length; index += 1) {
    mismatch |= left.charCodeAt(index) ^ right.charCodeAt(index);
  }
  return mismatch === 0;
}
