/**
 * TAMV GENESIS Ω — knowledge corpus governance.
 *
 * The local corpus is large, uneven and partly sensitive. This module decides
 * what may ship, what may inform doctrine and what must never enter a bundle.
 */

import type { KnowledgeSource } from "./types.ts";

const DIGEST = /^sha256:[a-f0-9]{64}$/;

export interface KnowledgeProblem {
  readonly id: string;
  readonly code:
    | "bad-digest"
    | "duplicate-id"
    | "restricted-must-be-excluded"
    | "confidential-in-public-bundle"
    | "unknown-license"
    | "missing-origin";
  readonly detail: string;
}

export function auditKnowledgeSources(sources: readonly KnowledgeSource[]): KnowledgeProblem[] {
  const problems: KnowledgeProblem[] = [];
  const ids = new Set<string>();
  for (const source of sources) {
    if (ids.has(source.id)) problems.push({ id: source.id, code: "duplicate-id", detail: source.id });
    ids.add(source.id);
    if (!DIGEST.test(source.sha256)) problems.push({ id: source.id, code: "bad-digest", detail: source.sha256 });
    if (source.sensitivity === "restricted" && source.use !== "excluded") {
      problems.push({
        id: source.id,
        code: "restricted-must-be-excluded",
        detail: "restricted material may not be doctrine, product or evidence",
      });
    }
    if (source.sensitivity === "confidential" && source.use === "product") {
      problems.push({ id: source.id, code: "confidential-in-public-bundle", detail: source.use });
    }
    if (!source.license.trim() || /^(?:unknown|tbd|n\/a)$/i.test(source.license.trim())) {
      problems.push({ id: source.id, code: "unknown-license", detail: source.license });
    }
    if (!source.origin.trim()) problems.push({ id: source.id, code: "missing-origin", detail: source.id });
  }
  return problems;
}

/** Sources allowed in a distribution bundle, by sensitivity ceiling. */
export function selectPublishable(
  sources: readonly KnowledgeSource[],
  ceiling: KnowledgeSource["sensitivity"] = "internal",
): readonly KnowledgeSource[] {
  const order: Record<KnowledgeSource["sensitivity"], number> = {
    public: 0,
    internal: 1,
    confidential: 2,
    restricted: 3,
  };
  return sources.filter(
    (source) => source.use !== "excluded" && order[source.sensitivity] <= order[ceiling],
  );
}

export interface CorpusSummary {
  readonly total: number;
  readonly publishable: number;
  readonly excluded: number;
  readonly bytes: number;
  readonly sensitive: number;
}

export function summarizeCorpus(sources: readonly KnowledgeSource[]): CorpusSummary {
  return {
    total: sources.length,
    publishable: selectPublishable(sources).length,
    excluded: sources.filter((source) => source.use === "excluded").length,
    bytes: sources.reduce((total, source) => total + source.bytes, 0),
    sensitive: sources.filter(
      (source) => source.sensitivity === "confidential" || source.sensitivity === "restricted",
    ).length,
  };
}
