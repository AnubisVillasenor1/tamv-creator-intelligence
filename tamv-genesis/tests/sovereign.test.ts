import test from "node:test";
import assert from "node:assert/strict";

import { canonicalJson, assertSafeRelativePath } from "../src/sovereign/canonical.ts";
import { bytesToBase64Url, base64UrlToBytes, sha256Hex } from "../src/sovereign/digest.ts";
import {
  generateEd25519KeyPair,
  generateX25519KeyPair,
  keyId,
  signEd25519,
  verifyEd25519,
} from "../src/sovereign/keys.ts";
import { decodePlaintext, openHybrid, sealHybrid } from "../src/sovereign/hybrid.ts";
import {
  buildPackSeal,
  requireCertifiedPack,
  signPackSeal,
  TamvSealDeniedError,
  verifyPackSeal,
  type PackSeal,
  type SkillSource,
} from "../src/sovereign/seal.ts";

const issuedAt = "2026-11-14T00:00:00.000Z";

function sources(): SkillSource[] {
  return [
    {
      id: "tamv-creator-os",
      path: "skills/tamv-creator-os",
      requiresConsent: false,
      capabilities: ["creator.strategy", "creator.launch"],
      files: [
        { path: "SKILL.md", content: "# TAMV Creator OS\n" },
        { path: "references/fusion.md", content: "patterns, not copied text\n" },
      ],
    },
    {
      id: "tamv-audio-intelligence",
      path: "skills/tamv-audio-intelligence",
      requiresConsent: true,
      capabilities: ["audio.production", "audio.mastering"],
      files: [{ path: "SKILL.md", content: "# TAMV Audio Intelligence\n" }],
    },
  ];
}

async function signedSeal() {
  const pair = await generateEd25519KeyPair();
  const seal = await signPackSeal(
    await buildPackSeal({ pack: "tamv-creator-intelligence", version: "3.0.0", issuedAt, skills: sources() }),
    pair.privateKey,
    pair.publicKey,
  );
  return { seal, pair };
}

test("canonical JSON sorts keys and rejects non-deterministic values", () => {
  assert.equal(canonicalJson({ b: 1, a: [true, null, "x"] }), '{"a":[true,null,"x"],"b":1}');
  assert.throws(() => canonicalJson({ a: undefined }), /undefined/);
  assert.throws(() => canonicalJson({ a: Number.NaN }), /non-finite/);
});

test("canonical JSON refuses non-plain objects instead of silently emitting {}", () => {
  assert.throws(() => canonicalJson({ when: new Date(0) }), /non-plain/);
  assert.throws(() => canonicalJson(new Map([["a", 1]])), /non-plain/);
  assert.throws(() => canonicalJson(new Set([1])), /non-plain/);
  assert.throws(() => canonicalJson(/x/), /non-plain/);
  assert.throws(() => canonicalJson(new (class Payload { a = 1; })()), /non-plain/);
  assert.equal(canonicalJson(Object.assign(Object.create(null), { a: 1 })), '{"a":1}');
});

test("relative paths reject traversal and platform separators", () => {
  assert.doesNotThrow(() => assertSafeRelativePath("skills/tamv/SKILL.md"));
  assert.throws(() => assertSafeRelativePath("../secret.md"));
  assert.throws(() => assertSafeRelativePath("skills\\tamv"));
  assert.throws(() => assertSafeRelativePath("/etc/passwd"));
});

test("SHA-256 matches the published empty-string vector", async () => {
  assert.equal(
    await sha256Hex(""),
    "sha256:e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855",
  );
  assert.equal(bytesToBase64Url(new Uint8Array([251, 255, 0])), "-_8A");
  assert.deepEqual(base64UrlToBytes("-_8A"), new Uint8Array([251, 255, 0]));
});

test("Ed25519 signatures authenticate one payload and fail on tamper", async () => {
  const pair = await generateEd25519KeyPair();
  const signature = await signEd25519(pair.privateKey, "canonical payload");
  assert.equal(await verifyEd25519(pair.publicKey, "canonical payload", signature), true);
  assert.equal(await verifyEd25519(pair.publicKey, "canonical payload ", signature), false);
  const other = await generateEd25519KeyPair();
  assert.equal(await verifyEd25519(other.publicKey, "canonical payload", signature), false);
  assert.match(await keyId(pair.publicKey), /^sha256:[a-f0-9]{64}$/);
});

test("hybrid envelope round-trips and rejects the wrong recipient or AAD", async () => {
  const recipient = await generateX25519KeyPair();
  const stranger = await generateX25519KeyPair();
  const envelope = await sealHybrid(recipient.publicKey, new TextEncoder().encode("protected capability"), "pack:3.0.0");
  assert.equal(decodePlaintext(await openHybrid(recipient.privateKey, envelope, "pack:3.0.0")), "protected capability");
  await assert.rejects(() => openHybrid(stranger.privateKey, envelope, "pack:3.0.0"));
  await assert.rejects(() => openHybrid(recipient.privateKey, envelope, "pack:3.0.1"));
  const tampered = { ...envelope, ciphertext: bytesToBase64Url(new Uint8Array(16)) };
  await assert.rejects(() => openHybrid(recipient.privateKey, tampered, "pack:3.0.0"));
});

test("a signed pack seal certifies the exact public skills", async () => {
  const { seal, pair } = await signedSeal();
  const result = await verifyPackSeal({ seal, sources: sources(), publicKey: pair.publicKey });
  assert.equal(result.allowed, true);
  assert.equal(result.code, "TAMV_SEAL_VALID");
  assert.match(seal.root, /^sha256:[a-f0-9]{64}$/);
});

test("editing one byte of one skill breaks the seal", async () => {
  const { seal, pair } = await signedSeal();
  const changed = sources();
  changed[0].files[0].content = "# TAMV Creator OS\nmalicious line\n";
  const result = await verifyPackSeal({ seal, sources: changed, publicKey: pair.publicKey });
  assert.equal(result.allowed, false);
  assert.equal(result.code, "TAMV_SEAL_CONTENT_MISMATCH");
});

test("removing or adding a skill is refused", async () => {
  const { seal, pair } = await signedSeal();
  const removed = sources().slice(1);
  assert.equal((await verifyPackSeal({ seal, sources: removed, publicKey: pair.publicKey })).code, "TAMV_SEAL_SKILL_MISSING");

  const added = sources();
  added.push({ ...sources()[1], id: "tamv-growth-engine", path: "skills/tamv-growth-engine" });
  assert.equal((await verifyPackSeal({ seal, sources: added, publicKey: pair.publicKey })).code, "TAMV_SEAL_CONTENT_MISMATCH");
});

test("an unsigned seal is denied even when every hash matches", async () => {
  const seal = await buildPackSeal({ pack: "tamv-creator-intelligence", version: "3.0.0", issuedAt, skills: sources() });
  const pair = await generateEd25519KeyPair();
  const result = await verifyPackSeal({ seal, sources: sources(), publicKey: pair.publicKey });
  assert.equal(result.allowed, false);
  assert.equal(result.code, "TAMV_SEAL_UNSIGNED");
});

test("a missing public key denies certification while structure is valid", async () => {
  const { seal } = await signedSeal();
  const result = await verifyPackSeal({ seal, sources: sources() });
  assert.equal(result.allowed, false);
  assert.equal(result.code, "TAMV_SEAL_KEY_MISSING");
});

test("a foreign signing key cannot authenticate the seal", async () => {
  const { seal } = await signedSeal();
  const attacker = await generateEd25519KeyPair();
  const result = await verifyPackSeal({ seal, sources: sources(), publicKey: attacker.publicKey });
  assert.equal(result.allowed, false);
  assert.equal(result.code, "TAMV_SEAL_SIGNATURE_INVALID");
});

test("a tampered root or signature block is rejected before execution", async () => {
  const { seal, pair } = await signedSeal();
  const rootTampered = { ...seal, root: ("sha256:" + "0".repeat(64)) as PackSeal["root"] };
  assert.equal((await verifyPackSeal({ seal: rootTampered, sources: sources(), publicKey: pair.publicKey })).code, "TAMV_SEAL_CONTENT_MISMATCH");

  const malformed = { ...seal, signature: { alg: "Ed25519" } } as unknown as PackSeal;
  assert.equal((await verifyPackSeal({ seal: malformed, sources: sources(), publicKey: pair.publicKey })).code, "TAMV_SEAL_MALFORMED");
});

test("requireCertifiedPack throws a typed denial instead of returning quietly", async () => {
  const seal = await buildPackSeal({ pack: "tamv-creator-intelligence", version: "3.0.0", issuedAt, skills: sources() });
  await assert.rejects(
    () => requireCertifiedPack({ seal, sources: sources() }),
    (error: unknown) => error instanceof TamvSealDeniedError && error.code === "TAMV_SEAL_UNSIGNED",
  );
});
