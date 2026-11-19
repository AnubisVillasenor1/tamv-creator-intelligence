import {
  createHash,
  createPrivateKey,
  createPublicKey,
  sign,
  verify,
} from "node:crypto";
import {
  lstat,
  readFile,
  readdir,
  realpath,
  rename,
  unlink,
  writeFile,
} from "node:fs/promises";
import path from "node:path";

type FileRecord = {
  path: string;
  size: number;
  sha512: string;
};

type Payload = {
  schemaVersion: 1;
  domain: "TAMV-GOVERNANCE-PACK/V1";
  algorithm: "Ed25519";
  fileHashAlgorithm: "SHA-512";
  keyId: string;
  sequence: number;
  createdAt: string;
  roots: string[];
  extras: string[];
  files: FileRecord[];
};

type Envelope = {
  payloadBase64: string;
  signatureBase64: string;
};

const ROOTS = [
  "src",
  "docs/governance",
  "scripts",
  "tamv-pack",
  "drizzle/migrations",
];

const EXTRAS = [
  "package.json",
  "bun.lock",
  "tsconfig.json",
  "AGENTS.md",
  "ATTRIBUTION.md",
  "LICENSE-MAP.md",
];

const MAX_FILE_BYTES = 8 * 1024 * 1024;
const MAX_LOCK_BYTES = 4 * 1024 * 1024;
const MAX_FILES = 10_000;
const LOCK_NAME = "governance.lock.json";
const argv = process.argv.slice(2);

function fail(message: string): never {
  throw new Error(message);
}

function flag(name: string): string {
  const positions = argv
    .map((value, index) => (value === name ? index : -1))
    .filter((index) => index >= 0);

  if (positions.length !== 1) {
    return fail(`Expected exactly one ${name}`);
  }

  const value = argv[positions[0] + 1];

  if (!value || value.startsWith("--")) {
    return fail(`Missing value for ${name}`);
  }

  return value;
}

function sha512(bytes: Uint8Array): string {
  return createHash("sha512").update(bytes).digest("hex");
}

function sequence(value: string): number {
  if (!/^[1-9][0-9]*$/.test(value)) {
    return fail("Sequence must be a positive integer");
  }

  const parsed = Number(value);

  if (!Number.isSafeInteger(parsed)) {
    return fail("Sequence exceeds safe integer range");
  }

  return parsed;
}

function strictBase64(value: unknown, label: string): Buffer {
  if (
    typeof value !== "string" ||
    !/^(?:[A-Za-z0-9+/]{4})*(?:[A-Za-z0-9+/]{2}==|[A-Za-z0-9+/]{3}=)?$/.test(
      value,
    )
  ) {
    return fail(`Invalid base64: ${label}`);
  }

  const decoded = Buffer.from(value, "base64");

  if (decoded.toString("base64") !== value) {
    return fail(`Non-canonical base64: ${label}`);
  }

  return decoded;
}

function assertInside(root: string, target: string): void {
  const relative = path.relative(root, target);

  if (
    relative === ".." ||
    relative.startsWith(`..${path.sep}`) ||
    path.isAbsolute(relative)
  ) {
    fail(`Path escapes repository: ${target}`);
  }
}

async function readRegular(
  file: string,
  limit: number,
): Promise<Buffer> {
  const info = await lstat(file);

  if (info.isSymbolicLink() || !info.isFile()) {
    return fail(`Not a regular file: ${file}`);
  }

  if (info.size > limit) {
    return fail(`File too large: ${file}`);
  }

  return readFile(file);
}

async function inventory(root: string): Promise<FileRecord[]> {
  const records: FileRecord[] = [];

  async function walk(relative: string): Promise<void> {
    const absolute = path.resolve(root, relative);
    assertInside(root, absolute);

    const info = await lstat(absolute);

    if (info.isSymbolicLink()) {
      return fail(`Symlink forbidden: ${relative}`);
    }

    if (info.isDirectory()) {
      const names = await readdir(absolute);
      names.sort();

      for (const name of names) {
        await walk(`${relative}/${name}`);
      }

      return;
    }

    if (!info.isFile()) {
      return fail(`Unsupported entry: ${relative}`);
    }

    if (records.length >= MAX_FILES) {
      return fail("Too many files");
    }

    const bytes = await readRegular(absolute, MAX_FILE_BYTES);

    if (/-----BEGIN (?:[A-Z ]* )?PRIVATE KEY-----/.test(bytes.toString("utf8"))) {
      return fail(`Private key material forbidden: ${relative}`);
    }

    records.push({
      path: relative.replaceAll("\\", "/"),
      size: bytes.length,
      sha512: sha512(bytes),
    });
  }

  for (const directory of ROOTS) {
    await walk(directory);
  }

  for (const file of EXTRAS) {
    await walk(file);
  }

  records.sort((a, b) =>
    a.path < b.path ? -1 : a.path > b.path ? 1 : 0,
  );

  const seen = new Set<string>();

  for (const item of records) {
    if (seen.has(item.path)) {
      fail(`Duplicate path: ${item.path}`);
    }

    seen.add(item.path);
  }

  return records;
}

async function assertNoPrivateKeyInPack(
  keyFile: string,
  root: string,
  files: FileRecord[],
): Promise<void> {
  const keyReal = await realpath(keyFile);
  const relativeKey = path.relative(root, keyReal);
  if (relativeKey !== ".." && !relativeKey.startsWith(`..${path.sep}`) && !path.isAbsolute(relativeKey)) {
    fail("Private signing key must be outside the repository");
  }

  for (const file of files) {
    if (
      (await realpath(path.resolve(root, file.path))) ===
      keyReal
    ) {
      fail(
        "Private key must not be included in the signed package",
      );
    }
  }
}

function validatePayload(value: unknown): asserts value is Payload {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return fail("Invalid payload");
  }

  const p = value as Payload;

  const expectedKeys = [
    "schemaVersion",
    "domain",
    "algorithm",
    "fileHashAlgorithm",
    "keyId",
    "sequence",
    "createdAt",
    "roots",
    "extras",
    "files",
  ].sort();

  if (
    JSON.stringify(Object.keys(p).sort()) !==
      JSON.stringify(expectedKeys) ||
    p.schemaVersion !== 1 ||
    p.domain !== "TAMV-GOVERNANCE-PACK/V1" ||
    p.algorithm !== "Ed25519" ||
    p.fileHashAlgorithm !== "SHA-512" ||
    !/^[a-f0-9]{128}$/.test(p.keyId) ||
    !Number.isSafeInteger(p.sequence) ||
    p.sequence < 1 ||
    typeof p.createdAt !== "string" ||
    !Number.isFinite(Date.parse(p.createdAt)) ||
    JSON.stringify(p.roots) !== JSON.stringify(ROOTS) ||
    JSON.stringify(p.extras) !== JSON.stringify(EXTRAS) ||
    !Array.isArray(p.files) ||
    p.files.length > MAX_FILES
  ) {
    return fail("Unsupported or malformed payload");
  }
}

async function main(): Promise<void> {
  const mode = argv[0];

  if (mode !== "--sign" && mode !== "--verify") {
    fail("First argument must be --sign or --verify");
  }

  const expectedFlags =
    mode === "--sign"
      ? ["--root", "--key", "--sequence"]
      : [
          "--root",
          "--pub",
          "--trusted-key-id",
          "--expected-sequence",
        ];

  if (argv.length !== 1 + expectedFlags.length * 2) {
    fail("Unexpected arguments");
  }

  for (const name of expectedFlags) flag(name);

  const root = await realpath(flag("--root"));
  const lock = path.join(root, LOCK_NAME);

  if (mode === "--sign") {
    const keyPath = path.resolve(flag("--key"));
    const keyBytes = await readRegular(keyPath, 64 * 1024);

    const privateKey = createPrivateKey({
      key: keyBytes,
      format: "pem",
      passphrase: process.env.TAMV_KEY_PASSPHRASE,
    });

    if (privateKey.asymmetricKeyType !== "ed25519") {
      fail("An Ed25519 private key is required");
    }

    const publicKey = createPublicKey(privateKey);
    const publicDer = publicKey.export({
      type: "spki",
      format: "der",
    });

    const files = await inventory(root);
    await assertNoPrivateKeyInPack(keyPath, root, files);

    const payload: Payload = {
      schemaVersion: 1,
      domain: "TAMV-GOVERNANCE-PACK/V1",
      algorithm: "Ed25519",
      fileHashAlgorithm: "SHA-512",
      keyId: sha512(publicDer),
      sequence: sequence(flag("--sequence")),
      createdAt: new Date().toISOString(),
      roots: ROOTS,
      extras: EXTRAS,
      files,
    };

    const bytes = Buffer.from(JSON.stringify(payload), "utf8");
    const signature = sign(null, bytes, privateKey);

    if (!verify(null, bytes, publicKey, signature)) {
      fail("Signature self-check failed");
    }

    const envelope: Envelope = {
      payloadBase64: bytes.toString("base64"),
      signatureBase64: signature.toString("base64"),
    };

    const temp = `${lock}.${process.pid}.tmp`;

    try {
      await writeFile(temp, JSON.stringify(envelope, null, 2) + "\n", {
        flag: "wx",
        mode: 0o600,
      });

      await rename(temp, lock);
    } finally {
      await unlink(temp).catch(() => undefined);
    }

    console.log(
      JSON.stringify({
        status: "SIGNED",
        keyId: payload.keyId,
        sequence: payload.sequence,
        files: files.length,
      }),
    );

    return;
  }

  const expectedKeyId = flag("--trusted-key-id").toLowerCase();

  if (!/^[a-f0-9]{128}$/.test(expectedKeyId)) {
    fail("Invalid trusted key fingerprint");
  }

  const publicKey = createPublicKey(
    await readRegular(path.resolve(flag("--pub")), 64 * 1024),
  );

  if (publicKey.asymmetricKeyType !== "ed25519") {
    fail("An Ed25519 public key is required");
  }

  const actualKeyId = sha512(
    publicKey.export({ type: "spki", format: "der" }),
  );

  if (actualKeyId !== expectedKeyId) {
    fail("Public key does not match external trust anchor");
  }

  const envelope = JSON.parse(
    (await readRegular(lock, MAX_LOCK_BYTES)).toString("utf8"),
  ) as Envelope;

  if (
    !envelope ||
    typeof envelope !== "object" ||
    JSON.stringify(Object.keys(envelope).sort()) !==
      JSON.stringify(["payloadBase64", "signatureBase64"].sort())
  ) {
    fail("Invalid envelope");
  }

  const bytes = strictBase64(envelope.payloadBase64, "payload");
  const signature = strictBase64(
    envelope.signatureBase64,
    "signature",
  );

  if (signature.length !== 64) {
    fail("Invalid Ed25519 signature length");
  }

  if (!verify(null, bytes, publicKey, signature)) {
    fail("Invalid package signature");
  }

  const payload: unknown = JSON.parse(bytes.toString("utf8"));
  validatePayload(payload);

  if (payload.keyId !== expectedKeyId) {
    fail("Signed key identifier mismatch");
  }

  if (
    payload.sequence !== sequence(flag("--expected-sequence"))
  ) {
    fail("Unexpected release sequence");
  }

  const currentFiles = await inventory(root);

  if (
    JSON.stringify(currentFiles) !== JSON.stringify(payload.files)
  ) {
    fail(
      "File inventory mismatch: modified, missing or added file",
    );
  }

  console.log(
    JSON.stringify({
      status: "VERIFIED",
      sequence: payload.sequence,
      keyId: payload.keyId,
      files: currentFiles.length,
    }),
  );
}

main().catch((error: unknown) => {
  console.error(
    JSON.stringify({
      status: "DENIED",
      error:
        error instanceof Error
          ? error.message
          : String(error),
    }),
  );

  process.exitCode = 1;
});
