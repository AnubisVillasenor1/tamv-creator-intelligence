# Estado de release — 15 de noviembre de 2026

**Commit de main:** `07e829b126deb7a6aea64a92f98e17f4ba582b5d`
**Remoto:** `https://github.com/AnubisVillasenor1/tamv-creator-intelligence`
**Verificación local:** 2026-11-15, ~22:04–22:10 hora local (UTC−6), Windows, npm 11.20.0 / node v26.13.1, git 2.56.
**Naturaleza:** documento histórico ligado a un SHA exacto. No representa ningún commit posterior; debe regenerarse con evidencia nueva para afirmar estado actual.

## Decisión de salida

El estado correcto de este SHA es **monitor verificable con funciones premium bloqueadas**, no una plataforma integral en producción. El release está **sin firma**: `tamv-attribution.sig` no contiene una firma Ed25519 oficial y el runtime mantiene bloqueadas las funciones certificadas. No se generó una identidad sustitutiva ni se relajó ningún control.

## Evidencia de CI sobre el SHA exacto

Consultada vía API de GitHub el 2026-11-15 (~22:08 local). Los tres workflows de main completaron con conclusión `success` sobre `07e829b126deb7a6aea64a92f98e17f4ba582b5d`:

| Workflow | Run | Conclusión |
|---|---|---|
| TAMV Creator Intelligence CI (`ci.yml`) | [43768218121](https://github.com/AnubisVillasenor1/tamv-creator-intelligence/actions/runs/43768218121) | success |
| TAMV Creator Intelligence CI (`tamv-creator-intelligence-ci.yml`) | [43768218122](https://github.com/AnubisVillasenor1/tamv-creator-intelligence/actions/runs/43768218122) | success |
| Validate TAMV Pack and Application | [43768218148](https://github.com/AnubisVillasenor1/tamv-creator-intelligence/actions/runs/43768218148) | success |

Jobs verificados: «Test, policy, package integrity and production build», «Test, lint, certification, and build» y «validate», los tres `success`.

**Check de Vercel:** el status combinado del commit es `failure` por el check `Vercel`, cuyo destino apunta al scope `metaversotamvonline-3484s-projects` con una invitación de upgrade por límite de tasa de builds (`build-rate-limit`). Es un bloqueo externo de la cuenta/plan de Vercel, no un fallo de las puertas del repositorio; no acredita ni invalida el artefacto desplegado. Requiere acción del propietario sobre ese scope. La evidencia CI de este SHA no debe presentarse como aceptación de Vercel.

## Puertas locales medidas en esta corrida

Ejecutadas en el clon de trabajo sobre el árbol limpio de `07e829b`, con npm (bun no está instalado en este entorno; el lock del repo sigue siendo `bun.lock`):

| Puerta | Resultado | Nota |
|---|---|---|
| `npm run test` (vitest) | PASS | 23 archivos, 250 pruebas, 0 fallos (~30 s) |
| `npm run lint` | PASS | 0 errores, 6 advertencias conocidas `react-refresh/only-export-components` |
| `node scripts/tamv-certification.mjs --check` | PASS con aviso | Hashes de origen válidos; release sin firma (bloqueo P1 esperado) |
| `node scripts/validate-skills-sh.mjs` | PASS | 4 skills públicas, 37 contratos internos |
| `node scripts/validate-governance-receipts-sql.mjs` | PASS | 20 checks estáticos; no es prueba PostgreSQL live |
| `node scripts/validate-closure-inventory.mjs` | PASS | 23 módulos, 19 capacidades públicas mapeadas |
| `npm run docs:check:test` | PASS | Suite del validador de enlaces |
| `npm run docs:check` | PASS | Documentos mantenidos (este documento incluido tras su registro) |
| `npm run build` | PASS | Certificación `--check` + vite client/SSR + nitro (`cloudflare-module`) |

Puertas no ejecutadas en este entorno (no son fallos del repo): `bash tamv-pack/scripts/test-scripts.sh`, `python3 scripts/validate-repo-hygiene.py`, `python3 scripts/validate-audit-migration.py` y las suites que invocan bash/python3 directamente. La verificación de ShellCheck y demás etapas alojadas consta en los workflows de CI citados arriba, no en esta corrida local.

## Advertencias conocidas del build

- `createServerFn().inputValidator()` deprecado en `src/lib/content.functions.ts:33` (usar `.validator()`).
- Chunks por encima de 500 kB tras minificación.
- El plugin `vite-tsconfig-paths` es sustituible por `resolve.tsconfigPaths` nativo de Vite.
- 6 advertencias de lint `react-refresh/only-export-components` en componentes `src/components/ui/`.

Ninguna debilita las guardas fail-closed; son deuda de toolchain registrada.

## Bloqueos externos vigentes en este SHA

Resumen; el detalle y los criterios de aceptación viven en el [manual de despliegue](DEPLOYMENT-READINESS-2026-11-15.md) y los [gates de evidencia](PRODUCTION-EVIDENCE-GATES.md):

- **P0 — Ledger Hyper-Core:** el orden canónico de `sequence_id` requiere cambio de esquema por el flujo administrado de Lovable; prueba concurrente live pendiente.
- **P0/P1 — Firma del release:** identidad Ed25519 autorizada, custodia de la clave privada y configuración de la clave pública; procedimiento en [RELEASE-SIGNING.md](RELEASE-SIGNING.md). Sin firma, `/api/tamv/status` devuelve `certified: false` y las capacidades certificadas permanecen bloqueadas.
- **P2 — Acceso real de creadores:** faltan rutas de registro/inicio/cierre de sesión y recuperación, y un usuario real confirmado con consentimiento del propietario.
- **P3 — Inferencia real y costes:** bloqueada por P1 y P2; no hay prueba de revisión autenticada extremo a extremo.
- **P4 — Cuotas compartidas:** la reserva atómica distribuida requiere prueba multi-instancia contra Redis/Upstash real; los límites en memoria no protegen gasto entre instancias.
- **P5 — Música, voz, audio avanzado y agentes:** sin ejecutores conectados; retornan 403 sin licencia y 501 certificados-no-conectados. No deben presentarse como disponibles.
- **P6 — Auditoría, métricas y procedencia:** almacenamiento de auditoría no aprovisionado/verificado; SBOM y atestaciones del release exacto pendientes; `TAMV_METRICS_TOKEN` y cron sin configurar.
- **Vercel:** check del commit en `failure` por límite de builds del plan; sin acceso administrativo al scope del propietario.

## Lo que este estado no acredita

- Producción completa, revisión con IA operativa ni aceptación de usuario real.
- Persistencia durable de recibos o ledger, ni permisos/RLS probados contra PostgreSQL vivo.
- Firma oficial, procedencia verificable ni despliegue aceptado en Vercel u otro alojamiento.
- Seguridad integral: la revisión básica de seguridad no sustituye pentest ni análisis profundo.

Un build verde o un 200 de `/api/tamv/status` no demuestran ninguno de esos puntos; revisar siempre el campo `certified` y la evidencia ligada al artefacto exacto ([ADR-003](adr/ADR-003-environment-isolation-and-evidence.md)).

## Política de actualización

Este documento se regenera por SHA cuando cambie el estado de release: nuevos runs de CI sobre el commit exacto, puertas locales repetidas, bloqueos revalidados. No editar un estado histórico para representarlo como actual; crear uno nuevo y enlazarlo desde el [índice](README.md) y la [matriz de cobertura](DOCUMENTATION-COVERAGE-MATRIX.md). El registro de deuda vigente es [TECHNICAL-AUDIT-AND-DEBT-REGISTER.md](TECHNICAL-AUDIT-AND-DEBT-REGISTER.md).