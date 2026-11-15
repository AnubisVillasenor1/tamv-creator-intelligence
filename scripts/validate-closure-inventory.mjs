#!/usr/bin/env node
import { readdir, readFile, stat } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const CLOSURE_PATH = "tamv-genesis/v3/closure.json";
const PACK_PATH = "tamv-genesis/v3/pack.json";
const SKILLS_REGISTRY_PATH = "skills.sh.json";
const ALLOWED_STATUSES = new Set([
  "closed",
  "contract",
  "documented",
  "partial",
  "blocked",
  "open",
  "not-applicable",
]);
const errors = [];
const warnings = [];

function fail(message) {
  errors.push(message);
}

async function readJson(relativePath) {
  try {
    return JSON.parse(await readFile(path.join(ROOT, relativePath), "utf8"));
  } catch (error) {
    fail(`Cannot read valid JSON at ${relativePath}: ${error.message}`);
    return null;
  }
}

async function existsAsFile(relativePath) {
  if (
    typeof relativePath !== "string" ||
    relativePath.length === 0 ||
    path.isAbsolute(relativePath) ||
    relativePath.split(/[\\/]/).includes("..")
  ) {
    return false;
  }

  try {
    return (await stat(path.join(ROOT, relativePath))).isFile();
  } catch {
    return false;
  }
}

async function collectFiles(directory) {
  const absoluteDirectory = path.join(ROOT, directory);
  const files = [];

  async function visit(current) {
    let entries;
    try {
      entries = await readdir(current, { withFileTypes: true });
    } catch (error) {
      fail(`Cannot enumerate ${path.relative(ROOT, current)}: ${error.message}`);
      return;
    }

    for (const entry of entries) {
      const fullPath = path.join(current, entry.name);
      if (entry.isSymbolicLink()) {
        warnings.push(`Symlink not followed: ${path.relative(ROOT, fullPath)}`);
      } else if (entry.isDirectory()) {
        await visit(fullPath);
      } else if (entry.isFile()) {
        files.push(path.relative(ROOT, fullPath).split(path.sep).join("/"));
      }
    }
  }

  await visit(absoluteDirectory);
  return files;
}

const [closure, pack, registry] = await Promise.all([
  readJson(CLOSURE_PATH),
  readJson(PACK_PATH),
  readJson(SKILLS_REGISTRY_PATH),
]);

if (!closure || closure.schema !== "tamv.closure.v1" || !Array.isArray(closure.modules)) {
  fail(`${CLOSURE_PATH} must use schema tamv.closure.v1 and contain a modules array`);
}
if (!pack || pack.schema !== "tamv.creator-intelligence.pack.v3" || !Array.isArray(pack.publicSkills)) {
  fail(`${PACK_PATH} must use schema tamv.creator-intelligence.pack.v3 and contain publicSkills`);
}
if (!registry || !Array.isArray(registry.groupings)) {
  fail(`${SKILLS_REGISTRY_PATH} must contain a groupings array`);
}

const repositoryFiles = new Set(await collectFiles("."));
const internalSkillFiles = [...repositoryFiles].filter(
  (file) => /^tamv-pack\/skills\/[^/]+\/SKILL\.md$/.test(file),
);
const declaredInternalCount = pack?.internalContracts?.count;

if (Number.isInteger(declaredInternalCount) && declaredInternalCount !== internalSkillFiles.length) {
  fail(
    `Internal contract count mismatch: pack declares ${declaredInternalCount}, tree contains ${internalSkillFiles.length} SKILL.md files`,
  );
}

const publicSkills = Array.isArray(pack?.publicSkills) ? pack.publicSkills : [];
const packSkillIds = publicSkills.map((skill) => skill?.id).filter(Boolean);
const registrySkillIds = (registry?.groupings ?? []).flatMap((group) =>
  Array.isArray(group?.skills) ? group.skills : [],
);
const closureModules = Array.isArray(closure?.modules) ? closure.modules : [];

if (new Set(packSkillIds).size !== packSkillIds.length) {
  fail("pack.json contains duplicate public skill IDs");
}
if (new Set(registrySkillIds).size !== registrySkillIds.length) {
  fail("skills.sh.json contains duplicate public skill IDs");
}
if (
  [...packSkillIds].sort().join("\n") !==
  [...registrySkillIds].sort().join("\n")
) {
  fail("Public skill IDs differ between pack.json and skills.sh.json");
}

const moduleIds = closureModules.map((module) => module?.id).filter(Boolean);
if (new Set(moduleIds).size !== moduleIds.length) {
  fail("closure.json contains duplicate module IDs");
}

const coveredSkills = new Set();
const coveredCapabilities = new Set();

for (const module of closureModules) {
  if (!module || typeof module.id !== "string" || module.id.trim() === "") {
    fail("Every closure module must have a non-empty id");
    continue;
  }

  if (!ALLOWED_STATUSES.has(module.status)) {
    fail(`Module ${module.id} has unknown status: ${String(module.status)}`);
  }

  for (const skill of module.publicSkills ?? []) coveredSkills.add(skill);
  for (const capability of module.capabilities ?? []) coveredCapabilities.add(capability);

  for (const field of ["evidence", "tests"]) {
    if (module[field] !== undefined && !Array.isArray(module[field])) {
      fail(`Module ${module.id} field ${field} must be an array when provided`);
      continue;
    }
    for (const reference of module[field] ?? []) {
      if (!(await existsAsFile(reference))) {
        fail(`Module ${module.id} references missing or unsafe ${field} path: ${String(reference)}`);
      }
    }
  }

  if (module.status === "closed") {
    if (!Array.isArray(module.evidence) || module.evidence.length === 0) {
      fail(`Module ${module.id} is closed without evidence`);
    }
    if (!Array.isArray(module.tests) || module.tests.length === 0) {
      fail(`Module ${module.id} is closed without test references`);
    }
  }
}

for (const skill of packSkillIds) {
  if (!coveredSkills.has(skill)) {
    fail(`Public skill ${skill} is not covered by any closure module`);
  }
  const skillDoc = `tamv-genesis/v3/skills/${skill}/SKILL.md`;
  if (!(await existsAsFile(skillDoc))) {
    fail(`Public skill document is missing: ${skillDoc}`);
  }
}

const declaredCapabilities = new Set(
  publicSkills.flatMap((skill) => Array.isArray(skill?.capabilities) ? skill.capabilities : []),
);
for (const capability of declaredCapabilities) {
  if (!coveredCapabilities.has(capability)) {
    fail(`Public capability ${capability} is not mapped to a closure module`);
  }
}

if (errors.length > 0) {
  console.error("TAMV closure inventory validation FAILED:");
  for (const error of errors) console.error(`- ${error}`);
  process.exitCode = 1;
} else {
  console.log("TAMV closure inventory validation PASSED");
  console.log(`- Closure modules: ${closureModules.length}`);
  console.log(`- Public skills: ${packSkillIds.length}`);
  console.log(`- Internal contracts (SKILL.md): ${internalSkillFiles.length}`);
  console.log(`- Public capabilities mapped: ${declaredCapabilities.size}`);
}

for (const warning of warnings) console.warn(`WARN: ${warning}`);
