/**
 * TAMV GENESIS Ω — scorecard arithmetic.
 *
 * Weights are public, scores are integers, and a failed blocking gate caps the
 * total. A scorecard that can say "92/100" while the release is unsigned is
 * worse than no scorecard.
 */

import type { ScoreDimension, Scorecard } from "./types.ts";

export const GATE_CAP = 59;
export const MIN_DIMENSIONS = 6;

export interface ScorecardInput {
  readonly subject: string;
  readonly generatedAt: string;
  readonly verdict: string;
  readonly dimensions: readonly ScoreDimension[];
  readonly gates: Scorecard["gates"];
}

export interface ScorecardProblem {
  readonly code: "weight-sum" | "score-range" | "missing-evidence" | "too-few-dimensions" | "duplicate-id";
  readonly detail: string;
}

export function validateDimensions(dimensions: readonly ScoreDimension[]): ScorecardProblem[] {
  const problems: ScorecardProblem[] = [];
  if (dimensions.length < MIN_DIMENSIONS) {
    problems.push({ code: "too-few-dimensions", detail: `at least ${MIN_DIMENSIONS} dimensions are required` });
  }
  const ids = new Set<string>();
  for (const dimension of dimensions) {
    if (ids.has(dimension.id)) problems.push({ code: "duplicate-id", detail: dimension.id });
    ids.add(dimension.id);
    if (!(dimension.score >= 0 && dimension.score <= 100)) {
      problems.push({ code: "score-range", detail: `${dimension.id} score ${dimension.score}` });
    }
    if (!Number.isFinite(dimension.weight) || dimension.weight <= 0) {
      problems.push({ code: "score-range", detail: `${dimension.id} weight ${dimension.weight}` });
    }
    if (!dimension.evidence.trim() || !dimension.nextPoint.trim()) {
      problems.push({ code: "missing-evidence", detail: dimension.id });
    }
  }
  const totalWeight = dimensions.reduce((total, dimension) => total + dimension.weight, 0);
  if (Math.abs(totalWeight - 100) > 0.01) {
    problems.push({ code: "weight-sum", detail: `weights sum to ${totalWeight}, expected 100` });
  }
  return problems;
}

export function weightedScore(dimensions: readonly ScoreDimension[]): number {
  const total = dimensions.reduce((sum, dimension) => sum + dimension.score * dimension.weight, 0);
  const weight = dimensions.reduce((sum, dimension) => sum + dimension.weight, 0);
  if (weight === 0) return 0;
  return Math.round((total / weight) * 10) / 10;
}

export function gradeFor(score: number): string {
  if (score >= 95) return "A+";
  if (score >= 90) return "A";
  if (score >= 85) return "A-";
  if (score >= 80) return "B+";
  if (score >= 75) return "B";
  if (score >= 70) return "B-";
  if (score >= 65) return "C+";
  if (score >= 60) return "C";
  if (score >= 50) return "D";
  return "F";
}

export function compileScorecard(input: ScorecardInput): { scorecard: Scorecard; problems: readonly ScorecardProblem[] } {
  const problems = validateDimensions(input.dimensions);
  const raw = weightedScore(input.dimensions);
  const blockingFailure = input.gates.some((gate) => gate.blocking && !gate.passed);
  const capped = blockingFailure ? Math.min(raw, GATE_CAP) : raw;
  const scorecard: Scorecard = {
    schema: "tamv.scorecard.v1",
    subject: input.subject,
    generatedAt: input.generatedAt,
    scale: "0-100",
    weightedScore: capped,
    rawWeightedScore: raw,
    gateCapApplied: blockingFailure && capped !== raw,
    grade: gradeFor(capped),
    verdict: input.verdict,
    dimensions: input.dimensions,
    gates: input.gates,
  };
  return { scorecard, problems };
}

export function formatScorecard(scorecard: Scorecard): string {
  const lines: string[] = [];
  lines.push(`# Scorecard — ${scorecard.subject}`);
  lines.push("");
  lines.push(`Score: **${scorecard.weightedScore}/100 (${scorecard.grade})**`);
  if (scorecard.gateCapApplied && scorecard.rawWeightedScore !== undefined) {
    lines.push(`Raw weighted score ${scorecard.rawWeightedScore} capped at ${GATE_CAP} by a failed blocking gate.`);
  }
  lines.push("");
  lines.push("| Dimension | Weight | Score | Evidence | Next point |");
  lines.push("|---|---:|---:|---|---|");
  for (const dimension of scorecard.dimensions) {
    lines.push(
      `| ${dimension.label} | ${dimension.weight} | ${dimension.score} | ${escapeCell(dimension.evidence)} | ${escapeCell(dimension.nextPoint)} |`,
    );
  }
  lines.push("");
  lines.push("| Gate | Blocking | Status | Detail |");
  lines.push("|---|---|---|---|");
  for (const gate of scorecard.gates) {
    lines.push(
      `| ${gate.label} | ${gate.blocking ? "yes" : "no"} | ${gate.passed ? "pass" : "fail"} | ${escapeCell(gate.detail)} |`,
    );
  }
  return lines.join("\n");
}

function escapeCell(value: string): string {
  return value.replace(/\|/g, "\\|").replace(/\n/g, " ");
}
