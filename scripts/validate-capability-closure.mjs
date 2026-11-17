#!/usr/bin/env node
import { existsSync, readFileSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const allowedStatuses = new Set(["closed", "contract", "documented", "partial", "blocked", "open"]);

export function validateClosure({ closure, pack, skillsManifest, exists = (path) => existsSync(resolve(root, path)) }) {
  const errors = [];
  const modules = Array.isArray(closure?.modules) ? closure.modules : [];
  if (closure?.schema !== "tamv.closure.v1") errors.push("closure.schema must be tamv.closure.v1");
  if (!modules.length) errors.push("closure.modules must be a non-empty array");

  const moduleIds = new Set();
  const coveredCapabilities = new Set();
  const coveredSkills = new Set();
  for (const [index, module] of modules.entries()) {
    const where = `modules[${index}]`;
    if (!module || typeof module !== "object") {
      errors.push(`${where} must be an object`);
      continue;
    }
    if (!module.id || typeof module.id !== "string") errors.push(`${where}.id is required`);
    else if (moduleIds.has(module.id)) errors.push(`duplicate module id: ${module.id}`);
    else moduleIds.add(module.id);

    if (!allowedStatuses.has(module.status)) errors.push(`${where}.status is invalid: ${module.status}`);
    const evidence = Array.isArray(module.evidence) ? module.evidence : [];
    const tests = Array.isArray(module.tests) ? module.tests : [];
    const capabilities = Array.isArray(module.capabilities) ? module.capabilities : [];
    const publicSkills = Array.isArray(module.publicSkills) ? module.publicSkills : [];
    if (typeof module.note !== "string" || !module.note.trim()) errors.push(`${where}.note must explain scope and limits`);
    if (module.status === "closed" && evidence.length === 0) errors.push(`${where} is closed without evidence`);
    if (module.status === "closed" && tests.length === 0) errors.push(`${where} is closed without tests`);
    for (const path of [...evidence, ...tests]) {
      if (typeof path !== "string" || !path.trim()) errors.push(`${where} contains an invalid evidence/test path`);
      else if (!exists(path)) errors.push(`${where} references missing path: ${path}`);
    }
    capabilities.forEach((capability) => coveredCapabilities.add(capability));
    publicSkills.forEach((skill) => coveredSkills.add(skill));
  }

  const declaredSkills = Array.isArray(pack?.publicSkills) ? pack.publicSkills : [];
  if (!declaredSkills.length) errors.push("pack.publicSkills must be non-empty");
  const packSkills = new Set(declaredSkills.map((skill) => skill?.id).filter(Boolean));
  for (const skill of packSkills) if (!coveredSkills.has(skill)) errors.push(`public skill has no closure module: ${skill}`);
  for (const skill of coveredSkills) if (!packSkills.has(skill)) errors.push(`closure references unknown public skill: ${skill}`);

  const declaredCapabilities = new Set(declaredSkills.flatMap((skill) => Array.isArray(skill?.capabilities) ? skill.capabilities : []));
  for (const capability of declaredCapabilities) if (!coveredCapabilities.has(capability)) errors.push(`capability has no closure module: ${capability}`);
  for (const capability of coveredCapabilities) if (!declaredCapabilities.has(capability)) errors.push(`closure references undeclared capability: ${capability}`);

  const registrySkills = new Set((skillsManifest?.groupings ?? []).flatMap((group) => Array.isArray(group?.skills) ? group.skills : []));
  for (const skill of packSkills) if (!registrySkills.has(skill)) errors.push(`public skill missing from skills.sh registry: ${skill}`);
  for (const skill of registrySkills) if (!packSkills.has(skill)) errors.push(`skills.sh registry contains unknown skill: ${skill}`);

  return { errors, moduleCount: modules.length, closedCount: modules.filter((module) => module?.status === "closed").length, publicSkillCount: packSkills.size, capabilityCount: declaredCapabilities.size };
}

export function closureInventoryLine({ closure, pack }) {
  const modules = closure.modules;
  const skills = pack.publicSkills;
  const capabilities = new Set(skills.flatMap((skill) => skill.capabilities));
  const states = [...allowedStatuses].map((status) => `${status}=${modules.filter((module) => module.status === status).length}`);
  return `Inventario validado: **${modules.length} módulos** · **${skills.length} skills públicas** · **${pack.internalContracts.count} contratos internos** · **${capabilities.size} capacidades**; estados: ${states.join(", ")}.`;
}

export function validateReadmeInventory(readme, input) {
  const expected = closureInventoryLine(input);
  const lines = readme.split(/\r?\n/).filter((line) => line.startsWith("Inventario validado:"));
  return lines.length === 1 && lines[0] === expected ? [] : [`README inventory is stale or missing. Expected: ${expected}`];
}

function readJson(relativePath) {
  return JSON.parse(readFileSync(resolve(root, relativePath), "utf8"));
}

function run() {
  const input = {
    closure: readJson("tamv-genesis/v3/closure.json"),
    pack: readJson("tamv-genesis/v3/pack.json"),
    skillsManifest: readJson("skills.sh.json"),
  };
  const result = validateClosure(input);
  if (!result.errors.length) result.errors.push(...validateReadmeInventory(readFileSync(resolve(root, "README.md"), "utf8"), input));
  console.log("TAMV capability closure validation");
  console.log(`Modules: ${result.moduleCount}; closed: ${result.closedCount}; public skills: ${result.publicSkillCount}; capabilities: ${result.capabilityCount}`);
  if (result.errors.length) {
    for (const error of result.errors) console.error(`FAIL: ${error}`);
    process.exitCode = 1;
    return;
  }
  console.log("PASS: evidence paths, test paths, module states, capability coverage, and public skill registry are consistent.");
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) run();
