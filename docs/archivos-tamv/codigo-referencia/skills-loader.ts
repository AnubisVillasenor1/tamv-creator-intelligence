import registry from "../skills/registry.json";

export interface IsabellaSkill {
  id: string;
  provider: string;
  category: string;
  isabellaSkill: string;
  risk: "low" | "medium" | "high";
  humanApproval: boolean;
  tools: string[];
}

export class SkillsLoader {
  private skills: IsabellaSkill[] = registry.skills as IsabellaSkill[];

  list(): IsabellaSkill[] {
    return this.skills;
  }

  byCategory(cat: string): IsabellaSkill[] {
    return this.skills.filter(s => s.category === cat);
  }

  requiresApproval(skillId: string): boolean {
    const s = this.skills.find(x => x.id === skillId);
    return s?.humanApproval ?? false;
  }

  /** Integra un skill externo en el flujo Isabella según riesgo */
  async invoke(skillId: string, payload: Record<string, unknown>, crown: any) {
    const skill = this.skills.find(x => x.id === skillId);
    if (!skill) throw new Error(`Skill ${skillId} no registrado`);

    if (skill.humanApproval) {
      const approved = await crown.requestApproval({ action: "skill.invoke", skillId, payload });
      if (!approved) return { status: "blocked", reason: "CROWN: aprobación humana requerida" };
    }

    // Delegar al skill real (MCP / CLI / API) según categoría
    return { status: "dispatched", skillId, category: skill.category, tools: skill.tools };
  }
}
