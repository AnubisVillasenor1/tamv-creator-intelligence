import test from "node:test";
import assert from "node:assert/strict";

import { GATE_CAP, compileScorecard, gradeFor, validateDimensions, weightedScore } from "../src/scorecard.ts";
import type { ScoreDimension, Scorecard } from "../src/types.ts";

function dimension(id: string, weight: number, score: number): ScoreDimension {
  return { id, label: id, weight, score, evidence: "artifact", nextPoint: "next" };
}

const dimensions = [
  dimension("a", 40, 100),
  dimension("b", 30, 50),
  dimension("c", 30, 0),
];

test("weights must sum to 100", () => {
  const valid = [
    dimension("a", 20, 80),
    dimension("b", 20, 80),
    dimension("c", 15, 80),
    dimension("d", 15, 80),
    dimension("e", 15, 80),
    dimension("f", 15, 80),
  ];
  const problems = validateDimensions(valid.slice(0, 2));
  assert.ok(problems.some((problem) => problem.code === "weight-sum"));
  assert.deepEqual(validateDimensions(valid), []);
});

test("weighted score is exact and grade follows thresholds", () => {
  assert.equal(weightedScore(dimensions), 55);
  assert.equal(gradeFor(55), "D");
  assert.equal(gradeFor(90), "A");
  assert.equal(gradeFor(59.9), "D");
  assert.equal(gradeFor(60), "C");
});

test("a failed blocking gate caps the score", () => {
  const gates: Scorecard["gates"] = [
    { id: "G1", label: "signed", passed: false, blocking: true, detail: "unsigned" },
  ];
  const { scorecard } = compileScorecard({
    subject: "test",
    generatedAt: "2026-11-13",
    verdict: "test",
    dimensions: [
      dimension("a", 20, 100),
      dimension("b", 20, 100),
      dimension("c", 20, 100),
      dimension("d", 20, 100),
      dimension("e", 20, 100),
    ],
    gates,
  });
  assert.equal(scorecard.rawWeightedScore, 100);
  assert.equal(scorecard.weightedScore, GATE_CAP);
  assert.equal(scorecard.gateCapApplied, true);
});

test("a non-blocking failure does not cap", () => {
  const { scorecard } = compileScorecard({
    subject: "test",
    generatedAt: "2026-11-13",
    verdict: "test",
    dimensions: [
      dimension("a", 20, 80),
      dimension("b", 20, 80),
      dimension("c", 20, 80),
      dimension("d", 20, 80),
      dimension("e", 20, 80),
      dimension("f", 0.0001, 100),
    ],
    gates: [{ id: "G2", label: "optional", passed: false, blocking: false, detail: "optional" }],
  });
  assert.ok(scorecard.weightedScore > GATE_CAP);
  assert.equal(scorecard.gateCapApplied, false);
});
