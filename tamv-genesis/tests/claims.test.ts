import test from "node:test";
import assert from "node:assert/strict";

import { assessClaim, findConflicts, summarizeClaims } from "../src/claims.ts";
import type { Claim } from "../src/types.ts";

const NOW = new Date("2026-11-13T00:00:00Z");

function claim(overrides: Partial<Claim> = {}): Claim {
  return {
    id: "C-T",
    statement: "statement",
    status: "corroborated",
    confidence: 0.5,
    sourceType: "machine-check",
    owner: "TAMV",
    domain: "technical",
    evidence: [{ id: "E1", kind: "file", locator: "README.md" }],
    whatWouldChangeIt: "a reproducible artifact from a third party",
    reviewedAt: "2026-11-01",
    ...overrides,
  };
}

test("verified without independent evidence is downgraded", () => {
  const assessment = assessClaim(claim({ status: "verified" }), NOW);
  assert.equal(assessment.effectiveStatus, "corroborated");
  assert.ok(assessment.issues.includes("verified-without-independent"));
});

test("self-published claims cap at unverified", () => {
  const assessment = assessClaim(
    claim({ sourceType: "self-published", evidence: [{ id: "E", kind: "url", locator: "https://blog.test/post" }] }),
    NOW,
  );
  assert.equal(assessment.effectiveStatus, "unverified");
});

test("a bare statement cannot support more than a declaration", () => {
  const assessment = assessClaim(
    claim({
      status: "unverified",
      sourceType: "self-published",
      evidence: [{ id: "E", kind: "statement", locator: "spoken to the auditor" }],
    }),
    NOW,
  );
  assert.equal(assessment.effectiveStatus, "declared");
  assert.equal(assessment.ceiling, "declared");
});

test("no evidence collapses to declared and is flagged", () => {
  const assessment = assessClaim(claim({ status: "corroborated", evidence: [] }), NOW);
  assert.equal(assessment.effectiveStatus, "declared");
  assert.ok(assessment.issues.includes("no-evidence"));
});

test("contradicted is terminal and survives the ladder", () => {
  const assessment = assessClaim(claim({ status: "contradicted" }), NOW);
  assert.equal(assessment.effectiveStatus, "contradicted");
  assert.ok(assessment.issues.includes("terminal-status"));
});

test("stale reviews are reported", () => {
  const assessment = assessClaim(claim({ reviewedAt: "2025-01-01" }), NOW);
  assert.ok(assessment.issues.includes("stale-review"));
});

test("conflicts are explicit and deduplicated", () => {
  const a = claim({ id: "C-A", contradicts: ["C-B"] });
  const b = claim({ id: "C-B", contradicts: ["C-A"] });
  const conflicts = findConflicts([a, b]);
  assert.equal(conflicts.length, 1);
  assert.equal(conflicts[0].kind, "declared-contradiction");
});

test("summary counts effective status, not declared status", () => {
  const summary = summarizeClaims(
    [
      claim({ id: "C-1", status: "verified" }),
      claim({ id: "C-2", status: "contradicted", contradicts: ["C-1"] }),
    ],
    NOW,
  );
  assert.equal(summary.total, 2);
  assert.equal(summary.byStatus.verified, 0);
  assert.equal(summary.byStatus.corroborated, 1);
  assert.equal(summary.byStatus.contradicted, 1);
});
