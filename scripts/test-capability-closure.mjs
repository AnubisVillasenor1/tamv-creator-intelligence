#!/usr/bin/env node
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { closureInventoryLine, validateClosure, validateReadmeInventory } from "./validate-capability-closure.mjs";

const root = process.cwd();
const read = (path) => JSON.parse(readFileSync(resolve(root, path), "utf8"));
const base = {
  closure: read("tamv-genesis/v3/closure.json"),
  pack: read("tamv-genesis/v3/pack.json"),
  skillsManifest: read("skills.sh.json"),
};
const valid = validateClosure(base);
assert.deepEqual(valid.errors, [], valid.errors.join("\n"));
assert.ok(valid.moduleCount > 0);
assert.equal(valid.publicSkillCount, 4);

const duplicate = structuredClone(base);
duplicate.closure.modules.push(structuredClone(duplicate.closure.modules[0]));
assert.ok(validateClosure(duplicate).errors.some((error) => error.includes("duplicate module id")));

const missingEvidence = structuredClone(base);
const closedModule = missingEvidence.closure.modules.find((module) => module.status === "closed");
closedModule.evidence = ["path/that/does/not/exist.txt"];
assert.ok(validateClosure(missingEvidence).errors.some((error) => error.includes("references missing path")));

const missingTests = structuredClone(base);
const anotherClosedModule = missingTests.closure.modules.find((module) => module.status === "closed");
anotherClosedModule.tests = [];
assert.ok(validateClosure(missingTests).errors.some((error) => error.includes("closed without tests")));

const uncoveredCapability = structuredClone(base);
uncoveredCapability.closure.modules = uncoveredCapability.closure.modules.map((module) => ({
  ...module,
  capabilities: (module.capabilities ?? []).filter((capability) => capability !== "creator.strategy"),
}));
assert.ok(validateClosure(uncoveredCapability).errors.some((error) => error.includes("capability has no closure module: creator.strategy")));

const unknownStatus = structuredClone(base);
unknownStatus.closure.modules[0].status = "production-ready";
assert.ok(validateClosure(unknownStatus).errors.some((error) => error.includes("status is invalid")));

const inventoryLine = closureInventoryLine(base);
assert.deepEqual(validateReadmeInventory(inventoryLine, base), []);
assert.ok(validateReadmeInventory(inventoryLine.replace(`**${base.closure.modules.length} módulos**`, "**-1 módulos**"), base).length);
assert.ok(validateReadmeInventory("No inventory", base).length);
assert.ok(validateReadmeInventory(`${inventoryLine}\n${inventoryLine}`, base).length);
assert.deepEqual(validateReadmeInventory(readFileSync(resolve(root, "README.md"), "utf8"), base), []);

console.log("Capability closure regression tests passed (11 scenarios).");
