# TAMV Creator Intelligence — Arquitectura Unificada del Creator OS

- **Versión del documento:** 1.0.0
- **Estado:** propuesta arquitectónica con implementación parcial
- **Fecha:** 2026-11-15
- **Repositorio:** `AnubisVillasenor1/tamv-creator-intelligence`
- **Regla de verdad:** una capacidad se considera operativa sólo cuando existe código ejecutable, configuración verificable, pruebas que la ejercitan y evidencia del entorno donde se ejecutó. La documentación por sí sola no acredita implementación.

## 1. Propósito y principios no negociables

TAMV Creator Intelligence es el plano de gobernanza y creación agnóstico al dominio para proyectos que usan IA. Su diseño unifica skills públicas, contratos internos, inferencia gobernada, controles de integridad, ciclo de ingeniería verificable, almacenamiento de evidencia y observabilidad. La integración debe ser incremental y no puede declarar conectados proveedores o servicios que aún no tienen adaptadores comprobados.

1. **Decisión humana:** la IA propone; la persona autorizada decide. Publicar, desplegar, alterar datos, cambiar esquemas, ejecutar rollback o realizar acciones externas requiere autorización explícita en el servidor y un punto de aprobación humano donde corresponda.
2. **Evidencia independiente:** el agente no se certifica a sí mismo. La prueba debe ser producida por herramientas deterministas/CI y vinculada al commit y al artefacto exactos.
3. **Secuencia verificable:** intención → propuesta → revisión/autorización → ejecución → recibo → verificación. No se debe emitir estado de éxito antes de verificar el resultado real del destino.
4. **Fail-closed:** si falta identidad autenticada, autorización, evidencia requerida, firma/trust root, política o resultado verificable, se bloquea la operación protegida.
5. **Separación de autoridad:** capacidad ≠ autoridad ≠ ejecución ≠ evidencia ≠ aprendizaje ≠ producción.
6. **Minimización de datos:** no colocar prompts, contenido creativo, PII, secretos ni URLs firmadas en recibos o logs de gobernanza.
7. **Agnosticismo de infraestructura:** OCI, Databricks, Delta Lake, LangGraph, Vercel y cualquier proveedor son adaptadores opcionales, no supuestos del núcleo.

## 2. Capas de arquitectura

| Capa | Responsabilidad | Contrato de entrada/salida | Estado verificable en este repositorio |
|---|---|---|---|
| Supervisión humana | Consentimiento, revisión, veto, signoff y atribución | Solicitud autorizada y decisión atribuible | Principio arquitectónico; los puntos de aprobación deben verificarse por flujo concreto |
| Skills públicas Genesis v3 | Interfaz estable para creadores, audio, crecimiento y plataforma soberana | Skills versionadas que delegan en contratos internos | Existen cuatro archivos de skills públicas en `tamv-genesis/v3/skills/`; validar cada skill y sus referencias con la suite del paquete |
| Inferencia y guardrails | Gateway server-side, selección de proveedor, redacción PII, límites de cuota y telemetría | Solicitud validada → respuesta más metadatos de auditoría | La integración concreta debe verificarse por ruta; no asumir Inference Tables, FMAPI, Databricks AI Functions ni rate limiting distribuido sin adaptadores y pruebas |
| HyperCore Turbo | Política, integridad, velocidad asíncrona y recibos de operación | Decisión de política y operación vinculada a fuente/artefacto/destino | Se incorpora un contrato puro de recibos en la rama de integración; no equivale a almacenamiento, ejecución ni firma |
| Harness SDLC | Fases F0–F17, límites de especificación, pruebas, arbitraje CI y signoff | Commit candidato → evidencia reproducible y veredicto | El ciclo F0–F17 es objetivo de arquitectura; cada fase debe mapearse a scripts/contratos reales antes de marcarse ejecutable |
| Datos y memoria | Sesiones, checkpoints, evidencia y capas analíticas | Eventos validados → datos curados con linaje | Medallion de 18 tablas, Autonomous AI Lakehouse 26ai y sincronización CodeGraph/Graphify son integraciones externas no demostradas por este documento |
| Observabilidad | Estado de workflows, recibos y evidencia de origen | Eventos verificables → panel con trazabilidad | God’s Eye View/FastAPI/streaming TLS deben tratarse como módulos objetivo hasta validar rutas, contenedores, OIDC, RBAC y despliegue |

## 3. Superficie pública de skills v3.0.0

Las cuatro skills coordinadoras se mantienen separadas de la biblioteca interna de contratos:

| Skill pública | Dominio | Responsabilidad principal |
|---|---|---|
| `tamv-creator-os` | Creador y estrategia | Identidad, propuesta de valor, planificación, contenido, lanzamientos, comunidad y aprendizaje |
| `tamv-audio-intelligence` | Audio y multimedia | Flujo de producción, DSP, voz, mezcla/masterización, visuales y metadatos |
| `tamv-growth-engine` | Crecimiento y monetización | SEO/AI-SEO, conversión transparente, email, atribución y analítica ética |
| `tamv-sovereign-platform` | Plataforma y gobernanza | Políticas, integridad, RBAC, firmas, cuotas, pruebas, datos y despliegue |

Las skills públicas deben orquestar contratos internos en lugar de duplicarlos. El número de contratos internos (37) se considera una afirmación de inventario que debe comprobarse contra el árbol real del paquete; no se usa como hecho certificado hasta que un validador enumere y cuente los contratos.

### Estados de cierre

- **`closed`**: código o contrato requerido presente, pruebas automáticas aplicables ejecutadas y evidencia reproducible vinculada a una revisión concreta.
- **`documented`**: sólo existe especificación/documentación; no implica capacidad ejecutable.
- **`blocked`**: existe una dependencia externa o condición verificable pendiente.
- **Regla:** no marcar una capacidad como `closed` sólo porque exista una skill, README, mock, tipo TypeScript o prueba no ejecutada.

El archivo canónico de cierre debe generarse/validarse desde el inventario real del repositorio. No se presupone la existencia de `tamv-pack/closure.json`; el inventario debe localizar su ubicación canónica antes de añadir un segundo registro que cause divergencia.

## 4. Modelo multiagente y límites de autoridad

Roles previstos:

1. **Agente documental:** prepara y valida metadatos; no publica por sí mismo.
2. **Agente de gobierno de datos:** consulta catálogo y aplica límites de alcance/efectos laterales; operaciones de escritura requieren autorización adicional.
3. **Agentes SDLC:** requisitos, arquitectura modular, diseño de pruebas, revisión de seguridad y planificación.
4. **Agente analítico:** formula consultas sobre datos autorizados y devuelve respuesta con referencias a la evidencia de origen.
5. **Controlador/orquestador:** verifica contratos y secuencia; no puede autoaprobar su propia propuesta.
6. **Revisor humano:** autoriza, rechaza o solicita cambios; la decisión queda vinculada a actor autenticado, commit, artefacto y política.

Un nombre de agente o un prompt de rol no es un control de seguridad. Las restricciones deben imponerse mediante autorización server-side, herramientas de alcance limitado, políticas deterministas, registros protegidos y CI.

## 5. HyperCore Turbo: gobernanza, integridad y velocidad

### 5.1 Govern Core

Mapeo de control a NIST CSF 2.0:

- **Govern:** roles, políticas, consentimiento, riesgo aceptado y responsabilidad.
- **Identify:** inventario de repositorios, dependencias, modelos, secretos referenciados, activos y riesgos.
- **Protect:** autenticación, autorización RBAC, mínimo privilegio, cifrado y aislamiento de datos.
- **Detect:** validación de integridad, alertas, anomalías y seguimiento de cambios.
- **Respond:** denegación fail-closed, revocación y procedimiento de incidentes.
- **Recover:** backups y restauraciones probadas, rotación de claves y recuperación de operaciones.

Este mapeo es una matriz de diseño; no es una certificación NIST ni evidencia de que todos los controles están desplegados.

### 5.2 Integrity Core

- Calcular SHA-256 sobre artefactos explícitos y versionados.
- Firmar manifiestos con Ed25519 sólo desde un entorno de firma protegido.
- Verificar la firma con una clave pública cuyo origen de confianza esté anclado por un canal independiente.
- Separar integridad de artefacto, autenticidad de firma, procedencia del build y autorización de ejecución: ninguna sustituye a las otras.
- Para transparencia append-only/Merkle, definir formato de hoja, orden, raíz, prueba de inclusión, retención y test de verificación independiente antes de afirmar que existe un registro verificable.
- El esquema `X25519 + HKDF-SHA256 + AES-256-GCM` sólo puede incorporarse con gestión de claves, nonces únicos, versionado de envelope, autenticación de contexto y pruebas criptográficas revisadas. No se debe improvisar criptografía propia.

La mención de un manifiesto de 22 archivos y un “Sello v3” debe verificarse contra el manifiesto real y el script de certificación antes de usarla como afirmación de estado actual.

### 5.3 AI Gateway e inferencia

El camino de inferencia objetivo es: autenticación backend → autorización/consentimiento → validación de entrada → minimización/redacción PII → cuota y rate limit → proveedor permitido → validación de salida → recibo de auditoría → respuesta. Un error en un control obligatorio bloquea la inferencia protegida.

- Los secretos de proveedor permanecen en el servidor/gestor de secretos.
- HTTP 429 sólo se declara cuando el limitador realmente rechaza una solicitud por cuota.
- Las tablas de inferencia deben minimizar/redactar datos y tener permisos/retención definidos; registrar prompts completos por defecto no es aceptable.
- Las AI Functions en SQL deben ejecutarse con permisos de datos acotados, límites de coste y validación de consultas.
- Databricks FMAPI, Inference Tables y AI Functions son integraciones específicas, no requisitos del núcleo agnóstico.

### 5.4 Recibos de operación

El contrato añadido en `src/lib/hypercore-turbo/governance-receipt.ts` define metadatos de operación, commit, digest del artefacto, referencias opacas, estado y digests de evidencia. El validador es puro. Por sí solo no autentica, persiste, firma, autoriza ni ejecuta.

Reglas:
- `succeeded` requiere evidencia.
- `resume` conserva operationId, commit, digest, destino e idempotency key.
- Un nuevo candidato se tramita como operación nueva autorizada, no como reanudación.
- Los estados terminales no se reabren.
- El adaptador futuro debe escribir atómicamente, aplicar idempotencia distribuida y verificar el resultado real del destino.

## 6. Harness SDLC F0–F17

| Fase | Nombre | Evidencia mínima esperada |
|---|---|---|
| F0 | Bootstrap | entorno, versión de herramientas, dependencias fijadas |
| F1 | Requisitos | historias, criterios de aceptación y restricciones |
| F2 | Revisión humana | alcance, riesgos y decisión registrada |
| F3 | Diseño | ADR, interfaces y esquema de datos |
| F4 | Validación | pruebas de concepto y precondiciones |
| F5 | Implementación | diff de código y trazabilidad de tareas |
| F6 | Verificación | pruebas, lint, análisis estático y cobertura aplicable |
| F7 | Integración | compatibilidad y pruebas de integración |
| F8 | Release | artefacto versionado, digest y notas |
| F9 | Migración | plan, aprobación, validación y rollback probado |
| F10 | Recuperación | simulación de fallo y evidencia de restauración |
| F11 | Mantenimiento | incidente/defecto, corrección y regresión |
| F12 | Evolución | compatibilidad, migración y criterios de aceptación |
| F13 | Human Gate | aprobación explícita atribuible al artefacto exacto |
| F14 | Atestación | firma/atestación vinculada a commit, artefacto y evidencia |
| F15 | Verificación final | CI independiente sobre el mismo candidato |
| F16 | Archivo | retención y localización de artefactos/recibos |
| F17 | Documentación y trazabilidad | índice de evidencia, dependencias y enlaces verificables |

Esta tabla define el contrato objetivo, no afirma que ya exista un comando ejecutable por cada fase. Los comandos `sdlc verdict`, `sdlc quality-gate`, `sdlc coverage-diff`, `sdlc signoff`, `sdlc session-start`, `sdlc resume`, `sdlc save` y `sdlc memory-sync` sólo deben documentarse como disponibles tras localizar sus implementaciones y probar sus efectos.

### Specification Boundary

El límite de especificación debe proteger al menos: contratos de fase, política de pruebas, workflows CI, reglas de autorización, scripts de verificación y configuración de firma. Una PR que modifique dichos archivos requiere una autorización explícita separada y una evidencia verificable previa al merge. El validador no debe aceptar una autorización que el propio cambio propuesto pueda falsificar.

## 7. Datos, memoria y linaje analítico

La arquitectura lógica puede organizar eventos en Landing → Bronze → Silver → Gold. Cada transformación debe mantener linaje, esquema versionado, validación de calidad y controles de acceso. Los datos Gold deben derivarse de datos Silver aprobados; el visor analítico no debe inventar alertas ni mostrar un resultado sin enlace a la evidencia de origen.

La cifra de 18 tablas Delta, el esquema `oci_medallion.oci_artifacts`, Autonomous AI Lakehouse 26ai, CodeGraph y Graphify son requisitos de integración por verificar. Antes de desplegarlos se necesita: definición real de tablas, propietario de datos, políticas de retención, permisos, pruebas de calidad, recuperación, coste y conectividad. No se deben añadir migraciones a directorios administrados por Lovable manualmente; usar el flujo de cambio de esquema aprobado por el propietario de esa capa.

## 8. God's Eye View y operación de despliegue

La consola objetivo presenta sólo eventos y resultados verificables: estado de operación, actor autorizado, destino, versión, digest, política, recibo y enlaces de evidencia. Cada visualización debe diferenciar datos observados, inferencias y alertas; no debe convertir incertidumbre en una emergencia visual.

El backend FastAPI, tres contenedores Compose, TLS en 443, OIDC/RBAC, globe 3D, streaming y controles React requieren pruebas de integración independientes. No se consideran desplegados por su descripción en este documento.

### Ciclo de operación

- **install:** instalación nueva con release y destino fijados.
- **resume:** reanuda la misma operación, fuente, artefacto y destino.
- **update:** operación nueva, autorizada y con candidato explícito.
- **redeploy:** reconstruye ejecutables conservando datos persistentes sólo si la compatibilidad está probada.
- **rollback:** restaura una versión anterior conforme a un plan probado; nunca borra el registro del fallo original.

Preflight debe comprobar identidad, permisos mínimos, versión/commit, digest, recursos, conectividad, certificados, política, backup, plan de rollback y aceptación posterior. Los “14 parámetros” y el estado `INSTALLED_CONVERSATION_PENDING` deben definirse en un esquema versionado y verificarse en el implementador real antes de tratarse como contrato operativo.

## 9. Licencias y procedencia

La propuesta de licencias híbridas requiere un inventario por ruta y revisión de licencias de dependencias y contribuciones. No inferir que todo el núcleo ya está bajo AGPL-3.0-only, todos los scripts bajo Apache-2.0, activos privados bajo una licencia comercial o toda la documentación bajo CC-BY-4.0 sin comprobar encabezados, LICENSE files, avisos de terceros y derechos sobre marcas/modelos. Mantener un SBOM y atribución por componente.

## 10. Gates de producción

Ninguna capacidad pasa a `closed` hasta reunir la evidencia aplicable:

- [ ] Contratos/skills versionados y validados contra el inventario real.
- [ ] Autenticación y autorización server-side; rechazo de acceso no autorizado probado.
- [ ] Consentimiento y aprobación humana persistidos y vinculados al artefacto exacto.
- [ ] Recibos persistentes, atómicos, con control de acceso e idempotencia distribuida.
- [ ] Pruebas de concurrencia, reintentos, duplicados, reinicio, fallo parcial y recuperación.
- [ ] Validación de Specification Boundary y CI independiente.
- [ ] Pruebas unitarias, integración, lint, build, cobertura y seguridad ejecutadas en el commit candidato.
- [ ] Firma Ed25519 verificada contra trust root independiente; clave privada fuera del repo/frontend.
- [ ] SBOM y procedencia de build vinculadas al digest exacto.
- [ ] Redacción PII, rate limits, permisos, retención y gestión de secretos probados.
- [ ] Backups/restauración, rotación de claves y respuesta a incidentes probados.
- [ ] Integraciones de proveedores probadas en entorno no productivo antes de habilitar producción.
- [ ] README, manifiesto y firmas regenerados mediante los scripts oficiales cuando corresponda; nunca falsificar una firma ni editar manualmente un artefacto protegido.

## 11. Próxima secuencia de implementación

1. Inventariar el árbol real y los 37 contratos declarados; localizar el registro canónico de cierre y evitar inventarios duplicados.
2. Ejecutar pruebas y build del PR sobre un checkout limpio; corregir errores observados, no supuestos.
3. Validar skills públicas y su relación con contratos internos mediante una prueba automatizada de referencias.
4. Implementar el adaptador de recibos con persistencia durable y autorización, sin tocar esquemas administrados manualmente.
5. Añadir idempotencia distribuida y pruebas de concurrencia/reanudación.
6. Integrar el recibo al flujo de ejecución protegido; verificar resultado del destino antes de marcar `succeeded`.
7. Añadir gates de firma, SBOM/procedencia y límites de especificación a CI.
8. Integrar proveedores de inferencia/observabilidad sólo después de definir permisos, datos, costes y pruebas.
9. Actualizar inventario de cierre con evidencia real y recalcular el estado de cada capacidad.
10. Obtener revisión humana y merge explícito tras CI satisfactorio.

## 12. Criterio de aceptación global

La arquitectura estará implementada cuando cada capacidad publicada tenga un contrato inequívoco, una implementación rastreable, pruebas que fallen ante violaciones relevantes, autorización en el servidor, evidencia vinculada al commit/artefacto, controles operativos comprobados y un estado de cierre derivado automáticamente. Este documento por sí solo no certifica que se haya alcanzado ese estado.
