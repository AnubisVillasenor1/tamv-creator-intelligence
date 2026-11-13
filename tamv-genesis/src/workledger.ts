/**
 * TAMV GENESIS Ω — work ledger.
 *
 * The ledger records *how many hours are claimed*, *who said so*, and *what
 * would have to happen for the number to become verifiable*. It deliberately
 * refuses to turn commit counts, file sizes or AI output into hours.
 */

import { canonicalJson, type HashFn } from "./evidence.ts";
import type { ClaimStatus, EvidenceRef, WorkLedger, WorkProvenance } from "./types.ts";

const DAY_MS = 86_400_000;

export interface WindowComputation {
  readonly years: number;
  readonly hoursPerDay: number;
  readonly hoursPerWeek: number;
}

/** Compute denominators for a claimed span. Inclusive of both endpoints. */
export function computeWindow(from: string, to: string, hours: number): WindowComputation {
  const start = Date.parse(from);
  const end = Date.parse(to);
  if (Number.isNaN(start) || Number.isNaN(end) || end <= start) {
    throw new Error(`computeWindow: invalid range ${from}..${to}`);
  }
  if (!Number.isFinite(hours) || hours < 0) {
    throw new Error("computeWindow: hours must be a non-negative number");
  }
  const days = (end - start) / DAY_MS + 1;
  const years = round(days / 365.25, 2);
  return {
    years,
    hoursPerDay: round(hours / days, 2),
    hoursPerWeek: round((hours / days) * 7, 1),
  };
}

export interface LedgerSpec {
  readonly schema: "tamv.workledger.v1";
  readonly subject: WorkLedger["subject"];
  readonly claim: WorkLedger["claim"];
  readonly provenanceChain: readonly WorkProvenance[];
  readonly windows: WorkLedger["windows"];
  readonly evidenceTiers: WorkLedger["evidenceTiers"];
  readonly attestations: WorkLedger["attestations"];
}

/** The rules that keep a work attestation honest. */
export const HOURS_ATTESTATION_PROTOCOL: readonly string[] = [
  "Hours are a self-report until a named third party signs the period, the activity log and the method used to count.",
  "Artifacts attest that work happened in a window; they never convert into a number of hours.",
  "A published claim does not become independent corroboration because it is hosted on a DOI, a blog or a repository the author controls.",
  "Overlapping windows are counted once; the ledger must show the union, not the sum.",
  "Every increase in the total requires a new dated statement and a named source; silent edits are a contradiction.",
  "An attestation that cannot be repeated by another reviewer is recorded as T1, not T3.",
];

export function buildLedger(spec: LedgerSpec, hash: HashFn, builtAt = new Date().toISOString()): WorkLedger {
  const payload = {
    schema: spec.schema,
    subject: spec.subject,
    claim: spec.claim,
    provenanceChain: spec.provenanceChain,
    windows: spec.windows,
    evidenceTiers: spec.evidenceTiers,
    attestations: spec.attestations,
  };
  return {
    ...spec,
    integrity: {
      chainHead: chainHead(spec.provenanceChain, spec.attestations, hash),
      entries: spec.provenanceChain.length + spec.attestations.length,
      verifiedAt: builtAt,
    },
  };
}

function chainHead(
  provenance: readonly WorkProvenance[],
  attestations: WorkLedger["attestations"],
  hash: HashFn,
): string {
  let previous = "genesis";
  for (const entry of provenance) {
    previous = hash(
      canonicalJson({
        previous,
        date: entry.date,
        hours: entry.hours,
        statement: entry.statement,
        source: entry.source.id,
        status: entry.status,
      }),
    );
  }
  for (const attestation of attestations) {
    previous = hash(
      canonicalJson({
        previous,
        id: attestation.id,
        period: attestation.period,
        hours: attestation.hours,
        artifact: attestation.artifact,
        tier: attestation.tier,
        status: attestation.status,
      }),
    );
  }
  return "sha256:" + previous;
}

export interface LedgerVerification {
  readonly valid: boolean;
  readonly expected: string;
  readonly actual: string;
  readonly problems: readonly string[];
}

export function verifyLedger(ledger: WorkLedger, hash: HashFn): LedgerVerification {
  const expected = chainHead(ledger.provenanceChain, ledger.attestations, hash);
  const problems: string[] = [];
  if (expected !== ledger.integrity.chainHead) problems.push("chain-head-mismatch");
  if (ledger.integrity.entries !== ledger.provenanceChain.length + ledger.attestations.length) {
    problems.push("entry-count-mismatch");
  }
  const dates = ledger.provenanceChain.map((entry) => Date.parse(entry.date));
  if (dates.some(Number.isNaN)) problems.push("invalid-provenance-date");
  if (dates.some((value, index) => index > 0 && value < dates[index - 1])) {
    problems.push("provenance-not-chronological");
  }
  return { valid: problems.length === 0, expected, actual: ledger.integrity.chainHead, problems };
}

/**
 * Hours actually covered by independent attestation. This is the number a
 * sceptical reader is allowed to treat as verified, and it is usually zero.
 */
export function independentlyAttestedHours(ledger: WorkLedger): number {
  return ledger.attestations
    .filter((entry) => (entry.tier === "T3" || entry.tier === "T4") && entry.status === "verified")
    .reduce((total, entry) => total + entry.hours, 0);
}

export interface LedgerFinding {
  readonly code:
    | "hours-not-monotonic"
    | "claim-status-unsupported"
    | "unattested-hours"
    | "window-inconsistent"
    | "missing-source-date"
    | "overlapping-windows";
  readonly detail: string;
}

/** Consistency checks between the claim, its chain and the derived denominators. */
export function auditLedger(ledger: WorkLedger): LedgerFinding[] {
  const findings: LedgerFinding[] = [];

  for (let index = 1; index < ledger.provenanceChain.length; index++) {
    const previous = ledger.provenanceChain[index - 1];
    const current = ledger.provenanceChain[index];
    if (current.hours < previous.hours) {
      findings.push({
        code: "hours-not-monotonic",
        detail: `${current.date} reports ${current.hours}h after ${previous.date} reported ${previous.hours}h`,
      });
    }
  }

  const attested = independentlyAttestedHours(ledger);
  const supportsVerified = attested >= ledger.claim.hours;
  if (ledger.claim.status === "verified" && !supportsVerified) {
    findings.push({
      code: "claim-status-unsupported",
      detail: `claim status is verified but only ${attested}h are independently attested`,
    });
  }
  if (ledger.claim.hours > 0 && attested === 0) {
    findings.push({
      code: "unattested-hours",
      detail: `${ledger.claim.hours}h are declared with no independent attestation`,
    });
  }

  for (const window of ledger.windows) {
    const computed = computeWindow(window.from, window.to, window.hours);
    if (
      Math.abs(computed.years - window.years) > 0.02 ||
      Math.abs(computed.hoursPerDay - window.hoursPerDay) > 0.02 ||
      Math.abs(computed.hoursPerWeek - window.hoursPerWeek) > 0.2
    ) {
      findings.push({
        code: "window-inconsistent",
        detail: `${window.id} declares ${window.hoursPerDay}h/day but the dates imply ${computed.hoursPerDay}h/day`,
      });
    }
  }

  for (const entry of ledger.provenanceChain) {
    if (!entry.date || !entry.source.locator) {
      findings.push({ code: "missing-source-date", detail: `${entry.date || "undated"} entry lacks a source locator` });
    }
  }

  const sorted = [...ledger.windows]
    .filter((window) => !window.alternative)
    .sort((a, b) => Date.parse(a.from) - Date.parse(b.from));
  for (let index = 1; index < sorted.length; index++) {
    if (Date.parse(sorted[index].from) <= Date.parse(sorted[index - 1].to)) {
      findings.push({
        code: "overlapping-windows",
        detail: `${sorted[index - 1].id} and ${sorted[index].id} overlap; hours must be counted once`,
      });
    }
  }

  return findings;
}

export interface AttestationTemplate {
  readonly id: string;
  readonly period: { readonly from: string; readonly to: string };
  readonly hours: number;
  readonly artifact: string;
  readonly tier: "T0" | "T1" | "T2" | "T3" | "T4";
  readonly status: ClaimStatus;
  readonly evidence: readonly EvidenceRef[];
}

/** Returns the missing fields that stop a template from being filed as T3. */
export function attestationGaps(template: AttestationTemplate): readonly string[] {
  const gaps: string[] = [];
  if (template.tier !== "T3" && template.tier !== "T4") gaps.push("not-independent");
  if (!template.artifact || template.artifact.length < 8) gaps.push("artifact-undeclared");
  if (template.evidence.length === 0) gaps.push("evidence-missing");
  if (!template.period.from || !template.period.to) gaps.push("period-incomplete");
  if (Date.parse(template.period.to) <= Date.parse(template.period.from)) gaps.push("period-invalid");
  if (template.hours <= 0) gaps.push("hours-zero");
  if (template.status !== "verified") gaps.push("attester-has-not-signed");
  return gaps;
}

function round(value: number, digits: number): number {
  const factor = 10 ** digits;
  return Math.round(value * factor) / factor;
}
