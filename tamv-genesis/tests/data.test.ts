import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync, readdirSync, existsSync } from "node:fs";
import { createHash } from "node:crypto";
import { fileURLToPath } from "node:url";

import { assessClaim, summarizeClaims } from "../src/claims.ts";
import { assessCapability, detectCapabilityDrift } from "../src/capabilities.ts";
import { auditKnowledgeSources } from "../src/knowledge.ts";
import { compileScorecard } from "../src/scorecard.ts";
import { auditLedger, verifyLedger } from "../src/workledger.ts";

const ROOT = fileURLToPath(new URL("../../", import.meta.url));
const read = (path: string) => readFileSync(new URL(`../../${path}`, import.meta.url), "utf8");
const json = (path: string) => JSON.parse(read(path));
const hash = (value: string) => createHash("sha256").update(value).digest("hex");
const NOW = new Date("2026-11-13T00:00:00Z");

const claims = json("tamv-genesis/data/claims.json").claims;
const capabilities = json("tamv-genesis/data/capabilities.json").capabilities;
const ledger = json("tamv-genesis/data/work-ledger.json");
const scorecard = json("tamv-genesis/data/scorecard.json");
const knowledge = json("tamv-genesis/data/knowledge-sources.json").sources;
const pack = json("tamv-pack/pack.json");

test("no claim claims more than its evidence supports", () => {
  for (const claim of claims) {
    const assessment = assessClaim(claim, NOW);
    if (claim.status === "contradicted" || claim.status === "retracted") continue;
    assert.equal(
      assessment.effectiveStatus,
      claim.status,
      `${claim.id}: declared ${claim.status}, earned ${assessment.effectiveStatus} (${assessment.issues.join(",")})`,
    );
  }
});

test("every claim has evidence and a falsifier", () => {
  for (const claim of claims) {
    assert.ok(claim.evidence.length > 0, claim.id);
    assert.ok(claim.whatWouldChangeIt.length > 20, claim.id);
  }
});

test("the hours claim stays unverified", () => {
  const hours = claims.find((claim: { id: string }) => claim.id === "C-001");
  assert.equal(hours.status, "unverified");
  assert.equal(ledger.claim.status, "unverified");
});

test("claim summary is internally consistent", () => {
  const summary = summarizeClaims(claims, NOW);
  assert.equal(summary.total, claims.length);
  const counted = Object.values(summary.byStatus).reduce((a: number, b: number) => a + b, 0);
  assert.equal(counted, claims.length);
});

test("work ledger chain verifies and exposes unattested hours", () => {
  const verification = verifyLedger(ledger, hash);
  assert.equal(verification.valid, true, verification.problems.join(","));
  const findings = auditLedger(ledger).map((finding) => finding.code);
  assert.ok(findings.includes("unattested-hours"));
});

test("scorecard recomputes to the declared value", () => {
  const compiled = compileScorecard({
    subject: scorecard.subject,
    generatedAt: scorecard.generatedAt,
    verdict: scorecard.verdict,
    dimensions: scorecard.dimensions,
    gates: scorecard.gates,
  });
  assert.deepEqual(compiled.problems, []);
  assert.equal(compiled.scorecard.weightedScore, scorecard.weightedScore);
  assert.equal(compiled.scorecard.grade, scorecard.grade);
});

test("capabilities never exceed their evidence", () => {
  for (const capability of capabilities) {
    const assessment = assessCapability(capability, {
      certificationValid: false,
      killSwitchActive: false,
      now: NOW,
    });
    assert.ok(
      assessment.earned === capability.maturity || assessment.gaps.length > 0,
      `${capability.id} earned ${assessment.earned} without a recorded gap`,
    );
  }
});

test("route vocabulary matches the policy allowlist", () => {
  const policySource = read("src/lib/hypercore-turbo/policy.ts");
  const union = policySource.match(/export type GovernedCapability =([\s\S]*?);/);
  assert.ok(union, "policy union not found");
  const policyIds = [...union![1].matchAll(/"([^"]+)"/g)].map((match) => match[1]);
  const routeIds: string[] = [];
  for (const file of readdirSync(new URL("../../src/routes/", import.meta.url))) {
    if (!/\.tsx?$/.test(file)) continue;
    const source = readFileSync(new URL(`../../src/routes/${file}`, import.meta.url), "utf8");
    for (const match of source.matchAll(/unavailableTamvCapabilityResponse\("([^"]+)"\)/g)) {
      routeIds.push(match[1]);
    }
  }
  const drift = detectCapabilityDrift(
    capabilities.map((capability: { id: string }) => capability.id),
    routeIds,
  );
  assert.deepEqual(drift.undeclared, []);
  const catalogDrift = detectCapabilityDrift(
    policyIds,
    capabilities.map((capability: { id: string }) => capability.id),
  );
  assert.deepEqual(catalogDrift.missing, []);
});

test("the knowledge catalogue excludes restricted material", () => {
  assert.deepEqual(auditKnowledgeSources(knowledge), []);
  const restricted = knowledge.filter((source: { sensitivity: string }) => source.sensitivity === "restricted");
  assert.ok(restricted.length > 0);
  for (const source of restricted) assert.equal(source.use, "excluded");
});

test("all 37 skills carry discoverable frontmatter", () => {
  assert.equal(pack.skills.length, 37);
  for (const id of pack.skills) {
    const path = `tamv-pack/skills/${id}/SKILL.md`;
    assert.ok(existsSync(new URL(`../../${path}`, import.meta.url)), path);
    const source = read(path);
    const front = source.match(/^---\r?\n([\s\S]*?)\r?\n---/);
    assert.ok(front, `${id} lacks frontmatter`);
    assert.match(front![1], new RegExp(`^name:\\s*${id}$`, "m"));
    assert.match(front![1], /^description:\s*\S+/m);
  }
});

test("skills.sh discovery is configured", () => {
  const config = json("skills.sh.json");
  assert.ok(config.paths.includes("./tamv-pack/skills"));
});
