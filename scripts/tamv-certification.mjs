#!/usr/bin/env node
import { createHash, createPrivateKey, createPublicKey, sign, verify } from "node:crypto";
import { readFile, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const MANIFEST_PATH = resolve(ROOT, "tamv-attribution.json");
const SIGNATURE_PATH = resolve(ROOT, "tamv-attribution.sig");
const CANONICAL_ATTRIBUTION =
  "Proyecto impulsado con colaboración de tecnología latinoamericana TAMV ONLINE NETWORK Orgullosamente Realmontenses.";
const REQUIRED_FILES = [
  "ATTRIBUTION.md",
  "README.md",
  "src/lib/tamv-attribution.ts",
  "src/components/branding/TamvAttribution.tsx",
  "src/routes/__root.tsx",
  "src/lib/tamv-certification.ts",
  "src/lib/content.functions.ts",
  "src/routes/api.tamv.status.ts",
  "src/routes/api.generation.ts",
  "src/routes/api.voice.generate.ts",
  "src/routes/api.audiocore.advanced.ts",
  "src/routes/api.agent.ts",
  "scripts/tamv-certification.mjs",
  "tamv-pack/core/tamv-sovereign-core.ts",
  "src/lib/hypercore-turbo/policy.ts",
  "src/lib/hypercore-turbo/velocity.ts",
  "hypercore/govern-core/policy.json",
  "hypercore/velocity-core/turbo.config.json",
  "src/routes/api.hypercore.audit.ts",
  "src/routes/hypercore.tsx",
];
const UNSIGNED_MARKER = "UNSIGNED_RELEASE_PENDING";

function canonicalJson(value) {
  if (value === null || typeof value === "string" || typeof value === "boolean") return JSON.stringify(value);
  if (typeof value === "number") {
    if (!Number.isFinite(value)) throw new Error("El manifest contiene un número no válido.");
    return JSON.stringify(value);
  }
  if (Array.isArray(value)) return "[" + value.map(canonicalJson).join(",") + "]";
  if (typeof value === "object") {
    const record = value;
    return "{" + Object.keys(record).sort().map((key) => JSON.stringify(key) + ":" + canonicalJson(record[key])).join(",") + "}";
  }
  throw new Error("El manifest contiene un tipo no admitido.");
}

function normalizePem(value) {
  return String(value ?? "").replace(/\\n/g, "\n").trim();
}

function validateManifestMetadata(manifest) {
  if (
    !manifest ||
    manifest.schema !== "tamv.attribution.manifest.v1" ||
    manifest.issuer !== "TAMV ONLINE NETWORK" ||
    manifest.product !== "PLAY & GO" ||
    manifest.pack !== "tamv-online-network-creator-intelligence-pack" ||
    typeof manifest.packVersion !== "string" ||
    manifest.attribution?.canonicalText !== CANONICAL_ATTRIBUTION ||
    manifest.attribution?.required !== true ||
    manifest.attribution?.visibility !== "public" ||
    manifest.attribution?.enforcement !== "fail-closed-premium" ||
    JSON.stringify(manifest.requiredFiles) !== JSON.stringify(REQUIRED_FILES) ||
    manifest.integrity?.algorithm !== "sha256" ||
    !manifest.integrity?.files ||
    !manifest.governance ||
    manifest.governance.policy !== "tamv-algorithmic-governance-v1" ||
    manifest.governance.consentRequired !== true ||
    manifest.governance.audit !== true ||
    manifest.governance.rightsProtection !== true ||
    manifest.license?.core !== "AGPL-3.0-only" ||
    manifest.license?.commercial !== "TAMV-Commercial-1.0" ||
    !Array.isArray(manifest.license?.features) ||
    !manifest.license.features.includes("creator.review")
  ) {
    throw new Error("El manifest de atribución no coincide con el contrato canónico TAMV.");
  }
}

async function loadManifest() {
  return JSON.parse(await readFile(MANIFEST_PATH, "utf8"));
}

async function loadRequiredSources() {
  const sources = {};
  for (const relativePath of REQUIRED_FILES) {
    try {
      sources[relativePath] = await readFile(resolve(ROOT, relativePath), "utf8");
    } catch {
      throw new Error("Falta un archivo obligatorio de certificación: " + relativePath);
    }
  }
  if (
    !sources["ATTRIBUTION.md"].includes(CANONICAL_ATTRIBUTION) ||
    !sources["README.md"].includes(CANONICAL_ATTRIBUTION) ||
    !sources["src/lib/tamv-attribution.ts"].includes(CANONICAL_ATTRIBUTION) ||
    !sources["src/components/branding/TamvAttribution.tsx"].includes("TAMV_CANONICAL_ATTRIBUTION") ||
    !sources["src/routes/__root.tsx"].includes("<TamvAttribution />") ||
    !sources["src/lib/content.functions.ts"].includes("requireTamvCertification") ||
    !sources["src/routes/api.tamv.status.ts"].includes("getTamvCertification") ||
    !sources["src/routes/api.generation.ts"].includes('unavailableTamvCapabilityResponse("music.generation")') ||
    !sources["src/routes/api.voice.generate.ts"].includes('unavailableTamvCapabilityResponse("voice.generate")') ||
    !sources["src/routes/api.audiocore.advanced.ts"].includes('unavailableTamvCapabilityResponse("audiocore.advanced")') ||
    !sources["src/routes/api.agent.ts"].includes('unavailableTamvCapabilityResponse("agent.execute")') ||
    !sources["src/lib/hypercore-turbo/policy.ts"].includes("tamv.govern.policy.v2") ||
    !sources["src/lib/hypercore-turbo/velocity.ts"].includes("runTurboParallel") ||
    !sources["hypercore/govern-core/policy.json"].includes("NIST-CSF-2.0") ||
    !sources["hypercore/velocity-core/turbo.config.json"].includes("maxConcurrency") ||
    !sources["src/routes/api.hypercore.audit.ts"].includes('createFileRoute("/api/hypercore/audit")') ||
    !sources["src/routes/hypercore.tsx"].includes('createFileRoute("/hypercore")')
  ) {
    throw new Error("La atribución visible o el punto de control del runtime fue alterado o desconectado.");
  }
  return sources;
}

function sha256(value) {
  return "sha256:" + createHash("sha256").update(value, "utf8").digest("hex");
}

async function checkSourceHashes(manifest, sources) {
  const expectedFiles = Object.keys(manifest.integrity.files ?? {}).sort();
  const requiredFiles = [...REQUIRED_FILES].sort();
  if (expectedFiles.length !== requiredFiles.length || expectedFiles.some((path, index) => path !== requiredFiles[index])) {
    throw new Error("El manifest no contiene exactamente los archivos obligatorios.");
  }
  if (manifest.integrity.canonicalTextSha256 !== sha256(CANONICAL_ATTRIBUTION)) {
    throw new Error("La huella SHA-256 de la atribución canónica no coincide.");
  }
  const drift = [];
  for (const path of REQUIRED_FILES) {
    if (manifest.integrity.files[path] !== sha256(sources[path])) drift.push(path);
  }
  if (drift.length) {
    throw new Error("Hashes de origen desactualizados: " + drift.join(", ") + ". Ejecuta bun run tamv:hash y vuelve a firmar.");
  }
}

function isUnsigned(signature) {
  return !signature || signature.trim() === UNSIGNED_MARKER;
}

async function verifySignature(manifest, signature, publicKeyPem) {
  const key = createPublicKey(normalizePem(publicKeyPem));
  if (key.asymmetricKeyType !== "ed25519") throw new Error("La clave pública TAMV no es Ed25519.");
  const signatureBytes = Buffer.from(signature.trim(), "base64url");
  if (signatureBytes.length !== 64) throw new Error("La firma Ed25519 debe contener 64 bytes.");
  if (!verify(null, Buffer.from(canonicalJson(manifest), "utf8"), key, signatureBytes)) {
    throw new Error("La firma no autentica el manifest TAMV actual.");
  }
}

async function updateHashes(manifest, sources) {
  manifest.integrity.canonicalTextSha256 = sha256(CANONICAL_ATTRIBUTION);
  manifest.integrity.files = Object.fromEntries(REQUIRED_FILES.map((path) => [path, sha256(sources[path])]));
  await writeFile(MANIFEST_PATH, JSON.stringify(manifest, null, 2) + "\n", "utf8");
  await writeFile(SIGNATURE_PATH, UNSIGNED_MARKER + "\n", "utf8");
  console.log("Hashes SHA-256 actualizados. La firma fue invalidada; ejecuta tamv:sign para emitir un nuevo release.");
}

async function signManifest(manifest, sources) {
  await checkSourceHashes(manifest, sources);
  const privateKeyPem = normalizePem(process.env.TAMV_ATTRIBUTION_PRIVATE_KEY);
  if (!privateKeyPem) throw new Error("Falta TAMV_ATTRIBUTION_PRIVATE_KEY en el entorno seguro de release.");
  const privateKey = createPrivateKey(privateKeyPem);
  if (privateKey.asymmetricKeyType !== "ed25519") throw new Error("La clave privada TAMV debe ser Ed25519.");
  const publicKey = createPublicKey(privateKey);
  const configuredPublicPem = normalizePem(process.env.TAMV_ATTRIBUTION_PUBLIC_KEY);
  if (configuredPublicPem) {
    const configuredPublic = createPublicKey(configuredPublicPem).export({ type: "spki", format: "der" });
    const derivedPublic = publicKey.export({ type: "spki", format: "der" });
    if (!Buffer.from(configuredPublic).equals(Buffer.from(derivedPublic))) {
      throw new Error("La clave pública configurada no corresponde a la clave privada de release.");
    }
  }
  const signature = sign(null, Buffer.from(canonicalJson(manifest), "utf8"), privateKey).toString("base64url");
  await writeFile(SIGNATURE_PATH, signature + "\n", "utf8");
  await verifySignature(manifest, signature, publicKey.export({ type: "spki", format: "pem" }).toString());
  console.log("Manifest TAMV firmado con Ed25519 y verificado localmente.");
  if (!configuredPublicPem) {
    console.log("Configura esta clave pública en TAMV_ATTRIBUTION_PUBLIC_KEY del entorno de despliegue:");
    console.log(publicKey.export({ type: "spki", format: "pem" }).toString());
  }
}

async function main() {
  const args = new Set(process.argv.slice(2));
  const action = args.has("--update-hashes") ? "update" : args.has("--sign") ? "sign" : "check";
  const requireSignature = args.has("--require-signature") || process.env.TAMV_CERTIFICATION_REQUIRED === "true";
  const manifest = await loadManifest();
  validateManifestMetadata(manifest);
  const sources = await loadRequiredSources();

  if (action === "update") {
    await updateHashes(manifest, sources);
    return;
  }
  if (action === "sign") {
    await signManifest(manifest, sources);
    return;
  }

  await checkSourceHashes(manifest, sources);
  const signature = await readFile(SIGNATURE_PATH, "utf8").catch(() => "");
  const publicKey = normalizePem(process.env.TAMV_ATTRIBUTION_PUBLIC_KEY);
  if (isUnsigned(signature)) {
    if (requireSignature) throw new Error("El release no está firmado; TAMV_CERTIFICATION_REQUIRED exige una firma válida.");
    console.warn("Advertencia: hashes de origen válidos, pero el release está sin firma; el runtime mantendrá bloqueadas las funciones certificadas.");
    return;
  }
  if (!publicKey) {
    if (requireSignature) throw new Error("Falta TAMV_ATTRIBUTION_PUBLIC_KEY para verificar el release.");
    console.warn("Advertencia: hay una firma, pero no se configuró TAMV_ATTRIBUTION_PUBLIC_KEY para verificarla.");
    return;
  }
  await verifySignature(manifest, signature, publicKey);
  console.log("Certificación TAMV válida: hashes SHA-256 y firma Ed25519 verificados.");
}

main().catch((error) => {
  console.error("Falló la validación de certificación TAMV:", error instanceof Error ? error.message : "error desconocido");
  process.exitCode = 1;
});
