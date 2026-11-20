import { REVIEW_SKILL_CONTRACTS } from "./skill-governance";
import { authorizeGovernedCapability } from "./hypercore-turbo/policy";
import type { Review } from "./content-schema";

export interface DeclaredReviewAudit {
  readonly runId: string;
  readonly model: string;
  readonly timestamp: string;
  readonly hash?: string | undefined;
  readonly governance?: { readonly policyVersion: string; readonly decision: string } | undefined;
  readonly skills?: string[] | undefined;
  readonly skillEvidence?: string | undefined;
}

export interface RecomputedReviewAudit {
  readonly runId: string;
  readonly model: string;
  readonly timestamp: string;
  readonly hash: string;
  readonly hashSource: "sha256(stable-json(review))";
  readonly governance: { readonly policyVersion: string; readonly decision: string };
  readonly skills: typeof REVIEW_SKILL_CONTRACTS;
  readonly skillEvidence: "server-recomputed";
  readonly declaredBy: "client";
}

function stableJson(value: unknown): string {
  if (value === null || typeof value !== "object") return JSON.stringify(value);
  if (Array.isArray(value)) return "[" + value.map(stableJson).join(",") + "]";
  const record = value as Record<string, unknown>;
  return (
    "{" +
    Object.keys(record)
      .sort()
      .map((key) => JSON.stringify(key) + ":" + stableJson(record[key]))
      .join(",") +
    "}"
  );
}

/**
 * The client may only declare run metadata. Decision, skill set and content hash
 * are recomputed here so a crafted `audit` object cannot become stored evidence.
 */
export async function recomputeReviewAudit(
  review: Review,
  declared: DeclaredReviewAudit,
  certificationValid: boolean,
): Promise<RecomputedReviewAudit> {
  const governance = authorizeGovernedCapability({
    capability: "creator.review",
    consentGranted: true,
    certificationValid,
  });
  if (!governance.allowed) {
    throw new Error("TAMV_REVIEW_GOVERNANCE_DENIED:" + governance.reasonCode);
  }
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(stableJson(review)));
  const hash = Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, "0")).join("");
  return {
    runId: declared.runId,
    model: declared.model,
    timestamp: declared.timestamp,
    hash,
    hashSource: "sha256(stable-json(review))",
    governance: { policyVersion: governance.policyVersion, decision: governance.reasonCode },
    skills: REVIEW_SKILL_CONTRACTS,
    skillEvidence: "server-recomputed",
    declaredBy: "client",
  };
}
