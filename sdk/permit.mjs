/** Trusted host snapshots only: this evaluator does not authenticate or reserve funds. */
export const PERMIT_POLICY_VERSION = "tamv.execution-permit.v1";
export function evaluateExecutionPermit(input, now = Date.now()) {
  const reasons = [];
  const text = (value) => typeof value === "string" && value.trim().length > 0;
  const integer = (value) => Number.isSafeInteger(value) && value >= 0;
  const digest = (value) => typeof value === "string" && /^[a-f0-9]{64}$/.test(value);
  const actor = input?.actor;
  const asset = input?.asset;
  const permit = input?.permit;
  const reviewer = input?.reviewer;
  if (!actor || actor.active !== true || !text(actor.id) || !text(actor.tenantId)) reasons.push("identity");
  if (!asset || !text(asset.id) || asset.tenantId !== actor?.tenantId || asset.ownerId !== actor?.id) reasons.push("ownership");
  if (!permit || !text(permit.id) || permit.tenantId !== actor?.tenantId || permit.actorId !== actor?.id || permit.assetId !== asset?.id) reasons.push("scope");
  if (!permit || permit.status !== "APPROVED") reasons.push("approval");
  if (!reviewer || reviewer.active !== true || reviewer.role !== "reviewer" || !text(reviewer.id) || reviewer.id === actor?.id || reviewer.tenantId !== actor?.tenantId || reviewer.id !== permit?.reviewerId) reasons.push("independent-reviewer");
  if (!Number.isFinite(now) || !integer(permit?.expiresAt) || permit.expiresAt <= now) reasons.push("expiry");
  if (!digest(input?.digest) || !digest(permit?.digest) || input.digest !== permit.digest) reasons.push("digest");
  if (!text(input?.policyVersion) || permit?.policyVersion !== input.policyVersion) reasons.push("policy");
  if (!integer(permit?.costUnits) || permit.costUnits < 1 || !integer(input?.reservedUnits) || input.reservedUnits < permit.costUnits) reasons.push("budget");
  if (permit?.consumed !== false) reasons.push("consumed");
  if (permit?.revoked !== false) reasons.push("revoked");
  return Object.freeze({ allowed: reasons.length === 0, policyVersion: PERMIT_POLICY_VERSION, reasons: Object.freeze(reasons) });
}

/** Claim must atomically revalidate identity, ownership, approval, expiry, digest and budget. */
export function createPermitGovernance({ resolve, claim, execute, settle } = {}) {
  for (const adapter of [resolve, claim, execute, settle]) {
    if (typeof adapter !== "function") throw new TypeError("Trusted resolve, atomic claim, execute and durable settle adapters required");
  }
  return {
    async run({ permitId, digest }) {
      if (typeof permitId !== "string" || !permitId.trim() || typeof digest !== "string" || !/^[a-f0-9]{64}$/.test(digest)) throw new TypeError("Permit ID and SHA-256 digest required");
      const decision = evaluateExecutionPermit(await resolve({ permitId, digest }));
      if (!decision.allowed) throw Object.assign(new Error("TAMV execution permit denied"), { decision });
      const reservation = await claim({ permitId, digest });
      if (!reservation || reservation.claimed !== true || typeof reservation.claimId !== "string" || !reservation.claimId.trim()) throw new Error("Permit already consumed or no longer authorized");
      let result;
      try {
        result = await execute({ permitId, digest, claimId: reservation.claimId });
      } catch (error) {
        // External failure can have an unknown outcome. Never release/retry automatically.
        try { await settle({ permitId, claimId: reservation.claimId, status: "unknown" }); }
        catch (auditError) { throw new AggregateError([error, auditError], "Execution outcome and receipt unresolved"); }
        throw error;
      }
      // A receipt failure does not undo an external effect and must not trigger replay.
      await settle({ permitId, claimId: reservation.claimId, status: "succeeded" });
      return result;
    },
  };
}