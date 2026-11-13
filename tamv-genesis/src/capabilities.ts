/**
 * TAMV GENESIS Ω — capability maturity.
 *
 * A capability never inherits maturity from a sibling, a roadmap or a slogan.
 * Each level is earned by an artifact that a stranger can inspect.
 */

import { MATURITY_ORDER } from "./types.ts";
import type { Capability, MaturityLevel } from "./types.ts";

export type MaturityIndex = number;

export function maturityIndex(level: MaturityLevel): MaturityIndex {
  return MATURITY_ORDER.indexOf(level);
}

export function maturityAt(index: number): MaturityLevel {
  return MATURITY_ORDER[Math.max(0, Math.min(MATURITY_ORDER.length - 1, index))];
}

export interface CapabilityContext {
  /** True only when release hashes and signature verify. */
  readonly certificationValid: boolean;
  readonly killSwitchActive: boolean;
  readonly now?: Date;
}

export interface CapabilityAssessment {
  readonly id: string;
  readonly declared: MaturityLevel;
  readonly earned: MaturityLevel;
  readonly evidenceCeiling: MaturityLevel;
  readonly gaps: readonly string[];
  readonly runnable: boolean;
}

const OPERATION_MIN_DAYS = 30;

/**
 * Compute the highest defensible level. The declared level is treated as an
 * upper bound *claim*, and is lowered when artifacts are missing.
 */
export function assessCapability(capability: Capability, context: CapabilityContext): CapabilityAssessment {
  const gaps: string[] = [];
  let ceiling = maturityIndex("M1-contracted");

  const hasImplementation = capability.implementedBy.length > 0;
  const hasBoundary = capability.endpoints.length > 0 || capability.implementedBy.some((path) => path.includes("."));
  if (hasImplementation && hasBoundary) ceiling = maturityIndex("M2-implemented");
  else gaps.push("implementation-or-boundary-missing");

  const tests = capability.evidence.filter((ref) => ref.kind === "test");
  if (ceiling >= maturityIndex("M2-implemented") && tests.length > 0) ceiling = maturityIndex("M3-tested");
  else if (tests.length === 0) gaps.push("no-reproducible-test");

  if (ceiling >= maturityIndex("M3-tested") && capability.operatedSince) {
    const since = new Date(capability.operatedSince);
    const days = Number.isNaN(since.getTime())
      ? 0
      : Math.floor(((context.now ?? new Date()).getTime() - since.getTime()) / 86_400_000);
    if (days >= OPERATION_MIN_DAYS) ceiling = maturityIndex("M4-operated");
    else gaps.push(`operation-window-${Math.max(0, OPERATION_MIN_DAYS - days)}d-short`);
  } else if (!capability.operatedSince) {
    gaps.push("no-operation-window");
  }

  const audit = capability.evidence.filter((ref) => ref.kind === "attestation");
  if (ceiling >= maturityIndex("M3-tested") && audit.length > 0) ceiling = maturityIndex("M5-audited");
  else gaps.push("no-independent-audit");

  if (capability.requiresCertification !== false && !context.certificationValid) {
    ceiling = Math.min(ceiling, maturityIndex("M2-implemented"));
    gaps.push("release-unsigned");
  }

  const declared = maturityIndex(capability.maturity);
  const earnedIndex = Math.min(declared, ceiling);
  if (earnedIndex < declared) gaps.push("declared-level-unsupported");

  const runnable =
    !context.killSwitchActive &&
    capability.blockedBy.length === 0 &&
    (capability.requiresCertification === false || context.certificationValid);

  return {
    id: capability.id,
    declared: capability.maturity,
    earned: maturityAt(earnedIndex),
    evidenceCeiling: maturityAt(ceiling),
    gaps,
    runnable,
  };
}

export interface CapabilityDrift {
  readonly missing: readonly string[];
  readonly undeclared: readonly string[];
}

/**
 * Compare the policy allowlist against the ids the runtime actually emits.
 * This is the check that catches `voice.generate` vs `voice.generation`.
 */
export function detectCapabilityDrift(
  policyIds: readonly string[],
  runtimeIds: readonly string[],
): CapabilityDrift {
  const policy = new Set(policyIds);
  const runtime = new Set(runtimeIds);
  return {
    missing: policyIds.filter((id) => !runtime.has(id)),
    undeclared: runtimeIds.filter((id) => !policy.has(id)),
  };
}

/**
 * Normalise near-duplicate ids so drift is detected instead of hidden.
 * Returns canonical ids, preferring the policy spelling.
 */
export function canonicalizeCapabilityId(id: string, policyIds: readonly string[]): string {
  if (policyIds.includes(id)) return id;
  const stem = (value: string) => value.replace(/\.(generate|generation|execute|execution|orchestrate|orchestration)$/, "");
  const candidate = policyIds.find((entry) => stem(entry) === stem(id));
  return candidate ?? id;
}

export function capabilitySummaryLine(assessment: CapabilityAssessment): string {
  const mark = assessment.earned === assessment.declared ? "=" : "<";
  return `${assessment.id}: ${assessment.earned} ${mark} ${assessment.declared}`;
}
