import test from "node:test";
import assert from "node:assert/strict";
import { createHash } from "node:crypto";

import {
  buildLedger,
  computeWindow,
  auditLedger,
  independentlyAttestedHours,
  verifyLedger,
  type LedgerSpec,
} from "../src/workledger.ts";

const hash = (value: string) => createHash("sha256").update(value).digest("hex");

const spec: LedgerSpec = {
  schema: "tamv.workledger.v1",
  subject: { legalName: "A", professionalName: "A", organization: "TAMV", origin: "MX" },
  claim: {
    hours: 1000,
    asOf: "2026-01-01",
    status: "unverified",
    statement: "declared",
    attribution: "self",
  },
  provenanceChain: [
    {
      date: "2025-01-01",
      hours: 500,
      statement: "first",
      source: { id: "s1", kind: "url", locator: "https://example.test/1" },
      status: "declared-published",
    },
    {
      date: "2026-01-01",
      hours: 1000,
      statement: "second",
      source: { id: "s2", kind: "statement", locator: "statement 2026-01-01" },
      status: "declared",
    },
  ],
  windows: [
    {
      id: "W",
      from: "2020-01-01",
      to: "2026-01-01",
      hours: 1000,
      years: 6.01,
      hoursPerDay: 0.46,
      hoursPerWeek: 3.2,
      note: "test",
    },
  ],
  evidenceTiers: [],
  attestations: [],
};

test("computeWindow derives plausible denominators", () => {
  const window = computeWindow("2020-01-01", "2026-11-13", 24000);
  assert.equal(window.years, 6.87);
  assert.equal(window.hoursPerDay, 9.57);
  assert.equal(window.hoursPerWeek, 67);
});

test("computeWindow rejects reversed ranges", () => {
  assert.throws(() => computeWindow("2026-01-01", "2025-01-01", 10));
});

test("buildLedger is deterministic and verifies", () => {
  const a = buildLedger(spec, hash, "2026-01-01T00:00:00.000Z");
  const b = buildLedger(spec, hash, "2026-01-01T00:00:00.000Z");
  assert.equal(a.integrity.chainHead, b.integrity.chainHead);
  assert.equal(verifyLedger(a, hash).valid, true);
});

test("tampering with hours breaks the chain", () => {
  const ledger = buildLedger(spec, hash, "2026-01-01T00:00:00.000Z");
  const tampered = {
    ...ledger,
    provenanceChain: ledger.provenanceChain.map((entry, index) =>
      index === 1 ? { ...entry, hours: 2000 } : entry,
    ),
  };
  const result = verifyLedger(tampered, hash);
  assert.equal(result.valid, false);
  assert.ok(result.problems.includes("chain-head-mismatch"));
});

test("zero independent attestation is reported, not hidden", () => {
  const ledger = buildLedger(spec, hash, "2026-01-01T00:00:00.000Z");
  assert.equal(independentlyAttestedHours(ledger), 0);
  const codes = auditLedger(ledger).map((finding) => finding.code);
  assert.ok(codes.includes("unattested-hours"));
});

test("a drop in the published total is a finding", () => {
  const ledger = buildLedger(
    {
      ...spec,
      provenanceChain: [
        spec.provenanceChain[1],
        { ...spec.provenanceChain[0], date: "2026-02-01" },
      ],
    },
    hash,
    "2026-03-01T00:00:00.000Z",
  );
  const codes = auditLedger(ledger).map((finding) => finding.code);
  assert.ok(codes.includes("hours-not-monotonic") || codes.includes("provenance-not-chronological"));
});
