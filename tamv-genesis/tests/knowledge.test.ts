import test from "node:test";
import assert from "node:assert/strict";

import { auditKnowledgeSources, selectPublishable, summarizeCorpus } from "../src/knowledge.ts";
import type { KnowledgeSource } from "../src/types.ts";

const digest = "sha256:" + "a".repeat(64);

function source(overrides: Partial<KnowledgeSource> = {}): KnowledgeSource {
  return {
    id: "KS-1",
    title: "t",
    kind: "markdown",
    origin: "file.md",
    capturedAt: "2026-11-13",
    sha256: digest,
    bytes: 10,
    license: "AGPL-3.0-only",
    sensitivity: "internal",
    use: "doctrine",
    notes: "",
    ...overrides,
  };
}

test("restricted material must be excluded", () => {
  const problems = auditKnowledgeSources([source({ sensitivity: "restricted", use: "doctrine" })]);
  assert.ok(problems.some((problem) => problem.code === "restricted-must-be-excluded"));
  assert.equal(auditKnowledgeSources([source({ sensitivity: "restricted", use: "excluded" })]).length, 0);
});

test("confidential material cannot be product", () => {
  const problems = auditKnowledgeSources([source({ sensitivity: "confidential", use: "product" })]);
  assert.ok(problems.some((problem) => problem.code === "confidential-in-public-bundle"));
});

test("bad digests and duplicate ids are rejected", () => {
  const problems = auditKnowledgeSources([source({ sha256: "sha256:short" }), source()]);
  const codes = problems.map((problem) => problem.code);
  assert.ok(codes.includes("bad-digest"));
  assert.ok(codes.includes("duplicate-id"));
});

test("publishable selection respects the ceiling", () => {
  const sources = [
    source({ id: "public", sensitivity: "public" }),
    source({ id: "internal", sensitivity: "internal" }),
    source({ id: "confidential", sensitivity: "confidential", use: "legal" }),
    source({ id: "restricted", sensitivity: "restricted", use: "excluded" }),
  ];
  assert.deepEqual(
    selectPublishable(sources, "internal").map((entry) => entry.id),
    ["public", "internal"],
  );
  assert.deepEqual(
    selectPublishable(sources, "confidential").map((entry) => entry.id),
    ["public", "internal", "confidential"],
  );
  assert.equal(summarizeCorpus(sources).excluded, 1);
});
