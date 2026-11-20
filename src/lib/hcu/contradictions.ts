/**
 * Registro de contradicciones entre el Manual metodológico (M), la Tesis (T) y el Compendio 5.0 (C).
 * Fuente: análisis de los adjuntos (2026-11-18). `resolution` es la decisión recomendada, no ratificada:
 * un responsable humano debe aprobarla (estado "proposed" hasta entonces).
 */
export type Severity = "C" | "A" | "M";

export interface Contradiction {
  readonly id: number;
  readonly severity: Severity;
  readonly topic: string;
  readonly conflict: string;
  readonly sources: readonly string[];
  readonly resolution: string;
  readonly status: "open" | "proposed";
}

const c = (
  id: number, severity: Severity, topic: string, conflict: string, sources: string[], resolution: string,
): Contradiction => ({ id, severity, topic, conflict, sources, resolution, status: "proposed" });

export const CONTRADICTIONS: readonly Contradiction[] = [
  c(1, "C", "Orden L09/L13/L14", "M ejecuta la habilidad en L09 y sella/registra después; T y C: permiso + pre-recibo en L13, ejecución en L14.", ["M §4", "T §3.3", "C §23"], "Adoptar T/C: efecto externo solo en L14 (pipeline-spec.ts, test de invariante)."),
  c(2, "A", "Contenido de L01–L14", "Tres definiciones distintas de la misma numeración.", ["M", "T", "C"], "Congelar una tabla única versionada (PIPELINE_LAYERS) y retirar las otras."),
  c(3, "A", "Estados de ARGUS", "M: ALLOW/FLAG/DENY; T y C: ALLOW/REVIEW/DENY.", ["M §4", "T §3.3", "C §22"], "ALLOW | REVIEW | DENY; REVIEW define revisor, evidencia y plazo."),
  c(4, "A", "Significado de «dominio/federación»", "Tres ejes: federaciones I–VII, dominios de control (C §21) y áreas de aplicación; ANUBIS designa cuatro cosas.", ["M", "T", "C §21"], "Glosario normativo con un término por eje; ANUBIS solo para un componente."),
  c(5, "A", "TINA", "Router de borde (F-I, L04) y núcleo cognitivo a la vez.", ["M", "T"], "Definir un rol único para TINA en el glosario."),
  c(6, "A", "Estados de conocimiento y ERI", "E0–E4 con ERI ≥ 95 (M) frente a taxonomía observado/documentado/inferido/hipotético/no sustentado (C).", ["M §4", "T §3.3", "C §29"], "Adoptar C; ERI solo exploratorio."),
  c(7, "A", "TRL", "M: TRL 7 documentación; T: TRL 3–4 sin inspeccionar; C: no asigna número.", ["M §5", "T §5.3", "C §51"], "Perfil de madurez por componente con banderas de evidencia; sin TRL global."),
  c(8, "A", "37 + 4 = 41", "T lo afirma como aritmética; C lo niega; 23 módulos es otra unidad.", ["T §5.1", "C §26"], "Tabla de equivalencias capacidad↔contrato↔skill↔módulo; no sumar unidades distintas."),
  c(9, "A", "Fórmula de bloque BookPI", "M incluye ORCID y BLAKE3 y habla de Merkle; T usa JCS+política+actor; cuatro funciones hash en juego.", ["M §4", "T §3.4E", "C §37"], "Registro de algoritmos por propósito; sin datos personales en la entrada del hash; llamarlo cadena de hashes."),
  c(10, "A", "Ámbito de los SAE", "M: caja negra e intervención previa a la decodificación; T/C: requieren activaciones.", ["M §4", "T §3.4C", "C §31"], "Puerta de aplicabilidad por nivel de acceso."),
  c(11, "M", "Equidad", "Equal opportunity y equalized odds mezcladas bajo una etiqueta.", ["M §4", "C §34"], "Tres métricas separadas: Δ_DP, equal opportunity, Δ_EO."),
  c(12, "A", "Hipótesis de «cero»", "Opacidad a cero, elimina cargos duplicados, cero exfiltración.", ["M §3", "T §6.2", "C §6"], "Hipótesis falsables con intervalos; sin tasa cero."),
  c(13, "A", "ISA-FLOW", "Gobernanza como etapa 6 (M/T) o transversal (C).", ["M §5", "C §40"], "Gobernanza transversal desde antes de la ingesta."),
  c(14, "A", "Identificadores comunicados", "Zenodo 23034324 vs 23034325; cinco DOIs sin fuente en CSV-F ni .bib.", ["T", "CSV-F"], "Reconciliar o retirar; estado communicated|inspected|resolved por fila."),
  c(15, "M", "ISNI", "Con/sin caveat de atribución pendiente.", ["M", "T", "C §4"], "Mantener caveat; checksum válido no prueba atribución."),
  c(16, "A", "Alias del autor", "«Red Hat Alfa» es marca de un tercero; alias discrepan entre documentos.", ["M §1", "T", "C §4"], "No usar alias de marca ajena; un solo alias verificado."),
  c(17, "M", "Autoría de D1", "TAMV ONLINE como autor en el depósito; Castillo Trejo en roles de proyecto.", ["T", "BIB", "C §8"], "Citar tal como figura en el depósito primario."),
  c(18, "A", "Naturaleza del documento T", "«Tesis doctoral» vs categoría Thesis que no acredita grado.", ["T", "CSV-F D2", "C"], "Titular «monografía/borrador de investigación»; sin implicar grado."),
  c(19, "A", "«Demuestra» y «preregistrados» sin ejecución", "T §7.1 demuestra; §7.2 admite que no hay ejecución; OSF no recuperado.", ["T §7", "C §7"], "Reescribir como propuesta; preregistro pendiente."),
  c(20, "A", "Reparto de ingresos", "100,00 % (M) frente a 50/30/20 o 70/20/10 sin regla del remanente.", ["M §4", "T §3.4A"], "bps con Σ=10 000 y regla pública y versionada del remanente."),
  c(21, "M", "PQC", "Kyber ronda 3 ≠ ML-KEM; FIPS 205 sin corroborar; el sello real es SHA-256+Ed25519.", ["M §4", "T", "C §36"], "PQC «especificado, no implementado»."),
  c(22, "M", "Consentimiento y ARCO", "ARCO son derechos, no consentimiento.", ["M", "T L03", "C §15"], "Separar base jurídica, consentimiento y derechos ARCO."),
  c(23, "M", "Calendario", "Hitos enero–marzo 2026 ya vencidos; «testnet Q4 2026» sin evidencia.", ["M §6", "C §55"], "Cronología fechada con estado real."),
  c(24, "M", "CRediT", "Isabella AI como «co-asistencia analítica».", ["M §6", "C §53"], "La IA no figura como autora ni supervisora; declarar asistencia aparte."),
  c(25, "M", "Resultados 1,4 ms / 100 % de bloqueo", "Citados sin fuente entre los adjuntos.", ["C §45"], "Marcar «no acreditado» hasta existir el archivo y la medición."),
  c(26, "M", "Adjuntos duplicados o mal rotulados", "TESISTAMV2026.docx es el Compendio; CSV-N duplicado; manifiesto apunta a un .md no adjunto.", ["archivos"], "Regenerar el manifiesto con todos los entregables, versión y fecha."),
];

export function contradictionSummary() {
  const bySeverity: Record<Severity, number> = { C: 0, A: 0, M: 0 };
  for (const x of CONTRADICTIONS) bySeverity[x.severity] += 1;
  return { total: CONTRADICTIONS.length, bySeverity };
}
