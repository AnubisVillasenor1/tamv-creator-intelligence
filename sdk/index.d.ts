export const POLICY_VERSION: string;
export const CORE_CONTROLS: ReadonlyArray<{ id: string; title: string; evidence: string }>;
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
  kind: string;
  timestamp: string;
  decision: Decision;
}
export function evaluateGovernance(context: Partial<GovernanceContext>): Decision;
export class GovernanceDeniedError extends Error {
  decision: Decision;
}
export function createGovernance(options: {
  audit: (event: AuditEvent) => Promise<unknown>;
  beforeEvaluate?: (input: { projectId: string; context: GovernanceContext }) => Promise<unknown>;
  afterEvaluate?: (input: { projectId: string; decision: Decision }) => Promise<unknown>;
}): {
  run<T>(input: {
    projectId: string;
    context: GovernanceContext;
    execute: () => Promise<T>;
  }): Promise<T>;
};
export function createTamvClient(options: {
  baseUrl: string;
  getAccessToken: () => Promise<string | null>;
  fetcher?: typeof fetch;
}): {
  list(): Promise<unknown>;
  create(name: string, useCase: string): Promise<unknown>;
  configure(
    projectId: string,
    expectedVersion: number,
    config: Record<string, unknown>,
  ): Promise<unknown>;
  approve(projectId: string, expectedVersion: number, reason: string): Promise<unknown>;
  evaluate(
    projectId: string,
    expectedVersion: number,
    evidence: Pick<
      GovernanceContext,
      "consent" | "rightsCleared" | "containsSensitiveData" | "disclosure"
    >,
  ): Promise<unknown>;
  audit(projectId: string): Promise<unknown>;
};
