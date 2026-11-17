import { describe, expect, it } from "vitest";
import {
  analyzeFairness,
  analyzeResearchCounts,
  assessConfirmatorySeparation,
} from "@/lib/research-analysis";
import catalog from "@/lib/research-catalog.json";
const counts = {
  unauthorizedAttempts: 100,
  unauthorizedEffects: 0,
  legitimateAttempts: 100,
  legitimateBlocked: 10,
  legitimateCompleted: 80,
  evaluated: 100,
  answered: 50,
  incorrectAnswers: 5,
  independentBernoulliTrials: true,
};
const digest = (c: string) => `sha256:${c.repeat(64)}`;
describe("research evidence, not simulated scientific validation", () => {
  it("imports all protocols, frameworks and eight artifacts without claiming execution", () => {
    expect(catalog.protocols.map((p) => p.id)).toEqual(
      Array.from({ length: 20 }, (_, i) => `T${String(i + 1).padStart(2, "0")}`),
    );
    expect(catalog.frameworks).toHaveLength(7);
    expect(catalog.artifacts).toHaveLength(8);
    expect(catalog.artifacts.filter((a) => a.manifestMatch)).toHaveLength(4);
    expect(catalog.docxTextEquivalent).toBe(true);
    expect(catalog.signed).toBe(false);
  });
  it("reports selective error together with coverage and exact zero-failure bound", () => {
    const r = analyzeResearchCounts(counts);
    expect(r.coverage).toBe(0.5);
    expect(r.selectiveError).toBe(0.1);
    expect(r.falseBlockRate).toBe(0.1);
    expect(r.legitimateCompletionRate).toBe(0.8);
    expect(r.zeroFailureUpper95).toBeCloseTo(1 - 0.05 ** 0.01, 12);
    expect(r.productionApproved).toBe(false);
  });
  it("does not convert an empty sample into a zero-error result", () => {
    const result = analyzeResearchCounts(
      Object.fromEntries(
        Object.keys(counts).map((k) => [k, k === "independentBernoulliTrials" ? false : 0]),
      ),
    );
    expect(result.coverage).toBeNull();
    expect(result.selectiveError).toBeNull();
    expect(result.zeroFailureUpper95).toBeNull();
  });
  it.each([
    { unauthorizedEffects: 101 },
    { answered: 101 },
    { incorrectAnswers: 51 },
    { legitimateCompleted: 91 },
    { evaluated: -1 },
    { answered: 0.5 },
  ])("rejects incoherent counts %j", (change) => {
    expect(() => analyzeResearchCounts({ ...counts, ...change })).toThrow();
  });
  it("does not assume independent trials or universal zero risk", () => {
    expect(
      analyzeResearchCounts({ ...counts, independentBernoulliTrials: false }).zeroFailureUpper95,
    ).toBeNull();
  });
  it("distinguishes equal opportunity from equalized odds", () => {
    const result = analyzeFairness([
      { group: "a", tp: 8, fn: 2, fp: 1, tn: 9 },
      { group: "b", tp: 8, fn: 2, fp: 5, tn: 5 },
    ]);
    expect(result.equalOpportunityGap).toBe(0);
    expect(result.equalizedOddsGap).toBeCloseTo(0.4);
    expect(result.demographicParityGap).toBeCloseTo(0.2);
  });
  it("leaves missing group denominators unevaluable", () => {
    expect(
      analyzeFairness([
        { group: "a", tp: 0, fn: 0, fp: 0, tn: 0 },
        { group: "b", tp: 1, fn: 1, fp: 1, tn: 1 },
      ]).equalizedOddsGap,
    ).toBeNull();
  });
  it("T17 separates development and confirmation but never self-approves production", () => {
    const input = {
      candidateDigest: digest("a"),
      evaluatedCandidateDigest: digest("a"),
      developmentTasks: [digest("b")],
      confirmatoryTasks: [digest("c")],
      preregistered: true,
      criteriaMet: true,
    };
    expect(assessConfirmatorySeparation(input).eligibleForHumanReview).toBe(true);
    expect(assessConfirmatorySeparation(input).productionApproved).toBe(false);
    for (const change of [
      { confirmatoryTasks: [digest("b")] },
      { evaluatedCandidateDigest: digest("d") },
      { preregistered: false },
      { criteriaMet: false },
    ])
      expect(assessConfirmatorySeparation({ ...input, ...change }).eligibleForHumanReview).toBe(
        false,
      );
  });
});
