import { build, mc, seedState, simulate, SC, T, Y0, sha3, atomHashes, rootOf, type HcuScenario, type HcuShock } from "./hcu-core.mjs";
import { lintClaims, lintVerdict } from "./claims-lint";

/** Límites de entrada: la API es pública de solo cómputo; nada se persiste ni se ejecuta fuera del proceso. */
export const HCU_LIMITS = { maxBodyBytes: 32_768, maxShocks: 16, maxQuarantine: 64, maxMcRuns: 200, maxLintChars: 200_000 } as const;

export const HCU_DISCLAIMER =
  "Modelo exploratorio con pesos, rezagos y parámetros de escenario que son HIPÓTESIS del autor. No es predicción, no es evidencia empírica y no certifica nada.";

type Fail = { readonly ok: false; readonly status: 400 | 413 | 415; readonly error: string };
type Ok<V> = { readonly ok: true; readonly value: V };

const isObj = (v: unknown): v is Record<string, unknown> => typeof v === "object" && v !== null && !Array.isArray(v);

export interface SimulateInput { scenario: HcuScenario; shocks: HcuShock[]; quarantine: string[]; mcRuns: number; seed: number }

export function parseSimulateInput(raw: unknown): Ok<SimulateInput> | Fail {
  if (!isObj(raw)) return { ok: false, status: 400, error: "El cuerpo debe ser un objeto JSON." };
  const S = seedState();
  const ids = new Set<string>(["core", ...S.atoms.map((a) => a.id)]);
  const scen = raw["scenario"] ?? "B";
  if (scen !== "A" && scen !== "B" && scen !== "C") return { ok: false, status: 400, error: "scenario debe ser A, B o C." };
  const shocksRaw = raw["shocks"] ?? S.shocks;
  if (!Array.isArray(shocksRaw) || shocksRaw.length > HCU_LIMITS.maxShocks) return { ok: false, status: 400, error: `shocks: arreglo de hasta ${HCU_LIMITS.maxShocks}.` };
  const shocks: HcuShock[] = [];
  for (let i = 0; i < shocksRaw.length; i += 1) {
    const s = shocksRaw[i];
    if (!isObj(s) || typeof s["node"] !== "string" || !ids.has(s["node"]) || s["node"] === "core") return { ok: false, status: 400, error: `shocks[${i}].node desconocido.` };
    const year = s["year"], mag = s["mag"];
    if (typeof year !== "number" || !Number.isInteger(year) || year < Y0 || year > Y0 + T) return { ok: false, status: 400, error: `shocks[${i}].year fuera de ${Y0}–${Y0 + T}.` };
    if (typeof mag !== "number" || !Number.isFinite(mag) || mag < -1 || mag > 1) return { ok: false, status: 400, error: `shocks[${i}].mag debe estar en [-1, 1].` };
    shocks.push({ id: `s${i + 1}`, node: s["node"], year, mag });
  }
  const qRaw = raw["quarantine"] ?? [];
  if (!Array.isArray(qRaw) || qRaw.length > HCU_LIMITS.maxQuarantine || qRaw.some((q) => typeof q !== "string" || !ids.has(q))) return { ok: false, status: 400, error: "quarantine: lista de ids de nodos válidos." };
  const runs = raw["mcRuns"] ?? 0;
  if (typeof runs !== "number" || !Number.isInteger(runs) || runs < 0 || runs > HCU_LIMITS.maxMcRuns) return { ok: false, status: 400, error: `mcRuns debe ser un entero entre 0 y ${HCU_LIMITS.maxMcRuns}.` };
  const seed = raw["seed"] ?? 20261101;
  if (typeof seed !== "number" || !Number.isInteger(seed)) return { ok: false, status: 400, error: "seed debe ser entero." };
  return { ok: true, value: { scenario: scen, shocks, quarantine: qRaw as string[], mcRuns: runs, seed } };
}

const r4 = (x: number) => Math.round(x * 1e4) / 1e4;

export function runSimulation(input: SimulateInput) {
  const S = seedState();
  const M = build(S);
  const sim = simulate(M, input.shocks, input.quarantine, input.scenario);
  const years = Array.from({ length: T + 1 }, (_, t) => Y0 + t);
  const series: Record<string, number[]> = {};
  M.nodes.forEach((n, j) => { series[n.id] = sim.a.map((row) => r4(row[j] ?? 0)); });
  const out: Record<string, unknown> = {
    disclaimer: HCU_DISCLAIMER,
    deterministic: true,
    scenario: { id: input.scenario, ...SC[input.scenario] },
    years,
    series,
    inputDigest: sha3(JSON.stringify([input.scenario, input.shocks, input.quarantine, input.mcRuns, input.seed])),
  };
  if (input.mcRuns > 0) {
    const r = mc(M, input.shocks, input.quarantine, input.scenario, input.mcRuns, input.seed);
    const band = (rows: Float32Array[]) => { const o: Record<string, number[]> = {}; M.nodes.forEach((n, j) => { o[n.id] = rows.map((row) => r4(row[j] ?? 0)); }); return o; };
    out["sensitivity"] = { runs: r.runs, seed: r.seed, p10: band(r.lo), p50: band(r.md), p90: band(r.hi), note: "Bandas P10–P90 por perturbación de pesos ±25 %, rezago ±1, ganancia ±15 %, persistencia ±10 %." };
  }
  return out;
}

export function graphSnapshot() {
  const S = seedState();
  const M = build(S);
  const hashes = atomHashes(S, M);
  return {
    disclaimer: HCU_DISCLAIMER,
    nodes: M.nodes.map((n) => ({ id: n.id, name: n.name, kind: n.kind, dom: n.dom, impact: n.impact, risk: n.risk, ev: n.ev, degree: n.deg, crossDomain: n.cross })),
    hyperedges: S.hyp.map((h) => ({ id: h.id, label: h.label, sources: h.S, targets: h.T, weight: h.w, lagYears: h.lag, origin: h.origin, ref: h.ref || null })),
    provisional: S.atoms.filter((a) => a.prov).map((a) => a.id),
    integrity: { algorithm: "SHA3-512", root: rootOf(hashes), atomCount: Object.keys(hashes).length, sealed: false, note: "Raíz de integridad de datos; NO es firma ni certificación." },
  };
}

export function lintRequest(raw: unknown): Ok<{ findings: ReturnType<typeof lintClaims>; verdict: ReturnType<typeof lintVerdict>; truncated: boolean }> | Fail {
  if (!isObj(raw) || typeof raw["text"] !== "string") return { ok: false, status: 400, error: "Se espera { text: string }." };
  const text = raw["text"];
  const findings = lintClaims(text);
  return { ok: true, value: { findings, verdict: lintVerdict(findings), truncated: text.length > HCU_LIMITS.maxLintChars } };
}
