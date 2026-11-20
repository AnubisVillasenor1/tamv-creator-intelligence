/**
 * Public trust anchors. A key id is the SHA-256 of the Ed25519 SPKI DER bytes;
 * it is public data, never a secret. Pinning it prevents a fork from swapping
 * the verification key and presenting its own signature as canonical.
 */

const KEY_ID_HEX = /^[a-f0-9]{64}$/;

export function normalizeKeyId(value: unknown): string {
  return String(value ?? "")
    .trim()
    .toLowerCase()
    .replace(/^sha256:/, "");
}

export function isValidKeyId(value: unknown): boolean {
  return KEY_ID_HEX.test(normalizeKeyId(value));
}

export function decodeSpkiPem(pem: string): Uint8Array<ArrayBuffer> {
  const normalized = String(pem ?? "").replace(/\\n/g, "\n").trim();
  const match = normalized.match(/-----BEGIN PUBLIC KEY-----([\s\S]+?)-----END PUBLIC KEY-----/);
  if (!match?.[1]) throw new Error("Se requiere una clave pública PEM SPKI.");
  const binary = atob(match[1].replace(/\s/g, ""));
  return Uint8Array.from(binary, (character) => character.charCodeAt(0));
}

export async function spkiKeyId(pem: string, provider: Crypto = globalThis.crypto): Promise<string> {
  if (!provider?.subtle) throw new Error("Web Crypto no está disponible para derivar el ancla.");
  const digest = await provider.subtle.digest("SHA-256", decodeSpkiPem(pem));
  return Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, "0")).join("");
}

export function configuredAttributionKeyId(): string {
  const fromServer =
    typeof process !== "undefined"
      ? process.env?.["TAMV_ATTRIBUTION_EXPECTED_KEY_ID"]
      : undefined;
  const fromClient = import.meta.env?.["VITE_TAMV_ATTRIBUTION_EXPECTED_KEY_ID"];
  return normalizeKeyId(fromServer ?? fromClient);
}
