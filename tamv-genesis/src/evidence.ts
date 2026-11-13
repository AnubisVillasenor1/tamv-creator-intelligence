/**
 * TAMV GENESIS Ω — evidence algebra.
 *
 * Deterministic, dependency-free rules that decide how much weight an artifact
 * carries. Nothing here reads the filesystem: callers pass bytes or digests in.
 */

import type { ClaimStatus, EvidenceRef, SourceType } from "./types.ts";

export type HashFn = (value: string) => string;

/** Canonical JSON: stable key order, no whitespace, rejects non-finite numbers. */
export function canonicalJson(value: unknown): string {
  if (value === null || typeof value === "string" || typeof value === "boolean") {
    return JSON.stringify(value) ?? "null";
  }
  if (typeof value === "number") {
    if (!Number.isFinite(value)) throw new Error("canonicalJson: non-finite number");
    return JSON.stringify(value) ?? "null";
  }
  if (Array.isArray(value)) {
    return "[" + value.map((entry) => canonicalJson(entry)).join(",") + "]";
  }
  if (typeof value === "object") {
    const record = value as Record<string, unknown>;
    return (
      "{" +
      Object.keys(record)
        .sort()
        .map((key) => JSON.stringify(key) + ":" + canonicalJson(record[key]))
        .join(",") +
      "}"
    );
  }
  throw new Error("canonicalJson: unsupported value");
}

/**
 * Evidence tiers. The tier answers "who could have faked this, and did anyone
 * outside the author check it?" — not "how impressive does it look?".
 */
export interface EvidenceTier {
  readonly tier: "T0" | "T1" | "T2" | "T3" | "T4";
  readonly label: string;
  readonly definition: string;
  /** Maximum claim status this tier can support on its own. */
  readonly ceiling: ClaimStatus;
  /** Whether the tier counts as independent corroboration. */
  readonly independent: boolean;
}

export const EVIDENCE_TIERS: readonly EvidenceTier[] = [
  {
    tier: "T0",
    label: "Assertion",
    definition: "A statement made by the author or an agent acting for the author, with no artifact attached.",
    ceiling: "declared",
    independent: false,
  },
  {
    tier: "T1",
    label: "Self-published artifact",
    definition:
      "A file, page, repository, PDF or post the author controls. It can be internally consistent and still be self-referential.",
    ceiling: "unverified",
    independent: false,
  },
  {
    tier: "T2",
    label: "Machine-checkable artifact",
    definition:
      "Hashes, commit graphs, test runs or signed manifests that a third party can recompute from the same bytes.",
    ceiling: "corroborated",
    independent: false,
  },
  {
    tier: "T3",
    label: "Independent attestation",
    definition:
      "A named party with no financial or identity tie to the author reviews the artifact and publishes a verifiable statement.",
    ceiling: "verified",
    independent: true,
  },
  {
    tier: "T4",
    label: "Independent audit",
    definition:
      "A scoped audit with stated method, sampling, access and findings, repeatable by another auditor.",
    ceiling: "verified",
    independent: true,
  },
] as const;

const TIER_BY_ID = new Map(EVIDENCE_TIERS.map((tier) => [tier.tier, tier]));

/**
 * Strength order for claim statuses. `contradicted` and `retracted` sit outside
 * the ladder: they are terminal states that outrank any positive status.
 */
export const CLAIM_STATUS_RANK: Record<ClaimStatus, number> = {
  declared: 0,
  unverified: 1,
  corroborated: 2,
  verified: 3,
  contradicted: -1,
  retracted: -2,
};

export function weakerStatus(a: ClaimStatus, b: ClaimStatus): ClaimStatus {
  return CLAIM_STATUS_RANK[a] <= CLAIM_STATUS_RANK[b] ? a : b;
}

export function getEvidenceTier(id: string): EvidenceTier | undefined {
  return TIER_BY_ID.get(id);
}

/** Map a free-form source type onto the tier it can reach without extra work. */
export function tierForSource(source: SourceType): EvidenceTier {
  switch (source) {
    case "third-party":
    case "independent-audit":
      return TIER_BY_ID.get("T3")!;
    case "machine-check":
    case "repository-artifact":
      return TIER_BY_ID.get("T2")!;
    case "self-published":
    default:
      return TIER_BY_ID.get("T1")!;
  }
}

/**
 * Status ceiling for a set of evidence refs. The strongest *verified* status a
 * claim may reach is bounded by its weakest required link: a chain of
 * self-published documents never becomes independent because it is long.
 */
export function statusCeiling(refs: readonly EvidenceRef[], sourceType: SourceType): ClaimStatus {
  if (refs.length === 0) return "declared";
  // A bare statement records provenance; it does not cap a claim that also
  // carries an inspectable artifact.
  const inspectable = refs.filter((ref) => ref.kind !== "statement");
  const basis = inspectable.length > 0 ? inspectable : refs;
  const tiers = basis.map((ref) => tierForRef(ref, sourceType));
  return tiers.reduce<ClaimStatus>((low, tier) => weakerStatus(low, tier.ceiling), "verified");
}

function tierForRef(ref: EvidenceRef, sourceType: SourceType): EvidenceTier {
  if (ref.kind === "attestation") return TIER_BY_ID.get("T3")!;
  if (ref.kind === "doi") return TIER_BY_ID.get("T1")!;
  if (ref.kind === "statement") return TIER_BY_ID.get("T0")!;
  if (ref.kind === "test" || ref.kind === "commit") return TIER_BY_ID.get("T2")!;
  if (ref.kind === "file" || ref.kind === "url") return tierForSource(sourceType);
  return TIER_BY_ID.get("T0")!;
}

/** True when at least one ref is independent (T3/T4). */
export function hasIndependentEvidence(refs: readonly EvidenceRef[]): boolean {
  return refs.some((ref) => ref.kind === "attestation");
}

export interface EvidenceIntegrityIssue {
  readonly refId: string;
  readonly problem: "missing-locator" | "bad-digest" | "future-capture" | "placeholder";
}

const DIGEST = /^sha256:[a-f0-9]{64}$/;

/** Structural checks that do not require the artifact itself. */
export function auditEvidenceRefs(refs: readonly EvidenceRef[], now = new Date()): EvidenceIntegrityIssue[] {
  const issues: EvidenceIntegrityIssue[] = [];
  for (const ref of refs) {
    if (!ref.locator || ref.locator.trim().length < 3) {
      issues.push({ refId: ref.id, problem: "missing-locator" });
    }
    if (ref.sha256 !== undefined && !DIGEST.test(ref.sha256)) {
      issues.push({ refId: ref.id, problem: "bad-digest" });
    }
    if (ref.capturedAt) {
      const captured = new Date(ref.capturedAt);
      if (Number.isNaN(captured.getTime()) || captured.getTime() > now.getTime() + 86_400_000) {
        issues.push({ refId: ref.id, problem: "future-capture" });
      }
    }
    if (/\b(?:TBD|TODO|xxx|placeholder)\b/i.test(ref.locator)) {
      issues.push({ refId: ref.id, problem: "placeholder" });
    }
  }
  return issues;
}

/** Deterministic digest of a claim's evidentiary payload, used by the ledger. */
export function claimPayloadDigest(claim: {
  id: string;
  statement: string;
  status: ClaimStatus;
  evidence: readonly EvidenceRef[];
}, hash: HashFn): string {
  return hash(
    canonicalJson({
      id: claim.id,
      statement: claim.statement,
      status: claim.status,
      evidence: claim.evidence.map((ref) => ({ id: ref.id, kind: ref.kind, locator: ref.locator, sha256: ref.sha256 ?? null })),
    }),
  );
}
