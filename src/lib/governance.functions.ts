import { createServerFn } from '@tanstack/react-start';
import { z } from 'zod';
import { requireSupabaseAuth } from '@/integrations/supabase/auth-middleware';
import { buildArtifact, coordinators, workflows, digest } from '@/core/governance/engine';
import {
  GOVERNANCE_APPROVAL_ACTION,
  WATERMARK_EVIDENCE_ACTION,
  issueGovernanceApprovalWatermark,
  receiptFromReasonCodes,
  verifyApprovalWatermark,
} from '@/core/governance/approval-watermark.server';

const projectInput = z.object({ id: z.string().uuid().optional(), coordinator: z.enum(coordinators), workflow: z.enum(workflows), title: z.string().trim().min(3).max(160), brief: z.string().trim().min(10).max(12000) });
export const listGovernance = createServerFn({ method: 'GET' }).middleware([requireSupabaseAuth]).handler(async ({ context }) => {
  const [projects, evidence, memories] = await Promise.all([
    context.supabase.from('governance_projects').select('*').order('updated_at', { ascending: false }).limit(100),
    context.supabase.from('governance_evidence').select('*').order('created_at', { ascending: false }).limit(100),
    context.supabase.from('governance_memories').select('*').order('created_at', { ascending: false }).limit(100),
  ]);
  if (projects.error || evidence.error || memories.error) throw new Error('No se pudo leer el espacio de trabajo.');
  return { projects: projects.data ?? [], evidence: evidence.data ?? [], memories: memories.data ?? [] };
});

export const saveGovernanceProject = createServerFn({ method: 'POST' }).middleware([requireSupabaseAuth]).inputValidator((input: unknown) => projectInput.parse(input)).handler(async ({ data, context }) => {
  const artifact = buildArtifact(data.coordinator, data.workflow, data.title, data.brief);
  const fields = { user_id: context.userId, coordinator: data.coordinator, workflow: data.workflow, title: data.title, brief: data.brief, artifact, digest: await digest(artifact), status: 'DRAFT', approval_digest: null };
  const query = data.id ? context.supabase.from('governance_projects').update(fields).eq('id', data.id).eq('user_id', context.userId) : context.supabase.from('governance_projects').insert(fields);
  const result = await query.select('*').single();
  if (result.error) throw new Error('No se pudo guardar la propuesta.');
  return result.data;
});

export const approveGovernanceProject = createServerFn({ method: 'POST' }).middleware([requireSupabaseAuth]).inputValidator((input: unknown) => z.object({ id: z.string().uuid(), digest: z.string().regex(/^[a-f0-9]{64}$/), revoke: z.boolean().default(false) }).parse(input)).handler(async ({ data, context }) => {
  // Write the human watermark first. An approval without attributable evidence
  // is never created, even if the evidence insert fails.
  if (!data.revoke) {
    const receipt = await issueGovernanceApprovalWatermark({
      projectId: data.id,
      artifactDigest: data.digest,
      actorId: context.userId,
    });
    const evidence = await context.supabase.from('governance_evidence').insert({
      action: WATERMARK_EVIDENCE_ACTION,
      decision: 'APPROVED',
      payload_digest: receipt.subjectDigest,
      policy_digest: receipt.subject.contractDigest,
      project_id: data.id,
      reason_codes: JSON.parse(JSON.stringify([{ code: 'HUMAN_APPROVAL_WATERMARK', receipt }])),
      request_digest: data.digest,
      user_id: context.userId,
    });
    if (evidence.error) throw new Error('No se pudo registrar la marca de agua de aprobación; la propuesta no quedó aprobada.');
  }
  const result = await context.supabase.from('governance_projects').update({ status: data.revoke ? 'REVOKED' : 'APPROVED', approval_digest: data.revoke ? null : data.digest }).eq('id', data.id).eq('user_id', context.userId).eq('digest', data.digest).select('*').single();
  if (result.error) throw new Error('La propuesta cambió o no está disponible; vuelve a revisarla.');
  return result.data;
});

export const executeGovernanceProject = createServerFn({ method: 'POST' }).middleware([requireSupabaseAuth]).inputValidator((input: unknown) => z.object({ id: z.string().uuid(), idempotencyKey: z.string().min(8).max(128), consent: z.boolean(), retentionDays: z.number().int().min(1).max(365) }).parse(input)).handler(async ({ data, context }) => {
  const projectResult = await context.supabase.from('governance_projects').select('digest, approval_digest').eq('id', data.id).eq('user_id', context.userId).single();
  if (projectResult.error || !projectResult.data?.approval_digest || projectResult.data.approval_digest !== projectResult.data.digest) {
    throw new Error('La propuesta no está aprobada en su versión actual; no se ejecutará.');
  }
  const evidenceResult = await context.supabase.from('governance_evidence').select('reason_codes').eq('project_id', data.id).eq('user_id', context.userId).eq('action', WATERMARK_EVIDENCE_ACTION).eq('decision', 'APPROVED').eq('request_digest', projectResult.data.approval_digest).order('created_at', { ascending: false }).limit(1);
  if (evidenceResult.error) throw new Error('No se pudo verificar la aprobación humana registrada.');
  const receipt = receiptFromReasonCodes(evidenceResult.data?.[0]?.reason_codes);
  if (!receipt || receipt.subject.action !== GOVERNANCE_APPROVAL_ACTION || receipt.subject.actorId !== context.userId || receipt.subject.artifactDigest !== projectResult.data.approval_digest || !(await verifyApprovalWatermark(receipt))) {
    throw new Error('La aprobación humana no tiene una marca de agua válida; no se ejecutará.');
  }
  const result = await context.supabase.rpc('execute_local_governance_project', { p_project: data.id, p_key: data.idempotencyKey, p_memory_consent: data.consent, p_retention_days: data.retentionDays });
  if (result.error) throw new Error('No se pudo ejecutar el entregable aprobado.');
  return result.data;
});

export const revokeGovernanceMemory = createServerFn({ method: 'POST' }).middleware([requireSupabaseAuth]).inputValidator((input: unknown) => z.string().uuid().parse(input)).handler(async ({ data, context }) => {
  const result = await context.supabase.from('governance_memories').delete().eq('id', data).eq('user_id', context.userId);
  if (result.error) throw new Error('No se pudo revocar la memoria.');
  return { revoked: true };
});