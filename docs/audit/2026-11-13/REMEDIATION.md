# Plan de remediación

Cada compuerta tiene un criterio de aceptación que se puede comprobar sin leer
una narrativa. El orden importa: no se firma un release antes de tener ledger, no
se pide validación antes de tener evidencia.

## Fase 0 — Contención (hecho)

| Acción | Criterio | Estado |
|---|---|---|
| Excluir material de recuperación de cuentas | No aparece en el árbol ni en el bundle | hecho |
| Autenticar la revisión creativa | Sin sesión → 401; con sesión → cuota | hecho |
| Unificar vocabulario de capacidades | Chequeo de deriva en verde | hecho |
| Alinear licencia | `LICENSE` íntegro + `NOTICE` + mapa | hecho |
| Normalizar frontmatter | 37/37 `SKILL.md` con `name` y `description` | hecho |
| Corregir versión y enlaces | Chequeo K-07 en verde | hecho |

## Fase 1 — Integridad operable (1–2 semanas)

| Compuerta | Trabajo | Aceptación |
|---|---|---|
| G1 firma | Generar par Ed25519 en custodia, firmar manifiesto, publicar clave pública | `tamv:verify` pasa con `--require-signature` |
| G2b cuota durable | Mover token bucket a Postgres/Redis con ventana por usuario | Prueba concurrente entre dos instancias respeta el límite |
| G5 SBOM | Generar CycloneDX, auditar dependencias, fijar acciones por SHA | CI adjunta SBOM y falla ante vulnerabilidad alta |
| G9 logs | Redacción de PII + prueba de inyección | Prueba intenta colar correo/token y el log sale limpio |

## Fase 2 — Persistencia y recuperación (2–4 semanas)

| Compuerta | Trabajo | Aceptación |
|---|---|---|
| G3 ledger durable | Tabla append-only, hash por evento, verificación periódica | Recomputar la cadena desde la base coincide con la cabeza |
| G3b respaldo | Respaldo diario cifrado + restauración ensayada | Restauración documentada con RPO/RTO medidos |
| G11 consentimiento | Registro por capacidad, revocación y expiración | Revocar consentimiento bloquea la siguiente llamada |
| G12 idempotencia | Clave por operación con efectos | Reintento no duplica publicación ni cobro |

## Fase 3 — Operación y escala (4–8 semanas)

| Compuerta | Trabajo | Aceptación |
|---|---|---|
| G8 carga | Prueba de 100 revisiones concurrentes | p95 bajo el objetivo y cero corrupción de cuota |
| G8b failover | Proveedor alterno y degradación declarada | Caída simulada produce error claro, no 500 genérico |
| G6 atestación | Bitácora de horas + atestador T3 | Al menos 90 días de horas con método verificable |
| G10 descubrimiento | Instalación en `.agents/skills` y `skills.sh.json` | `npx skills add` descubre 37 skills |
| G13 contratos | Completar entradas/salidas de 37 skills | Cero campos «Consultar contrato del skill» → **hecho** (37/37) |

## Fase 4 — Evaluación externa (sin fecha artificial)

| Entregable | Aceptación |
|---|---|
| Paquete de evaluación | Un revisor externo reproduce scorecard y claims en < 1 hora |
| Muestra de atestación | Tres periodos de 30 días contrastados |
| Informe de adopción | Instalaciones, proyectos y testimonios verificables, sin inflar |
| Respuesta a revisión | Hallazgos externos registrados con estado y fecha |

## Lo que no se hará

- Convertir commits, PDFs o respuestas de IA en horas.
- Declarar «certificado» sin firma.
- Presentar una respuesta de modelo como revisión por pares.
- Presionar a una institución para que valide: se le entrega evidencia y se acepta
  su criterio.
- Inflar métricas de adopción con instalaciones artificiales.

## Indicadores de éxito

| Indicador | Hoy | Objetivo 90 días |
|---|---|---|
| Compuertas bloqueantes en verde | 1/4 | 4/4 |
| Capacidades ejecutables | 1 | 3 |
| Skills con contrato completo | 37 | 37 |
| Horas con atestación independiente | 0 | ≥ 500 |
| Claims `verified` | 0 | ≥ 3 |
| Scorecard | 58.6 | ≥ 80 |
