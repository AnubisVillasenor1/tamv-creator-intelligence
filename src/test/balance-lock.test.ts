/* global process */
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { webcrypto } from "node:crypto";
import {
  computeQuoteDigest,
  evaluateBalanceLock,
  executeWithBalanceLock,
  type BalanceLockInput,
  type BalancePolicy,
  type FinancialQuote,
} from "@/core/governance/balance-lock.server";
import { issueApprovalWatermark } from "@/core/governance/approval-watermark.server";
import type { ExecutionRequest } from "@/core/governance/contracts";

vi.stubGlobal("crypto", webcrypto);

const secret = "s".repeat(48);
const actorId = "00000000-0000-4000-8000-0000000000c1";
const now = Date.parse("2026-11-19T12:00:00.000Z");

const policy: BalancePolicy = {
  schema: "tamv.balance.policy.v1",
  maxAmountMinor: 500_000,
  currencies: ["MXN"],
  plans: { pro: { amountMinor: "19900", currency: "MXN" } },
};

const quote: FinancialQuote = {
  quoteId: "quote-2026-11-19-pro",
  planId: "pro",
  amountMinor: "19900",
  currency: "MXN",
  expiresAt: new Date(now + 600_000).toISOString(),
};

const request: ExecutionRequest = {
  requestId: "00000000-0000-4000-8000-0000000000d1",
  idempotencyKey: "idem-0123456789abcdef",
  actorId,
  action: "financial.charge",
  resourceId: "customer-1",
  environment: "production",
  paramsDigest: "c".repeat(64),
  artifactDigest: "d".repeat(64),
  adrDigest: "e".repeat(64),
  amountMinor: quote.amountMinor,
  currency: quote.currency,
};

async function makeInput(overrides: Partial<BalanceLockInput> = {}): Promise<BalanceLockInput> {
  const quoteDigest = await computeQuoteDigest(quote);
  const approval = await issueApprovalWatermark({
    decisionId: "00000000-0000-4000-8000-0000000000e1",
    actorId,
    action: request.action,
    artifactDigest: quoteDigest,
    contractDigest: "f".repeat(64),
    autonomyLevel: 3,
    terminalNode: "human_resolved",
    issuedAt: new Date(now).toISOString(),
    validForSeconds: 600,
    amountMinor: quote.amountMinor,
    currency: quote.currency,
  });
  return { request, quote, approval, now, ...overrides };
}

beforeEach(() => {
  process.env["TAMV_APPROVAL_WATERMARK_SECRET"] = secret;
});
afterEach(() => {
  delete process.env["TAMV_APPROVAL_WATERMARK_SECRET"];
});

describe("balance lock", () => {
  it("allows an exact, approved, idempotent financial action", async () => {
    const decision = await evaluateBalanceLock(await makeInput(), policy);
    expect(decision.allowed).toBe(true);
    expect(decision.reasonCodes).toEqual([]);
    expect(decision.quoteDigest).toMatch(/^[0-9a-f]{64}$/);
  });

  it("blocks when the human approval watermark is invalid", async () => {
    const input = await makeInput();
    const tampered = {
      ...input,
      approval: {
        ...input.approval,
        subject: { ...input.approval.subject, amountMinor: "1" },
      },
    };
    const decision = await evaluateBalanceLock(tampered, policy);
    expect(decision.allowed).toBe(false);
    expect(decision.reasonCodes).toContain("APPROVAL_WATERMARK_INVALID");
  });

  it("blocks a mismatched amount or currency", async () => {
    const decision = await evaluateBalanceLock(
      await makeInput({ request: { ...request, amountMinor: "1", currency: "USD" } }),
      policy,
    );
    expect(decision.reasonCodes).toContain("REQUEST_QUOTE_MISMATCH");
  });

  it("blocks a price that is not in the authoritative catalogue", async () => {
    const changedPolicy = {
      ...policy,
      plans: { pro: { amountMinor: "99900", currency: "MXN" } },
    };
    const decision = await evaluateBalanceLock(await makeInput(), changedPolicy);
    expect(decision.reasonCodes).toContain("AMOUNT_MISMATCH_OR_OVER_CEILING");
  });

  it("blocks expired quotes and non-idempotent requests", async () => {
    const expired = { ...quote, expiresAt: new Date(now - 1000).toISOString() };
    const input = await makeInput();
    const decision = await evaluateBalanceLock(
      {
        ...input,
        quote: expired,
        request: { ...request, idempotencyKey: "x", amountMinor: expired.amountMinor },
      },
      policy,
    );
    expect(decision.reasonCodes).toContain("QUOTE_EXPIRED");
    expect(decision.reasonCodes).toContain("IDEMPOTENCY_REQUIRED");
    expect(decision.reasonCodes).toContain("APPROVAL_QUOTE_MISMATCH");
  });

  it("never executes a blocked action", async () => {
    const execute = vi.fn().mockResolvedValue("charged");
    const reconcile = vi.fn().mockResolvedValue(undefined);
    const base = await makeInput();
    const input: BalanceLockInput = {
      ...base,
      approval: {
        ...base.approval,
        subject: { ...base.approval.subject, terminalNode: "autonomous" },
      },
    };
    const outcome = await executeWithBalanceLock(input, policy, execute, reconcile);
    expect(outcome.status).toBe("BLOCKED");
    expect(execute).not.toHaveBeenCalled();
    expect(reconcile).not.toHaveBeenCalled();
  });

  it("reports UNKNOWN and reconciles when execution fails", async () => {
    const execute = vi.fn().mockRejectedValue(new Error("gateway timeout"));
    const reconcile = vi.fn().mockResolvedValue(undefined);
    const outcome = await executeWithBalanceLock(await makeInput(), policy, execute, reconcile);
    expect(outcome.status).toBe("UNKNOWN");
    expect(execute).toHaveBeenCalledTimes(1);
    expect(reconcile).toHaveBeenCalledTimes(1);
    expect(outcome.decision.allowed).toBe(true);
  });

  it("blocks when the watermark secret is not configured", async () => {
    const input = await makeInput();
    delete process.env["TAMV_APPROVAL_WATERMARK_SECRET"];
    const decision = await evaluateBalanceLock(input, policy);
    expect(decision.reasonCodes).toContain("APPROVAL_WATERMARK_INVALID");
  });
});
