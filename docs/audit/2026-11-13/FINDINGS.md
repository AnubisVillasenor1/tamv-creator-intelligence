# Hallazgos

Severidad: **P0** bloquea distribución o expone secretos; **P1** invalida una
afirmación pública o un control; **P2** degrada calidad, mantenibilidad o
evidencia. Estado al cerrar esta auditoría: `corregido`, `mitigado`, `abierto`,
`documentado`.

## P0 — bloqueantes

| ID | Hallazgo | Evidencia | Estado |
|---|---|---|---|
| F-01 | Release sin firma Ed25519: `tamv-attribution.sig` = `UNSIGNED_RELEASE_PENDING`. Toda capacidad premium queda bloqueada por diseño. | `tamv-attribution.sig`, `src/lib/tamv-certification.ts` | abierto |
| F-02 | Archivo local `RECUPERACION-GITHUB-OsoPanda1.md` con datos de recuperación de cuenta, correos y notas de tokens. Riesgo de secuestro de identidad y de cadena de suministro. | catálogo `KS-08` | mitigado (excluido del paquete; rotar credenciales) |
| F-03 | `reviewContent` no exigía autenticación de servidor ni cuota; cualquier cliente podía consumir el gateway. | `src/lib/content.functions.ts` (base) | corregido |
| F-04 | Deriva de identificadores: la política permite `voice.generation` y `agent.orchestration`, las rutas emitían `voice.generate` y `agent.execute`. Una allowlist que no coincide con el emisor no gobierna nada. | `policy.ts`, `api.voice.generate.ts`, `api.agent.ts` | corregido |
| F-05 | La política exige auditoría durable append-only con hash chaining; no existe tabla, cola ni almacén. | `hypercore/govern-core/policy.json`, `drizzle/schema.ts` | abierto |
| F-06 | Licencia contradictoria: `pack.json` y manifiesto `AGPL-3.0-only`; `LICENSE` del paquete decía «o posterior»; sin `LICENSE` raíz para `src/**`. | `LICENSE-MAP.md` previo | corregido |

## P1 — afirmaciones y controles

| ID | Hallazgo | Evidencia | Estado |
|---|---|---|---|
| F-07 | «37 skills conectados» en la UI y metadatos: solo `creator.review` tiene ejecutor; 34 campos del registro usan «Consultar contrato del skill». | `index.tsx`, `skill-registry.ts` | mitigado (UI corregida; contratos abiertos) |
| F-08 | 17 de 37 `SKILL.md` no tenían frontmatter YAML; skills.sh no los descubre y el catálogo queda incompleto. | `tamv-pack/skills/*/SKILL.md` | corregido |
| F-09 | `install.sh` copiaba a `.tamv/skills`, una ruta que ningún agente escanea por defecto. | `tamv-pack/install.sh` | corregido (`.agents/skills`, override por env) |
| F-10 | Un único `lastCapturedError` global con TTL de 5 s se consumía entre peticiones concurrentes: la pila podía pertenecer a otra solicitud. | `src/lib/error-capture.ts`, `src/server.ts` | corregido (AsyncLocalStorage) |
| F-11 | `scripts/verify-slsa.sh` existe pero CI no lo invoca; no hay SBOM ni attestation; acciones fijadas por etiqueta mayor. | `.github/workflows/ci.yml`, `verify-slsa.sh` | abierto |
| F-12 | Versión visible `PACK v1.2.0` contra `pack.json` 1.2.1. | `index.tsx` | corregido |
| F-13 | Enlaces de GitHub apuntaban a un repositorio con nombre distinto al real. | `index.tsx` | corregido |
| F-14 | El «Reporte sobre la Arquitectura…» fue generado y firmado por un cuaderno de IA y se presenta como reconocimiento. | corpus `KS-04`, `compendio-trazabilidad.pdf` | documentado |
| F-15 | Discrepancia de 23 obras con DOI frente a recuentos anteriores; sin inventario resoluble. | `compendio-trazabilidad.pdf` §9.4 | abierto |
| F-16 | «Automatización con riesgo cero» es un claim no falsable; no define riesgo residual ni umbral. | `ISABELLA_CERO_RISK_BASED_AUTOMATION_V2.md` | documentado |
| F-17 | Siete federaciones y seis hypercores se describen como arquitectura; el repositorio no contiene despliegues separados ni contratos entre federaciones. | documento maestro v1.0 | documentado |
| F-18 | Mapeo a NIST CSF 2.0 sin evaluación por función ni evidencia por control. | `policy.json` | abierto |
| F-19 | 24,000 horas sin bitácora, método de conteo ni atestación; los denominadores exigen jornadas de 9.6 h/día o 12.4 h/día en el último año. | `work-ledger.json`, `WORK-LEDGER.md` | documentado |

## P2 — calidad y sostenibilidad

| ID | Hallazgo | Evidencia | Estado |
|---|---|---|---|
| F-20 | El número de contratos se presenta como número de ejecutores; no hay métrica separada de «skill operativa». | `pack.json`, `skill-registry.ts` | mitigado |
| F-21 | Se afirma aislamiento multi-tenant con RLS; no hay migraciones ni políticas en el repositorio. | `drizzle/schema.ts`, skill RLS | abierto |
| F-22 | Observabilidad sin trazas, métricas agregadas ni alertas; solo logs y un panel de diagnóstico. | `hypercore.tsx`, `metrics.ts` | abierto |
| F-23 | Sin pruebas de carga, caos ni failover; el runner paralelo es en proceso, sin cola durable. | `parallel-runner.ts`, `turbo-config.json` | abierto |
| F-24 | Identidad fragmentada: nombre legal, nombre profesional, `OsoPanda1`, `AnubisVillasenor1`, tres nombres de organización. | perfiles GitHub, `pack.json` | documentado |
| F-25 | El corpus local declara CC BY 4.0 y Apache 2.0 en documentos que no pueden relicenciarse como AGPL; riesgo de contaminación si se importan. | `KS-07`, `LICENSE-MAP.md` | mitigado (excluido) |

## Patrón detrás de los hallazgos

No son 25 errores independientes. Son tres patrones:

1. **Documento antes que artefacto.** La política describe controles que el
   código todavía no tiene (F-05, F-18, F-21, F-23).
2. **Volumen como prueba.** Horas, repositorios, PDFs y DOI se usan como señal de
   calidad cuando son señal de actividad (F-14, F-15, F-19, F-20).
3. **Identidad sin registro.** Handles, organización, licencia y versión cambian
   entre superficies (F-06, F-12, F-13, F-24).

Corregir los 25 ítems uno por uno sin atacar el patrón produciría otra capa de
documentos. El paquete `tamv-genesis` existe para que el patrón sea detectable por
máquina: techos de evidencia, madurez por capacidad y deriva de vocabulario.
