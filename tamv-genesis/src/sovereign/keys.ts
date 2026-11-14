/**
 * Ed25519 identity and X25519 key transport.
 *
 * The private key never enters the repository. Release tooling reads it from
 * the environment or a file outside Git; the runtime only needs the public
 * half. Signatures are base64url over canonical UTF-8 bytes.
 */

import { bytesToBase64Url, base64UrlToBytes, bytesToHex, sha256Hex } from "./digest.ts";

export type TamvKeyAlgorithm = "Ed25519" | "X25519";

const encoder = new TextEncoder();

function subtle(provider?: Crypto): SubtleCrypto {
  const selected = provider ?? globalThis.crypto;
  if (!selected?.subtle) throw new Error("Web Crypto is required for TAMV key operations.");
  return selected.subtle;
}

function derToPem(der: Uint8Array, label: string): string {
  const body = bytesToBase64Url(der).replace(/-/g, "+").replace(/_/g, "/");
  const lines = body.replace(/(.{64})/g, "$1\n").replace(/\n$/, "").split("\n").join("\n");
  return `-----BEGIN ${label}-----\n${lines}\n-----END ${label}-----`;
}

function pemToDer(pem: string, label: string): Uint8Array {
  const pattern = new RegExp(`-----BEGIN ${label}-----([\\s\\S]*?)-----END ${label}-----`);
  const match = pattern.exec(pem);
  if (!match) throw new Error(`The value is not a ${label} PEM block.`);
  const body = match[1].replace(/\s+/g, "");
  return base64UrlToBytes(body.replace(/\+/g, "-").replace(/\//g, "_"));
}

export async function importEd25519PublicKey(pem: string, provider?: Crypto): Promise<CryptoKey> {
  const key = await subtle(provider).importKey(
    "spki",
    pemToDer(pem, "PUBLIC KEY"),
    { name: "Ed25519" },
    true,
    ["verify"],
  );
  if (key.algorithm.name !== "Ed25519") throw new Error("The supplied public key is not Ed25519.");
  return key;
}

export async function importEd25519PrivateKey(pem: string, provider?: Crypto): Promise<CryptoKey> {
  const key = await subtle(provider).importKey(
    "pkcs8",
    pemToDer(pem, "PRIVATE KEY"),
    { name: "Ed25519" },
    false,
    ["sign"],
  );
  if (key.algorithm.name !== "Ed25519") throw new Error("The supplied private key is not Ed25519.");
  return key;
}

export async function importX25519PublicKey(pem: string, provider?: Crypto): Promise<CryptoKey> {
  const key = await subtle(provider).importKey(
    "spki",
    pemToDer(pem, "PUBLIC KEY"),
    { name: "X25519" },
    true,
    [],
  );
  if (key.algorithm.name !== "X25519") throw new Error("The supplied public key is not X25519.");
  return key;
}

export async function importX25519PrivateKey(pem: string, provider?: Crypto): Promise<CryptoKey> {
  const key = await subtle(provider).importKey(
    "pkcs8",
    pemToDer(pem, "PRIVATE KEY"),
    { name: "X25519" },
    false,
    ["deriveBits"],
  );
  if (key.algorithm.name !== "X25519") throw new Error("The supplied private key is not X25519.");
  return key;
}

export async function exportEd25519PublicKeyPem(key: CryptoKey): Promise<string> {
  const der = new Uint8Array(await subtle().exportKey("spki", key));
  return derToPem(der, "PUBLIC KEY");
}

export async function exportX25519PublicKeyPem(key: CryptoKey): Promise<string> {
  const der = new Uint8Array(await subtle().exportKey("spki", key));
  return derToPem(der, "PUBLIC KEY");
}

export async function exportEd25519PrivateKeyPem(key: CryptoKey): Promise<string> {
  const der = new Uint8Array(await subtle().exportKey("pkcs8", key));
  return derToPem(der, "PRIVATE KEY");
}

export async function exportX25519PrivateKeyPem(key: CryptoKey): Promise<string> {
  const der = new Uint8Array(await subtle().exportKey("pkcs8", key));
  return derToPem(der, "PRIVATE KEY");
}

export async function generateEd25519KeyPair(provider?: Crypto): Promise<CryptoKeyPair> {
  return subtle(provider).generateKey({ name: "Ed25519" }, true, ["sign", "verify"]) as Promise<CryptoKeyPair>;
}

export async function generateX25519KeyPair(provider?: Crypto): Promise<CryptoKeyPair> {
  return subtle(provider).generateKey({ name: "X25519" }, true, ["deriveBits"]) as Promise<CryptoKeyPair>;
}

/** Stable key identifier: SHA-256 over the SPKI DER bytes. */
export async function keyId(publicKey: CryptoKey, provider?: Crypto): Promise<string> {
  const der = new Uint8Array(await subtle(provider).exportKey("spki", publicKey));
  return sha256Hex(der, provider);
}

export async function signEd25519(privateKey: CryptoKey, payload: string, provider?: Crypto): Promise<string> {
  const signature = await subtle(provider).sign("Ed25519", privateKey, encoder.encode(payload));
  return bytesToBase64Url(new Uint8Array(signature));
}

export async function verifyEd25519(
  publicKey: CryptoKey,
  payload: string,
  signature: string,
  provider?: Crypto,
): Promise<boolean> {
  let bytes: Uint8Array;
  try {
    bytes = base64UrlToBytes(signature);
  } catch {
    return false;
  }
  if (bytes.byteLength !== 64) return false;
  return subtle(provider).verify("Ed25519", publicKey, bytes, encoder.encode(payload));
}

/** Display a fingerprint without leaking key material. */
export function formatFingerprint(digest: string): string {
  const hex = digest.startsWith("sha256:") ? digest.slice(7) : digest;
  return hex.toUpperCase().replace(/(.{4})(?=.)/g, "$1 ").trim();
}

export { bytesToHex };
