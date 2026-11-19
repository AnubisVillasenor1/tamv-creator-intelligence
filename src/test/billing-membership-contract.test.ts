import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

async function migrationSource() {
  return readFile(resolve(process.cwd(), "drizzle/migrations/0007_billing_memberships_processor.sql"), "utf8");
}

describe("billing membership database contract", () => {
  it("keeps membership reads and writes out of public roles", async () => {
    const sql = await migrationSource();
    expect(sql).toContain("ENABLE ROW LEVEL SECURITY");
    expect(sql).toContain("FORCE ROW LEVEL SECURITY");
    expect(sql).toContain("REVOKE ALL ON TABLE public.tamv_memberships FROM PUBLIC, anon, authenticated");
    expect(sql).toContain("GRANT EXECUTE ON FUNCTION public.process_tamv_stripe_billing_event(jsonb, text) TO service_role");
    expect(sql).toContain("GRANT EXECUTE ON FUNCTION public.get_tamv_membership_summary() TO service_role");
    expect(sql).toContain("SECURITY DEFINER");
  });

  it("uses deterministic event ordering and an idempotency key", async () => {
    const sql = await migrationSource();
    expect(sql).toContain("ON CONFLICT (provider, event_id) DO NOTHING");
    expect(sql).toContain("last_event_created, public.tamv_memberships.last_event_id");
    expect(sql).toContain("Stripe event id reused with different payload");
  });
});
