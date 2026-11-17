import { z } from "zod";

const count = z.number().int().min(0).max(1_000_000_000);
export const researchCountsSchema = z
  .object({
    unauthorizedAttempts: count,
    unauthorizedEffects: count,
    legitimateAttempts: count,
    legitimateBlocked: count,
    legitimateCompleted: count,
    evaluated: count,
    answered: count,
    incorrectAnswers: count,
    independentBernoulliTrials: z.boolean(),
  })
  .strict()
  .superRefine((v, ctx) => {
    for (const [numerator, denominator] of [
      ["unauthorizedEffects", "unauthorizedAttempts"],
      ["legitimateBlocked", "legitimateAttempts"],
      ["legitimateCompleted", "legitimateAttempts"],
      ["answered", "evaluated"],
      ["incorrectAnswers", "answered"],
    ] as const) {
      if (v[numerator] > v[denominator])
        ctx.addIssue({
          code: "custom",
          path: [numerator],
          message: `${numerator} exceeds ${denominator}`,
        });
    }
    if (v.legitimateBlocked + v.legitimateCompleted > v.legitimateAttempts)
      ctx.addIssue({
        code: "custom",
        path: ["legitimateCompleted"],
        message: "Blocked and completed operations must be disjoint",
      });
  });

export function analyzeResearchCounts(input: unknown) {
  const v = researchCountsSchema.parse(input);
  const ratio = (n: number, d: number) => (d === 0 ? null : n / d);
  return {
    schema: "tamv.research.analysis.v1" as const,
    basis: "user-supplied-aggregate-counts" as const,
    unauthorizedEffectRate: ratio(v.unauthorizedEffects, v.unauthorizedAttempts),
    falseBlockRate: ratio(v.legitimateBlocked, v.legitimateAttempts),
    legitimateCompletionRate: ratio(v.legitimateCompleted, v.legitimateAttempts),
    coverage: ratio(v.answered, v.evaluated),
    selectiveError: ratio(v.incorrectAnswers, v.answered),
    zeroFailureUpper95:
      v.independentBernoulliTrials && v.unauthorizedEffects === 0 && v.unauthorizedAttempts > 0
        ? -Math.expm1(Math.log(0.05) / v.unauthorizedAttempts)
        : null,
    certified: false as const,
    productionApproved: false as const,
  };
}

const groupSchema = z
  .object({ group: z.string().trim().min(1).max(80), tp: count, fp: count, tn: count, fn: count })
  .strict();
export function analyzeFairness(input: unknown) {
  const groups = z.array(groupSchema).min(2).max(20).parse(input);
  if (new Set(groups.map((g) => g.group)).size !== groups.length)
    throw new Error("Duplicate group");
  const rate = (n: number, d: number) => (d ? n / d : null);
  const rates = groups.map((g) => ({
    group: g.group,
    selection: rate(g.tp + g.fp, g.tp + g.fp + g.tn + g.fn),
    truePositive: rate(g.tp, g.tp + g.fn),
    falsePositive: rate(g.fp, g.fp + g.tn),
  }));
  const gap = (values: (number | null)[]) =>
    values.includes(null)
      ? null
      : Math.max(...(values as number[])) - Math.min(...(values as number[]));
  const tpr = gap(rates.map((g) => g.truePositive)),
    fpr = gap(rates.map((g) => g.falsePositive));
  return {
    rates,
    demographicParityGap: gap(rates.map((g) => g.selection)),
    equalOpportunityGap: tpr,
    equalizedOddsGap: tpr === null || fpr === null ? null : Math.max(tpr, fpr),
    interpretation: "descriptive-only-not-proof-of-fairness" as const,
  };
}

export function assessConfirmatorySeparation(input: unknown) {
  const digest = z.string().regex(/^sha256:[a-f0-9]{64}$/);
  const v = z
    .object({
      candidateDigest: digest,
      evaluatedCandidateDigest: digest,
      developmentTasks: z.array(digest).min(1).max(10_000),
      confirmatoryTasks: z.array(digest).min(1).max(10_000),
      preregistered: z.boolean(),
      criteriaMet: z.boolean(),
    })
    .strict()
    .parse(input);
  const development = new Set(v.developmentTasks);
  const independent = v.confirmatoryTasks.every((task) => !development.has(task));
  const eligibleForHumanReview =
    independent &&
    v.candidateDigest === v.evaluatedCandidateDigest &&
    v.preregistered &&
    v.criteriaMet;
  return {
    eligibleForHumanReview,
    productionApproved: false as const,
    limitation:
      "Digest separation cannot detect semantically duplicated tasks or verify human authorization",
  };
}
