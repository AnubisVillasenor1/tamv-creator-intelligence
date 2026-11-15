import { describe, expect, it, vi } from "vitest";
import {
  createGovernanceReceiptStore,
  GovernanceReceiptStoreError,
} from "./governance-receipt-store.server";
import type { GovernanceOperationReceipt } from "./governance-receipt";

const digest = "a".repeat(64);
const base: GovernanceOperationReceipt = {
  schema: "tamv.governance.receipt.v1",
  receiptId: "receipt-00000001",
  operationId: "operation-0000001",
  operation: "update",
  phase: "preflight",
  status: "pending",
  actorRef: "actor-opaque-0001",
  targetRef: "target-opaque-001",
  sourceCommitSha: "b".repeat(40),
  artifactSha256: digest,
  policyVersion: "1.0.0",
  idempotencyKey: "idem-000000001",
  startedAt: "2026-11-15T12:00:00Z",
  recordedAt: "2026-11-15T12:00:00Z",
  evidence: [],
};

function response(body: unknown, status = 200): Response {
  return new Response(body === undefined ? null : JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

describe("Supabase governance receipt store", () => {
  it("fails closed if server-side configuration is missing", () => {
    expect(() => createGovernanceReceiptStore(
      { supabaseUrl: "", serviceRoleKey: "" },
      async () => true,
    )).toThrowError(GovernanceReceiptStoreError);
  });

  it("only allows new operations in pending state", async () => {
    const store = createGovernanceReceiptStore(
      { supabaseUrl: "https://project.supabase.co", serviceRoleKey: "server-secret" },
      async () => true,
      vi.fn(),
    );
    await expect(store.create({ ...base, status: "succeeded", evidence: [{
      kind: "test", sha256: digest, reference: "evidence-000001",
    }] })).rejects.toMatchObject({ code: "INITIAL_STATUS_INVALID" });
  });

  it("sends credentials only in server-side PostgREST headers and inserts pending receipt", async () => {
    const fetcher = vi.fn().mockResolvedValue(response([{ receipt: base }]));
    const store = createGovernanceReceiptStore(
      { supabaseUrl: "https://project.supabase.co/", serviceRoleKey: "server-secret" },
      async () => true,
      fetcher,
    );
    await expect(store.create(base)).resolves.toEqual(base);
    expect(fetcher).toHaveBeenCalledOnce();
    expect(fetcher.mock.calls[0][0]).toContain("/rest/v1/tamv_governance_receipts");
    expect(fetcher.mock.calls[0][1].headers.Authorization).toBe("Bearer server-secret");
    expect(fetcher.mock.calls[0][1].headers.Prefer).toBe("resolution=ignore-duplicates,return=representation");
  });

  it("rejects success transitions unless independent evidence verification succeeds", async () => {
    const running = { ...base, status: "running" as const, phase: "execution",
      recordedAt: "2026-11-15T12:00:02Z" };
    const fetcher = vi.fn()
      .mockResolvedValueOnce(response([{ receipt_id: base.receiptId, status: "running", receipt: running }]));
    const store = createGovernanceReceiptStore(
      { supabaseUrl: "https://project.supabase.co", serviceRoleKey: "server-secret" },
      async () => false,
      fetcher,
    );
    const succeeded = { ...running, status: "succeeded" as const, phase: "postflight",
      recordedAt: "2026-11-15T12:00:03Z",
      evidence: [{ kind: "test" as const, sha256: digest, reference: "evidence-000001" }] };
    await expect(store.transition(base.receiptId, "running", succeeded))
      .rejects.toMatchObject({ code: "EVIDENCE_UNVERIFIED" });
    expect(fetcher).toHaveBeenCalledOnce();
  });

  it("uses compare-and-set in the update URL to prevent lost transitions", async () => {
    const running = { ...base, status: "running" as const, phase: "execution",
      recordedAt: "2026-11-15T12:00:02Z" };
    const fetcher = vi.fn()
      .mockResolvedValueOnce(response([{ receipt_id: base.receiptId, status: "pending", receipt: base }]))
      .mockResolvedValueOnce(response([{ receipt_id: base.receiptId, status: "running", receipt: running }]));
    const store = createGovernanceReceiptStore(
      { supabaseUrl: "https://project.supabase.co", serviceRoleKey: "server-secret" },
      async () => true,
      fetcher,
    );
    await expect(store.transition(base.receiptId, "pending", running)).resolves.toEqual(running);
    expect(fetcher.mock.calls[1][0]).toContain("status=eq.pending");
    expect(fetcher.mock.calls[1][1].method).toBe("PATCH");
  });
});
