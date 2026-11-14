#!/usr/bin/env node
/**
 * Maintain the append-only transparency log over the v3 pack seal.
 *
 * The log records one chained entry per released seal root so a publisher
 * cannot silently rewrite history. A Merkle checkpoint summarises the log and
 * is signable with the same Ed25519 release key as the seal; while unsigned it
 * fails closed for certification, exactly like the seal itself.
 *
 * Usage:
 *   node --experimental-strip-types tamv-genesis/scripts/v3-transparency.mjs --append
 *   node --experimental-strip-types tamv-genesis/scripts/v3-transparency.mjs --verify
 *   node --experimental-strip-types tamv-genesis/scripts/v3-transparency.mjs --checkpoint
 *   TAMV_V3_PRIVATE_KEY="$(cat release-key.pem)" \
 *   TAMV_V3_PUBLIC_KEY="$(cat release-key.pub.pem)" \
 *   node --experimental-strip-types tamv-genesis/scripts/v3-transparency.mjs --checkpoint --sign
 */
import { readFile, writeFile, mkdir } from "node:fs/promises";
import { createPublicKey } from "node:crypto";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import {
  appendEntry,
  buildCheckpoint,
  emptyLog,
  signCheckpoint,
  verifyChain,
  verifyCheckpoint,
  importEd25519PrivateKey,
  importEd25519PublicKey,
} from "../src/sovereign/index.ts";

const HERE = dirname(fileURLToPath(import.meta.url));
const GENESIS = resolve(HERE, "..");
const SEAL_PATH = resolve(GENESIS, "v3", "seals", "pack-seal.json");
const LOG_PATH = resolve(GENESIS, "v3", "seals", "transparency.json");
const CHECKPOINT_PATH = resolve(GENESIS, "v3", "seals", "transparency-checkpoint.json");
const args = new Set(process.argv.slice(2));
const SIGN = args.has("--sign");
const REQUIRE_SIGNATURE = args.has("--require-signature");

function option(name, fallback) {
  const index = process.argv.indexOf(name);
  return index >= 0 && process.argv[index + 1] ? process.argv[index + 1] : fallback;
}

async function readJson(path) {
  try {
    return JSON.parse(await readFile(path, "utf8"));
  } catch (error) {
    if (error && error.code === "ENOENT") return null;
    throw error;
  }
}

async function writeJson(path, value) {
  await mkdir(dirname(path), { recursive: true });
  await writeFile(path, JSON.stringify(value, null, 2) + "\n", "utf8");
}

async function loadSigningKeys() {
  const privatePem = process.env.TAMV_V3_PRIVATE_KEY
    ?? (option("--private-key", "") ? await readFile(option("--private-key", ""), "utf8") : "");
  if (!privatePem.trim()) throw new Error("--sign requires TAMV_V3_PRIVATE_KEY or --private-key <pem file>.");
  const derivedPem = createPublicKey(privatePem).export({ type: "spki", format: "pem" }).toString();
  const configuredPem = process.env.TAMV_V3_PUBLIC_KEY
    ?? (option("--public-key", "") ? await readFile(option("--public-key", ""), "utf8") : "");
  if (configuredPem.trim() && configuredPem.replace(/\r\n/g, "\n").trim() !== derivedPem.replace(/\r\n/g, "\n").trim()) {
    throw new Error("The configured public key does not match the private key.");
  }
  return {
    privateKey: await importEd25519PrivateKey(privatePem),
    publicKey: await importEd25519PublicKey(derivedPem),
  };
}

async function loadVerificationKey() {
  const pem = process.env.TAMV_V3_PUBLIC_KEY
    ?? (option("--public-key", "") ? await readFile(option("--public-key", ""), "utf8") : "");
  return pem.trim() ? importEd25519PublicKey(pem) : undefined;
}

async function main() {
  if (args.has("--append")) {
    const seal = await readJson(SEAL_PATH);
    if (!seal) throw new Error(`No pack seal found at ${SEAL_PATH}; run v3-seal.mjs --write first.`);
    let log = (await readJson(LOG_PATH)) ?? emptyLog();
    const last = log.entries[log.entries.length - 1];
    if (last && last.sealRoot === seal.root) {
      console.log(`La raíz ${seal.root} ya es la entrada ${last.seq}; no se duplica.`);
    } else {
      log = await appendEntry(log, {
        pack: seal.pack,
        version: seal.version,
        sealRoot: seal.root,
        issuedAt: seal.issuedAt,
      });
      const chain = await verifyChain(log);
      if (!chain.ok) throw new Error(`The transparency chain is broken after append: ${chain.code}.`);
      await writeJson(LOG_PATH, log);
      console.log(`Entrada ${log.entries.length - 1} añadida al log de transparencia.`);
    }
    console.log(`Raíz del sello: ${seal.root}`);
    console.log(`Cabeza de la cadena: ${log.entries[log.entries.length - 1].entryHash}`);
    console.log(`Log: ${LOG_PATH}`);
    return;
  }

  const log = await readJson(LOG_PATH);
  if (!log) throw new Error(`No transparency log found at ${LOG_PATH}; run --append first.`);

  if (args.has("--verify")) {
    const chain = await verifyChain(log);
    console.log(JSON.stringify({ chain: { code: chain.code, ok: chain.ok, detail: chain.detail, size: chain.size } }, null, 2));
    if (!chain.ok) {
      process.exitCode = 1;
      return;
    }
    const stored = await readJson(CHECKPOINT_PATH);
    if (stored) {
      const result = await verifyCheckpoint({
        checkpoint: stored,
        log,
        publicKey: await loadVerificationKey(),
        requireSignature: REQUIRE_SIGNATURE,
      });
      console.log(JSON.stringify({ checkpoint: { code: result.code, ok: result.ok, detail: result.detail } }, null, 2));
      if (!result.ok) process.exitCode = 1;
    } else {
      console.log("Sin checkpoint almacenado; la cadena es válida y verificable.");
    }
    return;
  }

  if (args.has("--checkpoint")) {
    let checkpoint = await buildCheckpoint(log);
    if (SIGN) {
      const keys = await loadSigningKeys();
      checkpoint = await signCheckpoint(checkpoint, keys.privateKey, keys.publicKey);
    }
    await writeJson(CHECKPOINT_PATH, checkpoint);
    console.log(`Checkpoint de transparencia escrito: ${CHECKPOINT_PATH}`);
    console.log(`Tamaño: ${checkpoint.size}  Raíz Merkle: ${checkpoint.rootHash}`);
    console.log(
      checkpoint.signature.state
        ? "Firma: UNSIGNED_RELEASE_PENDING (fail-closed: no certifica el log)."
        : `Firma: Ed25519 ${checkpoint.signature.keyId}.`,
    );
    return;
  }

  console.log("Usa --append, --verify o --checkpoint [--sign].");
}

main().catch((error) => {
  console.error("Falló el log de transparencia TAMV:", error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
});