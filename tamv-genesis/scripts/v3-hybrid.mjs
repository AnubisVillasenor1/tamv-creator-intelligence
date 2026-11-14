#!/usr/bin/env node
/**
 * Hybrid envelope CLI for protected TAMV payloads.
 *
 *   node --experimental-strip-types tamv-genesis/scripts/v3-hybrid.mjs seal \
 *     --in protected.txt --out protected.envelope.json --public-key recipient.pub.pem --aad "tamv:pack:3.0.0"
 *
 *   node --experimental-strip-types tamv-genesis/scripts/v3-hybrid.mjs open \
 *     --in protected.envelope.json --out protected.txt --private-key recipient.pem --aad "tamv:pack:3.0.0"
 *
 * The plaintext is never written by `seal` and never committed. Losing the
 * private key means losing the payload; there is no recovery backdoor.
 */
import { readFile, writeFile } from "node:fs/promises";

import {
  importX25519PrivateKey,
  importX25519PublicKey,
  openHybrid,
  sealHybrid,
} from "../src/sovereign/index.ts";

const [action] = process.argv.slice(2);
const args = process.argv.slice(3);

function option(name, fallback) {
  const index = args.indexOf(name);
  return index >= 0 && args[index + 1] ? args[index + 1] : fallback;
}

async function main() {
  const input = option("--in");
  const output = option("--out");
  const aad = option("--aad", "");
  if (!input || !output) throw new Error("Both --in and --out are required.");

  if (action === "seal") {
    const keyPath = option("--public-key");
    if (!keyPath) throw new Error("--public-key is required to seal a payload.");
    const recipient = await importX25519PublicKey(await readFile(keyPath, "utf8"));
    const plaintext = await readFile(input);
    const envelope = await sealHybrid(recipient, new Uint8Array(plaintext), aad);
    await writeFile(output, JSON.stringify(envelope, null, 2) + "\n", "utf8");
    console.log(`Sobre híbrido escrito: ${output}`);
    return;
  }

  if (action === "open") {
    const keyPath = option("--private-key");
    if (!keyPath) throw new Error("--private-key is required to open a payload.");
    const recipient = await importX25519PrivateKey(await readFile(keyPath, "utf8"));
    const envelope = JSON.parse(await readFile(input, "utf8"));
    const plaintext = await openHybrid(recipient, envelope, aad);
    await writeFile(output, plaintext);
    console.log(`Payload descifrado (${plaintext.byteLength} bytes).`);
    return;
  }

  throw new Error("Use seal or open.");
}

main().catch((error) => {
  console.error("Falló el sobre híbrido TAMV:", error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
});
