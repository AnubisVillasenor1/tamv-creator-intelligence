/**
 * Especificación ejecutable del pipeline L01–L14 y de la máquina de estados de una solicitud gobernada.
 *
 * Estado: PROPUESTA CANÓNICA A RATIFICAR. Los documentos fuente (Manual M, Tesis T, Compendio C)
 * definen L01–L14 de tres maneras distintas (ver contradicciones #1–#3 en `contradictions.ts`).
 * Esta especificación adopta la regla común de T y C —el efecto externo ocurre solo en L14, con
 * permiso y pre-recibo durable en L13— y la hace comprobable. No describe un runtime desplegado.
 */

export const ARGUS_VERDICTS = ["ALLOW", "REVIEW", "DENY"] as const;
export type ArgusVerdict = (typeof ARGUS_VERDICTS)[number];

export interface PipelineLayer {
  readonly id: string;
  readonly order: number;
  readonly name: string;
  readonly component: string;
  /** La capa puede producir un efecto observable fuera del sistema. */
  readonly externalEffect: boolean;
  /** La capa exige que ya exista un recibo durable previo al efecto. */
  readonly requiresDurableReceipt: boolean;
  /** Origen de la definición: documento que la sustenta. */
  readonly source: "M" | "T" | "C" | "T+C";
}

export const PIPELINE_LAYERS: readonly PipelineLayer[] = [
  { id: "L01", order: 1, name: "Perímetro e identidad", component: "AEGIS", externalEffect: false, requiresDurableReceipt: false, source: "M" },
  { id: "L02", order: 2, name: "Sanitización léxica y anti-inyección", component: "AEGIS", externalEffect: false, requiresDurableReceipt: false, source: "M" },
  { id: "L03", order: 3, name: "Base jurídica y derechos ARCO (no es consentimiento hash)", component: "CROWN", externalEffect: false, requiresDurableReceipt: false, source: "C" },
  { id: "L04", order: 4, name: "Clasificación semántica e intención", component: "TINA", externalEffect: false, requiresDurableReceipt: false, source: "M" },
  { id: "L05", order: 5, name: "Evaluación de riesgo regulatorio", component: "CROWN", externalEffect: false, requiresDurableReceipt: false, source: "M" },
  { id: "L06", order: 6, name: "Enrutamiento de quórum federado", component: "TINA/CROWN", externalEffect: false, requiresDurableReceipt: false, source: "M" },
  { id: "L07", order: 7, name: "Aislamiento de contexto", component: "AEGIS", externalEffect: false, requiresDurableReceipt: false, source: "M" },
  { id: "L08", order: 8, name: "Orquestación de expertos (frontera de datos sensibles)", component: "Trinidad", externalEffect: false, requiresDurableReceipt: false, source: "T+C" },
  { id: "L09", order: 9, name: "Preparación de habilidad (sin efecto externo)", component: "tamv-pack", externalEffect: false, requiresDurableReceipt: false, source: "T+C" },
  { id: "L10", order: 10, name: "Anclaje epistémico y anti-AI-slop", component: "SOPHIA", externalEffect: false, requiresDurableReceipt: false, source: "M" },
  { id: "L11", order: 11, name: "Validación de contrato de esquema", component: "TINA", externalEffect: false, requiresDurableReceipt: false, source: "M" },
  { id: "L12", order: 12, name: "Política final", component: "ARGUS", externalEffect: false, requiresDurableReceipt: false, source: "T+C" },
  { id: "L13", order: 13, name: "Permiso atómico de un solo uso y pre-recibo durable", component: "CROWN/BookPI", externalEffect: false, requiresDurableReceipt: false, source: "T+C" },
  { id: "L14", order: 14, name: "Ejecución con efecto externo y recibo de resultado", component: "ORION/BookPI", externalEffect: true, requiresDurableReceipt: true, source: "T+C" },
];

export type PipelineViolation = { readonly rule: string; readonly detail: string };

/** Invariantes del pipeline (R-06). Devuelve la lista de violaciones; vacía si la especificación es coherente. */
export function checkPipelineInvariants(layers: readonly PipelineLayer[] = PIPELINE_LAYERS): PipelineViolation[] {
  const v: PipelineViolation[] = [];
  const ids = new Set<string>();
  layers.forEach((l, i) => {
    if (l.order !== i + 1) v.push({ rule: "orden-contiguo", detail: `${l.id} tiene orden ${l.order}, se esperaba ${i + 1}` });
    if (ids.has(l.id)) v.push({ rule: "id-unico", detail: `${l.id} duplicado` });
    ids.add(l.id);
  });
  if (layers.length !== 14) v.push({ rule: "catorce-capas", detail: `hay ${layers.length} capas` });
  const effects = layers.filter((l) => l.externalEffect);
  if (effects.length !== 1 || effects[0]?.id !== "L14") {
    v.push({ rule: "efecto-solo-en-L14", detail: `capas con efecto externo: ${effects.map((l) => l.id).join(",") || "ninguna"}` });
  }
  const l14 = layers.find((l) => l.id === "L14");
  if (!l14?.requiresDurableReceipt) v.push({ rule: "recibo-previo-al-efecto", detail: "L14 no exige recibo durable previo" });
  const l13 = layers.find((l) => l.id === "L13");
  if (!l13 || !l14 || l13.order >= l14.order) v.push({ rule: "L13-antes-de-L14", detail: "el permiso/pre-recibo debe preceder a la ejecución" });
  return v;
}

/* ---------------- Máquina de estados de solicitud (R-04) ---------------- */

export const REQUEST_STATES = [
  "RECEIVED", "DENIED", "REVIEW", "AUTHORIZED", "CLAIMED", "SUCCEEDED", "FAILED", "UNKNOWN", "RECONCILED",
] as const;
export type RequestState = (typeof REQUEST_STATES)[number];

export const TRANSITIONS: Readonly<Record<RequestState, readonly RequestState[]>> = {
  RECEIVED: ["DENIED", "REVIEW", "AUTHORIZED"],
  REVIEW: ["DENIED", "AUTHORIZED"],
  AUTHORIZED: ["CLAIMED", "DENIED"], // DENIED desde AUTHORIZED = revocación antes del consumo (T06)
  CLAIMED: ["SUCCEEDED", "FAILED", "UNKNOWN"],
  UNKNOWN: ["RECONCILED"], // un timeout nunca cuenta como fracaso sin conciliar (T04)
  DENIED: [],
  SUCCEEDED: [],
  FAILED: [],
  RECONCILED: [],
};

export function canTransition(from: RequestState, to: RequestState): boolean {
  return TRANSITIONS[from].includes(to);
}

export function isTerminal(state: RequestState): boolean {
  return TRANSITIONS[state].length === 0;
}

export type ReplayResult =
  | { readonly ok: true; readonly final: RequestState }
  | { readonly ok: false; readonly at: number; readonly from: RequestState | null; readonly to: string; readonly reason: string };

/** Reproduce una secuencia de estados y rechaza la primera transición inválida o el estado desconocido. */
export function replayStates(sequence: readonly string[]): ReplayResult {
  let cur: RequestState | null = null;
  for (let i = 0; i < sequence.length; i += 1) {
    const s = sequence[i] as string;
    if (!(REQUEST_STATES as readonly string[]).includes(s)) return { ok: false, at: i, from: cur, to: s, reason: "estado desconocido" };
    const next = s as RequestState;
    if (cur === null) {
      if (next !== "RECEIVED") return { ok: false, at: i, from: null, to: s, reason: "toda solicitud comienza en RECEIVED" };
    } else if (!canTransition(cur, next)) {
      return { ok: false, at: i, from: cur, to: s, reason: `transición ${cur}→${next} no permitida` };
    }
    cur = next;
  }
  return cur ? { ok: true, final: cur } : { ok: false, at: 0, from: null, to: "", reason: "secuencia vacía" };
}

/**
 * Evidencia antes del efecto (R-06/R-09): una secuencia de eventos de ejecución es válida solo si
 * el pre-recibo durable precede a la reclamación y a la ejecución.
 */
export function assertEvidenceBeforeEffect(events: readonly { readonly kind: "PRE_RECEIPT" | "CLAIM" | "EFFECT" | "RESULT_RECEIPT" }[]): PipelineViolation[] {
  const v: PipelineViolation[] = [];
  const idx = (k: string) => events.findIndex((e) => e.kind === k);
  const pre = idx("PRE_RECEIPT"), claim = idx("CLAIM"), effect = idx("EFFECT");
  if (effect >= 0 && (pre < 0 || pre > effect)) v.push({ rule: "pre-recibo-antes-del-efecto", detail: "hay efecto sin pre-recibo durable previo" });
  if (effect >= 0 && (claim < 0 || claim > effect)) v.push({ rule: "claim-antes-del-efecto", detail: "hay efecto sin consumo atómico del permiso" });
  if (events.filter((e) => e.kind === "EFFECT").length > 1) v.push({ rule: "un-solo-efecto", detail: "más de un efecto para un permiso de un solo uso (T02)" });
  return v;
}
