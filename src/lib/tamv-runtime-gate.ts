import { evaluateTamvRuntime } from "./hypercore-turbo/runtime";

const NO_STORE = { "Cache-Control": "no-store, max-age=0", "X-Content-Type-Options": "nosniff" };

/**
 * Single decision point for server-side governed capabilities. It deliberately
 * keeps three concerns separate: source integrity, external premium approval,
 * and runtime provenance. Until a trusted SLSA verifier is connected, the
 * provenance check denies with the honest status reported by the runtime.
 */
export async function requireApprovedRuntimeCapability(
  capability: string,
  consentGranted: boolean,
): Promise<Response | null> {
  const decision = await evaluateTamvRuntime({
    userId: "server",
    federationId: "tamv-canonical",
    capability,
    consentGranted,
  });
  if (decision.allowed) return null;
  return Response.json(
    {
      error: "Capacidad TAMV no autorizada en esta distribución.",
      code: decision.code,
      reason: decision.reason,
      capability: decision.capability,
      certificationStatus: decision.certificationStatus,
      provenance: decision.provenance,
      checkedAt: decision.checkedAt,
    },
    { status: decision.httpStatus, headers: NO_STORE },
  );
}
