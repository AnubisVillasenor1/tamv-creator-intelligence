#!/usr/bin/env node
import assert from "node:assert/strict";
import { mkdtemp, mkdir, readFile, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { validateMarkdownLinks } from "./lib/documentation-links.mjs";

const root = await mkdtemp(path.join(os.tmpdir(), "tamv-doc-links-"));
try {
  await mkdir(path.join(root, "docs"), { recursive: true });
  await writeFile(path.join(root, "docs", "target.md"), "# Target Heading\n\nText.\n", "utf8");
  await writeFile(path.join(root, "docs", "space file.md"), "# Space File\n", "utf8");
  await writeFile(
    path.join(root, "docs", "README.md"),
    [
      "# Index",
      "",
      "[target](target.md#target-heading)",
      "[space in file name](space%20file.md#space-file)",
      "[external](https://example.org/reference)",
      "[mailto](mailto:docs@example.org)",
      "```md",
      "[ignored fenced link](missing-fenced.md)",
      "```",
      "",
      "Inline code: `[ignored inline link](missing-inline.md)`",
      "",
    ].join("\n"),
    "utf8",
  );

  let errors = await validateMarkdownLinks({ root, documents: ["docs/README.md"] });
  assert.deepEqual(errors, [], "valid, encoded, and external links pass; code samples are ignored");

  await writeFile(
    path.join(root, "docs", "README.md"),
    [
      "[missing](missing.md)",
      "[bad anchor](target.md#no-such-heading)",
      "[escape](../../outside.md)",
      "[encoded escape](%2e%2e/%2e%2e/outside.md)",
      "[malformed anchor](target.md#%E0%A4%A)",
      "[unsafe scheme](javascript:alert)",
      "",
    ].join("\n"),
    "utf8",
  );
  errors = await validateMarkdownLinks({ root, documents: ["docs/README.md"] });
  assert.equal(errors.length, 6, "missing paths, invalid anchors, traversal, malformed encoding and unsafe schemes are rejected");
  assert.ok(errors.some((error) => error.includes("broken internal link")));
  assert.ok(errors.some((error) => error.includes("missing Markdown heading anchor")));
  assert.ok(errors.some((error) => error.includes("escapes repository root")));
  assert.ok(errors.some((error) => error.includes("malformed percent-encoding")));
  assert.ok(errors.some((error) => error.includes("unsupported or unsafe link scheme")));

  const generated = await readFile(path.join(root, "docs", "target.md"), "utf8");
  assert.match(generated, /Target Heading/, "fixture remains intact");
  console.log("DOCUMENTATION_LINK_VALIDATOR_TESTS_OK");
} finally {
  await rm(root, { recursive: true, force: true });
}
