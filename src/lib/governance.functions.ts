import { createServerFn } from '@tanstack/react-start';
import { z } from 'zod';
import { requireSupabaseAuth } from '@/integrations/supabase/auth-middleware';
import { buildArtifact, coordinators, workflows, digest } from '@/core/governance/engine';

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
  const result = await context.supabase.from('governance_projects').update({ status: data.revoke ? 'REVOKED' : 'APPROVED', approval_digest: data.revoke ? null : data.digest }).eq('id', data.id).eq('user_id', context.userId).eq('digest', data.digest).select('*').single();
  if (result.error) throw new Error('La propuesta cambió o no está disponible; vuelve a revisarla.');
  return result.data;
});

export const executeGovernanceProject = createServerFn({ method: 'POST' }).middleware([requireSupabaseAuth]).inputValidator((input: unknown) => z.object({ id: z.string().uuid(), idempotencyKey: z.string().min(8).max(128), consent: z.boolean(), retentionDays: z.number().int().min(1).max(365) }).parse(input)).handler(async ({ data, context }) => {
  const result = await context.supabase.rpc('execute_local_governance_project', { p_project: data.id, p_key: data.idempotencyKey, p_memory_consent: data.consent, p_retention_days: data.retentionDays });
  if (result.error) throw new Error('No se pudo ejecutar el entregable aprobado.');
  return result.data;
});

export const revokeGovernanceMemory = createServerFn({ method: 'POST' }).middleware([requireSupabaseAuth]).inputValidator((input: unknown) => z.string().uuid().parse(input)).handler(async ({ data, context }) => {
  const result = await context.supabase.from('governance_memories').delete().eq('id', data).eq('user_id', context.userId);
  if (result.error) throw new Error('No se pudo revocar la memoria.');
  return { revoked: true };
});