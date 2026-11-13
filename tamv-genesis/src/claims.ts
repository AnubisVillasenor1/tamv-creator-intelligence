/**
 * TAMV GENESIS Ω — claim discipline.
 *
 * The central rule: a claim may never be stronger than the weakest link in its
 * evidence chain, and independence cannot be simulated by volume.
 */

import {
  CLAIM_STATUS_RANK,
  auditEvidenceRefs,
  hasIndependentEvidence,
  statusCeiling,
  weakerStatus,
} from "./evidence.ts";
import type { Claim, ClaimStatus } from "./types.ts";

export type ClaimIssue =
  | "no-evidence"
  | "no-falsifier"
  | "verified-without-independent"
  | "self-published-verified"
  | "stale-review"
  | "unsupported-status"
  | "contradiction-unresolved"
  | "terminal-status";

export interface ClaimAssessment {
  readonly id: string;
  readonly declaredStatus: ClaimStatus;
  readonly effectiveStatus: ClaimStatus;
  readonly ceiling: ClaimStatus;
  readonly independent: boolean;
  readonly issues: readonly ClaimIssue[];
  readonly evidenceCount: number;
  readonly reviewAgeDays: number;
}

const DAY_MS = 86_400_000;
export const REVIEW_MAX_AGE_DAYS = 180;

/**
 * Downgrade, never upgrade. A reviewer may lower a status; only new evidence
 * may raise it, which happens by editing the data and re-running the audit.
 */
export function assessClaim(claim: Claim, now = new Date()): ClaimAssessment {
  const issues: ClaimIssue[] = [];
  const ceiling = statusCeiling(claim.evidence, claim.sourceType);
  const independent = hasIndependentEvidence(claim.evidence);
  let effective = claim.status;

  if (CLAIM_STATUS_RANK[claim.status] < 0) {
    issues.push("terminal-status");
  } else {
    if (claim.status === "verified" && !independent) {
      issues.push("verified-without-independent");
    }
    if (claim.evidence.length === 0) {
      issues.push("no-evidence");
      effective = "declared";
    }
    if (claim.whatWouldChangeIt.trim().length < 12) {
      issues.push("no-falsifier");
    }
    if (!claim.whatWouldChangeIt.trim()) {
      effective = weakerStatus(effective, "declared");
    }
    if (CLAIM_STATUS_RANK[effective] > CLAIM_STATUS_RANK[ceiling]) {
      issues.push("unsupported-status");
      effective = ceiling;
    }
    if (effective === "verified" && !independent) {
      effective = "corroborated";
    }
    if (claim.sourceType === "self-published" && effective === "verified") {
      issues.push("self-published-verified");
      effective = "corroborated";
    }
  }

  const reviewed = new Date(claim.reviewedAt);
  const reviewAgeDays = Number.isNaN(reviewed.getTime())
    ? Number.POSITIVE_INFINITY
    : Math.floor((now.getTime() - reviewed.getTime()) / DAY_MS);
  if (reviewAgeDays > REVIEW_MAX_AGE_DAYS) issues.push("stale-review");

  const structural = auditEvidenceRefs(claim.evidence, now);
  if (structural.length > 0 && effective !== "contradicted" && effective !== "retracted") {
    const broken = structural.some((issue) => issue.problem !== "future-capture");
    if (broken) effective = weakerStatus(effective, "unverified");
  }

  return {
    id: claim.id,
    declaredStatus: claim.status,
    effectiveStatus: effective,
    ceiling,
    independent,
    issues,
    evidenceCount: claim.evidence.length,
    reviewAgeDays,
  };
}

export interface ClaimConflict {
  readonly a: string;
  readonly b: string;
  readonly kind: "declared-contradiction" | "shared-topic-divergence";
}

/** Explicit `contradicts` links plus topic groups whose statuses cannot both hold. */
export function findConflicts(claims: readonly Claim[]): ClaimConflict[] {
  const conflicts: ClaimConflict[] = [];
  const seen = new Set<string>();
  for (const claim of claims) {
    for (const target of claim.contradicts ?? []) {
      const key = [claim.id, target].sort().join("|");
      if (seen.has(key)) continue;
      seen.add(key);
      conflicts.push({ a: claim.id, b: target, kind: "declared-contradiction" });
    }
  }
  const byTopic = new Map<string, Claim[]>();
  for (const claim of claims) {
    for (const tag of claim.tags ?? []) {
      const bucket = byTopic.get(tag) ?? [];
      bucket.push(claim);
      byTopic.set(tag, bucket);
    }
  }
  for (const [topic, bucket] of byTopic) {
    if (bucket.length < 2) continue;
    const verified = bucket.filter((claim) => claim.status === "verified");
    if (verified.length > 1) {
      for (let index = 1; index < verified.length; index++) {
        const key = [verified[0].id, verified[index].id].sort().join("|");
        if (seen.has(key)) continue;
        seen.add(key);
        conflicts.push({ a: verified[0].id, b: verified[index].id, kind: "shared-topic-divergence" });
      }
    }
  }
  return conflicts;
}

export interface ClaimLedgerSummary {
  readonly total: number;
  readonly byStatus: Record<ClaimStatus, number>;
  readonly independentClaims: number;
  readonly claimsWithIssues: number;
  readonly staleClaims: number;
  readonly conflicts: number;
  /** Share of claims whose evidence is machine-checkable or better. */
  readonly machineCheckableShare: number;
}

export function summarizeClaims(claims: readonly Claim[], now = new Date()): ClaimLedgerSummary {
  const byStatus: Record<ClaimStatus, number> = {
    declared: 0,
    unverified: 0,
    corroborated: 0,
    verified: 0,
    contradicted: 0,
    retracted: 0,
  };
  let claimsWithIssues = 0;
  let staleClaims = 0;
  let machine = 0;
  let independent = 0;
  for (const claim of claims) {
    const assessment = assessClaim(claim, now);
    byStatus[assessment.effectiveStatus] += 1;
    if (assessment.issues.length > 0) claimsWithIssues += 1;
    if (assessment.issues.includes("stale-review")) staleClaims += 1;
    if (assessment.ceiling !== "declared") machine += 1;
    if (assessment.independent) independent += 1;
  }
  return {
    total: claims.length,
    byStatus,
    independentClaims: independent,
    claimsWithIssues,
    staleClaims,
    conflicts: findConflicts(claims).length,
    machineCheckableShare: claims.length === 0 ? 0 : round(machine / claims.length),
  };
}

function round(value: number): number {
  return Math.round(value * 1000) / 1000;
}
