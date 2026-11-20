#!/usr/bin/env node
/**
 * Positive approval gate for CI. A signature proves integrity, not approval:
 * the exact canonical manifest digest must be injected from a protected
 * repository variable (vars.TAMV_RELEASE_MANIFEST_SHA256), never from the
 * candidate tree. This script contains no signing or key material.
 */
import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const MANIFEST_PATH = resolve(ROOT, "tamv-attribution.json");

function canonicalJson(value) {
  if (value === null || typeof value === "string" || typeof value === "boolean") {
    return JSON.stringify(value) ?? "null";
  }
  if (typeof value === "number") {
    if (!Number.isFinite(value)) throw new Error("Número no válido en el manifest.");
    return JSON.stringify(value);
  }
  if (Array.isArray(value)) return "[" + value.map(canonicalJson).join(",") + "]";
  if (typeof value === "object") {
    return (
      "{" +
      Object.keys(value)
        .sort()
        .map((key) => JSON.stringify(key) + ":" + canonicalJson(value[key]))
        .join(",") +
      "}"
    );
  }
  throw new Error("Tipo no admitido en el manifest.");
}

function fail(message) {
  console.error("TAMV release digest gate: " + message);
  process.exitCode = 1;
}

async function main() {
  const approved = String(process.env.TAMV_RELEASE_MANIFEST_SHA256 ?? "").trim();
  if (!/^sha256:[a-f0-9]{64}$/.test(approved)) {
    fail("TAMV_RELEASE_MANIFEST_SHA256 no está configurado o no tiene formato sha256:<64 hex>.");
    return;
  }
  const manifest = JSON.parse(await readFile(MANIFEST_PATH, "utf8"));
  const actual =
    "sha256:" + createHash("sha256").update(canonicalJson(manifest), "utf8").digest("hex");
  if (actual !== approved) {
    fail(`el manifest del candidato es ${actual}, pero el digest aprobado es ${approved}.`);
    return;
  }
  console.log("TAMV release digest gate: APROBADO " + actual);
}

main().catch((error) => fail(error instanceof Error ? error.message : "error desconocido"));
