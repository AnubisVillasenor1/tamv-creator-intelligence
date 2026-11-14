import test from "node:test";
import assert from "node:assert/strict";

import { sha256Hex } from "../src/sovereign/digest.ts";
import { generateEd25519KeyPair } from "../src/sovereign/keys.ts";
import {
  appendEntry,
  buildCheckpoint,
  emptyLog,
  entryInclusionProof,
  logMerkleRoot,
  signCheckpoint,
  verifyChain,
  verifyCheckpoint,
  verifyEntryInclusion,
  TRANSPARENCY_GENESIS_HASH,
  type TransparencyLog,
} from "../src/sovereign/transparency.ts";

const issuedAt = "2026-11-14T00:00:00.000Z";

async function rootFor(index: number) {
  return sha256Hex(`seal-root-${index}`);
}

async function logOf(size: number): Promise<TransparencyLog> {
  let log = emptyLog();
  for (let index = 0; index < size; index += 1) {
    log = await appendEntry(log, {
      pack: "tamv-creator-intelligence",
      version: `3.0.${index}`,
      sealRoot: await rootFor(index),
      issuedAt,
    });
  }
  return log;
}

test("appendEntry chains every release to the previous entry hash", async () => {
  const log = await logOf(4);
  assert.equal(log.entries.length, 4);
  assert.equal(log.entries[0].prevHash, TRANSPARENCY_GENESIS_HASH);
  for (let index = 1; index < log.entries.length; index += 1) {
    assert.equal(log.entries[index].prevHash, log.entries[index - 1].entryHash);
    assert.equal(log.entries[index].seq, index);
  }
  const result = await verifyChain(log);
  assert.equal(result.ok, true);
  assert.equal(result.code, "TAMV_TRANSPARENCY_VALID");
});

test("appendEntry rejects malformed release metadata", async () => {
  const log = emptyLog();
  const root = await rootFor(0);
  await assert.rejects(() => appendEntry(log, { pack: "", version: "3.0.0", sealRoot: root, issuedAt }), /pack/);
  await assert.rejects(() => appendEntry(log, { pack: "p", version: "3.0.0", sealRoot: "sha256:nothex", issuedAt }), /seal root/);
  await assert.rejects(() => appendEntry(log, { pack: "p", version: "3.0.0", sealRoot: root, issuedAt: "not-a-date" }), /issuedAt/);
});

test("editing a past entry breaks the hash chain", async () => {
  const log = await logOf(3);
  const tampered: TransparencyLog = {
    schema: log.schema,
    entries: log.entries.map((entry, index) => (index === 1 ? { ...entry, version: "9.9.9" } : entry)),
  };
  const result = await verifyChain(tampered);
  assert.equal(result.ok, false);
  assert.equal(result.code, "TAMV_TRANSPARENCY_CHAIN_BROKEN");
});

test("dropping or reordering entries breaks the chain", async () => {
  const log = await logOf(3);
  const dropped: TransparencyLog = { schema: log.schema, entries: [log.entries[0], log.entries[2]] };
  assert.equal((await verifyChain(dropped)).code, "TAMV_TRANSPARENCY_CHAIN_BROKEN");
  const reordered: TransparencyLog = { schema: log.schema, entries: [log.entries[1], log.entries[0], log.entries[2]] };
  assert.equal((await verifyChain(reordered)).code, "TAMV_TRANSPARENCY_CHAIN_BROKEN");
});

test("the Merkle root is deterministic and the empty root is the SHA-256 of empty", async () => {
  const log = await logOf(5);
  const first = await logMerkleRoot(log);
  assert.equal(await logMerkleRoot(log), first);
  assert.match(first, /^sha256:[a-f0-9]{64}$/);
  assert.equal(await logMerkleRoot(emptyLog()), await sha256Hex(new Uint8Array(0)));
});

test("every entry has a verifiable inclusion proof for log sizes 1..7", async () => {
  for (let size = 1; size <= 7; size += 1) {
    const log = await logOf(size);
    const root = await logMerkleRoot(log);
    for (let index = 0; index < size; index += 1) {
      const { leaf, proof } = await entryInclusionProof(log, index);
      assert.equal(await verifyEntryInclusion(leaf, proof, root), true, `size ${size} index ${index}`);
    }
  }
});

test("inclusion proofs reject a tampered leaf, proof node or root", async () => {
  const log = await logOf(5);
  const { leaf, root, proof } = await entryInclusionProof(log, 2);
  assert.equal(await verifyEntryInclusion(await rootFor(99), proof, root), false);
  const wrongRoot = await logMerkleRoot(await logOf(6));
  assert.equal(await verifyEntryInclusion(leaf, proof, wrongRoot), false);
  if (proof.length > 0) {
    const tamperedProof = proof.map((node, index) => (index === 0 ? { ...node, hash: "0".repeat(64) } : node));
    assert.equal(await verifyEntryInclusion(leaf, tamperedProof, root), false);
  }
});

test("an unsigned checkpoint is denied by default and admitted only when signature is optional", async () => {
  const log = await logOf(3);
  const checkpoint = await buildCheckpoint(log);
  const denied = await verifyCheckpoint({ checkpoint, log });
  assert.equal(denied.ok, false);
  assert.equal(denied.code, "TAMV_TRANSPARENCY_UNSIGNED");
  const allowed = await verifyCheckpoint({ checkpoint, log, requireSignature: false });
  assert.equal(allowed.ok, true);
  assert.equal(allowed.code, "TAMV_TRANSPARENCY_VALID");
});

test("a signed checkpoint verifies with its key and fails with a foreign or missing key", async () => {
  const log = await logOf(3);
  const pair = await generateEd25519KeyPair();
  const checkpoint = await signCheckpoint(await buildCheckpoint(log), pair.privateKey, pair.publicKey);
  assert.equal((await verifyCheckpoint({ checkpoint, log, publicKey: pair.publicKey })).code, "TAMV_TRANSPARENCY_VALID");
  assert.equal((await verifyCheckpoint({ checkpoint, log })).code, "TAMV_TRANSPARENCY_KEY_MISSING");
  const attacker = await generateEd25519KeyPair();
  assert.equal((await verifyCheckpoint({ checkpoint, log, publicKey: attacker.publicKey })).code, "TAMV_TRANSPARENCY_SIGNATURE_INVALID");
});

test("a checkpoint stops matching once the log grows or changes", async () => {
  const log = await logOf(3);
  const pair = await generateEd25519KeyPair();
  const checkpoint = await signCheckpoint(await buildCheckpoint(log), pair.privateKey, pair.publicKey);
  const grown = await appendEntry(log, { pack: "tamv-creator-intelligence", version: "3.0.3", sealRoot: await rootFor(3), issuedAt });
  assert.equal((await verifyCheckpoint({ checkpoint, log: grown, publicKey: pair.publicKey })).code, "TAMV_TRANSPARENCY_ROOT_MISMATCH");
});

test("buildCheckpoint refuses a broken log", async () => {
  const log = await logOf(2);
  const broken: TransparencyLog = { schema: log.schema, entries: [log.entries[1], log.entries[0]] };
  await assert.rejects(() => buildCheckpoint(broken), /broken transparency log/);
});