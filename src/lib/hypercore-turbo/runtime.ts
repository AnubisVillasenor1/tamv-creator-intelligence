import { getTamvCertification } from "../tamv-certification";
import { authorizeGovernedCapability, type GovernedCapability } from "./policy";

export type RuntimeCode =
  | "TAMV_ATTRIBUTION_INTEGRITY_FAILED"
  | "TAMV_PROVENANCE_UNVERIFIED"
  | "TAMV_CONSENT_REQUIRED"
  | "TAMV_CAPABILITY_NOT_IMPLEMENTED"
  | "TAMV_CAPABILITY_ALLOWED"
  | "TAMV_CAPABILITY_NOT_ALLOWLISTED";

export interface RuntimeContext {
  userId: string;
  federationId: string;
  capability: string;
  consentGranted: boolean;
}

export interface RuntimeDecision {
  allowed: boolean;
  httpStatus: 200 | 403 | 501;
  code: RuntimeCode;
  reason: string;
  capability: string;
  checkedAt: string;
  certificationStatus: string;
  provenance: { verified: false; status: "not-integrated"; reason: string };
}

/**
 * Unified fail-closed decision point. Certification and provenance are deliberately
 * separate: a valid source manifest/signature must never be treated as SLSA proof.
 * No capability is executed here; this function only authorizes or denies it.
 */
export async function evaluateTamvRuntime(context: RuntimeContext): Promise<RuntimeDecision> {
  const checkedAt = new Date().toISOString();
  const certification = await getTamvCertification();
  const provenance: { verified: boolean; status: "not-integrated" | "verified"; reason: string } = await verifyRuntimeProvenance();

  const decision = (
    allowed: boolean,
    httpStatus: 200 | 403 | 501,
    code: RuntimeCode,
    reason: string,
  ): RuntimeDecision => ({
    allowed, httpStatus, code, reason, capability: context.capability, checkedAt,
    certificationStatus: certification.status, provenance,
  });

  if (!certification.certified) {
    return decision(false, 403, "TAMV_ATTRIBUTION_INTEGRITY_FAILED", certification.reason);
  }
  if (!provenance.verified) {
    return decision(false, 403, "TAMV_PROVENANCE_UNVERIFIED", provenance.reason);
  }

  const authorization = authorizeGovernedCapability({
    capability: context.capability,
    consentGranted: context.consentGranted,
    certificationValid: certification.certified && provenance.verified,
  });

  if (authorization.reasonCode === "CAPABILITY_NOT_ALLOWLISTED") {
    return decision(false, 403, "TAMV_CAPABILITY_NOT_ALLOWLISTED", "La capacidad no está permitida por la política Govern Core.");
  }
  if (authorization.reasonCode === "CONSENT_MISSING") {
    return decision(false, 403, "TAMV_CONSENT_REQUIRED", "Esta capacidad requiere consentimiento explícito y vigente.");
  }
  if (!authorization.allowed) {
    return decision(false, 403, "TAMV_ATTRIBUTION_INTEGRITY_FAILED", "La certificación o la procedencia no cumple los requisitos.");
  }

  // All currently governed capabilities remain unimplemented until a reviewed gateway exists.
  return decision(false, 501, "TAMV_CAPABILITY_NOT_IMPLEMENTED", "La política autoriza la capacidad, pero no existe un gateway de ejecución habilitado.");
}

async function verifyRuntimeProvenance(): Promise<{ verified: boolean; status: "not-integrated" | "verified"; reason: string }> {
  // Fail closed until a trusted builder attestation verifier is implemented and configured.
  return {
    verified: false,
    status: "not-integrated",
    reason: "No hay un verificador de procedencia SLSA confiable conectado al runtime.",
  };
}

export function isGovernedCapability(value: string): value is GovernedCapability {
  return [
    "creator.review", "music.generation", "voice.generation",
    "audiocore.advanced", "agent.orchestration", "external.publishing",
  ].includes(value);
}
