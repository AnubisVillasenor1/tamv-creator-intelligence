#!/usr/bin/env node
/**
 * Adds the YAML frontmatter that skills.sh requires to any SKILL.md that lacks
 * it. Idempotent: files that already declare `name` and `description` are left
 * untouched. The body is never reformatted.
 *
 * Usage: node tamv-pack/scripts/normalize-skill-frontmatter.mjs [--check]
 */

import { readFileSync, readdirSync, writeFileSync, existsSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const HERE = dirname(fileURLToPath(import.meta.url));
const SKILLS_DIR = resolve(HERE, "..", "skills");
const CHECK = process.argv.includes("--check");

function firstParagraph(body) {
  const lines = body.split(/\r?\n/);
  let inHeading = false;
  const collected = [];
  for (const line of lines) {
    const trimmed = line.trim();
    if (trimmed.startsWith("## ")) {
      inHeading = /prop[oó]sito|purpose|qu[eé] hace|descripci[oó]n/i.test(trimmed);
      if (collected.length > 0) break;
      continue;
    }
    if (!inHeading || !trimmed || trimmed.startsWith("#") || trimmed.startsWith("-")) continue;
    collected.push(trimmed);
    if (collected.join(" ").length > 120) break;
  }
  if (collected.length === 0) {
    const fallback = lines.map((line) => line.trim()).find((line) => line && !line.startsWith("#"));
    return fallback ?? "";
  }
  return collected.join(" ").replace(/\s+/g, " ").slice(0, 200);
}

function frontmatterFor(id, body) {
  const paragraph = firstParagraph(body) || `Skill ${id} del paquete TAMV Creator Intelligence.`;
  const description = paragraph.replace(/"/g, "'").replace(/\s+/g, " ").trim();
  return `---\nname: ${id}\ndescription: ${description}\nlicense: AGPL-3.0-only\nmetadata:\n  author: TAMV ONLINE NETWORK\n  pack: tamv-creator-intelligence\n---\n`;
}

let changed = 0;
let invalid = 0;
for (const id of readdirSync(SKILLS_DIR)) {
  const file = join(SKILLS_DIR, id, "SKILL.md");
  if (!existsSync(file)) continue;
  const source = readFileSync(file, "utf8");
  const match = source.match(/^---\r?\n([\s\S]*?)\r?\n---/);
  if (match && /^name:\s*\S+/m.test(match[1]) && /^description:\s*\S+/m.test(match[1])) continue;
  if (match) {
    invalid += 1;
    console.error(`frontmatter incompleto: ${id}`);
    continue;
  }
  changed += 1;
  if (CHECK) {
    console.error(`falta frontmatter: ${id}`);
    continue;
  }
  const header = frontmatterFor(id, source);
  writeFileSync(file, header + source.replace(/^\uFEFF/, ""), "utf8");
}

console.log(`${CHECK ? "revisados" : "normalizados"}: ${changed}${invalid ? `, incompletos: ${invalid}` : ""}`);
process.exitCode = CHECK && (changed > 0 || invalid > 0) ? 1 : 0;
