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
| Aislamiento de entornos | [DEPLOYMENT-ENVIRONMENT-ISOLATION.md](DEPLOYMENT-ENVIRONMENT-ISOLATION.md) y [ADR-003](adr/ADR-003-environment-isolation-and-evidence.md) | RFC de entorno/operaciones de Isabella y ADR de Play & Go | No confirma que las variables o scopes reales de Vercel estén bien configurados |
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

## 4. Cambios integrados y gates pendientes — corte 2026-11-15

Los siguientes cambios se verificaron en el historial de GitHub y están integrados en `main`:
- [PR #16 — preflight de entorno](https://github.com/AnubisVillasenor1/tamv-creator-intelligence/pull/16): comprobaciones de presencia/formato de variables y pruebas de no filtración.
- [PR #17 — cierre de inventario de capacidades](https://github.com/AnubisVillasenor1/tamv-creator-intelligence/pull/17): validación de capacidades, estados y rutas de evidencia.
- [PR #18 — documentación e integridad de enlaces](https://github.com/AnubisVillasenor1/tamv-creator-intelligence/pull/18): referencia de arquitectura, fuentes externas, runbook y validador documental.
- [PR #19 — fallback de cuota](https://github.com/AnubisVillasenor1/tamv-creator-intelligence/pull/19), [PR #20 — target Vercel desconocido](https://github.com/AnubisVillasenor1/tamv-creator-intelligence/pull/20), [PR #21 — hardening adicional de cuota](https://github.com/AnubisVillasenor1/tamv-creator-intelligence/pull/21) y [PR #24 — clasificación explícita de entorno](https://github.com/AnubisVillasenor1/tamv-creator-intelligence/pull/24): controles fail-closed para cuotas y preflight estricto de producción.

Los PR #22 y #25 se cerraron como actualizaciones documentales obsoletas después de cambiar el estado de `main`; no se consideran cambios integrados.

### Gates externos aún pendientes

| Gate | Estado verificado | Condición de cierre |
|---|---|---|
| PostgreSQL ledger | P0 bloqueado por diseño de secuencia/trigger | Esquema aprobado por Lovable, probe concurrente, cadena íntegra y pruebas de permisos/RLS en PostgreSQL desechable |
| Redis/Upstash | Implementación y pruebas unitarias presentes; live no verificado | Cuota agregada desde procesos independientes, expiración, límite diario, outage y rotación |
| AuditPort | No conectado a operación protegida con evidencia durable | Append durable integrado; fallo de append impide ejecutar la acción protegida |
| Firma/procedencia de release | Sin evidencia de firma/atestación del artefacto vigente | Firma Ed25519, SBOM y atestación del digest exacto verificada en entorno limpio |
| Vercel | Check falla con destino `upgradeToPro=build-rate-limit`; scope administrativo inaccesible por la integración conectada | Propietario confirma el límite/build plan, proyecto/repositorio/branch/SHA y reintenta deployment |
| Capacidades no implementadas | Varias rutas devuelven 501 intencionalmente | Implementar proveedor/worker específico y pruebas reales; no declarar capacidades operativas desde contratos |

Los checks de GitHub Actions y la configuración de Vercel son evidencias separadas. No convertir un workflow verde ni un deployment READY en afirmación de integración live, restauración, firma, autorización o persistencia.

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

No usar porcentajes subjetivos de completitud. Si se necesita un score, publicar rúbrica, denominador, commit, evidencias y bloqueos excluidos.

## Validación de documentación canónica

La CI ejecuta `bun run docs:check:test` y `bun run docs:check`. El validador comprueba destinos internos, anchors Markdown y escapes del root para los documentos mantenidos; ignora URLs externas y ejemplos dentro de bloques de código. No sustituye revisión semántica.
