#!/usr/bin/env node
import path from "node:path";
import { fileURLToPath } from "node:url";
import { MAINTAINED_DOCUMENTS, validateMarkdownLinks } from "./lib/documentation-links.mjs";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const errors = await validateMarkdownLinks({ root });

if (errors.length > 0) {
  console.error("Documentation reference validation failed:");
  for (const error of errors) console.error(" - " + error);
  process.exitCode = 1;
} else {
  console.log("DOCUMENTATION_LINKS_OK");
  console.log("Validated " + MAINTAINED_DOCUMENTS.length + " maintained documentation files.");
}
