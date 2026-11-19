import baseline from './baseline.json';
import type { Decision, ExecutionRequest, PolicyDecision } from './contracts';

export const coordinators = ['tamv-creator-os', 'tamv-audio-intelligence', 'tamv-growth-engine', 'tamv-sovereign-platform'] as const;
export const workflows = ['Launch', 'Performance', 'Memory'] as const;
export type Coordinator = typeof coordinators[number];
export type Workflow = typeof workflows[number];

export async function digest(value: unknown, algorithm: 'SHA-256' | 'SHA-512' = 'SHA-256'): Promise<string> {
  const bytes = new TextEncoder().encode(JSON.stringify(value));
  const hash = await crypto.subtle.digest(algorithm, bytes);
  return Array.from(new Uint8Array(hash), b => b.toString(16).padStart(2, '0')).join('');
}

export async function evaluatePolicy(request: ExecutionRequest, authority: {
  authenticated: boolean; revoked: boolean; approvedDigest?: string; consent: boolean;
  evidenceAvailable: boolean; adapterAvailable: boolean; certificationValid: boolean;
}): Promise<PolicyDecision> {
  let decision: Decision = 'DENY';
  let reasons: string[] = [];
  if (!authority.authenticated) reasons = ['AUTH_REQUIRED'];
  else if (authority.revoked) reasons = ['AUTHORITY_REVOKED'];
  else if (!request.idempotencyKey.trim()) reasons = ['IDEMPOTENCY_REQUIRED'];
  else if (baseline.prohibited.includes(request.action)) reasons = ['PROHIBITED_ACTION'];
  else if (request.action.startsWith('financial.') && (!/^\d+$/.test(request.amountMinor ?? '') || !/^[A-Z]{3}$/.test(request.currency ?? ''))) reasons = ['INVALID_FINANCIAL_AMOUNT_OR_CURRENCY'];
  else if (baseline.consentRequiredFor.includes(request.action) && !authority.consent) reasons = ['CONSENT_REQUIRED'];
  else if (!authority.evidenceAvailable) reasons = ['EVIDENCE_UNAVAILABLE'];
  else if (authority.approvedDigest !== request.artifactDigest) { decision = 'REVIEW'; reasons = ['HUMAN_APPROVAL_REQUIRED']; }
  else if (request.environment === 'production' && request.action !== 'local.artifact.export' && !authority.certificationValid) reasons = ['CERTIFICATION_REQUIRED'];
  else if (!authority.adapterAvailable) reasons = ['ADAPTER_UNAVAILABLE'];
  else if (request.action === 'local.artifact.export') { decision = 'ALLOW'; reasons = ['LOCAL_ARTIFACT_ONLY']; }
  else reasons = ['ACTION_NOT_ALLOWLISTED'];
  return { decision, reasonCodes: reasons, policyDigest: await digest(baseline) };
}

// Deterministic deliverables use only supplied facts; no invented metrics or AI claims.
export function buildArtifact(coordinator: Coordinator, workflow: Workflow, title: string, brief: string) {
  const lines = brief.split(/\r?\n/).map(line => line.trim()).filter(Boolean);
  const metrics = lines.flatMap(line => {
    const match = /^([^:=]+)[:=]\s*(\d+(?:\.\d+)?)\s*$/.exec(line);
    return match ? [{ name: match[1]?.trim() ?? '', value: Number(match[2]) }] : [];
  });
  const steps = workflow === 'Launch'
    ? ['Validación de demanda', 'Derechos y consentimiento', 'Producción del entregable', 'Revisión humana', 'Lanzamiento externo pendiente de conexión']
    : workflow === 'Performance'
      ? ['Validar datos propios', 'Comparar indicadores disponibles', 'Identificar límites', 'Definir experimento', 'Revisión humana']
      : ['Minimizar datos', 'Confirmar consentimiento', 'Definir vencimiento', 'Conservar evidencia', 'Permitir revocación'];
  return { schema: 'tamv.exagon.artifact.v1', coordinator, workflow, title, brief,
    facts: lines, metrics, total: metrics.reduce((sum, metric) => sum + metric.value, 0),
    steps: steps.map((name, index) => ({ order: index + 1, name, status: 'PENDING' })),
    boundary: 'LOCAL_ARTIFACT_ONLY', externalEffects: false };
}

export function validatePermit(permit: { requestDigest: string; audience: string; notBefore: string; expiresAt: string }, requestDigest: string, audience: string, now = Date.now()) {
  return permit.requestDigest === requestDigest && permit.audience === audience &&
    Date.parse(permit.notBefore) <= now && Date.parse(permit.expiresAt) > now;
}

export async function executeWithReconciliation<T>(execute: () => Promise<T>, reconcile: () => Promise<void>) {
  try { return { status: 'SUCCEEDED' as const, output: await execute() }; }
  catch { await reconcile(); return { status: 'UNKNOWN' as const }; }
}