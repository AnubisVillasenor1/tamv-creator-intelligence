# Matriz de cobertura documental y evidencia

**Revisión:** 2026-11-15  
**Ámbito:** documentación del repositorio `AnubisVillasenor1/tamv-creator-intelligence`.  
**Objetivo:** reducir documentación duplicada, identificar vacíos y enlazar cada afirmación operativa con una fuente de verdad.

## 1. Criterio de auditoría

La existencia de un documento no demuestra que su contenido siga actualizado ni que la función descrita opere en producción. Cada tema debe tener:
1. Una fuente normativa o de diseño.
2. Una fuente de implementación (ruta, módulo, script o manifiesto).
3. Una prueba reproducible cuando la afirmación sea ejecutable.
4. Evidencia del entorno real cuando dependa de infraestructura externa.
5. Responsable y criterio de aceptación para los bloqueos externos.

### Estados de evidencia

- **Código + prueba local:** hay implementación y pruebas en el repositorio.
- **Diseño/contrato:** hay un contrato, documento o puerto, pero no un proveedor operativo demostrado.
- **Pendiente externo:** requiere secreto, proveedor, aprobación o esquema.
- **Sin evidencia de producción:** no hay evidencia de aceptación contra el entorno real.
- **Histórico:** válido para la fecha/commit indicado; debe regenerarse para afirmar estado actual.

## 2. Mapa de fuentes de verdad

| Tema | Fuente canónica | Complemento | Lo que no debe inferirse |
|---|---|---|---|
| Orientación documental | [docs/README.md](README.md) | README raíz | El índice no certifica que los documentos estén sincronizados |
| Superficie API y errores | [API-SURFACE-AND-ERROR-CONTRACTS.md](API-SURFACE-AND-ERROR-CONTRACTS.md) | `src/routes/`, `src/lib/content.functions.ts`, contratos de gobernanza | Los códigos y capacidades dependen de la implementación y del estado de certificación; no prueban operación live |
| Arquitectura runtime | [ARCHITECTURE-REFERENCE.md](ARCHITECTURE-REFERENCE.md) | `AGENTS.md`, `src/routes/README.md`, módulos fuente | Un mapa no reemplaza la revisión de código |
| Fuentes de ambos perfiles | [CROSS-REPOSITORY-ADOPTION-REGISTER.md](CROSS-REPOSITORY-ADOPTION-REGISTER.md) | ADR, RFC, amenazas y docs institucionales fijados por commit/blob SHA | Los patrones ajenos son referencia, no prueba ni implementación del destino |
| Estado de implementación | [IMPLEMENTATION-MATRIX.md](IMPLEMENTATION-MATRIX.md) | `tamv-genesis/v3/closure.json`, `package.json` | El estado puede cambiar; requiere revisión de evidencia |
| Operación general | [OPERATIONS.md](OPERATIONS.md) | [GOVERNANCE-RECEIPTS-OPERATIONS.md](GOVERNANCE-RECEIPTS-OPERATIONS.md) | Un procedimiento no prueba que el servicio esté conectado |
| Despliegue | [DEPLOYMENT-READINESS-2026-11-15.md](DEPLOYMENT-READINESS-2026-11-15.md) | [PRODUCTION-EVIDENCE-GATES.md](PRODUCTION-EVIDENCE-GATES.md) | Un check de Vercel no acredita integridad de datos ni firma |
| Estado de release fechado | [RELEASE-STATE-2026-11-15.md](RELEASE-STATE-2026-11-15.md) | Runs de CI sobre el SHA exacto, puertas locales medidas | Un estado histórico no representa un SHA posterior; regenerar con evidencia nueva |
| Aislamiento de entornos | [DEPLOYMENT-ENVIRONMENT-ISOLATION.md](DEPLOYMENT-ENVIRONMENT-ISOLATION.md) y [ADR-003](adr/ADR-003-environment-isolation-and-evidence.md) | RFC de entorno/operaciones de Isabella y ADR de Play & Go | No confirma que las variables o scopes reales de Vercel estén bien configurados |
| Orden del Hyper-Core ledger | [Solicitud de cambio de esquema](SCHEMA-CHANGE-REQUEST-HYPERCORE-LEDGER.md), `scripts/validate-audit-migration.py`, `scripts/test-audit-migration-validator.py` | `drizzle/migrations/0000_hypercore_audit_ledger.sql`, [Issue #14](https://github.com/AnubisVillasenor1/tamv-creator-intelligence/issues/14) | El cambio de esquema sólo puede aplicarse por Lovable; la prueba estática no reemplaza el probe PostgreSQL live |
| Resolución de funciones SECURITY DEFINER | `security_definer_findings()` en `scripts/validate-audit-migration.py` | `pgcrypto` en `extensions`; trigger `tamv_hypercore_audit_chain_insert` | P1 conservador: requiere calificar `extensions.digest()` y verificar privilegios CREATE; el esquema no se modificó manualmente |
| Hardening | [PRODUCTION-HARDENING-PLAN.md](PRODUCTION-HARDENING-PLAN.md) | [TECHNICAL-AUDIT-AND-DEBT-REGISTER.md](TECHNICAL-AUDIT-AND-DEBT-REGISTER.md) | Una lista de tareas no demuestra remediación |
| Auditoría técnica | [audit/2026-11-15/README.md](audit/2026-11-15/README.md) | [AUDIT-TECHNICAL-2026-11-13.md](AUDIT-TECHNICAL-2026-11-13.md) | Las conclusiones históricas no son un score actual |
| Firma e integridad | [RELEASE-SIGNING.md](RELEASE-SIGNING.md) | `tamv-attribution.json`, `tamv-attribution.sig`, `scripts/tamv-certification.mjs` | Hashes sin firma válida no certifican el release |
| Hyper-Core ledger | [HYPERCORE-AUDIT-LEDGER.md](HYPERCORE-AUDIT-LEDGER.md) | [PRODUCTION-EVIDENCE-GATES.md](PRODUCTION-EVIDENCE-GATES.md), probe PostgreSQL | Una prueba guardada en el repo no significa que se haya ejecutado contra DB real |
| Recibos de gobernanza | [GOVERNANCE-RECEIPTS-OPERATIONS.md](GOVERNANCE-RECEIPTS-OPERATIONS.md) | `docs/sql/tamv-governance-receipts.sql`, store server-side | Un recibo de intención no es aprobación ni ejecución |
| Audio | [AUDIO-PIPELINE.md](AUDIO-PIPELINE.md) | [AUDIO-ORCHESTRATION.md](AUDIO-ORCHESTRATION.md) | Un puerto no equivale a DSP nativo, modelo local o worker distribuido |
| Skills/paquete | [CORPUS-CATALOG.md](CORPUS-CATALOG.md) | `skills.sh.json`, `tamv-genesis/v3/pack.json`, `closure.json` | Número de skills no demuestra que cada capacidad tenga ejecutor |
| Publicación | [PUBLISHING.md](PUBLISHING.md) | [PUBLIC-PROJECT-DISCLOSURE.md](PUBLIC-PROJECT-DISCLOSURE.md) | Publicar un paquete no certifica seguridad |
| Legal y derechos | [legal/AI-GOVERNANCE-POLICY.md](legal/AI-GOVERNANCE-POLICY.md) | [legal/DATA-PROTECTION-AND-CREATOR-RIGHTS.md](legal/DATA-PROTECTION-AND-CREATOR-RIGHTS.md), [legal/REGULATORY-MATRIX.md](legal/REGULATORY-MATRIX.md) | La documentación no sustituye revisión jurídica competente |
| Seguridad | [SECURITY.md](../SECURITY.md) | [audit/2026-11-13/THREAT-MODEL.md](audit/2026-11-13/THREAT-MODEL.md) | Una política no equivale a una prueba de penetración |
| Integridad de enlaces | `scripts/validate-documentation-links.mjs` | `scripts/test-documentation-links.mjs`, CI | Comprueba rutas/anclas Markdown de documentos mantenidos, no la veracidad semántica ni los enlaces externos |
| Reproducibilidad de toolchain | `.github/workflows/ci.yml`, `.github/workflows/tamv-creator-intelligence-ci.yml`, `.github/workflows/validate-pack.yml` | SHA fijados de actions y Bun 1.3.5 | Requiere CI verde sobre el SHA exacto de esta rama y revisión de las reglas de branch protection |
| Gobernanza del proyecto | [GOVERNANCE.md](../GOVERNANCE.md) | [PUBLIC-FOOTPRINT.md](PUBLIC-FOOTPRINT.md) | Una política propuesta no demuestra que exista un proceso institucional activo |

## 3. Vacíos identificados y tratamiento

| Vacío o riesgo documental | Acción en esta entrega | Criterio de cierre |
|---|---|---|
| No había un único mapa corto entre rutas, servicios, skills y dependencias | Añadida [referencia de arquitectura](ARCHITECTURE-REFERENCE.md) | Revisar el mapa contra el árbol del código en cada cambio de arquitectura |
| Fuentes relevantes estaban dispersas entre perfiles GitHub y proyectos de distinto runtime | Añadido [registro de adopción](CROSS-REPOSITORY-ADOPTION-REGISTER.md) con commit y SHA de blob | Revalidar la fuente al cambiar; no importar valores/configuración de otro proyecto |
| Los documentos no estaban presentados como matriz de fuentes canónicas y límites inferenciales | Añadida esta matriz | Cada nueva guía se enlaza aquí o desde el índice |
| Respuesta ante incidentes estaba distribuida entre seguridad, hardening y auditorías | Añadido [playbook de incidentes](SECURITY-OPERATIONS-AND-INCIDENT-PLAYBOOK.md) | Simular tabletop y asignar responsables reales antes de declarar operativo |
| Las variables de entorno y preflight deben corresponder a los scripts reales | Referencias a `.env.example`, `AGENTS.md` y la guía de despliegue | Tras integrar un cambio de configuración, actualizar tabla y probar el validador |
| Los cambios propuestos en PRs abiertos no forman parte de `main` hasta fusionarse | Se registra la separación de ramas y evidencia abajo | No anunciar esos gates como disponibles en `main` antes de merge + CI |
| El registro de cierre no tiene el mismo significado que aceptación de producción | Se explicita en arquitectura y criterios de cierre | Mantener por separado estados de código, integración y entorno |

## 4. Estado actual de integración y gates pendientes

**Corte de GitHub:** 15 de noviembre de 2026.  
**Commit principal:** `c56a2a6283ffb0d38a5e99d3f45b372ce27e09bd`.

### Integración de código

Los PR recientes de hardening están integrados en `main`: #27, #28, #29, #30 y #31. El PR #31 corrigió el fixture PL/pgSQL sintético que hacía fallar los tres workflows en el commit principal anterior.

GitHub no reporta PRs abiertos en este corte.

### Branches remotos que ya no tienen función

Permanecen tres branches no protegidos asociados a PRs ya fusionados:

- `fix/ledger-security-test-fixture-2026-11-15` — PR #31 fusionado.
- `hardening/definer-extension-resolution-2026-11-15` — PR #30 fusionado.
- `hardening/ledger-sequence-privilege-guard-2026-11-15` — PR #29 fusionado.

Son candidatos de eliminación. La conexión GitHub disponible en esta sesión no expone una operación administrativa de borrado de refs, por lo que no se presenta una eliminación ficticia. Mientras tanto, no son ramas activas de desarrollo.

### Evidencia de CI

PR #31 se validó en su SHA exacto `97fe87b72e35db94a99e9aaf15321ba34c194475` con éxito en:
- `ci.yml`
- `tamv-creator-intelligence-ci.yml`
- `validate-pack.yml`

El merge produjo `c56a2a6283ffb0d38a5e99d3f45b372ce27e09bd`. Las ejecuciones antiguas sobre `6ab68b...` quedaron en `failure` por el fixture ya corregido; no deben seguir utilizándose como evidencia de un fallo del runtime actual.

### Vercel

El check de Vercel del commit principal aparece `pending` y apunta a un deployment en el scope `metaversotamvonline-3484s-projects`. La integración administrativa no tiene acceso a ese scope; por ello siguen sin verificarse el proyecto asociado, variables por target, artefacto desplegado, branch de producción y causa final de la aceptación de Vercel.

### Gates de producción todavía abiertos

- **P0 — Ledger:** el orden canónico de `sequence_id` sigue requiriendo corrección de esquema mediante el flujo administrado por Lovable.
- **P0 — Release:** firma Ed25519 real y procedencia/attestation verificable siguen pendientes.
- **P1 — PostgreSQL:** prueba concurrente live, RLS/grants, mutaciones negativas, reinicio y restauración siguen pendientes.
- **P1 — AuditPort:** no existe evidencia live de que el camino protegido escriba en un ledger durable y falle cerrado cuando la auditoría requerida no está disponible.
- **P1 — Redis/Upstash:** falta prueba multi-instancia, expiración, límites diarios y rotación/outage contra infraestructura real.
- **P1 — Vercel:** falta acceso administrativo al scope propietario y aceptación del deployment.

No se debe interpretar este estado como certificación de producción ni como deuda técnica cero.

## 5. Política de actualización documental

En cada PR que cambie comportamiento, contratos o despliegue:
- [ ] Actualizar la guía operativa afectada.
- [ ] Actualizar la matriz de implementación si cambia un estado.
- [ ] Actualizar `closure.json` y sus evidencias solo si el cambio satisface los criterios definidos.
- [ ] Añadir pruebas de regresión para comportamiento nuevo o corregido.
- [ ] Documentar errores, códigos de estado, límites, timeouts, reintentos e idempotencia.
- [ ] Indicar variables de entorno por nombre, ubicación y clasificación (pública/secreta); nunca copiar valores.
- [ ] Distinguir comprobación local, CI, integración real y producción.
- [ ] Registrar el SHA del commit y la URL del run para evidencia temporal.
- [ ] Actualizar este índice si se crea un documento canónico.
- [ ] Revisar enlaces internos y ejecutar los validadores disponibles.

Estado de ramas verificado contra el remoto el 2026-11-15 (~22:08 local, SHA de main `07e829b126deb7a6aea64a92f98e17f4ba582b5d`): existen `main` y cuatro branches adicionales — `docs/current-state-reconciliation-2026-11-15` (`be0f845`), `fix/ledger-security-test-fixture-2026-11-15` (`97fe87b`, PR #31 fusionado), `hardening/definer-extension-resolution-2026-11-15` (`a137075`, PR #30 fusionado) y `hardening/ledger-sequence-privilege-guard-2026-11-15` (`6216895`, PR #29 fusionado). La afirmación previa de que solo existía `main` no coincide con el remoto actual; la eliminación de branches requiere una operación administrativa que esta sesión no ejecuta. Ver [estado de release](RELEASE-STATE-2026-11-15.md) para la evidencia fechada de este corte.

No usar porcentajes subjetivos de completitud. Si se necesita un score, publicar rúbrica, denominador, commit, evidencias y bloqueos excluidos.

Para el análisis ejecutado y los límites actuales, consulta [la auditoría profunda](audit/2026-11-15/DEEP-AUDIT-IMPLEMENTATION-REPORT.md).

## Validación de documentación canónica

La CI ejecuta `bun run docs:check:test` y `bun run docs:check`. El validador comprueba destinos internos, anchors Markdown y escapes del root para los documentos mantenidos; ignora URLs externas y ejemplos dentro de bloques de código. No sustituye revisión semántica.
