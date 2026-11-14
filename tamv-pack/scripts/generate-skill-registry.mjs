#!/usr/bin/env node
/**
 * Keeps `src/lib/skill-registry.ts` in sync with the SKILL.md contracts.
 *
 * Only fills fields that are still placeholders, so curated names, categories
 * and dependencies are preserved. Idempotent; exits 1 under `--check` when a
 * placeholder remains.
 *
 * Usage: node tamv-pack/scripts/generate-skill-registry.mjs [--check]
 */

import { readFileSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(HERE, "..", "..");
const SKILLS_DIR = resolve(ROOT, "tamv-pack", "skills");
const REGISTRY = resolve(ROOT, "src", "lib", "skill-registry.ts");
const CHECK = process.argv.includes("--check");

const PLACEHOLDER = "Consultar contrato del skill";
const GENERIC_DESCRIPTION = "Skill original del Creator Intelligence Pack.";

function section(source, names) {
  for (const name of names) {
    const match = new RegExp(`^## ${name}\\s*\\n([\\s\\S]*?)(?=\\n## |$)`, "m").exec(source);
    if (!match) continue;
    const items = match[1]
      .split(/\r?\n/)
      .map((line) => line.replace(/^\s*(?:[-*]|\d+\.)\s*/, "").trim())
      .filter((line) => line && !line.startsWith("#"));
    if (items.length > 0) return items.join(", ");
  }
  return null;
}

function frontmatterDescription(source) {
  const front = /^---\r?\n([\s\S]*?)\r?\n---/.exec(source)?.[1] ?? "";
  return front.match(/^description:\s*(.+)$/m)?.[1]?.trim() ?? null;
}

let registry = readFileSync(REGISTRY, "utf8");
let changed = 0;
const missing = [];

for (const match of registry.matchAll(/"id":\s*"([^"]+)"/g)) {
  const id = match[1];
  const start = registry.indexOf(`"id": "${id}"`);
  const tail = start >= 0 ? registry.slice(start) : "";
  const close = /\n  \}(?:,|\n\])/.exec(tail);
  const end = close ? start + close.index : -1;
  if (start < 0 || end < 0) {
    missing.push(`${id}: bloque no localizado`);
    continue;
  }
  let block = registry.slice(start, end);
  const source = readFileSync(join(SKILLS_DIR, id, "SKILL.md"), "utf8");

  if (block.includes(PLACEHOLDER)) {
    const inputs = section(source, ["Entradas requeridas"]);
    const outputs = section(source, ["Contrato de salida", "Salida esperada", "Respuesta esperada", "Salida"]);
    if (!inputs || !outputs) {
      missing.push(`${id}: SKILL.md sin entradas o salida`);
      continue;
    }
    block = block
      .replace(`"inputs": "${PLACEHOLDER}"`, `"inputs": ${JSON.stringify(inputs)}`)
      .replace(`"outputs": "${PLACEHOLDER}"`, `"outputs": ${JSON.stringify(outputs)}`);
  }

  if (block.includes(`"description": "${GENERIC_DESCRIPTION}"`)) {
    const description = frontmatterDescription(source);
    if (description) {
      block = block.replace(`"description": "${GENERIC_DESCRIPTION}"`, `"description": ${JSON.stringify(description)}`);
    }
  }

  const updated = registry.slice(0, start) + block + registry.slice(end);
  if (updated !== registry) {
    changed += 1;
    registry = updated;
  }
}

const remaining = (registry.match(new RegExp(PLACEHOLDER, "g")) ?? []).length;
if (CHECK) {
  if (changed > 0) console.error(`registro desactualizado: ${changed} entradas`);
  if (remaining > 0) console.error(`quedan ${remaining} campos con «${PLACEHOLDER}»`);
  process.exitCode = changed > 0 || remaining > 0 || missing.length > 0 ? 1 : 0;
} else {
  writeFileSync(REGISTRY, registry, "utf8");
  console.log(`actualizados: ${changed}, placeholders restantes: ${remaining}`);
}
for (const problem of missing) console.error(problem);
if (missing.length > 0) process.exitCode = 1;
