export const PERMIT_POLICY_VERSION: string;
export interface ExecutionPermitContext {
  actor: { id: string; tenantId: string; active: boolean };
  asset: { id: string; tenantId: string; ownerId: string };
  reviewer: { id: string; tenantId: string; active: boolean; role: string };
  permit: {
    id: string; tenantId: string; actorId: string; assetId: string;
    reviewerId: string; status: string; expiresAt: number; digest: string;
    policyVersion: string; costUnits: number; consumed: boolean; revoked: boolean;
  };
  digest: string; policyVersion: string; reservedUnits: number;
}
export interface PermitDecision {
  readonly allowed: boolean; readonly policyVersion: string; readonly reasons: readonly string[];
}
export function evaluateExecutionPermit(input: Partial<ExecutionPermitContext>, now?: number): PermitDecision;
export function createPermitGovernance<T>(adapters: {
  resolve(input: { permitId: string; digest: string }): Promise<ExecutionPermitContext>;
  claim(input: { permitId: string; digest: string }): Promise<{ claimed: boolean; claimId?: string }>;
  execute(input: { permitId: string; digest: string; claimId: string }): Promise<T>;
  settle(input: { permitId: string; claimId: string; status: "succeeded" | "unknown" }): Promise<unknown>;
}): { run(input: { permitId: string; digest: string }): Promise<T> };