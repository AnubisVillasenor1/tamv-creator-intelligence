/**
 * TAMV GENESIS Ω — policy decision point (PDP).
 *
 * Deny by default. The PDP receives facts, never intentions: no model output,
 * no client claim and no document can promote a capability on its own.
 */

import { assessCapability, maturityIndex, type CapabilityContext } from "./capabilities.ts";
import type { Capability, MaturityLevel, PolicyDecision } from "./types.ts";

export const PDP_VERSION = "tamv.genesis.pdp/2.0.0";

export interface PolicyRequest {
  readonly capabilityId: string;
  readonly consentGranted: boolean;
  readonly humanApproval: boolean;
  /** Minimum maturity required by the calling surface. */
  readonly minimumMaturity?: MaturityLevel;
}

export interface PolicyWorld extends CapabilityContext {
  readonly capabilities: readonly Capability[];
  readonly certificationValid: boolean;
  readonly killSwitchActive: boolean;
}

export function decidePolicy(request: PolicyRequest, world: PolicyWorld): PolicyDecision {
  const capability = world.capabilities.find((entry) => entry.id === request.capabilityId);
  if (!capability) {
    return {
      allowed: false,
      code: "UNKNOWN_CAPABILITY",
      reason: `Capability ${request.capabilityId} is not in the genesis catalogue.`,
      policyVersion: PDP_VERSION,
    };
  }

  if (world.killSwitchActive) {
    return {
      allowed: false,
      code: "KILL_SWITCH_ACTIVE",
      reason: "The kill switch is active; every governed capability is denied.",
      policyVersion: PDP_VERSION,
    };
  }

  const assessment = assessCapability(capability, world);
  const required = request.minimumMaturity ?? "M3-tested";
  if (maturityIndex(assessment.earned) < maturityIndex(required)) {
    return {
      allowed: false,
      code: "MATURITY_TOO_LOW",
      reason: `${capability.id} reached ${assessment.earned}; the surface requires ${required}.`,
      policyVersion: PDP_VERSION,
      requiredGate: capability.nextGate,
    };
  }

  if (capability.requiresCertification !== false && !world.certificationValid) {
    return {
      allowed: false,
      code: "EVIDENCE_MISSING",
      reason: `${capability.id} requires a signed, hash-verified release before it may run.`,
      policyVersion: PDP_VERSION,
      requiredGate: "G1-signed-release",
    };
  }

  if (capability.requiresConsent && !request.consentGranted) {
    return {
      allowed: false,
      code: "CONSENT_REQUIRED",
      reason: `${capability.id} processes creator material and needs explicit, revocable consent.`,
      policyVersion: PDP_VERSION,
    };
  }

  const highImpact = capability.riskTier === "R4" || capability.riskTier === "R5";
  if (highImpact && !request.humanApproval) {
    return {
      allowed: false,
      code: "RISK_REQUIRES_HUMAN",
      reason: `${capability.id} is ${capability.riskTier}; a human must approve the exact payload.`,
      policyVersion: PDP_VERSION,
    };
  }

  if (capability.riskTier === "R5") {
    return {
      allowed: false,
      code: "RISK_REQUIRES_HUMAN",
      reason: `${capability.id} is R5 (prohibited); approval is never sufficient.`,
      policyVersion: PDP_VERSION,
    };
  }

  return {
    allowed: true,
    code: "ALLOWED",
    reason: `${capability.id} satisfied maturity ${assessment.earned}, consent and risk controls.`,
    policyVersion: PDP_VERSION,
  };
}
