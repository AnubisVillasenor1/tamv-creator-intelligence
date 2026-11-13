import publicBundle from "../../tamv-genesis/dist/public.json";

export interface GenesisClaim {
  id: string;
  statement: string;
  status: string;
  effectiveStatus: string;
  confidence: number;
  domain: string;
  owner: string;
  evidenceCount: number;
  independent: boolean;
  issues: string[];
  whatWouldChangeIt: string;
}

export interface GenesisCapability {
  id: string;
  label: string;
  summary: string;
  maturity: string;
  earnedMaturity: string;
  riskTier: string;
  requiresConsent: boolean;
  runnable: boolean;
  blockedBy: string[];
  nextGate: string;
}

export interface GenesisGate {
  id: string;
  label: string;
  passed: boolean;
  blocking: boolean;
  detail: string;
}

export interface GenesisDimension {
  id: string;
  label: string;
  weight: number;
  score: number;
  evidence: string;
  nextPoint: string;
}

export interface GenesisPublic {
  schema: string;
  version: string;
  generatedAt: string;
  identity: {
    subject: Record<string, unknown> & { legalName: string; organization: string; origin: string };
    canonical: { attribution: string; product: string; tagline: string; repository: string; issuer: string };
  };
  scorecard: {
    weightedScore: number;
    rawWeightedScore?: number;
    gateCapApplied?: boolean;
    grade: string;
    verdict: string;
    dimensions: GenesisDimension[];
    gates: GenesisGate[];
  };
  claims: GenesisClaim[];
  claimSummary: {
    total: number;
    byStatus: Record<string, number>;
    independentClaims: number;
    claimsWithIssues: number;
    staleClaims: number;
    conflicts: number;
    machineCheckableShare: number;
  };
  capabilities: GenesisCapability[];
  workLedger: {
    subject: { legalName: string; organization: string; origin: string };
    claim: { hours: number; asOf: string; status: string; statement: string; attribution: string };
    provenanceChain: { date: string; hours: number; statement: string; sourceId: string; status: string }[];
    windows: { id: string; from: string; to: string; hours: number; years: number; hoursPerDay: number; hoursPerWeek: number; note: string }[];
    attestations: { id: string; period: string; hours: number; artifact: string; tier: string; status: string }[];
    independentHours: number;
    integrity: { chainHead: string; entries: number; verifiedAt: string };
  };
  knowledge: { total: number; excluded: number; sensitive: number; policy: string };
  certification: { hashesValid: boolean; signed: boolean; signatureState: string; protectedFiles: number };
  checks: { id: string; label: string; status: string; detail: string; blocking: boolean }[];
}

export const GENESIS: GenesisPublic = publicBundle as unknown as GenesisPublic;

export const STATUS_TONE: Record<string, string> = {
  verified: "text-emerald-600 dark:text-emerald-400",
  corroborated: "text-sky-600 dark:text-sky-400",
  unverified: "text-amber-600 dark:text-amber-400",
  declared: "text-muted-foreground",
  contradicted: "text-rose-600 dark:text-rose-400",
  retracted: "text-rose-700 dark:text-rose-300",
};
