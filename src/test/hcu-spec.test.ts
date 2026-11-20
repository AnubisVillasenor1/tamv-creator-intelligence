import { describe, expect, it } from "vitest";
import { ARGUS_VERDICTS, PIPELINE_LAYERS, REQUEST_STATES, TRANSITIONS, assertEvidenceBeforeEffect, canTransition, checkPipelineInvariants, replayStates } from "../lib/hcu/pipeline-spec";
import { CONTRADICTIONS, contradictionSummary } from "../lib/hcu/contradictions";
import { lintClaims, lintVerdict } from "../lib/hcu/claims-lint";
import { HCU_LIMITS, graphSnapshot, lintRequest, parseSimulateInput, runSimulation } from "../lib/hcu/hcu-service";

describe("pipeline L01–L14", () => {
  it("cumple las invariantes y ARGUS no tiene FLAG", () => {
    expect(checkPipelineInvariants()).toEqual([]);
    expect(ARGUS_VERDICTS).toEqual(["ALLOW", "REVIEW", "DENY"]);
  });
  it("detecta el diseño del Manual M (efecto en L09)", () => {
    const bad = PIPELINE_LAYERS.map((l) => (l.id === "L09" ? { ...l, externalEffect: true } : l.id === "L14" ? { ...l, externalEffect: false } : l));
    expect(checkPipelineInvariants(bad).map((v) => v.rule)).toContain("efecto-solo-en-L14");
  });
  it("evidencia antes del efecto", () => {
    expect(assertEvidenceBeforeEffect([{ kind: "PRE_RECEIPT" }, { kind: "CLAIM" }, { kind: "EFFECT" }, { kind: "RESULT_RECEIPT" }])).toEqual([]);
    expect(assertEvidenceBeforeEffect([{ kind: "EFFECT" }]).length).toBe(2);
    expect(assertEvidenceBeforeEffect([{ kind: "PRE_RECEIPT" }, { kind: "CLAIM" }, { kind: "EFFECT" }, { kind: "EFFECT" }]).map((v) => v.rule)).toContain("un-solo-efecto");
  });
});

describe("máquina de estados", () => {
  it("terminales no transitan y UNKNOWN solo concilia", () => {
    for (const s of REQUEST_STATES) if (["DENIED", "SUCCEEDED", "FAILED", "RECONCILED"].includes(s)) expect(TRANSITIONS[s]).toEqual([]);
    expect(canTransition("UNKNOWN", "FAILED")).toBe(false);
    expect(canTransition("UNKNOWN", "RECONCILED")).toBe(true);
  });
  it("reproduce secuencias válidas e inválidas", () => {
    expect(replayStates(["RECEIVED", "AUTHORIZED", "CLAIMED", "UNKNOWN", "RECONCILED"])).toEqual({ ok: true, final: "RECONCILED" });
    expect(replayStates(["RECEIVED", "CLAIMED"]).ok).toBe(false);
    expect(replayStates(["AUTHORIZED"]).ok).toBe(false);
    expect(replayStates(["RECEIVED", "NOPE"]).ok).toBe(false);
    expect(replayStates([]).ok).toBe(false);
  });
});

describe("registro de contradicciones", () => {
  it("contiene 26 entradas con ids únicos", () => {
    expect(CONTRADICTIONS.length).toBe(26);
    expect(new Set(CONTRADICTIONS.map((c) => c.id)).size).toBe(26);
    expect(contradictionSummary().bySeverity.C).toBe(1);
  });
});

describe("linter de afirmaciones", () => {
  it("bloquea absolutos, inmutabilidad, TRL, poscuántico y cumplimiento", () => {
    const f = lintClaims("Reduce la opacidad a cero, es inmutable, TRL 7, criptografía poscuántica y cumple con el AI Act.");
    const ids = f.map((x) => x.rule);
    for (const r of ["S-01-cero-absoluto", "S-03-inmutable", "S-05-trl", "S-06-poscuantico", "S-02-cumplimiento"]) expect(ids).toContain(r);
    expect(lintVerdict(f)).toBe("BLOCKED");
  });
  it("texto prudente no se bloquea", () => {
    const f = lintClaims("Cadena de hashes append-only con detección de manipulación; anclaje externo pendiente. Hipótesis a falsar con IC 95 %.");
    expect(lintVerdict(f)).toBe("CLEAR");
  });
  it("es acotado frente a entradas patológicas", () => {
    const t = "inmutable ".repeat(100_000);
    expect(lintClaims(t).length).toBeLessThanOrEqual(500 * 16);
  });
});

describe("servicio HCU", () => {
  it("valida entradas de simulación", () => {
    expect(parseSimulateInput(null).ok).toBe(false);
    expect(parseSimulateInput({ scenario: "Z" }).ok).toBe(false);
    expect(parseSimulateInput({ shocks: [{ node: "ia", year: 1999, mag: 1 }] }).ok).toBe(false);
    expect(parseSimulateInput({ shocks: [{ node: "ia", year: 2030, mag: 5 }] }).ok).toBe(false);
    expect(parseSimulateInput({ shocks: [{ node: "nope", year: 2030, mag: 1 }] }).ok).toBe(false);
    expect(parseSimulateInput({ quarantine: ["__proto__"] }).ok).toBe(false);
    expect(parseSimulateInput({ mcRuns: HCU_LIMITS.maxMcRuns + 1 }).ok).toBe(false);
    expect(parseSimulateInput({}).ok).toBe(true);
  });
  it("simula con y sin sensibilidad y es reproducible", () => {
    const p = parseSimulateInput({ scenario: "A", mcRuns: 10 });
    if (!p.ok) throw new Error("input");
    const a = runSimulation(p.value), b = runSimulation(p.value);
    expect(a).toEqual(b);
    expect(a["disclaimer"]).toMatch(/HIPÓTESIS/);
    expect(a["sensitivity"]).toBeDefined();
  });
  it("el grafo declara que no está sellado", () => {
    const g = graphSnapshot();
    expect(g.integrity.sealed).toBe(false);
    expect(g.provisional).toEqual(expect.arrayContaining(["edu", "trab"]));
  });
  it("lint rechaza cuerpo sin texto", () => {
    expect(lintRequest({}).ok).toBe(false);
    expect(lintRequest({ text: "ok" }).ok).toBe(true);
  });
});
