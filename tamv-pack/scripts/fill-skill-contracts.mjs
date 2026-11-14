#!/usr/bin/env node
/**
 * Completes the input/output contract of the skills that shipped without one.
 *
 * The text is authored per skill from its stated purpose; nothing is inferred
 * from an execution that does not exist. The script is idempotent: a file that
 * already declares `## Entradas requeridas` and a delivery section is left
 * untouched.
 *
 * Usage: node tamv-pack/scripts/fill-skill-contracts.mjs [--check]
 */

import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const HERE = dirname(fileURLToPath(import.meta.url));
const SKILLS_DIR = resolve(HERE, "..", "skills");
const CHECK = process.argv.includes("--check");

const CONTRACTS = {
  "tamv-play-and-go-architect": {
    inputs: [
      "objetivos del producto y alcance del MVP",
      "usuarios y roles",
      "restricciones de infraestructura y presupuesto",
      "nivel de riesgo y datos tratados",
    ],
    outputs: null, // ya declara «Salida esperada»
  },
  "tamv-nextjs-supabase-builder": {
    inputs: [
      "requisitos funcionales",
      "modelo de datos y relaciones",
      "roles y reglas de acceso",
      "entorno de despliegue",
    ],
    outputs: [
      "esquema de base de datos",
      "rutas y componentes",
      "políticas RLS y validación en servidor",
      "pruebas y notas de despliegue",
    ],
  },
  "tamv-musicgen-local": {
    inputs: [
      "descripción y estilo musical",
      "licencia del modelo y de las muestras",
      "hardware y límites de cómputo",
      "uso previsto de la salida",
    ],
    outputs: [
      "pipeline de inferencia local",
      "parámetros y semillas reproducibles",
      "licencias y atribuciones",
      "salvaguardas de uso",
    ],
  },
  "tamv-voice-identity": {
    inputs: [
      "consentimiento escrito del titular",
      "muestras de voz autorizadas",
      "alcance, canal y vigencia del uso",
      "mecanismo de revocación",
    ],
    outputs: [
      "perfil de voz autorizado",
      "matriz de permisos por uso",
      "restricciones y bloqueos",
      "registro de consentimiento y revocación",
    ],
  },
  "tamv-audiocore-dsp": {
    inputs: [
      "archivos de audio autorizados",
      "formato y frecuencia de muestreo",
      "objetivos de medición",
      "criterios de aceptación",
    ],
    outputs: [
      "mediciones de LUFS, picos y espectro",
      "informe técnico",
      "recomendaciones de procesamiento",
      "limitaciones del análisis",
    ],
  },
  "tamv-bullmq-redis": {
    inputs: [
      "tipo y volumen de tareas",
      "latencia objetivo",
      "política de reintentos",
      "capacidad de Redis",
    ],
    outputs: [
      "diseño de colas y workers",
      "política de backoff e idempotencia",
      "métricas y alertas",
      "plan de recuperación",
    ],
  },
  "tamv-supabase-rls-security": {
    inputs: [
      "tablas y columnas",
      "roles y reglas de negocio",
      "datos sensibles",
      "requisitos de auditoría",
    ],
    outputs: [
      "políticas RLS por tabla",
      "pruebas de acceso permitido y denegado",
      "registro de auditoría",
      "riesgos residuales",
    ],
  },
  "tamv-license-authority": {
    inputs: [
      "titular y alcance de derechos",
      "producto y funcionalidades licenciadas",
      "vigencia y canal de emisión",
      "política de revocación",
    ],
    outputs: [
      "esquema de licencia",
      "firma y verificación en servidor",
      "registro de emisiones",
      "procedimiento de revocación",
    ],
  },
  "tamv-creator-growth": {
    inputs: [
      "audiencia propia y canales",
      "métricas disponibles y periodo",
      "objetivos medibles",
      "restricciones de tiempo y presupuesto",
    ],
    outputs: [
      "plan de crecimiento por etapas",
      "experimentos con hipótesis",
      "denominadores y metas",
      "tablero de seguimiento",
    ],
  },
  "tamv-monetization-advisor": {
    inputs: [
      "propuesta de valor",
      "costos y márgenes",
      "segmentos de audiencia",
      "restricciones legales y de plataforma",
    ],
    outputs: [
      "modelo de precios y planes",
      "escenarios de ingreso",
      "riesgos y supuestos",
      "política de transparencia",
    ],
  },
  "tamv-marketing-growth": {
    inputs: [
      "propuesta de valor",
      "audiencia y segmentos",
      "canales disponibles",
      "presupuesto y periodo",
    ],
    outputs: [
      "mensajes y ángulos",
      "calendario por canal",
      "métricas y atribución",
      "límites y salvaguardas",
    ],
  },
  "tamv-seo-discoverability": {
    inputs: [
      "URLs y contenido propio",
      "intención de búsqueda",
      "restricciones técnicas",
      "competencia relevante",
    ],
    outputs: [
      "mapa de metadatos por página",
      "estructura y enlaces internos",
      "contenido prioritario",
      "medición y seguimiento",
    ],
  },
  "tamv-conversion-optimizer": {
    inputs: [
      "embudo y pasos actuales",
      "métricas base y volumen",
      "hipótesis de mejora",
      "restricciones de tráfico",
    ],
    outputs: [
      "hipótesis priorizadas",
      "diseño de prueba y tamaño de muestra",
      "criterio de decisión",
      "lectura de resultados",
    ],
  },
  "tamv-launch-strategist": {
    inputs: [
      "producto y propuesta",
      "fecha e hitos",
      "audiencia y canales",
      "dependencias y riesgos",
    ],
    outputs: [
      "plan de lanzamiento por fases",
      "checklist y responsables",
      "métricas de éxito",
      "plan de reversión",
    ],
  },
  "tamv-rights-safety-guard": {
    inputs: [
      "obra o material a evaluar",
      "titularidad y permisos",
      "uso previsto y canal",
      "país o jurisdicción relevante",
    ],
    outputs: null, // ya declara «Respuesta esperada»
  },
  "tamv-support-assistant": {
    inputs: [
      "descripción del incidente",
      "pasos para reproducirlo",
      "entorno y versión",
      "impacto y urgencia",
    ],
    outputs: ["diagnóstico", "solución o alternativa", "escalado y responsables", "registro para seguimiento"],
  },
};

const INPUT_HEADING = /^## Entradas requeridas\s*$/m;
const OUTPUT_HEADING = /^## (?:Contrato de salida|Salida esperada|Respuesta esperada|Salida)\s*$/m;

function bulletBlock(heading, items) {
  return `## ${heading}\n\n${items.map((item) => `- ${item}`).join("\n")}\n\n`;
}

let changed = 0;
const problems = [];

for (const [id, contract] of Object.entries(CONTRACTS)) {
  const file = join(SKILLS_DIR, id, "SKILL.md");
  if (!existsSync(file)) {
    problems.push(`${id}: archivo ausente`);
    continue;
  }
  let source = readFileSync(file, "utf8").replace(/\r\n/g, "\n");
  const before = source;

  if (!INPUT_HEADING.test(source)) {
    const anchor = /^## (?:Reglas|Reglas obligatorias|Bloqueos obligatorios)\s*$/m.exec(source);
    if (!anchor) {
      problems.push(`${id}: sin ancla para insertar entradas`);
      continue;
    }
    source = source.slice(0, anchor.index) + bulletBlock("Entradas requeridas", contract.inputs) + source.slice(anchor.index);
  }

  if (contract.outputs && !OUTPUT_HEADING.test(source)) {
    const anchor = /^## Atribución\s*$/m.exec(source);
    if (!anchor) {
      problems.push(`${id}: sin ancla para insertar salida`);
      continue;
    }
    source = source.slice(0, anchor.index) + bulletBlock("Contrato de salida", contract.outputs) + source.slice(anchor.index);
  }

  if (source !== before) {
    changed += 1;
    if (CHECK) {
      console.error(`contrato incompleto: ${id}`);
      continue;
    }
    writeFileSync(file, source, "utf8");
  }
}

console.log(`${CHECK ? "revisados" : "actualizados"}: ${changed}${problems.length ? `, problemas: ${problems.length}` : ""}`);
for (const problem of problems) console.error(problem);
process.exitCode = (CHECK && changed > 0) || problems.length > 0 ? 1 : 0;
