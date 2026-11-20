/**
 * Linter de afirmaciones (registro de sobreafirmaciones S-01…S-25 del análisis de la tesis y el compendio).
 * Es determinista, sin LLM y de alcance léxico: detecta formulaciones que los propios documentos
 * (Compendio C, matrices CSV-N/CSV-F) marcan como no sustentables. No decide si una afirmación es
 * verdadera; exige que el autor la reformule o la respalde con evidencia.
 */

export type LintSeverity = "block" | "warn" | "info";

export interface LintRule {
  readonly id: string;
  readonly severity: LintSeverity;
  readonly pattern: RegExp;
  readonly why: string;
  readonly suggestion: string;
}

export interface LintFinding {
  readonly rule: string;
  readonly severity: LintSeverity;
  readonly match: string;
  readonly index: number;
  readonly why: string;
  readonly suggestion: string;
}

export const LINT_RULES: readonly LintRule[] = [
  { id: "S-01-cero-absoluto", severity: "block", pattern: /\b(a\s+cero|cero\s+(?:opacidad|riesgo|errores?|fallos?|exfiltraci[oó]n|fraude|sesgo)|tasa\s+cero|riesgo\s+cero)\b/gi, why: "Absoluto infalsable: sin medida ni intervalo de confianza.", suggestion: "Formular como hipótesis medible con IC (p. ej. cota 1−0,05^(1/n) cuando hay 0 fallos en n)." },
  { id: "S-03-inmutable", severity: "block", pattern: /\binmutab(?:le|les|ilidad)\b/gi, why: "Un ledger no es inmutable; solo detecta manipulación y solo con ancla externa.", suggestion: "«Append-only con detección de manipulación; anclaje externo pendiente»." },
  { id: "S-06-poscuantico", severity: "block", pattern: /\bposcu[aá]ntic[oa]s?\b|\bpost-?quantum\b/gi, why: "El sello real es SHA-256 + Ed25519; ML-KEM/ML-DSA no están evidenciados en código.", suggestion: "Marcar «especificado, no implementado» hasta existir implementación y pruebas." },
  { id: "S-08-estado-cuantico", severity: "warn", pattern: /\bestado\s+cu[aá]ntico\b|\bquantum\s*pods?\b/gi, why: "Connotación de computación cuántica sin respaldo.", suggestion: "Definir operacionalmente o renombrar (p. ej. «estado de transformación»)." },
  { id: "S-05-trl", severity: "block", pattern: /\bTRL\s*[-:]?\s*[5-9]\b/gi, why: "Un DOI no acredita TRL; el Compendio no asigna TRL global sin evidencia por celda.", suggestion: "Usar el perfil de madurez por componente con banderas de evidencia." },
  { id: "S-22-demuestra", severity: "warn", pattern: /\b(?:se\s+)?demuestra(?:n)?\s+que\b|\bqueda\s+demostrado\b/gi, why: "Conclusión empírica: ¿existe experimento ejecutado?", suggestion: "«Propone» o «sugiere» hasta ejecutar y registrar el experimento." },
  { id: "S-17-preregistro", severity: "warn", pattern: /\bpreregistrad[oa]s?\b|\bpre-?registered\b/gi, why: "No hay registro OSF recuperado (CSV-F P3: «No recuperado»).", suggestion: "«Protocolo propuesto; preregistro pendiente»." },
  { id: "S-02-cumplimiento", severity: "block", pattern: /\b(?:cumple|cumplimos|garantiza\s+el\s+cumplimiento|conforme)\s+(?:con\s+|a\s+)?(?:el\s+|la\s+)?(?:EU\s+)?(?:AI\s*Act|NIST|ISO(?:\/IEC)?\s*42001|CETS|GDPR|RGPD|SOC\s*2)\b/gi, why: "CSV-N: «No declarar cumplimiento por contar con CROWN»; «Inventario no es certificación».", suggestion: "«Mapeado a…; evaluación por requisito pendiente de revisión jurídica»." },
  { id: "S-09-eri", severity: "warn", pattern: /\bERI\s*(?:≥|>=|mayor\s+o\s+igual\s+a)\s*95\b/gi, why: "ERI ≥ 95 sin constructo, escala ni calibración (Compendio §29).", suggestion: "Tratar ERI como indicador exploratorio, no como llave de producción." },
  { id: "S-07-flag", severity: "warn", pattern: /\bALLOW\s*[,/|]\s*FLAG\s*[,/|]\s*DENY\b|\bFLAG\b(?=\s*\/\s*DENY)/g, why: "ARGUS: T y C usan ALLOW/REVIEW/DENY; FLAG es ambiguo.", suggestion: "Usar ALLOW | REVIEW | DENY y definir quién revisa y en qué plazo." },
  { id: "S-11-merkle", severity: "info", pattern: /\b[áa]rbol(?:es)?\s+de\s+Merkle\b|\bMerkle\b/gi, why: "Merkle exige hojas, orden, codificación, separación de dominios y pruebas de inclusión.", suggestion: "Si no están definidos, llamarlo «cadena de hashes»." },
  { id: "S-12-saE-caja-negra", severity: "warn", pattern: /\bcaja\s+negra\b[^.]{0,80}\b(?:SAE|autoencoder)/gi, why: "Los SAE requieren acceso a activaciones; son inaplicables a APIs cerradas.", suggestion: "Declarar la puerta de aplicabilidad por nivel de acceso." },
  { id: "S-26-exactly-once", severity: "warn", pattern: /\bexactly[-\s]?once\b|\bexactamente\s+una\s+vez\b/gi, why: "No hay exactly-once global; solo efecto único dentro de las garantías del adaptador.", suggestion: "«A lo sumo un efecto dentro de las garantías del adaptador»." },
  { id: "S-27-garantizado", severity: "warn", pattern: /\b(?:100\s*%\s+(?:seguro|garantizado|protegido|verificado)|totalmente\s+seguro|infalible|inviolable|a\s+prueba\s+de\s+todo)\b/gi, why: "Garantía absoluta sin modelo de amenaza.", suggestion: "Declarar el modelo de amenaza y el riesgo residual." },
  { id: "S-28-certificado", severity: "warn", pattern: /\b(?:est[aá]\s+certificad[oa]|sistema\s+certificado|certificaci[oó]n\s+(?:obtenida|completa))\b/gi, why: "Un inventario, un DOI, un hash o la firma del release no son certificación normativa; la firma solo cubre integridad del artefacto.", suggestion: "Indicar organismo, alcance, fecha y evidencia, o retirar." },
];

const MAX_TEXT = 200_000;

export function lintClaims(text: string, rules: readonly LintRule[] = LINT_RULES): LintFinding[] {
  const input = text.length > MAX_TEXT ? text.slice(0, MAX_TEXT) : text;
  const out: LintFinding[] = [];
  for (const r of rules) {
    const re = new RegExp(r.pattern.source, r.pattern.flags.includes("g") ? r.pattern.flags : r.pattern.flags + "g");
    let m: RegExpExecArray | null;
    let guard = 0;
    while ((m = re.exec(input)) !== null && guard < 500) {
      guard += 1;
      if (m[0].length === 0) { re.lastIndex += 1; continue; }
      out.push({ rule: r.id, severity: r.severity, match: m[0], index: m.index, why: r.why, suggestion: r.suggestion });
    }
  }
  return out.sort((a, b) => a.index - b.index);
}

export function lintVerdict(findings: readonly LintFinding[]): "BLOCKED" | "REVIEW" | "CLEAR" {
  if (findings.some((f) => f.severity === "block")) return "BLOCKED";
  if (findings.length > 0) return "REVIEW";
  return "CLEAR";
}
