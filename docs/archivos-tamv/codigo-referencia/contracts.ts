/**
 * TAMV GENESIS Ω — shared contracts.
 *
 * Pure types only. Nothing in this file executes, fetches, or persists.
 * The same contracts are consumed by the web app, the CLI and the test suite.
 */

/** Maturity ladder. A capability earns a level only with evidence, never by declaration. */
export type MaturityLevel =
  | "M0-declared"
  | "M1-contracted"
  | "M2-implemented"
  | "M3-tested"
  | "M4-operated"
  | "M5-audited";

export const MATURITY_ORDER: readonly MaturityLevel[] = [
  "M0-declared",
  "M1-contracted",
  "M2-implemented",
  "M3-tested",
  "M4-operated",
  "M5-audited",
] as const;

/** Epistemic status of a claim. Ordered from weakest to strongest. */
export type ClaimStatus =
  | "declared"
  | "unverified"
  | "corroborated"
  | "verified"
  | "contradicted"
  | "retracted";

/** Who produced the evidence behind a claim. */
export type SourceType =
  | "self-published"
  | "repository-artifact"
  | "machine-check"
  | "third-party"
  | "independent-audit";

/** Risk classification used by the policy decision point (R0–R5). */
export type RiskTier = "R0" | "R1" | "R2" | "R3" | "R4" | "R5";

export interface EvidenceRef {
  readonly id: string;
  readonly kind: "file" | "commit" | "test" | "url" | "doi" | "attestation" | "statement";
  readonly locator: string;
  /** SHA-256 of the referenced artifact when it is a local file. */
  readonly sha256?: string;
  readonly capturedAt?: string;
  readonly note?: string;
}

export interface Claim {
  readonly id: string;
  readonly statement: string;
  readonly status: ClaimStatus;
  readonly confidence: number;
  readonly sourceType: SourceType;
  readonly owner: string;
  readonly domain: "technical" | "institutional" | "academic" | "legal" | "economic" | "biographical";
  readonly evidence: readonly EvidenceRef[];
  readonly counterEvidence?: readonly EvidenceRef[];
  readonly whatWouldChangeIt: string;
  readonly reviewedAt: string;
  readonly tags?: readonly string[];
  /** IDs of claims this one asserts are wrong or superseded. */
  readonly contradicts?: readonly string[];
}

export interface Capability {
  readonly id: string;
  readonly label: string;
  readonly summary: string;
  readonly maturity: MaturityLevel;
  readonly riskTier: RiskTier;
  readonly requiresConsent: boolean;
  readonly externalSideEffects: boolean;
  readonly requiresCertification?: boolean;
  /** ISO date from which the capability has been exercised under observation. */
  readonly operatedSince?: string;
  readonly implementedBy: readonly string[];
  readonly endpoints: readonly string[];
  readonly evidence: readonly EvidenceRef[];
  readonly blockedBy: readonly string[];
  readonly nextGate: string;
}

export interface WorkProvenance {
  readonly date: string;
  readonly hours: number;
  readonly statement: string;
  readonly source: EvidenceRef;
  readonly status: "declared-published" | "declared" | "corroborated" | "verified";
}

export interface WorkLedger {
  readonly schema: "tamv.workledger.v1";
  readonly subject: {
    readonly legalName: string;
    readonly professionalName: string;
    readonly organization: string;
    readonly origin: string;
  };
  readonly claim: {
    readonly hours: number;
    readonly asOf: string;
    readonly status: ClaimStatus;
    readonly statement: string;
    readonly attribution: string;
  };
  readonly provenanceChain: readonly WorkProvenance[];
  readonly windows: readonly {
    readonly id: string;
    readonly from: string;
    readonly to: string;
    /** Hours attributed to this specific window, not to the whole claim. */
    readonly hours: number;
    readonly years: number;
    readonly hoursPerDay: number;
    readonly hoursPerWeek: number;
    readonly note: string;
    /** Alternate denominator for the same claim; excluded from union checks. */
    readonly alternative?: boolean;
  }[];
  readonly evidenceTiers: readonly {
    readonly tier: string;
    readonly label: string;
    readonly definition: string;
    readonly creditRule: string;
  }[];
  readonly attestations: readonly {
    readonly id: string;
    readonly period: string;
    readonly hours: number;
    readonly artifact: string;
    readonly tier: string;
    readonly status: ClaimStatus;
  }[];
  readonly integrity: {
    readonly chainHead: string;
    readonly entries: number;
    readonly verifiedAt: string;
  };
}

export interface ScoreDimension {
  readonly id: string;
  readonly label: string;
  readonly weight: number;
  readonly score: number;
  readonly evidence: string;
  readonly nextPoint: string;
}

export interface Scorecard {
  readonly schema: "tamv.scorecard.v1";
  readonly subject: string;
  readonly generatedAt: string;
  readonly scale: "0-100";
  readonly weightedScore: number;
  readonly rawWeightedScore?: number;
  readonly gateCapApplied?: boolean;
  readonly grade: string;
  readonly verdict: string;
  readonly dimensions: readonly ScoreDimension[];
  readonly gates: readonly {
    readonly id: string;
    readonly label: string;
    readonly passed: boolean;
    readonly blocking: boolean;
    readonly detail: string;
  }[];
}

export interface KnowledgeSource {
  readonly id: string;
  readonly title: string;
  readonly kind: "markdown" | "pdf" | "docx" | "code" | "image" | "audio" | "video" | "archive";
  readonly origin: string;
  readonly capturedAt: string;
  readonly sha256: string;
  readonly bytes: number;
  readonly license: string;
  readonly sensitivity: "public" | "internal" | "confidential" | "restricted";
  readonly use: "doctrine" | "evidence" | "legal" | "product" | "archive" | "excluded";
  readonly notes: string;
}

export interface LedgerEvent {
  readonly seq: number;
  readonly at: string;
  readonly kind: "capability.evaluated" | "claim.reviewed" | "work.attested" | "policy.changed" | "pack.built";
  readonly subject: string;
  readonly payloadHash: string;
  readonly previousHash: string;
  readonly hash: string;
}

export interface PolicyDecision {
  readonly allowed: boolean;
  readonly code:
    | "ALLOWED"
    | "UNKNOWN_CAPABILITY"
    | "MATURITY_TOO_LOW"
    | "CONSENT_REQUIRED"
    | "RISK_REQUIRES_HUMAN"
    | "KILL_SWITCH_ACTIVE"
    | "EVIDENCE_MISSING";
  readonly reason: string;
  readonly policyVersion: string;
  readonly requiredGate?: string;
}
