#!/usr/bin/env node
/**
 * Build the committed GitHub profile inventory.
 *
 * Input: raw GitHub API snapshots (public metadata only). Output:
 *   tamv-genesis/data/github-profiles.json   aggregates + normalized metadata
 *   docs/PROFILES.md                         generated, human-readable report
 *
 * Usage:
 *   node --experimental-strip-types tamv-genesis/scripts/profile-inventory.mjs \
 *     --input OsoPanda1=oso1.json --input OsoPanda1=oso2.json \
 *     --input AnubisVillasenor1=anubis.json \
 *     --user OsoPanda1=oso-user.json --user AnubisVillasenor1=anubis-user.json \
 *     --write
 *
 * Nothing is fetched here. A network call belongs to the operator, not to the
 * reproducible build: the same snapshot must produce the same file.
 */

import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import {
  auditProfiles,
  normalizeProfile,
  renderProfilesMarkdown,
} from "../src/profiles.ts";

const HERE = dirname(fileURLToPath(import.meta.url));
const PACKAGE_ROOT = resolve(HERE, "..");
const REPO_ROOT = resolve(PACKAGE_ROOT, "..");

function parseArgs(argv) {
  const options = { inputs: new Map(), users: new Map(), write: false, date: null, out: null, docs: null };
  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === "--write") options.write = true;
    else if (arg === "--date") options.date = argv[++index];
    else if (arg === "--out") options.out = argv[++index];
    else if (arg === "--docs") options.docs = argv[++index];
    else if (arg === "--input") addTo(options.inputs, argv[++index], "--input");
    else if (arg === "--user") addTo(options.users, argv[++index], "--user");
    else if (arg === "--help" || arg === "-h") options.help = true;
    else throw new Error(`Argumento desconocido: ${arg}`);
  }
  return options;
}

function addTo(map, value, flag) {
  if (!value || !value.includes("=")) throw new Error(`${flag} requiere login=ruta`);
  const at = value.indexOf("=");
  const login = value.slice(0, at).trim();
  const path = value.slice(at + 1).trim();
  if (!login || !path) throw new Error(`${flag} requiere login=ruta`);
  const list = map.get(login) ?? [];
  list.push(path);
  map.set(login, list);
}

function readJson(path) {
  const raw = readFileSync(resolve(path), "utf8").replace(/^\uFEFF/, "");
  return JSON.parse(raw);
}

function localDate(now = new Date()) {
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function readArray(path) {
  const value = readJson(path);
  if (!Array.isArray(value)) throw new Error(`${path} no contiene un arreglo`);
  return value;
}

function readObject(path) {
  const value = readJson(path);
  if (Array.isArray(value) || typeof value !== "object" || value === null) {
    throw new Error(`${path} no contiene un objeto`);
  }
  return value;
}

function mergeRepos(paths) {
  const byName = new Map();
  for (const path of paths) {
    for (const repo of readArray(path)) {
      if (!repo || typeof repo.name !== "string") continue;
      const key = repo.full_name ?? repo.name;
      if (byName.has(key)) continue;
      byName.set(key, repo);
    }
  }
  return [...byName.values()];
}

function fallbackUser(login, repos) {
  const created = repos
    .map((repo) => repo.created_at)
    .filter(Boolean)
    .sort()[0];
  return {
    login,
    name: login,
    bio: null,
    company: null,
    location: null,
    blog: null,
    html_url: `https://github.com/${login}`,
    public_repos: repos.length,
    followers: 0,
    following: 0,
    created_at: created ?? null,
  };
}

function main() {
  const options = parseArgs(process.argv.slice(2));
  if (options.help) {
    console.log("Uso: profile-inventory.mjs --input <login=ruta>... [--user <login=ruta>...] [--write] [--date YYYY-MM-DD]");
    return 0;
  }
  if (options.inputs.size === 0) {
    console.error("Falta al menos un --input login=ruta con el snapshot de repositorios.");
    return 2;
  }

  const capturedAt = options.date ?? localDate();
  const profiles = [];
  for (const [login, paths] of options.inputs) {
    const repos = mergeRepos(paths);
    const userPaths = options.users.get(login) ?? [];
    const user = userPaths.length > 0 ? readObject(userPaths[0]) : fallbackUser(login, repos);
    if (!user.login) user.login = login;
    const profile = normalizeProfile({ user, repos, capturedAt });
    profiles.push({
      ...profile,
      repos: [...profile.repos].sort((a, b) => a.name.localeCompare(b.name)),
    });
  }

  const doc = {
    schema: "tamv.profiles.v1",
    capturedAt,
    method:
      "GitHub REST API: GET /users/{login} and GET /users/{login}/repos?per_page=100 (authenticated, paginated). Normalized by tamv-genesis/src/profiles.ts.",
    policy:
      "Metadatos públicos únicamente. Los forks se registran como forks y no se presentan como autoría. El contenido de los repositorios no se descarga ni se redistribuye. La vertical restringida se inventaría sin clonar.",
    profiles: profiles.sort((a, b) => a.login.localeCompare(b.login)),
  };

  const problems = auditProfiles(doc, new Date());
  for (const profile of doc.profiles) {
    const s = profile.summary;
    console.log(
      `${profile.login}: ${s.total} repos (${s.originals} originales, ${s.forks} forks), ${s.stars} estrellas, ${s.forksReceived} forks recibidos, ${s.zeroStarOriginals} originales con 0 estrellas.`,
    );
  }
  if (problems.length > 0) {
    console.error(`\n${problems.length} problema(s) de inventario:`);
    for (const problem of problems) console.error(`  ${problem.login} ${problem.code}: ${problem.detail}`);
    return 1;
  }
  console.log("Inventario consistente: totales, forks, fechas y métricas recalculadas.");

  if (!options.write) {
    console.log("Sin --write: no se escribió ningún archivo.");
    return 0;
  }

  const out = resolve(options.out ?? join(PACKAGE_ROOT, "data", "github-profiles.json"));
  const docs = resolve(options.docs ?? join(REPO_ROOT, "docs", "PROFILES.md"));
  mkdirSync(dirname(out), { recursive: true });
  writeFileSync(out, JSON.stringify(doc, null, 2) + "\n", "utf8");
  writeFileSync(docs, renderProfilesMarkdown(doc), "utf8");
  console.log(`Datos: ${out}`);
  console.log(`Documento: ${docs}`);
  return 0;
}

process.exitCode = main();
