/**
 * Firma y verifica el manifiesto de gobernanza del paquete con Ed25519.
 *
 * Autocontenido: solo usa node:crypto, node:fs, node:path, node:url y
 * node:process. No importa el núcleo soberano del repositorio de origen.
 *
 * Fail-closed: sin clave no se firma ni se verifica; nunca se fabrica una firma.
 * La clave privada de release se mantiene fuera de Git, logs, frontend y VITE_.
 *
 * Uso:
 *   TAMV_GOVERNANCE_PRIVATE_KEY=/ruta/release.pem \
 *     node --experimental-strip-types scripts/sign-governance-pack.ts --sign
 *   TAMV_GOVERNANCE_PUBLIC_KEY=/ruta/release.pub.pem \
 *     node --experimental-strip-types scripts/sign-governance-pack.ts --verify
 *
 * Las variables de entorno aceptan un PEM inline o la ruta a un archivo PEM.
 */

import { createHash, createPrivateKey, createPublicKey, sign as cryptoSign, verify as cryptoVerify, type KeyObject } from "node:crypto";
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import process from "node:process";

const DOMAIN = "tamv.governance-manifest.ed25519.v1";
const SIG_SCHEMA = "tamv.governance-signature.v1";

const SCRIPT_DIR = dirname(fileURLToPath(import.meta.url));
const PACK_ROOT = resolve(SCRIPT_DIR, "..");
const MANIFEST_PATH = resolve(PACK_ROOT, "governance-manifest.json");
const SIGNATURE_PATH = resolve(PACK_ROOT, "governance-manifest.sig.json");

function canonicalJson(value: unknown): string {
  if (value === null) return "null";
  const kind = typeof value;
  if (kind === "boolean") return value ? "true" : "false";
  if (kind === "number") {
    if (!Number.isFinite(value as number)) {
      throw new Error("El payload canónico no admite números no finitos.");
    }
    return JSON.stringify(value);
  }
  if (kind === "string") return JSON.stringify(value);
  if (Array.isArray(value)) return "[" + value.map(canonicalJson).join(",") + "]";
  if (kind === "object") {
    const prototype = Object.getPrototypeOf(value);
    if (prototype !== Object.prototype && prototype !== null) {
      throw new Error("El payload canónico no admite objetos no planos (Date, Map, Set, RegExp o instancias de clase).");
    }
    const record = value as Record<string, unknown>;
    const keys = Object.keys(record).sort();
    const parts = keys.map((key) => {
      const entry = record[key];
      if (entry === undefined) {
        throw new Error("El payload canónico no admite valores undefined.");
      }
      return JSON.stringify(key) + ":" + canonicalJson(entry);
    });
    return "{" + parts.join(",") + "}";
  }
  throw new Error("Tipo no soportado en el payload canónico: " + kind);
}

function sha256Hex(bytes: Buffer): string {
  return createHash("sha256").update(bytes).digest("hex");
}

function loadPem(envName: string): string {
  const raw = process.env[envName];
  if (!raw || raw.trim().length === 0) {
    throw new Error(`Falta ${envName}. Sin clave la operación se deniega (fail-closed); no se fabrica una firma.`);
  }
  const trimmed = raw.trim();
  if (trimmed.includes("-----BEGIN")) return trimmed;
  if (existsSync(trimmed)) return readFileSync(trimmed, "utf8");
  throw new Error(`${envName} no es un PEM inline ni la ruta a un archivo existente.`);
}

function keyIdFromPublic(publicKey: KeyObject): string {
  const der = publicKey.export({ type: "spki", format: "der" }) as Buffer;
  return sha256Hex(der).slice(0, 16);
}

function readManifest(): { manifest: unknown; canonicalBytes: Buffer; manifestSha256: string } {
  if (!existsSync(MANIFEST_PATH)) {
    throw new Error("No existe governance-manifest.json en la raíz del paquete.");
  }
  const manifest = JSON.parse(readFileSync(MANIFEST_PATH, "utf8")) as unknown;
  const canonicalBytes = Buffer.from(canonicalJson(manifest), "utf8");
  return { manifest, canonicalBytes, manifestSha256: "sha256:" + sha256Hex(canonicalBytes) };
}

function signingBytes(manifest: unknown): Buffer {
  return Buffer.from(canonicalJson({ domain: DOMAIN, manifest }), "utf8");
}

function doSign(): void {
  const { manifest, manifestSha256 } = readManifest();
  const privateKey = createPrivateKey(loadPem("TAMV_GOVERNANCE_PRIVATE_KEY"));
  const publicKey = createPublicKey(privateKey);
  const value = cryptoSign(null, signingBytes(manifest), privateKey).toString("base64");
  const signature = {
    schema: SIG_SCHEMA,
    alg: "Ed25519",
    domain: DOMAIN,
    keyId: keyIdFromPublic(publicKey),
    manifestSha256,
    value,
    signedAt: new Date().toISOString(),
  };
  writeFileSync(SIGNATURE_PATH, JSON.stringify(signature, null, 2) + "\n", "utf8");
  console.log("FIRMADO " + manifestSha256);
  console.log("keyId " + signature.keyId);
  console.log("escrito " + SIGNATURE_PATH);
}

function doVerify(): void {
  const { manifest, manifestSha256 } = readManifest();
  const publicKey = createPublicKey(loadPem("TAMV_GOVERNANCE_PUBLIC_KEY"));
  if (!existsSync(SIGNATURE_PATH)) {
    throw new Error("No existe governance-manifest.sig.json; el manifiesto está sin firmar (UNSIGNED).");
  }
  const signature = JSON.parse(readFileSync(SIGNATURE_PATH, "utf8")) as {
    schema?: string;
    domain?: string;
    manifestSha256?: string;
    value?: string;
  };
  if (signature.domain !== DOMAIN) {
    throw new Error("Dominio de firma distinto; una firma de otro payload no vale aquí.");
  }
  if (signature.manifestSha256 !== manifestSha256) {
    throw new Error("El manifiesto cambió desde la firma (MANIFEST_MISMATCH).");
  }
  if (typeof signature.value !== "string") {
    throw new Error("Firma malformada.");
  }
  const ok = cryptoVerify(null, signingBytes(manifest), publicKey, Buffer.from(signature.value, "base64"));
  if (!ok) {
    throw new Error("Firma Ed25519 inválida para esta clave pública (SIGNATURE_INVALID).");
  }
  console.log("VALIDO " + manifestSha256);
}

function main(): void {
  const argv = process.argv.slice(2);
  const mode = argv.includes("--sign") ? "sign" : argv.includes("--verify") ? "verify" : null;
  if (!mode) {
    console.error("Uso: sign-governance-pack.ts --sign | --verify");
    process.exit(2);
  }
  try {
    if (mode === "sign") doSign();
    else doVerify();
  } catch (error) {
    console.error("DENEGADO " + (error instanceof Error ? error.message : String(error)));
    process.exit(1);
  }
}

main();