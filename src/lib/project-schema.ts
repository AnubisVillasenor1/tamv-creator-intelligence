import { z } from "zod";

/**
 * JSON values accepted for a project's `config` column. Keeping the type
 * explicit (instead of `unknown`) lets the server function stay serializable
 * for TanStack Start, which rejects `unknown` index signatures.
 */
export type JsonValue =
  string | number | boolean | null | JsonValue[] | { [key: string]: JsonValue };

const jsonValueSchema: z.ZodType<JsonValue> = z.lazy(() =>
  z.union([
    z.string(),
    z.number(),
    z.boolean(),
    z.null(),
    z.array(jsonValueSchema),
    z.record(jsonValueSchema),
  ]),
);

export const projectSchema = z.object({
  id: z.string().uuid(),
  owner_id: z.string().uuid(),
  name: z.string(),
  use_case: z.string(),
  config: z.record(jsonValueSchema),
  version: z.number().int(),
  approved_version: z.number().nullable(),
  assessment: jsonValueSchema.nullable(),
  created_at: z.string(),
  updated_at: z.string(),
});
export type GovernedProject = z.infer<typeof projectSchema>;
export const evidenceSchema = z
  .object({
    consent: z.boolean(),
    rightsCleared: z.boolean(),
    containsSensitiveData: z.boolean(),
    disclosure: z.boolean(),
  })
  .strict();
export const configSchema = z
  .object({
    requireConsent: z.literal(true),
    requireHumanApproval: z.literal(true),
    requireDisclosure: z.literal(true),
    purpose: z.string().max(1000).optional(),
    retentionDays: z.number().int().min(1).max(365).optional(),
  })
  .strict();
export const projectActionSchema = z.discriminatedUnion("action", [
  z
    .object({
      action: z.literal("create"),
      name: z.string().trim().min(2).max(120),
      useCase: z.string().trim().min(20).max(8000),
    })
    .strict(),
  z
    .object({
      action: z.literal("configure"),
      projectId: z.string().uuid(),
      expectedVersion: z.number().int().positive(),
      config: configSchema,
    })
    .strict(),
  z
    .object({
      action: z.literal("approve"),
      projectId: z.string().uuid(),
      expectedVersion: z.number().int().positive(),
      reason: z.string().trim().min(10).max(1000),
    })
    .strict(),
  z
    .object({
      action: z.literal("evaluate"),
      projectId: z.string().uuid(),
      expectedVersion: z.number().int().positive(),
      evidence: evidenceSchema,
    })
    .strict(),
]);
export const assessmentSchema = z.object({
  summary: z.string().min(1),
  riskLevel: z.enum(["bajo", "medio", "alto"]),
  risks: z
    .array(z.object({ title: z.string(), mitigation: z.string() }))
    .min(1)
    .max(10),
  plan: z
    .array(
      z.object({
        control: z.string(),
        action: z.string(),
        owner: z.string(),
        evidence: z.string(),
      }),
    )
    .min(1)
    .max(12),
  limitations: z.string(),
});
export type ProjectAssessment = z.infer<typeof assessmentSchema>;
