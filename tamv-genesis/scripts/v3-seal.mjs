#!/usr/bin/env node
/**
 * Build or verify the TAMV v3 pack seal.
 *
 * Only the public skills under tamv-genesis/v3 are enumerated. The 37 internal
 * contracts stay in tamv-pack and are referenced, not re-published.
 *
 * Usage:
 *   node --experimental-strip-types tamv-genesis/scripts/v3-seal.mjs --write
 *   node --experimental-strip-types tamv-genesis/scripts/v3-seal.mjs --verify
 *   TAMV_V3_PRIVATE_KEY="$(cat release-key.pem)" \
 *   TAMV_V3_PUBLIC_KEY="$(cat release-key.pub.pem)" \
 *   node --experimental-strip-types tamv-genesis/scripts/v3-seal.mjs --write --sign
 */
import { readFile, readdir, writeFile, mkdir } from "node:fs/promises";
import { createPublicKey } from "node:crypto";
import { dirname, extname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import {
  buildPackSeal,
  importEd25519PrivateKey,
  importEd25519PublicKey,
  signPackSeal,
  verifyPackSeal,
} from "../src/sovereign/index.ts";

const HERE = dirname(fileURLToPath(import.meta.url));
const GENESIS = resolve(HERE, "..");
const PACK_PATH = resolve(GENESIS, "v3", "pack.json");
const SEAL_PATH = resolve(GENESIS, "v3", "seals", "pack-seal.json");
const TEXT_EXTENSIONS = new Set([".md", ".json", ".txt", ".yaml", ".yml", ".ts", ".mjs", ".js"]);
const args = new Set(process.argv.slice(2));
const SIGN = args.has("--sign");
const REQUIRE_SIGNATURE = args.has("--require-signature");

function option(name, fallback) {
  const index = process.argv.indexOf(name);
  return index >= 0 && process.argv[index + 1] ? process.argv[index + 1] : fallback;
}

async function listFiles(root) {
  const output = [];
  async function walk(relative) {
    const absolute = resolve(root, relative);
    const entries = await readdir(absolute, { withFileTypes: true });
    for (const entry of entries) {
      const next = relative ? `${relative}/${entry.name}` : entry.name;
      if (entry.isDirectory()) await walk(next);
      else if (entry.isFile()) output.push(next);
    }
  }
  await walk("");
  return output.sort();
}

async function sourcesFromPack(pack) {
  const sources = [];
  for (const skill of pack.publicSkills) {
    const root = resolve(GENESIS, "v3", skill.path);
    const files = await listFiles(root);
    if (!files.length) throw new Error(`The public skill ${skill.id} has no files.`);
    if (!files.includes("SKILL.md")) throw new Error(`The public skill ${skill.id} has no SKILL.md.`);
    const contents = [];
    for (const path of files) {
      const content = await readFile(resolve(root, path), "utf8");
      if (!TEXT_EXTENSIONS.has(extname(path)) && !path.endsWith("SKILL.md")) {
        throw new Error(`Unexpected binary asset in public skill ${skill.id}: ${path}`);
      }
      contents.push({ path, content });
    }
    const frontmatter = contents.find((file) => file.path === "SKILL.md").content;
    const declared = /^---\nname:\s*([a-z0-9-]+)/m.exec(frontmatter)?.[1];
    if (declared !== skill.id) {
      throw new Error(`Frontmatter name ${String(declared)} does not match folder id ${skill.id}.`);
    }
    sources.push({
      id: skill.id,
      path: skill.path,
      requiresConsent: skill.requiresConsent === true,
      capabilities: skill.capabilities,
      files: contents,
    });
  }
  return sources;
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
  const pack = JSON.parse(await readFile(PACK_PATH, "utf8"));
  if (pack.schema !== "tamv.creator-intelligence.pack.v3") throw new Error("Unsupported v3 manifest schema.");
  const sources = await sourcesFromPack(pack);

  if (args.has("--verify")) {
    const raw = await readFile(SEAL_PATH, "utf8");
    const result = await verifyPackSeal({
      seal: JSON.parse(raw),
      sources,
      publicKey: await loadVerificationKey(),
      requireSignature: REQUIRE_SIGNATURE,
    });
    console.log(JSON.stringify({ code: result.code, allowed: result.allowed, detail: result.detail }, null, 2));
    if (!result.allowed) process.exitCode = 1;
    return;
  }

  const issuedAt = option("--date", "2026-11-14T00:00:00.000Z");
  let seal = await buildPackSeal({
    pack: pack.pack,
    version: pack.packVersion,
    issuedAt,
    skills: sources,
    internalContracts: { path: pack.internalContracts.path, count: pack.internalContracts.count },
  });
  if (SIGN) {
    const keys = await loadSigningKeys();
    seal = await signPackSeal(seal, keys.privateKey, keys.publicKey);
  }
  await mkdir(dirname(SEAL_PATH), { recursive: true });
  await writeFile(SEAL_PATH, JSON.stringify(seal, null, 2) + "\n", "utf8");
  console.log(`Sello v3 escrito: ${SEAL_PATH}`);
  console.log(`Raíz del paquete: ${seal.root}`);
  for (const skill of seal.skills) console.log(`  ${skill.id.padEnd(28)} ${skill.root}`);
  console.log(
    seal.signature.state
      ? "Firma: UNSIGNED_RELEASE_PENDING (fail-closed: el runtime negará las capacidades certificadas)."
      : `Firma: Ed25519 ${seal.signature.keyId}.`,
  );
}

main().catch((error) => {
  console.error("Falló el sello v3 TAMV:", error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
});
