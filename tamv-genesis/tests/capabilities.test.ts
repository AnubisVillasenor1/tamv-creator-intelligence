import test from "node:test";
import assert from "node:assert/strict";

import {
  assessCapability,
  canonicalizeCapabilityId,
  detectCapabilityDrift,
  maturityIndex,
} from "../src/capabilities.ts";
import type { Capability } from "../src/types.ts";

const NOW = new Date("2026-11-13T00:00:00Z");

function capability(overrides: Partial<Capability> = {}): Capability {
  return {
    id: "demo.capability",
    label: "Demo",
    summary: "demo",
    maturity: "M3-tested",
    riskTier: "R2",
    requiresConsent: true,
    externalSideEffects: false,
    implementedBy: ["src/demo.ts"],
    endpoints: ["POST /api/demo"],
    evidence: [{ id: "T", kind: "test", locator: "src/test/demo.test.ts" }],
    blockedBy: [],
    nextGate: "G-x",
    ...overrides,
  };
}

test("a test artifact is required for M3", () => {
  const withTest = assessCapability(capability(), { certificationValid: true, killSwitchActive: false, now: NOW });
  assert.equal(withTest.earned, "M3-tested");
  const withoutTest = assessCapability(capability({ evidence: [] }), {
    certificationValid: true,
    killSwitchActive: false,
    now: NOW,
  });
  assert.equal(withoutTest.earned, "M2-implemented");
  assert.ok(withoutTest.gaps.includes("no-reproducible-test"));
});

test("an unsigned release caps certified capabilities at M2", () => {
  const assessment = assessCapability(capability({ maturity: "M4-operated", operatedSince: "2025-01-01" }), {
    certificationValid: false,
    killSwitchActive: false,
    now: NOW,
  });
  assert.ok(maturityIndex(assessment.earned) <= maturityIndex("M2-implemented"));
  assert.ok(assessment.gaps.includes("release-unsigned"));
});

test("a declared level above the evidence is lowered", () => {
  const assessment = assessCapability(capability({ maturity: "M5-audited" }), {
    certificationValid: true,
    killSwitchActive: false,
    now: NOW,
  });
  assert.equal(assessment.earned, "M3-tested");
  assert.ok(assessment.gaps.includes("declared-level-unsupported"));
});

test("drift catches generate vs generation", () => {
  const drift = detectCapabilityDrift(
    ["voice.generation", "agent.orchestration", "music.generation"],
    ["voice.generate", "agent.execute", "music.generation"],
  );
  assert.deepEqual(drift.missing.sort(), ["agent.orchestration", "voice.generation"]);
  assert.deepEqual(drift.undeclared.sort(), ["agent.execute", "voice.generate"]);
});

test("canonicalisation maps aliases to the policy spelling", () => {
  const policy = ["voice.generation", "agent.orchestration"];
  assert.equal(canonicalizeCapabilityId("voice.generate", policy), "voice.generation");
  assert.equal(canonicalizeCapabilityId("agent.execute", policy), "agent.orchestration");
  assert.equal(canonicalizeCapabilityId("music.generation", policy), "music.generation");
});
