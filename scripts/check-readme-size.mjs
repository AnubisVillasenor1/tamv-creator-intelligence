#!/usr/bin/env node
import { readFile } from "node:fs/promises";

const path = new URL("../README.md", import.meta.url);
const maximumLines = 100;
const maximumCharacters = 8000;
const readme = await readFile(path, "utf8");
const lines = readme.split(/\r?\n/);
const errors = [];
if (readme.length > maximumCharacters) errors.push(`README.md has ${readme.length} characters; limit is ${maximumCharacters}.`);
if (lines.length > maximumLines) errors.push(`README.md has ${lines.length} lines; limit is ${maximumLines}.`);
if (!readme.includes("docs/README.md")) errors.push("README.md must link to docs/README.md.");
if (!readme.includes("UNSIGNED_RELEASE_PENDING")) errors.push("README.md must accurately disclose the pending release-signature state.");
if (errors.length) {
  for (const error of errors) console.error("README policy: " + error);
  process.exitCode = 1;
} else {
  console.log(`README policy passed: ${lines.length} lines, ${readme.length} characters.`);
}
