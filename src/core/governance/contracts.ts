export type Decision = "ALLOW" | "DENY" | "REVIEW";

export type Environment =
  | "development"
  | "staging"
  | "production";

export interface ExecutionRequest {
  requestId: string;
  idempotencyKey: string;
  actorId: string;
  action: string;
  resourceId: string;
  environment: Environment;
  paramsDigest: string;
  artifactDigest: string;
  adrDigest: string;
  amountMinor?: string;
  currency?: string;
}

export interface DecisionRecord {
  decisionId: string;
  requestDigest: string;
  decision: Decision;
  reasonCodes: string[];
  policyDigest: string;
  authorityReferences: string[];
  approvalReferences: string[];
  evidenceReceiptId: string;
  reservationId?: string;
}

export interface ExecutionPermit {
  permitId: string;
  decisionId: string;
  requestDigest: string;
  audience: string;
  nonce: string;
  notBefore: string;
  expiresAt: string;
  signature: string;
}

export interface EvidenceReceipt {
  receiptId: string;
  requestDigest: string;
  decision: Decision;
  createdAt: string;
  payloadDigest: string;
}

export interface PolicyDecision {
  decision: Decision;
  reasonCodes: string[];
  policyDigest: string;
}

export interface GovernanceRuntime {
  authenticate(actorId: string, proof: unknown): Promise<boolean>;
  resolvePolicy(request: ExecutionRequest): Promise<PolicyDecision>;
  reserveBudget(request: ExecutionRequest): Promise<string | undefined>;
  persistDecision(record: DecisionRecord): Promise<EvidenceReceipt>;
  issuePermit(record: DecisionRecord): Promise<ExecutionPermit>;
  consumePermit(permit: ExecutionPermit): Promise<boolean>;
  execute(request: ExecutionRequest): Promise<"SUCCEEDED" | "FAILED" | "UNKNOWN">;
  reconcile(request: ExecutionRequest): Promise<void>;
}
