/**
 * Balance lock: fail-closed guard for financial actions.
 *
 * It never moves money and never grants authority. It only decides whether an
 * operation may be attempted, based on an exact quote, an idempotency key and
 * a verifiable human approval watermark. If execution ends in an uncertain
 * state, the outcome is UNKNOWN and reconciliation is required instead of a
 * retry. Missing configuration or malformed evidence is always a denial.
 */

import { executeWithReconciliation, digest } from "./engine";
import type { ExecutionRequest } from "./contracts";
import {
  isApprovalCurrentlyValid,
  verifyApprovalWatermark,
  type ApprovalWatermarkReceipt,
} from "./approval-watermark.server";

const ALLOWED_FINANCIAL_ACTIONS = ["financial.charge", "financial.refund", "financial.payout"] as const;
const IDEMPOTENCY_PATTERN = /^[A-Za-z0-9_-]{16,128}$/;
const INTEGER_AMOUNT = /^[1-9][0-9]*$/;

export interface BalancePolicy {
  schema: "tamv.balance.policy.v1";
  /** Hard ceiling in minor units; independent of any single plan price. */
  maxAmountMinor: number;
  currencies: readonly string[];
  /** Authoritative price catalogue supplied by the application, never invented here. */
  plans: Record<string, { amountMinor: string; currency: string }>;
}

export interface FinancialQuote {
  quoteId: string;
  planId: string;
  amountMinor: string;
  currency: string;
  expiresAt: string;
}

export interface BalanceLockInput {
  request: ExecutionRequest;
  quote: FinancialQuote;
  approval: ApprovalWatermarkReceipt;
  now?: number;
}

export interface BalanceLockDecision {
  allowed: boolean;
  reasonCodes: string[];
  quoteDigest: string;
  policyDigest: string;
}

export async function computeQuoteDigest(quote: FinancialQuote): Promise<string> {
  return digest({
    schema: "tamv.financial.quote.v1",
    quoteId: quote.quoteId,
    planId: quote.planId,
    amountMinor: quote.amountMinor,
    currency: quote.currency,
    expiresAt: quote.expiresAt,
  });
}

/** Pure decision function. It performs no I/O, charges or state changes. */
export async function evaluateBalanceLock(
  input: BalanceLockInput,
  policy: BalancePolicy,
): Promise<BalanceLockDecision> {
  const { request, quote, approval, now = Date.now() } = input;
  const reasonCodes: string[] = [];
  const quoteDigest = await computeQuoteDigest(quote);
  const policyDigest = await digest(policy);

  if (!(ALLOWED_FINANCIAL_ACTIONS as readonly string[]).includes(request.action)) {
    reasonCodes.push("ACTION_NOT_FINANCIAL_ALLOWLISTED");
  }
  if (!IDEMPOTENCY_PATTERN.test(request.idempotencyKey)) {
    reasonCodes.push("IDEMPOTENCY_REQUIRED");
  }

  const plan = policy.plans[quote.planId];
  if (!plan) {
    reasonCodes.push("PLAN_NOT_ALLOWLISTED");
  } else {
    if (!INTEGER_AMOUNT.test(quote.amountMinor) || !INTEGER_AMOUNT.test(plan.amountMinor)) {
      reasonCodes.push("INVALID_AMOUNT");
    } else if (
      Number(quote.amountMinor) !== Number(plan.amountMinor) ||
      Number(quote.amountMinor) > policy.maxAmountMinor
    ) {
      reasonCodes.push("AMOUNT_MISMATCH_OR_OVER_CEILING");
    }
    if (!policy.currencies.includes(quote.currency) || quote.currency !== plan.currency) {
      reasonCodes.push("CURRENCY_NOT_ALLOWLISTED");
    }
  }

  if (!INTEGER_AMOUNT.test(quote.amountMinor)) reasonCodes.push("INVALID_AMOUNT");
  if (Number.isNaN(Date.parse(quote.expiresAt)) || Date.parse(quote.expiresAt) <= now) {
    reasonCodes.push("QUOTE_EXPIRED");
  }
  if (request.amountMinor !== quote.amountMinor || request.currency !== quote.currency) {
    reasonCodes.push("REQUEST_QUOTE_MISMATCH");
  }

  // The approval must cover exactly this quote, this action and this human.
  if (approval.subject.artifactDigest !== quoteDigest) reasonCodes.push("APPROVAL_QUOTE_MISMATCH");
  if (approval.subject.action !== request.action) reasonCodes.push("APPROVAL_ACTION_MISMATCH");
  if (approval.subject.actorId !== request.actorId) reasonCodes.push("APPROVAL_ACTOR_MISMATCH");
  if (approval.subject.amountMinor !== undefined && approval.subject.amountMinor !== quote.amountMinor) {
    reasonCodes.push("APPROVAL_AMOUNT_MISMATCH");
  }
  if (approval.subject.currency !== undefined && approval.subject.currency !== quote.currency) {
    reasonCodes.push("APPROVAL_CURRENCY_MISMATCH");
  }
  if (approval.subject.autonomyLevel >= 3 && approval.subject.terminalNode !== "human_resolved") {
    reasonCodes.push("HUMAN_LINK_REQUIRED");
  }
  if (!(await verifyApprovalWatermark(approval))) reasonCodes.push("APPROVAL_WATERMARK_INVALID");
  if (!isApprovalCurrentlyValid(approval, now)) reasonCodes.push("APPROVAL_NOT_CURRENT");

  return {
    allowed: reasonCodes.length === 0,
    reasonCodes,
    quoteDigest,
    policyDigest,
  };
}

export interface LockedOutcome<T> {
  status: "BLOCKED" | "SUCCEEDED" | "UNKNOWN";
  decision: BalanceLockDecision;
  output?: T;
}

/**
 * Wraps a financial executor. A blocked action is never attempted; a failed
 * or timed-out attempt is reported as UNKNOWN after reconciliation, so callers
 * cannot assume the money did not move and retry blindly.
 */
export async function executeWithBalanceLock<T>(
  input: BalanceLockInput,
  policy: BalancePolicy,
  execute: () => Promise<T>,
  reconcile: () => Promise<void>,
): Promise<LockedOutcome<T>> {
  const decision = await evaluateBalanceLock(input, policy);
  if (!decision.allowed) return { status: "BLOCKED", decision };
  const result = await executeWithReconciliation(execute, reconcile);
  return result.status === "SUCCEEDED"
    ? { status: "SUCCEEDED", decision, output: result.output }
    : { status: "UNKNOWN", decision };
}
