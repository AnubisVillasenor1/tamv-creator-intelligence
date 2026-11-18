export * from "./permit.js";
export const POLICY_VERSION: string;
export const CORE_CONTROLS: ReadonlyArray<{ id: string; title: string; evidence: string }>;
export type ExecutionMode = "certified" | "draft" | "local";
export interface GovernanceContext {
  consent: boolean;
  rightsCleared: boolean;
  containsSensitiveData: boolean;
  disclosure: boolean;
  humanApproved: boolean;
  certified: boolean;
}
export interface Decision {
  readonly allowed: boolean;
  readonly policyVersion: string;
  readonly reasons: string[];
  readonly checks: Record<string, boolean>;
}
export interface AuditEvent {
  projectId: string;
  kind: "policy.evaluated" | "execution.started" | "execution.succeeded" | "execution.failed";
  timestamp: string;
  decision: Decision;
  mode: ExecutionMode;
  executionAllowed: boolean;
  outcome: "allowed_certified" | "allowed_uncertified" | "denied";
}
export function evaluateGovernance(context: Partial<GovernanceContext>): Decision;
export class GovernanceDeniedError extends Error {
  decision: Decision;
  mode: ExecutionMode;
}
export function createGovernance(options: {
  audit: (event: AuditEvent) => Promise<unknown>;
  beforeEvaluate?: (input: { projectId: string; context: GovernanceContext; mode: ExecutionMode }) => Promise<unknown>;
  afterEvaluate?: (input: { projectId: string; decision: Decision; mode: ExecutionMode; executionAllowed: boolean }) => Promise<unknown>;
}): {
  run<T>(input: { projectId: string; context: GovernanceContext; execute: () => Promise<T> | T; mode?: ExecutionMode }): Promise<T>;
};
export function createTamvClient(options: {
  baseUrl: string;
  getAccessToken: () => Promise<string | null>;
  fetcher?: typeof fetch;
}): {
  list(): Promise<unknown>;
  create(name: string, useCase: string): Promise<unknown>;
  configure(projectId: string, expectedVersion: number, config: Record<string, unknown>): Promise<unknown>;
  approve(projectId: string, expectedVersion: number, reason: string): Promise<unknown>;
  evaluate(projectId: string, expectedVersion: number, evidence: Pick<GovernanceContext, "consent" | "rightsCleared" | "containsSensitiveData" | "disclosure">): Promise<unknown>;
  audit(projectId: string): Promise<unknown>;
};
