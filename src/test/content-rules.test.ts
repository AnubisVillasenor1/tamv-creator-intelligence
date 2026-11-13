import { describe, expect, it } from 'vitest';
import { contentSchema } from '@/lib/content-schema';
import { skillRegistry } from '@/lib/skill-registry';
import pack from '../../tamv-pack/pack.json';

describe('Creator review safeguards', () => {
  const input = { draft: 'Un taller original para aprender a componer música.', audience: 'Músicos principiantes', goal: 'Inscripciones a un taller', channel: 'Instagram', consent: true };
  it('requires explicit consent before sharing with AI', () => {
    expect(contentSchema.safeParse({ ...input, consent: false }).success).toBe(false);
    expect(contentSchema.safeParse(input).success).toBe(true);
  });
  it('requires audience and objectives for personalized suggestions', () => {
    expect(contentSchema.safeParse({ ...input, audience: '', goal: '' }).success).toBe(false);
  });
});

describe('Governed skill extension', () => {
  it('adds exactly 20 skills to the existing 17', () => {
    expect(pack.skills).toHaveLength(37);
    expect(Object.keys(pack.skillGraph)).toHaveLength(20);
    expect(skillRegistry.map(s => s.id).sort()).toEqual([...pack.skills].sort());
  });
  it('connects every new skill to original governance and rights guards', () => {
    for (const deps of Object.values(pack.skillGraph)) {
      expect(deps).toContain('tamv-core-governance');
      expect(deps).toContain('tamv-rights-safety-guard');
      for (const dependency of deps) expect(pack.skills).toContain(dependency);
    }
    expect(pack.orchestration.humanApprovalRequired).toBe(true);
  });
});