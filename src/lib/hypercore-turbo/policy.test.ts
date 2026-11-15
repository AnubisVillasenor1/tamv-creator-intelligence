import { describe, expect, it } from "vitest";
import {
  authorizeGovernedCapability,
  GOVERN_CORE_POLICY,
  validateGovernCorePolicy,
} from "./policy";

describe("Hyper-Core governed capability policy", () => {
  it("validates the declared policy and its fail-closed defaults", () => {
    expect(validateGovernCorePolicy()).toEqual({ valid: true, errors: [] });
    expect(GOVERN_CORE_POLICY.defaults.decision).toBe("deny");
    expect(GOVERN_CORE_POLICY.defaults.failClosed).toBe(true);
    expect(GOVERN_CORE_POLICY.authorization.clientClaimsAreNotAuthority).toBe(true);
  });

  it("denies unknown capabilities by default", () => {
    expect(authorizeGovernedCapability({
      capability: "system.root",
      consentGranted: true,
      certificationValid: true,
    })).toMatchObject({ allowed: false, reasonCode: "CAPABILITY_NOT_ALLOWLISTED" });
  });

  it("requires consent for creator review", () => {
    expect(authorizeGovernedCapability({
      capability: "creator.review",
      consentGranted: false,
      certificationValid: true,
    })).toMatchObject({ allowed: false, reasonCode: "CONSENT_MISSING" });
  });

  it("denies capabilities when certification is invalid even if consent exists", () => {
    expect(authorizeGovernedCapability({
      capability: "creator.review",
      consentGranted: true,
      certificationValid: false,
    })).toMatchObject({ allowed: false, reasonCode: "CERTIFICATION_FAILED" });
  });

  it("allows only an allowlisted capability with valid certification and required consent", () => {
    expect(authorizeGovernedCapability({
      capability: "creator.review",
      consentGranted: true,
      certificationValid: true,
    })).toMatchObject({ allowed: true, reasonCode: "POLICY_ALLOWED" });
  });
});
