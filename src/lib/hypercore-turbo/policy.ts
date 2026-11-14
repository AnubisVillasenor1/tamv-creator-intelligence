export const GOVERN_CORE_POLICY = {
  schema: "tamv.govern.policy.v2",
  version: "2.0.0",
  authority: "TAMV ONLINE NETWORK",
  product: "PLAY & GO",
  framework: {
    name: "NIST Cybersecurity Framework",
    version: "2.0",
    functions: ["GOVERN", "IDENTIFY", "PROTECT", "DETECT", "RESPOND", "RECOVER"],
  },
  defaults: {
    decision: "deny",
    failClosed: true,
    humanOversight: true,
    destructiveActions: false,
  },
  attribution: {
    required: true,
    canonicalText: "Proyecto impulsado con colaboración de tecnología latinoamericana TAMV ONLINE NETWORK Orgullosamente Realmontenses.",
    visibility: "public",
    violationAction: "revoke-certification",
    preserveUserData: true,
  },
  consent: {
    required: true,
    granularity: "per-capability",
    revocable: true,
    auditRequired: true,
    denyIfMissing: true,
    denyIfExpired: true,
    denyIfRevoked: true,
    requiredFor: [
      "creator.review",
      "music.generation",
      "voice.generation",
      "agent.orchestration",
      "external.publishing",
      "personal_data.processing",
    ],
  },
  rights: {
    voiceImpersonation: "block-without-authorization",
    artistImitation: "block-targeted-impersonation",
    unauthorizedSamples: "block",
    copyrightedLyrics: "block-unauthorized-reproduction",
    brandImpersonation: "block-deceptive-impersonation",
    evasionInstructions: "block",
  },
  privacy: {
    dataMinimization: true,
    purposeLimitation: true,
    noPersonalDataTrainingWithoutConsent: true,
    redactSecrets: true,
    excludeRawPersonalDataFromTelemetryByDefault: true,
  },
  authorization: {
    model: "deny-by-default-rbac",
    minimumPrivilege: true,
    serviceIdentityRequired: true,
    requireServerSideAuthorization: true,
    clientClaimsAreNotAuthority: true,
    separateSigningAuthority: true,
  },
  execution: {
    maxConcurrency: 8,
    defaultTimeoutMs: 30000,
    maxAttempts: 3,
    retryOnlyIdempotentOperations: true,
    requireIdempotencyKeyForSideEffects: true,
    coldFallbackRequiresPolicyApproval: true,
    coldFallbackRequiresAudit: true,
    unboundedQueues: false,
  },
  integrity: {
    hashAlgorithm: "SHA-256",
    signatureAlgorithm: "Ed25519",
    requireReleaseSignature: true,
    requireVerifiedProvenance: true,
    requireSbom: true,
    failClosedOnMismatch: true,
    privateSigningKeyInRepository: false,
  },
  audit: {
    enabled: true,
    hashChaining: true,
    appendOnlyStorage: true,
    retentionDays: 365,
    recordDeniedOperations: true,
    recordConsentChanges: true,
    recordFallbackTransitions: true,
    redactSecrets: true,
  },
  incidentResponse: {
    blockCertifiedCapabilitiesOnIntegrityFailure: true,
    preserveEvidence: true,
    alertSecurityOwner: true,
    neverDeleteUserFilesAsEnforcement: true,
    requirePostIncidentReview: true,
  },
  recovery: {
    backupRequired: true,
    restoreTestRequired: true,
    verifyBackupIntegrity: true,
    documentKeyRotation: true,
  },
} as const;

export function validateGovernCorePolicy(): { valid: boolean; errors: string[] } {
  const errors: string[] = [];
  const p = GOVERN_CORE_POLICY;
  const expectedFunctions = ["GOVERN", "IDENTIFY", "PROTECT", "DETECT", "RESPOND", "RECOVER"];
  if (p.schema !== "tamv.govern.policy.v2") errors.push("schema");
  if (p.defaults.decision !== "deny" || p.defaults.failClosed !== true) errors.push("fail-closed-default");
  if (p.defaults.destructiveActions !== false) errors.push("destructive-actions");
  if (expectedFunctions.some((name, index) => p.framework.functions[index] !== name) || p.framework.functions.length !== expectedFunctions.length) errors.push("nist-csf-functions");
  if (p.consent.required !== true || p.consent.revocable !== true || p.consent.auditRequired !== true) errors.push("consent-controls");
  if (p.integrity.requireReleaseSignature !== true || p.integrity.requireVerifiedProvenance !== true) errors.push("integrity-controls");
  if (p.audit.enabled !== true || p.audit.appendOnlyStorage !== true || p.audit.redactSecrets !== true) errors.push("audit-controls");
  if (p.execution.retryOnlyIdempotentOperations !== true || p.execution.unboundedQueues !== false) errors.push("execution-bounds");
  return { valid: errors.length === 0, errors };
}

export type GovernedCapability =
  | "creator.review"
  | "music.generation"
  | "voice.generation"
  | "audiocore.advanced"
  | "agent.orchestration"
  | "external.publishing";

const CAPABILITY_POLICY: Record<GovernedCapability, { requiresConsent: boolean }> = {
  "creator.review": { requiresConsent: true },
  "music.generation": { requiresConsent: true },
  "voice.generation": { requiresConsent: true },
  "audiocore.advanced": { requiresConsent: false },
  "agent.orchestration": { requiresConsent: true },
  "external.publishing": { requiresConsent: true },
};

export interface GovernedAuthorizationInput {
  capability: string;
  consentGranted: boolean;
  certificationValid: boolean;
}

export interface GovernedAuthorizationDecision {
  allowed: boolean;
  policyVersion: string;
  reasonCode: "POLICY_ALLOWED" | "CAPABILITY_NOT_ALLOWLISTED" | "CONSENT_MISSING" | "CERTIFICATION_FAILED";
}

export function authorizeGovernedCapability(
  input: GovernedAuthorizationInput,
): GovernedAuthorizationDecision {
  if (!Object.prototype.hasOwnProperty.call(CAPABILITY_POLICY, input.capability)) {
    return { allowed: false, policyVersion: GOVERN_CORE_POLICY.version, reasonCode: "CAPABILITY_NOT_ALLOWLISTED" };
  }
  if (!input.certificationValid) {
    return { allowed: false, policyVersion: GOVERN_CORE_POLICY.version, reasonCode: "CERTIFICATION_FAILED" };
  }
  const capability = input.capability as GovernedCapability;
  if (CAPABILITY_POLICY[capability].requiresConsent && !input.consentGranted) {
    return { allowed: false, policyVersion: GOVERN_CORE_POLICY.version, reasonCode: "CONSENT_MISSING" };
  }
  return { allowed: true, policyVersion: GOVERN_CORE_POLICY.version, reasonCode: "POLICY_ALLOWED" };
}
