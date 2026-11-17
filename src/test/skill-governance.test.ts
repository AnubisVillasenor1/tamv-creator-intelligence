import { describe, expect, it } from "vitest";
import { skillRegistry } from "@/lib/skill-registry";
import {
  resolveSkillDependencies,
  REVIEW_SKILL_CONTRACTS,
  REVIEW_SKILL_INSTRUCTIONS,
} from "@/lib/skill-governance";
import { authorizeGovernedCapability } from "@/lib/hypercore-turbo/policy";
import pack from "../../tamv-pack/pack.json";

describe("governed skill dependency wiring", () => {
  it.each(skillRegistry.map((skill) => [skill.id]))(
    "resolves the complete dependency closure for %s",
    (id) => {
      const plan = resolveSkillDependencies([id]);
      expect(plan.at(-1)).toBe(id);
      expect(new Set(plan).size).toBe(plan.length);
      expect(plan[0]).toBe("tamv-core-governance");
      for (const skillId of plan) {
        const skill = skillRegistry.find((entry) => entry.id === skillId)!;
        for (const dep of skill.dependencies)
          expect(plan.indexOf(dep)).toBeLessThan(plan.indexOf(skillId));
      }
    },
  );
  it("matches the canonical package graph, not just skill names", () => {
    for (const [id, dependencies] of Object.entries(pack.skillGraph)) {
      expect(skillRegistry.find((entry) => entry.id === id)?.dependencies).toEqual(dependencies);
    }
  });
  it("rejects unknown contracts, duplicate identifiers and dependency cycles", () => {
    expect(() => resolveSkillDependencies(["unknown"])).toThrow("Unknown");
    expect(() =>
      resolveSkillDependencies(
        ["a"],
        [
          { id: "a", dependencies: ["b"] },
          { id: "b", dependencies: ["a"] },
        ],
      ),
    ).toThrow("Cyclic");
    expect(() =>
      resolveSkillDependencies(
        ["a"],
        [
          { id: "a", dependencies: [] },
          { id: "a", dependencies: [] },
        ],
      ),
    ).toThrow("Duplicate");
  });
  it("includes transitive review contracts and binds their instructions", () => {
    expect(REVIEW_SKILL_CONTRACTS).toContain("tamv-marketing-growth");
    expect(REVIEW_SKILL_CONTRACTS).toContain("tamv-creator-growth");
    for (const id of REVIEW_SKILL_CONTRACTS) expect(REVIEW_SKILL_INSTRUCTIONS).toContain(id);
  });
  it.each([
    "creator.review",
    "music.generation",
    "voice.generation",
    "audiocore.advanced",
    "agent.orchestration",
    "external.publishing",
  ])("denies %s without explicit consent", (capability) => {
    expect(
      authorizeGovernedCapability({ capability, consentGranted: false, certificationValid: true }),
    ).toMatchObject({ allowed: false, reasonCode: "CONSENT_MISSING" });
  });
});
