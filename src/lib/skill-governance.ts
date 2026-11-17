import { skillRegistry } from "./skill-registry";

type SkillContract = { id: string; dependencies: readonly string[] };

export function resolveSkillDependencies(
  ids: readonly string[],
  registry: readonly SkillContract[] = skillRegistry,
): string[] {
  const byId = new Map(registry.map((skill) => [skill.id, skill]));
  if (byId.size !== registry.length) throw new Error("Duplicate skill contract");
  const visiting = new Set<string>();
  const resolved = new Set<string>();
  function visit(id: string) {
    if (resolved.has(id)) return;
    if (visiting.has(id)) throw new Error(`Cyclic skill dependency: ${id}`);
    const skill = byId.get(id);
    if (!skill) throw new Error(`Unknown skill contract: ${id}`);
    visiting.add(id);
    for (const dependency of skill.dependencies) visit(dependency);
    visiting.delete(id);
    resolved.add(id);
  }
  for (const id of ids) visit(id);
  return [...resolved];
}

export const REVIEW_SKILL_CONTRACTS = resolveSkillDependencies([
  "tamv-content-review",
  "tamv-audience-research",
  "tamv-quality-gate",
]);
export const REVIEW_SKILL_INSTRUCTIONS = skillRegistry
  .filter((skill) => REVIEW_SKILL_CONTRACTS.includes(skill.id))
  .map((skill) => `${skill.id}: ${skill.description}`)
  .join("\n");
