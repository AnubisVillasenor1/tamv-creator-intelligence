import { z } from 'zod';

export const contentSchema = z.object({
  draft: z.string().trim().min(20, 'Comparte al menos 20 caracteres.').max(12000),
  audience: z.string().trim().min(5, 'Describe tu audiencia.').max(600),
  goal: z.string().trim().min(5, 'Describe tu objetivo.').max(600),
  channel: z.enum(['Instagram', 'YouTube', 'TikTok', 'Newsletter', 'Otro']),
  consent: z.literal(true, { errorMap: () => ({ message: 'Autoriza el envío a IA antes de continuar.' }) }),
});
export const reviewSchema = z.object({
  diagnosis: z.string(),
  improvements: z.array(z.object({ title: z.string(), reason: z.string(), action: z.string() })).min(1).max(5),
  revised: z.string(),
  safety: z.string(),
});
export type Review = z.infer<typeof reviewSchema>;