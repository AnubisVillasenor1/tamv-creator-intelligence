# TAMV Creator Intelligence

**TAMV Creator Intelligence** es el **Creator Operating System™** y paquete de gobernanza algorítmica desarrollado por **TAMV ONLINE NETWORK** para **cualquier proyecto que utilice inteligencia artificial**, sin importar su dominio, stack o escala. Nació en el ecosistema PLAY & GO y hoy es agnóstico al proyecto: su contrato es que la IA opere bajo estándares de máxima excelencia en **gobernanza, observabilidad, transparencia, ética y protección**.

Su propósito es dotar a creadores, educadores, desarrolladores y comunidades territoriales de una infraestructura de inteligencia artificial **auditable, segura, trazable y bajo supervisión humana**, con una aplicación operativa, un SDK para integrarla en proyectos existentes y cuatro skills públicas distribuibles.

El principio rector es:

> **La IA propone; el humano decide.**

TAMV Creator Intelligence estructura flujos de trabajo asistidos por IA mediante habilidades modulares, políticas de consentimiento, controles de derechos, verificación de integridad, procedencia de software y evidencia auditable. No sustituye la autoría humana ni publica contenido automáticamente: asiste en la creación, el análisis, la planificación y la operación, dejando las decisiones finales en manos del creador.

> **Verificación local al 2026-11-17, sobre cambios posteriores a `ad44b444`.** Se ejecutaron **460/460 pruebas de aplicación**, **125/125 pruebas de Genesis** y **17/17 pruebas del prototipo de investigación SQLite**, además de typecheck, lint (0 errores, 7 advertencias) y build de producción. Son suites separadas, no ensayos científicos ni aceptación de un despliegue. El release sigue **sin firma Ed25519** (`UNSIGNED_RELEASE_PENDING`); las capacidades certificadas permanecen bloqueadas. El prototipo de investigación usa créditos sintéticos explícitos, nunca cobros reales. No se fabricó firma, aval ni despliegue.
>
> **Este README está protegido por el manifiesto de integridad.** En esta actualización se ejecutó `tamv:hash`, por lo que el hash registrado corresponde al texto actual; el marcador de firma se mantiene en `UNSIGNED_RELEASE_PENDING` y la firma real debe generarla el responsable autorizado del release con `tamv:sign` → `tamv:verify`.

## Identidad

| Atributo                  | Valor                                                                                                           |
| ------------------------- | --------------------------------------------------------------------------------------------------------------- |
| Nombre público            | TAMV Creator Intelligence                                                                                       |
| Producto                  | Creator Operating System™ — gobernanza para proyectos con IA                                                    |
| Ámbito                    | Cualquier proyecto que utilice IA, sin importar dominio o stack                                                 |
| Proyecto de origen        | PLAY & GO (ecosistema TAMV)                                                                                     |
| Repositorio               | [`AnubisVillasenor1/tamv-creator-intelligence`](https://github.com/AnubisVillasenor1/tamv-creator-intelligence) |
| Identificador del paquete | `tamv-online-network-creator-intelligence-pack`                                                                 |
| Versión pública           | `v3.0.0`                                                                                                        |
| Contratos internos        | 37 (`tamv-pack`, v1.2.1)                                                                                        |
| SDK                       | `@tamv/governance-sdk` v0.1.0 (fuente en [`sdk/`](sdk/index.mjs))                                               |
| Autoría institucional     | TAMV ONLINE NETWORK                                                                                             |
| Dirección creativa        | Anubis Villaseñor                                                                                               |
| Origen                    | Real del Monte, Hidalgo, México                                                                                 |
| Principio                 | La IA propone; el humano decide                                                                                 |
| Licencia base             | AGPL-3.0-only                                                                                                   |
| Licencias complementarias | Apache-2.0 y TAMV Commercial License                                                                            |

## Qué resuelve

El núcleo de gobernanza aplica a **cualquier proyecto con IA**; las cuatro skills públicas aportan capacidades de creación, audio, crecimiento y plataforma que cualquier proyecto puede adoptar o ignorar. TAMV Creator Intelligence está diseñado para convertir capacidades de IA en sistemas operativos auditables:

- Definir identidad, propuesta de valor y estrategia de creador.
- Planificar contenido, lanzamientos, comunidad y educación.
- Crear WAV procedural determinista y medir LUFS, pico de muestra y chroma en un estudio con consentimiento; no genera voz ni música neuronal. Las rutas certificadas siguen bloqueadas sin firma.
- Diseñar estrategias de crecimiento, descubrimiento y monetización ética.
- Integrar controles de gobernanza en proyectos existentes mediante SDK, API autenticada y adaptadores.
- Registrar proyectos de IA, versionar su configuración, aprobarlos con intervención humana y evaluar sus riesgos con evidencia exportable.
- Verificar la integridad del paquete antes de habilitar funciones sensibles.
- Guiar la operación segura en Cloudflare/Vercel, Supabase, colas, almacenamiento y servicios de IA; esos servicios no se aprovisionan ni se despliegan desde este repositorio.

Los contratos describen activación, entradas, reglas y salvaguardas: **no son servicios ejecutándose**. La referencia operativa completa está en [docs/OPERATIONS.md](docs/OPERATIONS.md).

## Estándares de excelencia

El paquete se rige por cinco estándares. La columna de estado distingue lo implementado de lo declarado, porque un estándar no se cumple por escribirlo:

| Estándar           | Qué aporta el paquete                                                                                                                             | Estado verificado                                                                            |
| ------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------- |
| **Gobernanza**     | Govern Core con denegación por defecto, consentimiento explícito, supervisión humana y alineación NIST CSF 2.0                                    | Política y guardas implementadas; consentimiento durable y RBAC completos pendientes         |
| **Observabilidad** | Métricas Prometheus autenticadas, auditoría HyperCore y evaluación Genesis con 20 chequeos `K-01..K-20`                                           | Local al proceso; sin agregación externa ni alertas conectadas                               |
| **Transparencia**  | Manifiesto de integridad SHA-256, sello v3 por skill, log de transparencia append-only con pruebas de inclusión Merkle y documentación de límites | Implementado y probado; firmas Ed25519 del sello y del checkpoint pendientes en este release |
| **Ética**          | Prohibiciones explícitas, protección de derechos, monetización sin patrones oscuros y la IA propone / el humano decide                            | Contratos y guardas de revisión implementados                                                |
| **Protección**     | Fail-closed ante integridad inválida, Ed25519, cifrado híbrido X25519 + AES-256-GCM, RLS y secretos solo en servidor                              | Implementado donde se declara; procedencia SLSA del runtime `not-integrated`                 |

## Arquitectura

TAMV Creator Intelligence combina una **aplicación web operativa** (TanStack Start), una **biblioteca interna de 37 contratos**, **cuatro skills públicas v3** y un **SDK** para proyectos de terceros.

### Skills públicas

| Skill pública             | Dominio     | Función principal                                                                   |
| ------------------------- | ----------- | ----------------------------------------------------------------------------------- |
| `tamv-creator-os`         | Creador     | Identidad, estrategia, contenido, lanzamientos, comunidad, educación y soporte      |
| `tamv-audio-intelligence` | Audio       | Música, voz característica local, DSP, video, visuales, mezcla y masterización      |
| `tamv-growth-engine`      | Crecimiento | SEO, AI SEO, contenido, conversión, monetización ética, email y analítica           |
| `tamv-sovereign-platform` | Plataforma  | Gobernanza, seguridad, integridad, SLSA, datos, Skills Bridge y operación en Vercel |

Las cuatro skills viven en `tamv-genesis/v3/skills/` y son las únicas publicadas en [skills.sh.json](skills.sh.json). No duplican los 37 contratos de `tamv-pack/skills/`: los referencian como biblioteca interna. La matriz de fusión de patrones externos —absorbidos como capacidades, sin copiar texto ni implementación de terceros— está en [tamv-genesis/v3/pack.json](tamv-genesis/v3/pack.json).

Estas cuatro skills son **contratos publicados**, no servicios operativos. Sus 19 capacidades están mapeadas en el registro de cierre. AudioCore y el agente tienen ejecutores locales acotados; las rutas de generación neuronal y voz siguen sin ejecutor. Un contrato instalable no concede autoridad ni activa proveedores.

### Registro de cierre

Inventario validado: **26 módulos** · **4 skills públicas** · **37 contratos internos** · **19 capacidades**; estados: closed=11, contract=2, documented=7, partial=1, blocked=4, open=1.

[tamv-genesis/v3/closure.json](tamv-genesis/v3/closure.json) distingue alcance y límites por módulo: `closed` exige evidencia y archivos de pruebas existentes, no aceptación de producción; `documented` significa contrato documental; `blocked` significa dependencia externa verificable. `scripts/validate-capability-closure.mjs` rechaza módulos cerrados sin pruebas y discrepancias de esta línea de inventario con los manifiestos. Las cifras de pruebas ejecutadas se fechan por separado: contar archivos no acredita ejecución.

### Sello v3

El paquete v3 se protege con un sello de raíces SHA-256 por skill y por paquete, firmado con Ed25519 y verificado en fail-closed: quitar, editar, mover o añadir una skill rompe el sello y el runtime deniega la ejecución certificada. **El sello actual no está firmado** (`UNSIGNED_RELEASE_PENDING`).

El endurecimiento triple del sello añade: (1) **vinculación del manifiesto**, de modo que `pack.json` no puede intercambiarse sin romper el sello; (2) **separación de dominio** en las firmas, para que una firma de sello no se reutilice como firma de checkpoint; y (3) una **puerta de capacidades** (`requireCapability`) que exige sello válido, pertenencia al registro sellado y consentimiento cuando la skill lo declara. Sobre ese sello, un log de transparencia append-only encadena por hash cada raíz publicada y ofrece pruebas de inclusión Merkle verificables por terceros, con un checkpoint firmable que también está sin firmar en este release. El modelo de amenaza, el cifrado híbrido X25519 + HKDF-SHA256 + AES-256-GCM, el log de transparencia y la migración desde 1.2.1 están en [docs/SOVEREIGN-V3.md](docs/SOVEREIGN-V3.md).

## Superficie de la aplicación

La aplicación es un centro de control para proyectos de IA: permite registrarlos, configurarlos, aprobarlos, evaluarlos y auditar cada operación.

| Ruta             | Función                                                                       | Estado                                                            |
| ---------------- | ----------------------------------------------------------------------------- | ----------------------------------------------------------------- |
| `/`              | Centro operativo con navegación agrupada, búsqueda y tema claro/oscuro | Implementado; no implica despliegue aceptado |
| `/guide`         | Tutorial de seis pasos, progreso local, reanudación y reinicio | Recorrido local verificado en navegador |
| `/studio`        | WAV procedural y planes deterministas, reproducción y descarga verificadas por digest | Cliente probado con transporte controlado; recorrido autenticado externo pendiente |
| `/integrations`  | Diez plataformas, nueve receptores nativos y relay firmado | Transporte probado; cuentas externas no activadas; Longe.ai pendiente |
| `/research`      | Veinte protocolos, expediente vacío y análisis descriptivo local | Interacción local verificada; no resultados experimentales |
| `/projects`      | Proyectos gobernados: alta, configuración, aprobación y evaluación            | Implementada contra Supabase; requiere sesión                     |
| `/audit`         | Auditoría privada por proyecto, exportable a JSON                             | Implementada contra Supabase; requiere sesión                     |
| `/auth`          | Acceso: inicio de sesión, registro, recuperación y cambio de contraseña       | Implementada; recorrido con usuario real pendiente                |
| `/auth-callback` | Retorno de enlaces de confirmación/recuperación y códigos de sesión           | Implementada                                                      |
| `/sdk`           | Gateway de desarrollador: contrato del SDK, API y adaptadores                 | Página informativa implementada                                   |
| `/marketplace`   | Catálogo explorable de los 37 contratos y sus dependencias                    | Implementado sobre el registro local                              |
| `/models`        | Explorador de modelos y costes, íntegramente en el navegador                  | Implementado; no habilita proveedores                             |
| `/hypercore`     | Diagnóstico de Govern, Integrity y Velocity Core                              | Implementado; diagnóstico, no certificación                       |
| `/sovereignty`   | Panel Genesis: scorecard, claims, capacidades y ledger                        | Snapshot importado, solo lectura                                  |

### Endpoints

| Endpoint                      | Método        | Función                                        | Estado                                                |
| ----------------------------- | ------------- | ---------------------------------------------- | ----------------------------------------------------- |
| `/api/tamv/status`            | `GET`         | Estado de certificación y atribución           | `200`; `certified: false` sin firma                   |
| `/api/tamv/genesis`           | `GET`         | Proyección del bundle Genesis                  | `200`; datos guardados, sin recálculo                 |
| `/api/tamv/hypercore/audit`   | `GET`         | Política, integridad, probe y procedencia      | `200` con estado global bloqueado mientras falte SLSA |
| `/api/tamv/hypercore/metrics` | `GET`         | Métricas Prometheus del proceso                | Bearer `TAMV_METRICS_TOKEN`; `401`/`503` si falta     |
| `/api/public/tamv/projects`   | `GET`, `POST` | Listar proyectos, auditoría y aplicar acciones | Bearer de Supabase; `401` sin sesión                  |
| `/api/governance/receipts`    | `GET`, `POST` | Recibos de gobernanza append-only              | Requiere Supabase y almacén aprovisionado             |
| `/api/generation`             | `POST`        | `music.generation`                             | Sin ejecutor conectado (`403`/`501`)                  |
| `/api/voice/generate`         | `POST`        | `voice.generation`                             | Sin ejecutor conectado (`403`/`501`)                  |
| `/api/audiocore/advanced`     | `POST`        | WAV procedural y DSP local medido            | Ejecutor implementado; exige sesión, consentimiento, certificación y cuota |
| `/api/agent`                  | `POST`        | Plan determinista de 1–8 pasos locales        | Ejecutor implementado; sin LLM ni efectos externos, con guardas y cuota |
| `/api/studio/metrics`         | `GET`         | Prometheus compartido por audio/agente       | Token de operador y certificación; solo eventos del proceso |
| `/api/webhooks/$provider`     | `GET`, `POST` | Challenges, firmas nativas y relay opt-in     | Requiere secretos externos y acuse exacto del relay; Longe.ai `501` |

Además existen server functions autenticadas para la interfaz: `listProjects`, `changeProject`, `readProjectAudit`, `assessProject` y `reviewContent`. Generación neuronal y voz conservan `403` ante guardas fallidas y `501` si no existe ejecutor. El manifiesto declara `creator.review`, `audiocore.advanced` y `agent.orchestration`; esa lista no sustituye sesión, consentimiento, cuota ni firma y digest de release aprobados externamente. El resolver de los 37 contratos agrega instrucciones de gobernanza a la revisión, no ejecuta servicios por declarar una dependencia.

Los endpoints de estado, Genesis, auditoría, métricas, proyectos y recibos envían `Cache-Control: no-store`.

## Proyectos gobernados

El flujo convierte una idea en un registro versionado con decisiones humanas y evidencia:

| Paso           | Entrada validada                                                                                                       | Efecto                                                                         |
| -------------- | ---------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------ |
| **Crear**      | Nombre (2–120) y caso de uso (20–8000)                                                                                 | Crea el proyecto en `tamv_ai_projects` con `version = 1`                       |
| **Configurar** | `requireConsent`, `requireHumanApproval`, `requireDisclosure` (todos `true`), `purpose` ≤ 1000 y `retentionDays` 1–365 | Incrementa `version`, reinicia aprobación/evaluación y exige `expectedVersion` |
| **Aprobar**    | Motivo (10–1000) y `expectedVersion`                                                                                   | Marca `approved_version = version` y registra el evento                        |
| **Evaluar**    | `consent: true` y `expectedVersion`                                                                                    | Exige certificación `creator.review`, cuota disponible y modelo autorizado     |

Reglas verificables del flujo:

- **Concurrencia optimista**: cada mutación exige `expectedVersion`; un conflicto devuelve un mensaje estable para recargar el proyecto. La operación se aplica en la función SQL `tamv_project_action`.
- **Auditoría**: cada acción escribe en `tamv_project_audit`; `/audit` permite exportar el historial privado del proyecto en JSON.
- **Evaluación con IA**: el modelo recibe nombre, caso de uso y configuración como **datos no confiables**, nunca como instrucciones. La salida se valida con un JSON Schema estricto (`summary`, `riskLevel`, `risks`, `plan`, `limitations`) y se guarda junto con `runId`, modelo, versión de política y SHA-256 del caso de uso.
- **Sin efectos colaterales**: `changeProject` audita la evidencia declarada por el propietario, pero no ejecuta IA ni acciones externas; `executionStarted` permanece `false`.
- **Fail-closed**: sin firma, la evaluación con IA se bloquea y conserva proyecto y auditoría. Sin cuota disponible, no se envía el caso de uso.
- **Cuotas**: la reserva usa Redis cuando está configurado; en local/test sin Redis se usa el bucket en memoria (`6` de ráfaga, `6`/hora, `40`/día, `4` en vuelo por proceso, timeout de 45 s). En producción, la ausencia de un almacén distribuido falla cerrado.
- **Límite**: el ledger de auditoría es durable en Supabase solo cuando el proyecto alojado está aprovisionado; no hay un ledger inmutable adicional en esta versión.

## SDK y API

El SDK `@tamv/governance-sdk` v0.1.0 vive en [`sdk/`](sdk/index.mjs) y permite integrar los controles TAMV sin cambiar el proveedor de IA:

| Export                  | Función                                                                                                            |
| ----------------------- | ------------------------------------------------------------------------------------------------------------------ |
| `POLICY_VERSION`        | `tamv.governance.v1`                                                                                               |
| `CORE_CONTROLS`         | 7 controles: consentimiento, derechos, privacidad, transparencia, supervisión, integridad y evidencia/trazabilidad |
| `evaluateGovernance`    | Decisión determinista y deny-by-default sobre el contexto declarado                                                |
| `createGovernance`      | Envuelve una ejecución con auditoría `before/after`                                                                |
| `createTamvClient`      | Cliente autenticado de la API de proyectos: `list`, `create`, `configure`, `approve`, `evaluate`, `audit`          |
| `GovernanceDeniedError` | Error tipado con la decisión que denegó la ejecución                                                               |

```js
import { createGovernance } from "@tamv/governance-sdk";

const tamv = createGovernance({
  audit: async (event) => persist(event), // implementación del integrador
});

await tamv.run({
  projectId,
  context: {
    consent: true,
    rightsCleared: true,
    containsSensitiveData: false,
    disclosure: true,
    humanApproved: true,
    certified: false, // un release sin firma no habilita ejecución certificada
  },
  execute: async () => runYourProviderCall(),
});
```

La instalación es local al checkout, porque el paquete **no se publica en npm**:

```bash
npm install /ruta/al/checkout-tamv-creator-intelligence/sdk
```

Los ejemplos están en [`sdk/examples/provider-neutral.mjs`](sdk/examples/provider-neutral.mjs) y [`sdk/examples/http-api.sh`](sdk/examples/http-api.sh). El SDK no contiene claves privadas ni decide por ti: evalúa el contexto que le entregas y devuelve una decisión auditable.

## HyperCore Turbo

**TAMV HyperCore Turbo** es la capa de ejecución y gobernanza del paquete.

| HyperCore          | Función                                                                                 |
| ------------------ | --------------------------------------------------------------------------------------- |
| **Govern Core**    | Políticas de consentimiento, atribución, derechos, auditoría y supervisión humana       |
| **Integrity Core** | Hashes SHA-256, firmas Ed25519, manifiesto de integridad, SBOM y procedencia SLSA       |
| **Velocity Core**  | Ejecución concurrente de promesas, reintentos condicionados, límites y métricas locales |

Su regla de operación es:

```text
Rápido cuando es seguro.
Fail-closed cuando hay riesgo.
Auditable siempre.
```

La política de gobernanza declara requisitos como registro append-only, RBAC, respaldos y revocación de consentimiento; validar esa configuración no demuestra que todos esos mecanismos estén implementados. Velocity es concurrencia de promesas en proceso: las colas BullMQ/Redis y la caché distribuida son contratos del pack, no servicios desplegados. La procedencia SLSA del runtime permanece `not-integrated` y el orquestador hot/cold aún no está conectado al flujo de revisión.

## Capacidades públicas

### Revisión creativa supervisada

La capacidad `creator.review` está implementada como una pasarela de análisis asistido por IA.

- Requiere autenticación en el backend.
- Requiere consentimiento explícito del usuario.
- Aplica control de cuotas por usuario (Redis cuando existe; memoria solo en local/test).
- Devuelve metadatos de auditoría —`runId`, modelo, fecha, SHA-256 del borrador y decisión de política— exportables mediante `tamv.review.export.v1`. No existe aún un ledger durable e inmutable de eventos.
- No publica, reemplaza ni distribuye automáticamente el trabajo del creador.

Ejecutar una revisión envía el borrador y su contexto al gateway de IA: no incluyas secretos ni datos personales innecesarios. Cuotas, guardas y límites exactos en [docs/OPERATIONS.md](docs/OPERATIONS.md#revisión-creativa).

### Explorador local de modelos y costes

El explorador permite importar y comparar catálogos de modelos, como `models_dev.json`, para estimar capacidades y presupuestos de tokens.

- Se ejecuta íntegramente en el navegador.
- No requiere credenciales ni envía datos personales a servicios externos.
- Permite comparar modelos por capacidad, contexto, coste y restricciones.
- Sirve como herramienta de planificación, no como fuente de verdad financiera.

Importar o seleccionar un modelo no lo habilita en el proveedor de revisión ni acredita licencia o disponibilidad.

### Skills Bridge con Skills.sh (contrato declarado)

La integración con Skills.sh como sistema hermano mediante Vercel OIDC está **declarada en el contrato `tamv-sovereign-platform`, pero no implementada** en esta versión: no hay cliente OIDC ni rutas de descubrimiento en la aplicación.

El diseño previsto contempla:

- Descubrir habilidades públicas y buscarlas por nombre, descripción o repositorio.
- Consultar auditorías de seguridad disponibles y bloquear instalaciones de alto riesgo.
- Aplicar caché y límites internos de solicitud.
- No enviar contenido creativo, voces, datos personales ni secretos a Skills.sh.

Mientras no exista implementación verificada, estas funciones no deben presentarse como operativas.

### Pipeline de audio (in-process, sin infraestructura desplegada)

Existe un pipeline ejecutable y probado para validar, autorizar, encolar, generar, almacenar y analizar audio:

- Valida peticiones estrictas y rechaza campos desconocidos, derechos inválidos o falta de consentimiento.
- Autoriza mediante el sello v3 y exige consentimiento cuando la skill lo declara.
- Máquina de estados explícita (`queued → running → succeeded | failed | cancelled`) con reintentos y backoff determinista.
- Valida el artefacto (formato, frecuencia, duración, tamaño), exige un SHA-256 de almacenamiento y audita cada transición.
- No inventa DSP: `truePeakDb`, `integratedLufs` y `chroma` permanecen `null` si el proveedor no los entrega.
- Expone métricas Prometheus solo de eventos observados, sin gauges de loudness ficticios.

El worker es in-process (`runOnce()`), no un daemon. La ruta AudioCore conecta síntesis procedural determinista y DSP TypeScript: LUFS BS.1770-4, pico de muestra y chroma FFT. El nombre heredado `truePeakDb` no implica pico intersample con oversampling; silencio y ventanas insuficientes conservan `null`. No hay síntesis neuronal, voces, cola durable, Postgres ni bucket de audio conectados. Los adaptadores en memoria no son producción. Véanse [pipeline](docs/AUDIO-PIPELINE.md), [orquestación](docs/AUDIO-ORCHESTRATION.md) y [estudio y tutorial](docs/WORKSPACE-AND-STUDIO.md).

### Investigación reproducible y conexiones sociales

El laboratorio `/research` importa un corpus de ocho archivos (20 protocolos, 7 marcos, 22 registros de fuentes) y expone análisis agregado local y expedientes sin resultados. Un prototipo SQLite separado del servidor implementa permisos, reservas, consumo atómico, evidencia y reconciliación con créditos sintéticos. No es una API autenticada, contabilidad real ni validación científica. El contraste de la tesis adicional y los experimentos pendientes se documentan en [Investigación TAMV 5.0](docs/RESEARCH-PROTOCOL-5.md).

El centro social implementa recepción verificada y relay firmado con acuse ligado al evento. No publica posts, no activa OAuth ni cuentas y no proporciona deduplicación durable local; esa responsabilidad exige un receptor externo. [Webhooks sociales](docs/SOCIAL-WEBHOOKS.md) documenta configuración, límites y pruebas negativas.

## Seguridad e integridad

TAMV Creator Intelligence implementa una arquitectura de verificación continua:

- Manifiesto de integridad basado en SHA-256 sobre **22 archivos obligatorios**, incluido este README y el texto canónico de atribución.
- Firma Ed25519 para el manifiesto de atribución (pendiente en este release).
- Sello v3 fail-closed: sin firma válida, las capacidades certificadas se deniegan.
- Vinculación del manifiesto v3, separación de dominio de firmas y puerta de capacidad con consentimiento.
- Registro de cierre `K-20`: ningún módulo `closed` puede carecer de evidencia o pruebas existentes.
- Pipeline de audio con artefacto verificado por SHA-256, reintentos acotados y métricas sin valores inventados.
- Procedencia SLSA para artefactos publicados y SBOM para visibilidad de componentes, configurados en el workflow de release.
- Políticas fail-closed ante fallos de integridad.
- RLS obligatoria en Supabase como regla de diseño; los cambios de esquema se gestionan mediante Lovable.
- Acceso con Supabase Auth: correo/contraseña validados, confirmación y recuperación por enlace, redirecciones restringidas al mismo origen y mensajes que no revelan si una cuenta existe.
- Secretos restringidos al backend o gestor de secretos; ninguna clave privada en frontend, repositorio, logs o imágenes Docker.
- Trazabilidad exportable de proyectos y revisión creativa; el registro inmutable y durable de eventos sensibles sigue pendiente.
- Supervisión humana para publicación, revocación y respuesta a incidentes.

## Gobernanza algorítmica

La gobernanza se alinea con las funciones de **NIST Cybersecurity Framework 2.0**. Son marcos de referencia, no avales ni certificaciones del producto:

| Función  | Implementación TAMV                                               |
| -------- | ----------------------------------------------------------------- |
| Govern   | Políticas, roles, consentimiento, atribución y supervisión        |
| Identify | Inventario de activos, dependencias, modelos, riesgos y datos     |
| Protect  | Control de acceso, cifrado, RLS, firmas y mínimo privilegio       |
| Detect   | Verificación de integridad, anomalías, auditoría y monitoreo      |
| Respond  | Bloqueo fail-closed, revocación, alertas y respuesta a incidentes |
| Recover  | Backups, restauración, rotación de claves y post-mortem           |

## Prohibiciones

TAMV Creator Intelligence bloquea o escala las siguientes solicitudes:

- Imitación de voces, artistas, celebridades o marcas protegidas.
- Uso de samples, melodías, letras o grabaciones sin autorización.
- Instrucciones para evadir derechos de autor, DRM o controles técnicos.
- Promesas de ingresos, viralidad, ROI o éxito garantizado.
- Asesoría legal, fiscal, financiera o de inversión definitiva.
- Acciones destructivas sin confirmación explícita.
- Entrenamiento con datos personales sin consentimiento.
- Exposición de secretos, claves privadas o credenciales de servicio.

## Licenciamiento

El proyecto utiliza un modelo de licenciamiento híbrido:

| Componente                                                  | Licencia                  |
| ----------------------------------------------------------- | ------------------------- |
| Núcleo, aplicaciones y HyperCores                           | AGPL-3.0-only             |
| Scripts, conectores y utilidades                            | Apache-2.0                |
| Activos comerciales, modelos privados y recursos protegidos | TAMV Commercial License   |
| Documentación abierta                                       | CC-BY-4.0, cuando aplique |

`AGPL-3.0-only` indica que el código se distribuye exclusivamente bajo la versión 3 de la GNU Affero General Public License, sin opción de versiones posteriores. El alcance exacto depende de los archivos vigentes: [LICENSE](LICENSE), [LICENSE-MAP.md](LICENSE-MAP.md), [NOTICE](NOTICE) y [ATTRIBUTION.md](ATTRIBUTION.md). Una licencia de software no concede derechos de marca, imagen, voz ni obras ajenas.

## Instalación

### Aplicación

Requisitos: Git, Node compatible con Vite 8/TypeScript 5.8 y, para los flujos de release, Bash y Python 3. El CI instala dependencias con **Bun 1.3.5** y `bun.lock`; en este entorno de verificación se usó **npm 11.20** con `npm install --no-package-lock`.

```bash
git clone https://github.com/AnubisVillasenor1/tamv-creator-intelligence.git
cd tamv-creator-intelligence
bun install --frozen-lockfile
# Alternativa verificada en este entorno, sin Bun:
# npm install --no-package-lock
cp .env.example .env.local   # completa solo valores públicos locales
npm run dev
```

Configura las integraciones mediante el gestor de secretos del entorno; no copies valores privados al repositorio. Variables relevantes:

| Variable                                             | Ámbito           | Uso                                    |
| ---------------------------------------------------- | ---------------- | -------------------------------------- |
| `SUPABASE_URL`, `SUPABASE_PUBLISHABLE_KEY`           | servidor/cliente | Conexión al proyecto Supabase          |
| `VITE_SUPABASE_URL`, `VITE_SUPABASE_PUBLISHABLE_KEY` | navegador        | Cliente público de sesión              |
| `SUPABASE_SERVICE_ROLE_KEY`                          | solo servidor    | Operaciones administrativas            |
| `LOVABLE_API_KEY`                                    | solo servidor    | Gateway de IA                          |
| `TAMV_ATTRIBUTION_PUBLIC_KEY`                        | despliegue       | Verificación Ed25519 del release       |
| `TAMV_RELEASE_MANIFEST_SHA256`                      | servidor/release | Digest exacto aprobado fuera del paquete; impide aceptar releases anteriores |
| `VITE_TAMV_RELEASE_MANIFEST_SHA256`                 | build del cliente | Aprobación pública para verificación del cliente; no sustituye la del servidor |
| `TAMV_CAPABILITY_QUOTA_KEY_SALT`                        | solo servidor    | Separación de identidades en cuotas de audio/agente |
| `TAMV_REVIEW_QUOTA_KEY_SALT`                            | solo servidor    | Separación de identidades en cuotas de revisión |
| `TAMV_CERTIFICATION_REQUIRED`                        | release          | Exige firma en builds certificados     |
| `TAMV_METRICS_TOKEN`                                 | solo servidor    | Bearer de métricas (≥ 32 caracteres)   |
| `TAMV_DEPLOYMENT_ENV`                                | despliegue       | Clasificación local/staging/producción |

Abrir la interfaz no habilita inferencia ni funciones premium: se requiere proyecto alojado, autenticación, proveedor y release válido.

### Skills públicas

La superficie pública instalable son las cuatro skills v3:

```bash
npx skills add AnubisVillasenor1/tamv-creator-intelligence
```

Para instalar una skill específica:

```bash
npx skills add AnubisVillasenor1/tamv-creator-intelligence --skill tamv-creator-os
npx skills add AnubisVillasenor1/tamv-creator-intelligence --skill tamv-audio-intelligence
npx skills add AnubisVillasenor1/tamv-creator-intelligence --skill tamv-growth-engine
npx skills add AnubisVillasenor1/tamv-creator-intelligence --skill tamv-sovereign-platform
```

Instalar una skill v3 no instala los 37 contratos internos: el contrato público los referencia como biblioteca. La instalación 1.2.1 sigue siendo válida; v3 es aditivo. Revisa el código y las opciones del instalador externo antes de ejecutarlo.

### Biblioteca completa en otro proyecto

Usa el instalador incluido **desde el proyecto destino**, tras validar el pack:

```bash
bash tamv-pack/scripts/validate-pack.sh
bash tamv-pack/scripts/test-scripts.sh
bash "/ruta/al/repositorio/tamv-creator-intelligence/tamv-pack/install.sh"
```

El instalador respalda archivos preexistentes en `.tamv/backups/` y registra operaciones en `.tamv/install.log`; no incluye rollback automático. Procedimientos de actualización y reversión en [docs/OPERATIONS.md](docs/OPERATIONS.md#instalación).

## Verificación

Comprobaciones locales del 2026-11-17 desde la raíz del repositorio. En Windows se invocaron directamente los binarios instalados con Node 24; el preflight de entorno se probó con Bun. Los comandos siguientes son sus equivalentes reproducibles:

| Comando | Resultado |
| --- | --- |
| `node node_modules/vitest/vitest.mjs run --maxWorkers=1` | **38 archivos, 460 pruebas, 0 fallos**; avisos de cierre de workers en Windows |
| `npm run typecheck` | **0 errores**, sin relajar TypeScript |
| `npm run lint` | **0 errores, 7 advertencias** `react-refresh/only-export-components` |
| `node scripts/tamv-certification.mjs --check` | Hashes válidos; aviso de release sin firma |
| `node scripts/validate-skills-sh.mjs` | Registro público y contratos internos consistentes |
| `node scripts/validate-closure-inventory.mjs` | Inventario, referencias y cobertura consistentes |
| `node scripts/validate-governance-receipts-sql.mjs` | **20 checks estáticos PASS**, no PostgreSQL vivo |
| `node --experimental-strip-types --test tamv-genesis/tests/*.test.ts` | **125/125 pruebas Genesis** |
| `node scripts/test-research-gateway.mjs` | **17/17 pruebas SQLite**, efectos sintéticos |
| `bun scripts/test-production-env-check.mjs` | **8 escenarios**, incluida aprobación de digest ausente |
| `node scripts/test-hypercore-ledger-postgres-guard.mjs` | **8 guardas**, sin abrir conexión a base de datos |
| `python tamv-pack/scripts/validate-manifest.py` | **37 skills internas, 20 extensiones gobernadas** |
| `python tamv-pack/scripts/validate-integrity.py` | **63 Git blobs** consistentes |
| `python scripts/test-audit-migration-validator.py` | Regresiones del validador aprobadas; no migración ejecutada |
| `python scripts/test-repo-hygiene.py` | Regresiones de higiene aprobadas |
| `python scripts/validate-repo-hygiene.py` | Índice y versiones de trabajo examinados |
| `npm run build` | Client/SSR/Nitro `cloudflare-module` construidos; no despliegue |

También se validan enlaces documentales con `node scripts/validate-documentation-links.mjs` y su suite, y el inventario del README con `node scripts/test-capability-closure.mjs`. Estos validadores no comprueban la veracidad de resultados científicos ni ejecutan la evidencia citada.

En navegador local se comprobó tutorial completo/reanudación/reinicio, navegación por búsqueda, temas, búsqueda de protocolos y análisis válido/inválido. Las capturas visuales quedaron limitadas por el viewport de la herramienta; no se declara validación visual exhaustiva ni aceptación autenticada. No se probó con credenciales reales ni se activaron redes sociales.

No se ejecutaron aquí `tamv:check` completo, scripts Bash de instalación/SLSA ni ShellCheck por fallo del shell local. Las guardas de PostgreSQL no sustituyen ensayos de concurrencia, roles o recuperación sobre un servidor real. Los workflows de CI contienen validaciones adicionales; sus resultados deben comprobarse para el commit publicado, no heredarse de otro SHA.

`tamv:check` puede terminar correctamente con la firma ausente: **no equivale a `tamv:verify`**. La verificación certificada exige clave pública externa, firma válida y coincidencia con el digest aprobado independientemente.

### Firma y recertificación

La firma corresponde al responsable autorizado del release. Tras firmar, una revisión independiente debe aprobar el digest canónico exacto en `TAMV_RELEASE_MANIFEST_SHA256` antes de verificar/construir. No se copia automáticamente el digest candidato a la configuración confiable. El workflow de release requiere todavía integrar esta aprobación protegida; véase [RELEASE-SIGNING](docs/RELEASE-SIGNING.md).

```bash
npm run tamv:hash
npm run tamv:sign
npm run tamv:verify
node --experimental-strip-types tamv-genesis/scripts/v3-seal.mjs --write --sign
node --experimental-strip-types tamv-genesis/scripts/v3-seal.mjs --verify --require-signature
```

No desactives verificaciones para conseguir un build ni sustituyas `UNSIGNED_RELEASE_PENDING` por texto que simule una firma.

## Despliegue

`npm run build` produce un artefacto Nitro con preset `cloudflare-module` en `.output/` (cliente, SSR y worker). El repositorio también documenta la ruta Vercel.

Estado real de despliegue:

- **No hay evidencia de aceptación funcional ni de promoción a producción.** Al 2026-11-16, el check de Vercel del commit `1678fe3` reportó `success` con la descripción «Deployment has completed». Ese check acredita que la plataforma terminó su build, no que la URL sea accesible, que la aplicación funcione ni que el despliegue sea producción.
- El 15 de noviembre el mismo check había quedado en `failure` por `build-rate-limit` del scope del propietario: un bloqueo externo de cuenta/plan.
- No se obtuvo la URL pública del despliegue ni se ejecutó una prueba funcional contra ella.
- No se ejecutó una prueba con usuario real, ni se aprovisionó auditoría durable, Redis, colas, almacenamiento ni atestaciones del release.
- Un build verde o un `200` de `/api/tamv/status` **no** demuestran producción ni certificación; hay que leer `certified` y la evidencia ligada al artefacto exacto.

Los bloqueos P0–P6 y sus criterios de aceptación están en [docs/DEPLOYMENT-READINESS-2026-11-15.md](docs/DEPLOYMENT-READINESS-2026-11-15.md) y [docs/PRODUCTION-EVIDENCE-GATES.md](docs/PRODUCTION-EVIDENCE-GATES.md).

## Deuda y límites conocidos

- **Firma pendiente (P1):** sin clave privada Ed25519 autorizada, el release no se certifica y las capacidades premium permanecen bloqueadas.
- **Acceso de creadores (P2):** las rutas y flujos existen, pero falta verificar correo, confirmación y recuperación en el proyecto Supabase alojado, y completar un recorrido con usuario real.
- **Inferencia (P3):** bloqueada por P1/P2; no hay prueba autenticada de extremo a extremo con el proveedor.
- **Cuotas (P4):** solo son distribuidas si Redis está configurado; el fallback en memoria es exclusivamente local/test.
- **Audio, voz, agentes y publicación (P5):** audio procedural y agentes deterministas locales implementados; generación neuronal, voz, publicación social, cola y almacenamiento durables siguen pendientes.
- **Auditoría y procedencia (P6):** ledger Hyper-Core y recibos requieren aprovisionamiento; SLSA del runtime sigue `not-integrated`; SBOM/atestaciones del release exacto pendientes.
- Advertencias de build: `createServerFn().inputValidator()` deprecado, chunks > 500 kB y `vite-tsconfig-paths` sustituible por la opción nativa de Vite.
- 7 advertencias de lint `react-refresh/only-export-components` en componentes `ui/`.

Ninguna de estas deudas se presenta como resuelta.

## Documentación

- [Referencia operativa](docs/OPERATIONS.md) — revisión, cuotas, catálogo de 37 contratos, Genesis, endpoints, instalación y certificación.
- [Espacio de trabajo, estudio y tutorial](docs/WORKSPACE-AND-STUDIO.md).
- [Integraciones y webhooks sociales](docs/SOCIAL-WEBHOOKS.md).
- [Investigación TAMV 5.0 y contraste de la tesis](docs/RESEARCH-PROTOCOL-5.md).
- [Firma y aprobación externa del release](docs/RELEASE-SIGNING.md).
- [Superficie API y contratos de error](docs/API-SURFACE-AND-ERROR-CONTRACTS.md).
- [Sello, firma y cifrado híbrido v3](docs/SOVEREIGN-V3.md).
- [Pipeline de audio](docs/AUDIO-PIPELINE.md) y [orquestación de audio](docs/AUDIO-ORCHESTRATION.md).
- [Recibos de gobernanza](docs/GOVERNANCE-RECEIPTS-OPERATIONS.md).
- [Posicionamiento TAMV Online / PLAY & GO](docs/PRODUCT-POSITIONING.md).
- [Matriz de implementación](docs/IMPLEMENTATION-MATRIX.md).
- [Registro de cierre de módulos y capacidades](tamv-genesis/v3/closure.json).
- [Estado de release del 15 de noviembre](docs/RELEASE-STATE-2026-11-15.md) y [preparación de despliegue](docs/DEPLOYMENT-READINESS-2026-11-15.md).
- [Auditoría técnica del 15 de noviembre](docs/audit/2026-11-15/README.md).
- [Huella pública y límites de corroboración](docs/PUBLIC-FOOTPRINT.md).
- [Distribución y publicación](docs/PUBLISHING.md).
- [Gobernanza](GOVERNANCE.md) y [seguridad](SECURITY.md).
- [Reglas para agentes y contribuciones](AGENTS.md).

## Atribución institucional

```text
Proyecto impulsado con colaboración de tecnología latinoamericana TAMV ONLINE NETWORK Orgullosamente Realmontenses.
```
