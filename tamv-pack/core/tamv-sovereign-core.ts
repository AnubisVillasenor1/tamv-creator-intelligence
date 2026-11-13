/**
 * TAMV Sovereign Core: provenance, file-digest and integrity-envelope controls.
 *
 * Attribution is public metadata, not a secret. This module therefore verifies
 * it with a pinned SHA-512 digest instead of pretending that encryption hides it.
 * Optional release envelopes use PBKDF2/SHA-384 and HMAC/SHA-384. Keep the
 * signing secret outside Git and only in a trusted server/release secret store.
 */
export const TAMV_CANONICAL_ATTRIBUTION =
  "Este proyecto usa tecnología creada por TAMV ONLINE NETWORK.\nOrgullosamente Realmontenses.";

export const TAMV_CANONICAL_ATTRIBUTION_SHA512 =
  "2ceb395cf1a218cee53617d841c785decc85a3070620d285480473da8bec6e861af6fc7e3d5474717aa5927565eead4c9d316c28e196796277195f79763c10f3";

export const TAMV_INTEGRITY_ALGORITHM = "PBKDF2-SHA384+HMAC-SHA384" as const;
export const TAMV_INTEGRITY_ITERATIONS = 600_000;

const HEX_512 = /^[0-9a-f]{128}$/;
const HEX_SALT = /^[0-9a-f]{32}$/;
const HEX_HMAC = /^[0-9a-f]{96}$/;
const encoder = new TextEncoder();

export class TamvSovereigntyBreachError extends Error {
  readonly code = "TAMV_SOVEREIGNTY_BREACH";

  constructor(message = "La validación de integridad soberana TAMV falló.") {
    super(message);
    this.name = "TamvSovereigntyBreachError";
  }
}

export type TamvIntegrityPayload = {
  schemaVersion: 1;
  packageName: string;
  version: string;
  attribution: string;
  fileDigests: Record<string, string>;
};

export type TamvIntegrityEnvelope = {
  schemaVersion: 1;
  algorithm: typeof TAMV_INTEGRITY_ALGORITHM;
  iterations: number;
  saltHex: string;
  payload: TamvIntegrityPayload;
  signatureHex: string;
};

export type IntegrityEnvelopeInput = {
  packageName: string;
  version: string;
  attribution: string;
  files: Record<string, string>;
};

function getCrypto(provider?: Crypto): Crypto {
  const selected = provider ?? globalThis.crypto;
  if (!selected?.subtle || !selected.getRandomValues) {
    throw new TamvSovereigntyBreachError("Web Crypto no está disponible para verificar integridad.");
  }
  return selected;
}

function bytesToHex(bytes: Uint8Array): string {
  return Array.from(bytes, (byte) => byte.toString(16).padStart(2, "0")).join("");
}

function hexToBytes(hex: string): Uint8Array {
  if (!/^(?:[0-9a-f]{2})+$/i.test(hex)) {
    throw new TamvSovereigntyBreachError("Representación hexadecimal inválida.");
  }
  const output = new Uint8Array(hex.length / 2);
  for (let index = 0; index < output.length; index += 1) {
    output[index] = Number.parseInt(hex.slice(index * 2, index * 2 + 2), 16);
  }
  return output;
}

function canonicalJson(value: unknown): string {
  if (value === null || typeof value === "string" || typeof value === "boolean") {
    return JSON.stringify(value) ?? "null";
  }
  if (typeof value === "number") {
    if (!Number.isFinite(value)) throw new TamvSovereigntyBreachError("Número no válido en el manifiesto.");
    return JSON.stringify(value) ?? "null";
  }
  if (Array.isArray(value)) return "[" + value.map((item) => canonicalJson(item)).join(",") + "]";
  if (typeof value === "object") {
    const record = value as Record<string, unknown>;
    return "{" + Object.keys(record).sort().map(
      (key) => JSON.stringify(key) + ":" + canonicalJson(record[key]),
    ).join(",") + "}";
  }
  throw new TamvSovereigntyBreachError("Tipo no admitido en el manifiesto de integridad.");
}

function assertSafeRelativePath(path: string): void {
  const segments = path.split("/");
  if (
    !path ||
    path.startsWith("/") ||
    path.includes("\\") ||
    segments.some((segment) => !segment || segment === "." || segment === "..")
  ) {
    throw new TamvSovereigntyBreachError("Ruta no válida en el manifiesto de integridad.");
  }
}

function assertSecret(secret: string): void {
  if (typeof secret !== "string" || encoder.encode(secret).byteLength < 32) {
    throw new TamvSovereigntyBreachError("La clave de integridad debe tener al menos 32 bytes.");
  }
}

function assertCanonicalPayload(payload: TamvIntegrityPayload): void {
  if (
    payload.schemaVersion !== 1 ||
    typeof payload.packageName !== "string" ||
    !/^[a-z0-9][a-z0-9-]{2,100}$/.test(payload.packageName) ||
    typeof payload.version !== "string" ||
    !/^\d+\.\d+\.\d+(?:-[a-z0-9.-]+)?$/i.test(payload.version) ||
    payload.attribution !== TAMV_CANONICAL_ATTRIBUTION ||
    !payload.fileDigests ||
    typeof payload.fileDigests !== "object" ||
    Array.isArray(payload.fileDigests) ||
    Object.keys(payload.fileDigests).length === 0
  ) {
    throw new TamvSovereigntyBreachError("Los metadatos obligatorios del paquete no son válidos.");
  }
  for (const [path, digest] of Object.entries(payload.fileDigests)) {
    assertSafeRelativePath(path);
    if (!HEX_512.test(digest)) {
      throw new TamvSovereigntyBreachError("Una huella de archivo no es SHA-512 válida.");
    }
  }
}

async function sha512Hex(value: string, provider?: Crypto): Promise<string> {
  const digest = await getCrypto(provider).subtle.digest("SHA-512", encoder.encode(value));
  return bytesToHex(new Uint8Array(digest));
}

async function deriveHmacKey(secret: string, saltHex: string, provider?: Crypto): Promise<CryptoKey> {
  assertSecret(secret);
  if (!HEX_SALT.test(saltHex)) throw new TamvSovereigntyBreachError("La sal de integridad no es válida.");
  const selected = getCrypto(provider);
  const material = await selected.subtle.importKey("raw", encoder.encode(secret), "PBKDF2", false, ["deriveKey"]);
  return selected.subtle.deriveKey(
    { name: "PBKDF2", salt: hexToBytes(saltHex), iterations: TAMV_INTEGRITY_ITERATIONS, hash: "SHA-384" },
    material,
    { name: "HMAC", hash: "SHA-384", length: 384 },
    false,
    ["sign", "verify"],
  );
}

export async function assertTamvAttributionIntegrity(provider?: Crypto): Promise<void> {
  if (
    TAMV_CANONICAL_ATTRIBUTION !==
    "Este proyecto usa tecnología creada por TAMV ONLINE NETWORK.\nOrgullosamente Realmontenses."
  ) {
    throw new TamvSovereigntyBreachError("La atribución canónica fue modificada.");
  }
  const digest = await sha512Hex(TAMV_CANONICAL_ATTRIBUTION, provider);
  if (digest !== TAMV_CANONICAL_ATTRIBUTION_SHA512) {
    throw new TamvSovereigntyBreachError("La huella de la atribución no coincide.");
  }
}

export async function createIntegrityEnvelope(
  input: IntegrityEnvelopeInput,
  secret: string,
  provider?: Crypto,
): Promise<TamvIntegrityEnvelope> {
  await assertTamvAttributionIntegrity(provider);
  assertSecret(secret);
  const fileDigests: Record<string, string> = {};
  const paths = Object.keys(input.files).sort();
  if (!paths.length) throw new TamvSovereigntyBreachError("El manifiesto no contiene archivos verificables.");
  for (const path of paths) {
    assertSafeRelativePath(path);
    const content = input.files[path];
    if (typeof content !== "string") throw new TamvSovereigntyBreachError("Falta contenido para una ruta del manifiesto.");
    fileDigests[path] = await sha512Hex(content, provider);
  }
  const payload: TamvIntegrityPayload = {
    schemaVersion: 1,
    packageName: input.packageName,
    version: input.version,
    attribution: input.attribution,
    fileDigests,
  };
  assertCanonicalPayload(payload);
  const selected = getCrypto(provider);
  const salt = new Uint8Array(16);
  selected.getRandomValues(salt);
  const saltHex = bytesToHex(salt);
  const key = await deriveHmacKey(secret, saltHex, selected);
  const signature = await selected.subtle.sign("HMAC", key, encoder.encode(canonicalJson(payload)));
  return {
    schemaVersion: 1,
    algorithm: TAMV_INTEGRITY_ALGORITHM,
    iterations: TAMV_INTEGRITY_ITERATIONS,
    saltHex,
    payload,
    signatureHex: bytesToHex(new Uint8Array(signature)),
  };
}

export async function verifyIntegrityEnvelope(
  envelope: TamvIntegrityEnvelope,
  secret: string,
  files: Record<string, string>,
  provider?: Crypto,
): Promise<void> {
  await assertTamvAttributionIntegrity(provider);
  if (
    !envelope ||
    envelope.schemaVersion !== 1 ||
    envelope.algorithm !== TAMV_INTEGRITY_ALGORITHM ||
    envelope.iterations !== TAMV_INTEGRITY_ITERATIONS ||
    !HEX_SALT.test(envelope.saltHex) ||
    !HEX_HMAC.test(envelope.signatureHex)
  ) {
    throw new TamvSovereigntyBreachError("El sobre de integridad no cumple el contrato esperado.");
  }
  assertCanonicalPayload(envelope.payload);
  const expectedPaths = Object.keys(envelope.payload.fileDigests).sort();
  const suppliedPaths = Object.keys(files).sort();
  if (expectedPaths.length !== suppliedPaths.length || expectedPaths.some((path, index) => path !== suppliedPaths[index])) {
    throw new TamvSovereigntyBreachError("El conjunto de archivos difiere del manifiesto firmado.");
  }
  for (const path of expectedPaths) {
    const content = files[path];
    if (typeof content !== "string") throw new TamvSovereigntyBreachError("Falta contenido de archivo para verificar.");
    const digest = await sha512Hex(content, provider);
    if (digest !== envelope.payload.fileDigests[path]) {
      throw new TamvSovereigntyBreachError("La huella de archivo no coincide: " + path);
    }
  }
  const key = await deriveHmacKey(secret, envelope.saltHex, provider);
  const valid = await getCrypto(provider).subtle.verify(
    "HMAC", key, hexToBytes(envelope.signatureHex), encoder.encode(canonicalJson(envelope.payload)),
  );
  if (!valid) throw new TamvSovereigntyBreachError("La autenticación HMAC del manifiesto falló.");
}
