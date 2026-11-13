import { describe, expect, it } from "vitest";
import { authorizeGovernedCapability, validateGovernCorePolicy } from "../lib/hypercore-turbo/policy";

describe("Govern Core policy enforcement", () => {
  it("validates the NIST CSF 2.0 policy and fail-closed defaults", () => {
    expect(validateGovernCorePolicy()).toEqual({ valid: true, errors: [] });
  });
  it("rejects unknown capabilities", () => {
    expect(authorizeGovernedCapability({ capability: "admin.root", consentGranted: true, certificationValid: true })).toMatchObject({
      allowed: false, reasonCode: "CAPABILITY_NOT_ALLOWLISTED",
    });
  });
  it("requires consent for voice generation", () => {
    expect(authorizeGovernedCapability({ capability: "voice.generation", consentGranted: false, certificationValid: true })).toMatchObject({
      allowed: false, reasonCode: "CONSENT_MISSING",
    });
  });
  it("blocks capabilities when certification is invalid", () => {
    expect(authorizeGovernedCapability({ capability: "music.generation", consentGranted: true, certificationValid: false })).toMatchObject({
      allowed: false, reasonCode: "CERTIFICATION_FAILED",
    });
  });
});
