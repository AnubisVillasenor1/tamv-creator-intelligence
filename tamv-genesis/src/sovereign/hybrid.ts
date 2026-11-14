/**
 * Hybrid envelope: X25519 key agreement + HKDF-SHA256 + AES-256-GCM.
 *
 * This protects payloads that are deliberately *not* shipped in plaintext
 * (for example, commercial capability packs). It is not DRM: once decrypted,
 * a recipient can copy the plaintext. Its purpose is to keep protected bytes
 * out of the public repository and to make accidental disclosure fail closed.
 */

import { canonicalJson } from "./canonical.ts";
import { base64UrlToBytes, bytesToBase64Url } from "./digest.ts";

export const HYBRID_SCHEMA = "tamv.hybrid-envelope.v1";
export const HYBRID_KDF = "X25519-HKDF-SHA256";
export const HYBRID_AEAD = "AES-256-GCM";
export const HYBRID_INFO = "tamv.hybrid.v1";

export type HybridEnvelope = {
  schema: typeof HYBRID_SCHEMA;
  kdf: typeof HYBRID_KDF;
  aead: typeof HYBRID_AEAD;
  ephemeralPublic: string;
  salt: string;
  iv: string;
  ciphertext: string;
  aadSha256: string;
};

const encoder = new TextEncoder();
const decoder = new TextDecoder();

function subtle(provider?: Crypto): SubtleCrypto {
  const selected = provider ?? globalThis.crypto;
  if (!selected?.subtle) throw new Error("Web Crypto is required for TAMV hybrid envelopes.");
  return selected.subtle;
}

async function sha256Base64Url(value: Uint8Array, provider?: Crypto): Promise<string> {
  const digest = await subtle(provider).digest("SHA-256", value);
  return bytesToBase64Url(new Uint8Array(digest));
}

async function deriveAesKey(
  privateKey: CryptoKey,
  publicKey: CryptoKey,
  salt: Uint8Array,
  provider?: Crypto,
): Promise<CryptoKey> {
  const shared = await subtle(provider).deriveBits({ name: "X25519", public: publicKey }, privateKey, 256);
  const material = await subtle(provider).importKey("raw", shared, "HKDF", false, ["deriveKey"]);
  return subtle(provider).deriveKey(
    { name: "HKDF", hash: "SHA-256", salt, info: encoder.encode(HYBRID_INFO) },
    material,
    { name: "AES-GCM", length: 256 },
    false,
    ["encrypt", "decrypt"],
  );
}

export async function sealHybrid(
  recipientPublicKey: CryptoKey,
  plaintext: Uint8Array,
  aad = "",
  provider?: Crypto,
): Promise<HybridEnvelope> {
  if (recipientPublicKey.algorithm.name !== "X25519") {
    throw new Error("The recipient key must be X25519.");
  }
  const selected = provider ?? globalThis.crypto;
  if (!selected?.getRandomValues) throw new Error("Secure randomness is required for TAMV envelopes.");
  const salt = new Uint8Array(32);
  selected.getRandomValues(salt);
  const iv = new Uint8Array(12);
  selected.getRandomValues(iv);
  const ephemeral = (await subtle(selected).generateKey({ name: "X25519" }, true, [
    "deriveBits",
  ])) as CryptoKeyPair;
  const derived = await deriveAesKey(ephemeral.privateKey, recipientPublicKey, salt, selected);
  const aadBytes = encoder.encode(aad);
  const sealed = await subtle(selected).encrypt(
    { name: "AES-GCM", iv, additionalData: aadBytes, tagLength: 128 },
    derived,
    plaintext,
  );
  const ciphertext = new Uint8Array(sealed);
  const ephemeralPublic = new Uint8Array(await subtle(selected).exportKey("spki", ephemeral.publicKey));
  const envelope: HybridEnvelope = {
    schema: HYBRID_SCHEMA,
    kdf: HYBRID_KDF,
    aead: HYBRID_AEAD,
    ephemeralPublic: bytesToBase64Url(ephemeralPublic),
    salt: bytesToBase64Url(salt),
    iv: bytesToBase64Url(iv),
    ciphertext: bytesToBase64Url(ciphertext),
    aadSha256: await sha256Base64Url(aadBytes, selected),
  };
  return envelope;
}

export async function openHybrid(
  recipientPrivateKey: CryptoKey,
  envelope: HybridEnvelope,
  aad = "",
  provider?: Crypto,
): Promise<Uint8Array> {
  assertEnvelope(envelope);
  if (recipientPrivateKey.algorithm.name !== "X25519") {
    throw new Error("The recipient private key must be X25519.");
  }
  const selected = provider ?? globalThis.crypto;
  const aadBytes = encoder.encode(aad);
  if ((await sha256Base64Url(aadBytes, selected)) !== envelope.aadSha256) {
    throw new Error("The associated data does not match this envelope.");
  }
  const ephemeralPublic = await subtle(selected).importKey(
    "spki",
    base64UrlToBytes(envelope.ephemeralPublic),
    { name: "X25519" },
    false,
    [],
  );
  const salt = base64UrlToBytes(envelope.salt);
  if (salt.byteLength !== 32) throw new Error("The hybrid salt must contain 32 bytes.");
  const iv = base64UrlToBytes(envelope.iv);
  if (iv.byteLength !== 12) throw new Error("The AES-GCM IV must contain 12 bytes.");
  const derived = await deriveAesKey(recipientPrivateKey, ephemeralPublic, salt, selected);
  const plaintext = await subtle(selected).decrypt(
    { name: "AES-GCM", iv, additionalData: aadBytes, tagLength: 128 },
    derived,
    base64UrlToBytes(envelope.ciphertext),
  );
  return new Uint8Array(plaintext);
}

export function assertEnvelope(value: unknown): asserts value is HybridEnvelope {
  if (!value || typeof value !== "object") throw new Error("A hybrid envelope must be an object.");
  const envelope = value as Record<string, unknown>;
  if (
    envelope.schema !== HYBRID_SCHEMA ||
    envelope.kdf !== HYBRID_KDF ||
    envelope.aead !== HYBRID_AEAD ||
    typeof envelope.ephemeralPublic !== "string" ||
    typeof envelope.salt !== "string" ||
    typeof envelope.iv !== "string" ||
    typeof envelope.ciphertext !== "string" ||
    typeof envelope.aadSha256 !== "string"
  ) {
    throw new Error("The hybrid envelope does not match the TAMV contract.");
  }
}

export function envelopeDigestInput(envelope: HybridEnvelope): string {
  return canonicalJson(envelope);
}

export function decodePlaintext(bytes: Uint8Array): string {
  return decoder.decode(bytes);
}
