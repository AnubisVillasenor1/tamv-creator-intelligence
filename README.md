# TAMV Creator Intelligence

**TAMV Creator Intelligence** es el **Creator Operating System™** y paquete de gobernanza algorítmica desarrollado por **TAMV ONLINE NETWORK** para **cualquier proyecto que utilice inteligencia artificial**, sin importar su dominio, stack o escala. Nació en el ecosistema PLAY & GO y hoy es agnóstico al proyecto: su contrato es que la IA opere bajo estándares de máxima excelencia en **gobernanza, observabilidad, transparencia, ética y protección**.

Su propósito es dotar a creadores, educadores, desarrolladores y comunidades territoriales de una infraestructura de inteligencia artificial **auditable, segura, trazable y bajo supervisión humana**.

El principio rector es:

> **La IA propone; el humano decide.**

TAMV Creator Intelligence estructura flujos de trabajo asistidos por IA mediante habilidades modulares, políticas de consentimiento, controles de derechos, verificación de integridad, procedencia de software y evidencia auditable. No sustituye la autoría humana ni publica contenido automáticamente: asiste en la creación, el análisis, la planificación y la operación, dejando las decisiones finales en manos del creador.

> **Estado verificado al 2026-11-14: desarrollo, no release certificado.** El paquete combina **37 contratos internos** (`tamv-pack`, v1.2.1) con **cuatro skills públicas v3.0.0** (`tamv-genesis/v3`). La única capacidad de inferencia implementada es `creator.review`. Tanto la firma del manifiesto raíz como el sello del paquete v3 conservan `UNSIGNED_RELEASE_PENDING`: las capacidades certificadas permanecen bloqueadas hasta una firma Ed25519 válida.
>
> **Este README está protegido por el manifiesto de integridad.** Su reescritura deja desactualizado el hash registrado. Antes de distribuir una versión certificada, el responsable del release debe ejecutar `tamv:hash` → `tamv:sign` → `tamv:verify`. Esta actualización documental no fabrica ni simula una firma.

## Identidad

| Atributo | Valor |
|---|---|
| Nombre público | TAMV Creator Intelligence |
| Producto | Creator Operating System™ — gobernanza para proyectos con IA |
| Ámbito | Cualquier proyecto que utilice IA, sin importar dominio o stack |
| Proyecto de origen | PLAY & GO (ecosistema TAMV) |
| Repositorio | [`AnubisVillasenor1/tamv-creator-intelligence`](https://github.com/AnubisVillasenor1/tamv-creator-intelligence) |
| Identificador del paquete | `tamv-online-network-creator-intelligence-pack` |
| Versión pública | `v3.0.0` |
| Autoría institucional | TAMV ONLINE NETWORK |
| Dirección creativa | Anubis Villaseñor |
| Origen | Real del Monte, Hidalgo, México |
| Principio | La IA propone; el humano decide |
| Licencia base | AGPL-3.0-only |
| Licencias complementarias | Apache-2.0 y TAMV Commercial License |

## Qué resuelve

El núcleo de gobernanza aplica a **cualquier proyecto con IA**; las cuatro skills públicas aportan capacidades de creación, audio, crecimiento y plataforma que cualquier proyecto puede adoptar o ignorar. TAMV Creator Intelligence está diseñado para convertir capacidades de IA en sistemas operativos auditables:

- Definir identidad, propuesta de valor y estrategia de creador.
- Planificar contenido, lanzamientos, comunidad y educación.
- Analizar propuestas musicales, de voz y audiovisuales mediante contratos especializados; la generación de música, voz y DSP **no tiene ejecutores conectados** en esta versión.
- Diseñar estrategias de crecimiento, descubrimiento y monetización ética.
- Gobernar capacidades de IA con consentimiento, trazabilidad y límites claros.
- Verificar la integridad del paquete antes de habilitar funciones sensibles.
- Guiar la operación segura en Vercel, Supabase, colas, almacenamiento y servicios de IA; esos servicios no se aprovisionan ni se despliegan desde este repositorio.

Los contratos describen activación, entradas, reglas y salvaguardas: **no son servicios ejecutándose**. La referencia operativa completa está en [docs/OPERATIONS.md](docs/OPERATIONS.md).

## Estándares de excelencia

El paquete se rige por cinco estándares. La columna de estado distingue lo implementado de lo declarado, porque un estándar no se cumple por escribirlo:

| Estándar | Qué aporta el paquete | Estado verificado |
|---|---|---|
| **Gobernanza** | Govern Core con denegación por defecto, consentimiento explícito, supervisión humana y alineación NIST CSF 2.0 | Política y guardas implementadas; consentimiento durable y RBAC completos pendientes |
| **Observabilidad** | Métricas Prometheus autenticadas, auditoría HyperCore y evaluación Genesis con 19 chequeos | Local al proceso; sin agregación externa ni alertas conectadas |
| **Transparencia** | Manifiesto de integridad SHA-256, sello v3 por skill, log de transparencia append-only con pruebas de inclusión Merkle y documentación de límites | Implementado y probado; firmas Ed25519 del sello y del checkpoint pendientes en este release |
| **Ética** | Prohibiciones explícitas, protección de derechos, monetización sin patrones oscuros y la IA propone / el humano decide | Contratos y guardas de revisión implementados |
| **Protección** | Fail-closed ante integridad inválida, Ed25519, cifrado híbrido X25519 + AES-256-GCM, RLS y secretos solo en servidor | Implementado donde se declara; procedencia SLSA del runtime `not-integrated` |

## Arquitectura

El paquete se organiza en una superficie pública unificada de **cuatro skills coordinadoras**, respaldadas por una biblioteca interna de **37 contratos** y módulos de gobernanza, integridad y ejecución.

| Skill pública | Dominio | Función principal |
|---|---|---|
| `tamv-creator-os` | Creador | Identidad, estrategia, contenido, lanzamientos, comunidad, educación y soporte |
| `tamv-audio-intelligence` | Audio | Música, voz característica local, DSP, video, visuales, mezcla y masterización |
| `tamv-growth-engine` | Crecimiento | SEO, AI SEO, contenido, conversión, monetización ética, email y analítica |
| `tamv-sovereign-platform` | Plataforma | Gobernanza, seguridad, integridad, SLSA, datos, Skills Bridge y operación en Vercel |

Las cuatro skills viven en `tamv-genesis/v3/skills/` y son las únicas publicadas en [skills.sh.json](skills.sh.json). No duplican los 37 contratos de `tamv-pack/skills/`: los referencian como biblioteca interna. La matriz de fusión de patrones externos — absorbidos como capacidades, sin copiar texto ni implementación de terceros — está en [tamv-genesis/v3/pack.json](tamv-genesis/v3/pack.json).

El paquete v3 se protege con un sello de raíces SHA-256 por skill y por paquete, firmado con Ed25519 y verificado en fail-closed: quitar, editar, mover o añadir una skill rompe el sello y el runtime deniega la ejecución certificada. **El sello actual no está firmado** (`UNSIGNED_RELEASE_PENDING`). Sobre ese sello, un log de transparencia append-only encadena por hash cada raíz publicada y ofrece pruebas de inclusión Merkle verificables por terceros, con un checkpoint firmable que también está sin firmar en este release. El modelo de amenaza, el cifrado híbrido X25519 + HKDF-SHA256 + AES-256-GCM, el log de transparencia y la migración desde 1.2.1 están en [docs/SOVEREIGN-V3.md](docs/SOVEREIGN-V3.md).

## HyperCore Turbo

**TAMV HyperCore Turbo** es la capa de ejecución y gobernanza del paquete.

| HyperCore | Función |
|---|---|
| **Govern Core** | Políticas de consentimiento, atribución, derechos, auditoría y supervisión humana |
| **Integrity Core** | Hashes SHA-256, firmas Ed25519, manifiesto de integridad, SBOM y procedencia SLSA |
| **Velocity Core** | Ejecución concurrente de promesas, reintentos condicionados, límites y métricas locales |

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
- Aplica control de cuotas por usuario (en memoria, no distribuidas).
- Devuelve metadatos de auditoría — `runId`, modelo, fecha, SHA-256 del borrador y decisión de política — exportables mediante `tamv.review.export.v1`. No existe aún un ledger durable e inmutable de eventos.
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

## Seguridad e integridad

TAMV Creator Intelligence implementa una arquitectura de verificación continua:

- Manifiesto de integridad basado en SHA-256 sobre 22 archivos obligatorios.
- Firma Ed25519 para el manifiesto de atribución (pendiente en este release).
- Sello v3 fail-closed: sin firma válida, las capacidades certificadas se deniegan.
- Procedencia SLSA para artefactos publicados y SBOM para visibilidad de componentes, configurados en el workflow de release.
- Políticas fail-closed ante fallos de integridad.
- RLS obligatoria en Supabase como regla de diseño; los cambios de esquema se gestionan mediante Lovable.
- Secretos restringidos al backend o gestor de secretos.
- Prohibición de claves privadas en frontend, repositorio, logs o imágenes Docker.
- Trazabilidad exportable de la revisión creativa; el registro inmutable y durable de eventos sensibles sigue pendiente.
- Supervisión humana para publicación, revocación y respuesta a incidentes.

## Gobernanza algorítmica

La gobernanza se alinea con las funciones de **NIST Cybersecurity Framework 2.0**. Son marcos de referencia, no avales ni certificaciones del producto:

| Función | Implementación TAMV |
|---|---|
| Govern | Políticas, roles, consentimiento, atribución y supervisión |
| Identify | Inventario de activos, dependencias, modelos, riesgos y datos |
| Protect | Control de acceso, cifrado, RLS, firmas y mínimo privilegio |
| Detect | Verificación de integridad, anomalías, auditoría y monitoreo |
| Respond | Bloqueo fail-closed, revocación, alertas y respuesta a incidentes |
| Recover | Backups, restauración, rotación de claves y post-mortem |

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

| Componente | Licencia |
|---|---|
| Núcleo, aplicaciones y HyperCores | AGPL-3.0-only |
| Scripts, conectores y utilidades | Apache-2.0 |
| Activos comerciales, modelos privados y recursos protegidos | TAMV Commercial License |
| Documentación abierta | CC-BY-4.0, cuando aplique |

`AGPL-3.0-only` indica que el código se distribuye exclusivamente bajo la versión 3 de la GNU Affero General Public License, sin opción de versiones posteriores. El alcance exacto depende de los archivos vigentes: [LICENSE](LICENSE), [LICENSE-MAP.md](LICENSE-MAP.md), [NOTICE](NOTICE) y [ATTRIBUTION.md](ATTRIBUTION.md). Una licencia de software no concede derechos de marca, imagen, voz ni obras ajenas.

## Instalación

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

Para instalar la biblioteca completa en otro proyecto, usa el instalador incluido **desde el proyecto destino**, tras validar el pack:

```bash
bash tamv-pack/scripts/validate-pack.sh
bash tamv-pack/scripts/test-scripts.sh
bash "/ruta/al/repositorio/tamv-creator-intelligence/tamv-pack/install.sh"
```

El instalador respalda archivos preexistentes en `.tamv/backups/` y registra operaciones en `.tamv/install.log`; no incluye rollback automático. Procedimientos de actualización y reversión en [docs/OPERATIONS.md](docs/OPERATIONS.md#instalación).

## Verificación

Comprobaciones locales, desde la raíz del repositorio:

```bash
bun install --frozen-lockfile
bun run lint
bunx tsc --noEmit
bun run test
bun run tamv:check
bun run build
node --experimental-strip-types --test tamv-genesis/tests/*.test.ts
node --experimental-strip-types tamv-genesis/scripts/v3-seal.mjs --verify
node --experimental-strip-types tamv-genesis/scripts/v3-transparency.mjs --verify
bash scripts/verify-slsa.sh
```

`tamv:check` puede terminar correctamente con la firma ausente: **no equivale a `tamv:verify`**. `v3-seal.mjs --verify` sin `TAMV_V3_PUBLIC_KEY` devuelve `TAMV_SEAL_KEY_MISSING`; el build exige integridad válida. En esta actualización se ejecutó la suite de Genesis: **77/77 pruebas aprobadas** localmente (Node v24.18.0), incluidas las del núcleo soberano y las 11 del log de transparencia, y se verificaron la estructura del sello v3 y la cadena del log de transparencia con sus CLIs. No se ejecutaron Vitest, lint, typecheck, build ni validación en navegador; la suite de la aplicación no se declara “en verde”.

La firma y recertificación corresponden al responsable autorizado del release, con las claves suministradas de forma segura:

```bash
bun run tamv:hash
bun run tamv:sign
bun run tamv:verify
node --experimental-strip-types tamv-genesis/scripts/v3-seal.mjs --write --sign
node --experimental-strip-types tamv-genesis/scripts/v3-seal.mjs --verify --require-signature
```

No desactives verificaciones para conseguir un build ni sustituyas `UNSIGNED_RELEASE_PENDING` por texto que simule una firma.

## Documentación

- [Referencia operativa verificada](docs/OPERATIONS.md) — revisión, cuotas, catálogo de 37 contratos, Genesis, endpoints, instalación y certificación.
- [Sello, firma y cifrado híbrido v3](docs/SOVEREIGN-V3.md).
- [Distribución y publicación](docs/PUBLISHING.md).
- [Auditoría fechada y evidencia](docs/audit/2026-11-13/README.md).
- [Gobernanza](GOVERNANCE.md) y [seguridad](SECURITY.md).
- [Reglas para agentes y contribuciones](AGENTS.md).

## Atribución institucional

```text
Proyecto impulsado con colaboración de tecnología latinoamericana
TAMV ONLINE NETWORK
Orgullosamente Realmontenses.
```