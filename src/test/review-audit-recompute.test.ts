import { webcrypto } from "node:crypto";
import { beforeAll, describe, expect, it } from "vitest";
import { recomputeReviewAudit } from "../lib/review-audit-recompute";
import { REVIEW_SKILL_CONTRACTS } from "../lib/skill-governance";
import type { Review } from "../lib/content-schema";

beforeAll(() => {
  Object.defineProperty(globalThis, "crypto", { value: webcrypto, configurable: true });
});

const review: Review = {
  diagnosis: "Diagnóstico de prueba.",
  improvements: [{ title: "Claridad", reason: "El objetivo puede precisarse.", action: "Añade un ejemplo." }],
  revised: "Texto revisado de prueba.",
  safety: "Sin riesgos identificados.",
};

describe("saved review audit recomputation", () => {
  it("ignores client-declared governance, skills and hash", async () => {
    const audit = await recomputeReviewAudit(
      review,
      {
        runId: "run-1",
        model: "declared-model",
        timestamp: "2026-11-19T00:00:00.000Z",
        hash: "forged",
        governance: { policyVersion: "forged", decision: "POLICY_ALLOWED" },
        skills: ["forged.skill"],
        skillEvidence: "forged",
      },
      true,
    );

    expect(audit.hash).not.toBe("forged");
    expect(audit.hash).toMatch(/^[a-f0-9]{64}$/);
    expect(audit.governance.decision).toBe("POLICY_ALLOWED");
    expect(audit.governance.policyVersion).not.toBe("forged");
    expect(audit.skills).toEqual(REVIEW_SKILL_CONTRACTS);
    expect(audit.skillEvidence).toBe("server-recomputed");
    expect(audit.declaredBy).toBe("client");
  });

  it("fails closed when the distribution is not certified", async () => {
    await expect(
      recomputeReviewAudit(
        review,
        { runId: "run-1", model: "model", timestamp: "2026-11-19T00:00:00.000Z" },
        false,
      ),
    ).rejects.toThrow("TAMV_REVIEW_GOVERNANCE_DENIED");
  });
});
