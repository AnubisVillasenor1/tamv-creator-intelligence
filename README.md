# TAMV Intelligence — The Paradigm Killer

**Paquete de inteligencia para creadores de TAMV ONLINE NETWORK**, desarrollado alrededor de PLAY & GO. Reúne contratos de skills, revisión creativa asistida por IA, exploración local de modelos y herramientas para contrastar capacidades declaradas con evidencia técnica.

**PLAY & GO · Aprende. Crea. Analiza. Evoluciona.**

“The Paradigm Killer” es la identidad editorial del paquete: no significa superioridad demostrada frente a otros sistemas, autonomía general ni certificación externa. El repositorio conserva el nombre **TAMV Creator Intelligence** y el identificador técnico `tamv-online-network-creator-intelligence-pack`. El pack interno `tamv-pack` mantiene la versión **1.2.1**; la superficie pública **v3.0.0**, en `tamv-genesis/v3/`, agrupa cuatro skills paraguas sobre los 37 contratos internos.

**Repositorio:** [AnubisVillasenor1/tamv-creator-intelligence](https://github.com/AnubisVillasenor1/tamv-creator-intelligence)

**Atribución canónica:** Proyecto impulsado con colaboración de tecnología latinoamericana TAMV ONLINE NETWORK Orgullosamente Realmontenses.

> **Estado documentado al 2026-11-14: desarrollo, no release certificado.** Hay 37 contratos internos, cuatro skills públicas v3 y una capacidad de inferencia implementada: `creator.review`. Tanto la firma del manifiesto raíz como el sello del paquete v3 conservan `UNSIGNED_RELEASE_PENDING`. Este documento describe el código inspeccionado, incluidas mejoras locales; no acredita su publicación remota, un despliegue ni pruebas exitosas en CI.
>
> **Este README está protegido por el manifiesto de integridad.** Su reescritura deja desactualizado el hash registrado. Antes de distribuir una versión certificada, el responsable del release debe actualizar hashes, firmar y verificar el conjunto final. Esta actualización documental no modifica el manifiesto ni fabrica una firma.

## Índice

- [Propósito y alcance](#propósito-y-alcance)
- [Estado documentado](#estado-documentado)
- [Revisión creativa](#revisión-creativa)
- [Modelos y costes](#modelos-y-costes)
- [Catálogo de skills](#catálogo-de-skills)
- [Cuatro skills públicas v3](#cuatro-skills-públicas-v3)
- [HyperCore](#hypercore)
- [TAMV Genesis](#tamv-genesis)
- [Interfaces y endpoints](#interfaces-y-endpoints)
- [Arquitectura](#arquitectura)
- [Instalación](#instalación)
- [Desarrollo y pruebas](#desarrollo-y-pruebas)
- [Certificación y releases](#certificación-y-releases)
- [Gobernanza de IA y derechos](#gobernanza-de-ia-y-derechos)
- [Auditoría y evidencia](#auditoría-y-evidencia)
- [Deuda técnica](#deuda-técnica)
- [Contribuciones y seguridad](#contribuciones-y-seguridad)
- [Licencias](#licencias)
- [Gate de producción](#gate-de-producción)

## Propósito y alcance

El proyecto reúne cuatro superficies con responsabilidades diferentes:

1. **Creator Intelligence:** aplicación web con monitor, revisión creativa, red de skills, explorador de modelos, gobernanza y documentación.
2. **Pack de skills:** 37 contratos Markdown instalables en agentes compatibles. Describen activación, entradas, reglas, salvaguardas y salidas; no son 37 servicios ejecutándose.
3. **HyperCore:** utilidades de autorización, integridad, concurrencia asíncrona, diagnóstico y métricas locales.
4. **TAMV Genesis:** núcleo TypeScript y CLI para evaluar claims, metadatos de evidencia, madurez declarada, scorecards e inventarios locales.

La IA propone; la persona conserva el control creativo. El flujo implementado no publica contenido, no ejecuta campañas ni toma decisiones legales o financieras definitivas.

## Estado documentado

| Superficie | Evidencia presente | Límite actual |
|---|---|---|
| Catálogo | 37 IDs en manifiesto y registro; contratos `SKILL.md` | Contar contratos no demuestra ejecución ni disponibilidad. |
| Revisión creativa | Server function con gateway Lovable, validación, autenticación, consentimiento y límites | Necesita sesión, configuración, licencia, integridad y firma válidas; no se comprobó inferencia real en esta revisión. |
| Modelos y costes | Importador y comparador local de catálogos JSON | No llama a modelos, consulta precios en vivo ni modifica el proveedor de revisión. |
| Exportación de revisión | Copia de propuesta y descarga JSON de resultado y trazabilidad | No es almacenamiento durable ni un documento firmado. |
| Certificación | SHA-256 de 22 archivos obligatorios y soporte Ed25519 | Firma pendiente; hashes actualizados, firma ausente. |
| Auditoría HyperCore | Política, certificación y prueba mínima de concurrencia | Procedencia SLSA del runtime `not-integrated`; resultado global bloqueado. |
| Métricas | Prometheus autenticado y registros acotados en memoria | Sin persistencia ni agregación entre instancias demostradas. |
| Genesis | CLI, evaluadores y artefactos JSON guardados | La web sirve una instantánea; evaluar metadatos no acredita operación real. |
| Perfiles y corpus | Inventario de 154 repositorios vía API pública y resumen agregado de 9,948 archivos locales | El conteo de repositorios no acredita autoría ni horas; el detalle con rutas no se distribuye. |
| Música, voz, DSP y agentes | Contratos y rutas de rechazo explícito | Sin adaptadores de ejecución conectados en esas rutas. |
| Release | Workflow con firma, build, SBOM y atestaciones configurados | No se verificó un run exitoso, artefacto publicado ni despliegue. |
| Cuatro skills públicas v3 | `tamv-genesis/v3/pack.json`, cuatro `SKILL.md`, sello SHA-256 y CLI de firma | Sello sin firma Ed25519; el runtime deniega capacidades certificadas. Los 37 contratos internos no se duplican. |

**Declarado, implementado, probado, operado y auditado no son estados intercambiables.** Los indicadores de la interfaz y los documentos históricos deben contrastarse con el código, el artefacto y el entorno concretos.

## Revisión creativa

La capacidad `creator.review` está implementada en [content.functions.ts](src/lib/content.functions.ts), con formulario en [creator-review.tsx](src/components/creator-review.tsx). Es una server function `POST` de TanStack Start, no una API REST pública denominada `/api/review`.

### Entrada y resultado

| Campo | Contrato |
|---|---|
| Borrador | Entre 20 y 12.000 caracteres, tras recortar espacios exteriores. |
| Audiencia | Entre 5 y 600 caracteres. |
| Objetivo | Entre 5 y 600 caracteres. |
| Canal | Instagram, YouTube, TikTok, Newsletter u Otro. |
| Consentimiento | Debe ser explícitamente `true`. |

El resultado contiene diagnóstico, mejoras con título/motivo/acción, borrador revisado y observaciones de seguridad. El prompt solicita tres mejoras; el esquema de validación admite entre una y cinco. Los contratos están en [content-schema.ts](src/lib/content-schema.ts).

### Secuencia implementada

1. Validar el formulario y evitar envíos simultáneos desde el mismo componente.
2. Adjuntar la sesión Supabase mediante el middleware global y verificarla en servidor.
3. Validar la entrada con Zod.
4. Exigir certificación de distribución y habilitación de `creator.review` en la licencia del manifiesto.
5. Aplicar la lista de capacidades permitidas y el requisito de consentimiento.
6. Comprobar cuota por usuario y capacidad simultánea del proceso.
7. Enviar el contexto a `@lovable.dev/ai-gateway`, solicitar JSON estructurado y validar la respuesta.
8. Mostrar una propuesta sin sustituir automáticamente el borrador original ni publicarlo.

El modelo configurado es **`openai/gpt-6-astra`**, con razonamiento `low` y `max_output_tokens: 2400`. Su presencia en código o tipos generados no demuestra disponibilidad, créditos, calidad ni acceso en un entorno determinado.

La revisión usa su propia cadena de guardas; **no pasa por el evaluador unificado de procedencia de HyperCore**. No debe afirmarse que ya verifica SLSA antes de cada inferencia.

### Límites de consumo

Valores de [review-guard.ts](src/lib/review-guard.ts):

| Control | Valor |
|---|---|
| Espera máxima de la revisión | 45 segundos. |
| Ráfaga inicial por usuario | 6 solicitudes. |
| Recuperación del cupo | 6 solicitudes por hora. |
| Tope diario por usuario | 40 solicitudes, con cambio de día en UTC. |
| Revisiones simultáneas | 4 por proceso. |

Las cuotas se consumen al admitir la solicitud, no únicamente cuando termina con éxito. Se guardan en memoria y se reinician con el proceso; **no son cuotas distribuidas**.

Un timeout no demuestra que el proveedor haya cancelado el trabajo. La implementación conserva el cupo de concurrencia hasta que la promesa del proveedor termina y no reenvía automáticamente la solicitud. La protección contra doble clic no equivale a idempotencia durable entre pestañas, procesos o reinicios.

La interfaz distingue respuestas de sesión, créditos, acceso, cuota y saturación cuando recibe los códigos correspondientes; respeta `Retry-After` válido sin reintentar automáticamente. Algunos errores del gateway se devuelven como `ok: false`, no como estados HTTP específicos. La ausencia de Bearer tiene una guarda `401`; no se garantiza que todos los errores del middleware generado de autenticación estén normalizados a `401`.

### Trazabilidad y exportación

Cada resultado satisfactorio incluye `runId`, modelo, fecha, SHA-256 del **borrador** y versión/decisión de política. El hash no cubre toda la solicitud ni el resultado.

La trazabilidad declara cinco IDs: `tamv-core-governance`, `tamv-rights-safety-guard`, `tamv-content-review`, `tamv-audience-research` y `tamv-quality-gate`. No representan cinco agentes ejecutados de forma independiente: el flujo contiene una llamada de revisión al gateway.

La descarga local usa el esquema `tamv.review.export.v1` y contiene `review` y `audit`. No incorpora un campo con el borrador original, aunque la propuesta puede reproducir fragmentos de este. Resultado y borrador permanecen en estado React mientras el componente sigue montado; no hay historial durable de revisiones implementado en este flujo. La persistencia de la sesión de autenticación es un mecanismo separado.

**Privacidad:** ejecutar una revisión sí envía borrador, audiencia, objetivo y canal al gateway. No incluyas secretos o datos personales innecesarios. Este código no demuestra una política de retención o eliminación del proveedor.

## Modelos y costes

La vista **Modelos y costes** permite planificar una integración sin ejecutar inferencia. Está implementada en [model-explorer.tsx](src/components/model-explorer.tsx) y [model-catalog.ts](src/lib/model-catalog.ts).

### Uso

1. Importar un catálogo `models_dev.json` compatible.
2. Filtrar por nombre o ID, proveedor, modalidad de entrada, contexto mínimo, herramientas o razonamiento.
3. Seleccionar hasta **tres modelos** para compararlos; la tabla muestra **25 por página**.
4. Introducir un presupuesto de tokens de entrada y salida.
5. Confirmar las unidades de precio únicamente después de verificarlas en la fuente del catálogo.
6. Vaciar el catálogo local cuando deje de ser necesario.

El formato esperado contiene `database.providers`, con un mapa `models` por proveedor. Se normalizan nombre, ID, precios, límites, modalidades y capacidades declaradas. La importación admite archivos de hasta **16 MiB** y limita el recorrido a **50.000 entradas de modelos**; descarta entradas inválidas e informa cuántas omitió. Si una importación falla, conserva el catálogo previo.

El archivo se procesa en el navegador, sin subirlo, persistirlo ni modificar el original. Solo se mantienen metadatos normalizados en memoria. Esta integración no incorpora copias del catálogo personal, sesiones, credenciales ni cachés de herramientas al repositorio. La importación tampoco debe usarse como sanitizador de archivos secretos.

### Precios y compatibilidad

La estimación requiere confirmación explícita de tarifas en **USD por millón de tokens**:

```text
coste orientativo = tokens de entrada × tarifa de entrada / 1.000.000
                 + tokens de salida  × tarifa de salida  / 1.000.000
```

- Sin confirmación de unidades o tarifas necesarias, muestra **Sin estimación**.
- Una tarifa cero se conserva; un precio ausente no se interpreta como gratuito.
- Los límites cero o ausentes se consideran desconocidos, no capacidad ilimitada.
- Rechaza presupuestos negativos, fraccionarios o numéricamente inseguros y excesos de límites conocidos.
- Exige modalidad `text` declarada para cada dirección con tokens consumidos; no calcula precios de imagen, audio o vídeo.
- No tokeniza borradores ni incluye descuentos de caché, cargos adicionales, otras modalidades o conversión a créditos de Lovable.
- La fecha es la declarada por el archivo; se advierte si supera 30 días. No hay actualización ni verificación de precios en vivo.

Importar o seleccionar un modelo **no lo habilita en Lovable**, no cambia el modelo de revisión y no acredita licencia, disponibilidad, soporte de JSON estructurado ni compatibilidad del proveedor.

## Catálogo de skills

La fuente del inventario es [tamv-pack/pack.json](tamv-pack/pack.json); los contratos están en [tamv-pack/skills](tamv-pack/skills/) y su representación en la aplicación en [skill-registry.ts](src/lib/skill-registry.ts).

Los ámbitos siguientes describen **contratos**, no ejecutores disponibles:

| N.º | ID | Ámbito del contrato |
|---|---|---|
| 1 | `tamv-core-governance` | Gobernanza y autorización. |
| 2 | `tamv-play-and-go-architect` | Arquitectura de PLAY & GO. |
| 3 | `tamv-nextjs-supabase-builder` | Desarrollo con Next.js y Supabase. |
| 4 | `tamv-musicgen-local` | Generación musical local. |
| 5 | `tamv-voice-identity` | Identidad vocal y permisos. |
| 6 | `tamv-audiocore-dsp` | Procesamiento digital de audio. |
| 7 | `tamv-bullmq-redis` | Colas y procesamiento de trabajos. |
| 8 | `tamv-supabase-rls-security` | Seguridad y aislamiento de datos. |
| 9 | `tamv-license-authority` | Licencias y atribución. |
| 10 | `tamv-creator-growth` | Desarrollo de proyectos de creadores. |
| 11 | `tamv-monetization-advisor` | Orientación sobre monetización. |
| 12 | `tamv-marketing-growth` | Marketing y crecimiento. |
| 13 | `tamv-seo-discoverability` | SEO y descubrimiento. |
| 14 | `tamv-conversion-optimizer` | Conversión. |
| 15 | `tamv-launch-strategist` | Lanzamientos. |
| 16 | `tamv-rights-safety-guard` | Derechos y seguridad. |
| 17 | `tamv-support-assistant` | Soporte. |
| 18 | `tamv-audience-research` | Investigación de audiencias. |
| 19 | `tamv-content-review` | Revisión de contenido. |
| 20 | `tamv-brand-voice` | Voz editorial de marca. |
| 21 | `tamv-storytelling` | Narrativa. |
| 22 | `tamv-editorial-calendar` | Calendario editorial. |
| 23 | `tamv-channel-adaptation` | Adaptación por canal. |
| 24 | `tamv-community-care` | Atención a comunidades. |
| 25 | `tamv-experiment-design` | Diseño de experimentos. |
| 26 | `tamv-retention-insights` | Análisis de retención. |
| 27 | `tamv-campaign-measurement` | Medición de campañas. |
| 28 | `tamv-learning-path` | Rutas de aprendizaje. |
| 29 | `tamv-lesson-design` | Diseño de lecciones. |
| 30 | `tamv-practice-coach` | Práctica guiada. |
| 31 | `tamv-release-readiness` | Preparación de releases. |
| 32 | `tamv-accessibility-review` | Accesibilidad. |
| 33 | `tamv-metadata-provenance` | Metadatos y procedencia. |
| 34 | `tamv-consent-ledger` | Registro de consentimiento. |
| 35 | `tamv-privacy-minimization` | Minimización de datos. |
| 36 | `tamv-quality-gate` | Control de calidad. |
| 37 | `tamv-workflow-orchestrator` | Orquestación de flujos. |

El manifiesto declara un grafo de **20 extensiones**, con gobernanza y derechos como dependencias, aprobación humana y una política de reutilización de dependencias completadas. La validación comprueba coherencia de IDs, carpetas, contratos y dependencias; no despliega servicios ni otorga permisos de sistema.

El nombre de una skill no cambia la tecnología de la aplicación: el contrato Next.js no significa que este frontend use Next.js.

### Comprobar la coherencia del catálogo

Desde la raíz del repositorio:

```bash
python3 tamv-pack/scripts/validate-manifest.py
python3 tamv-pack/scripts/validate-integrity.py
node tamv-pack/scripts/normalize-skill-frontmatter.mjs --check
node tamv-pack/scripts/fill-skill-contracts.mjs --check
node tamv-pack/scripts/generate-skill-registry.mjs --check
```

Sin `--check`, los tres scripts Node pueden modificar archivos. El generador del registro completa entradas placeholder preservando datos curados: no debe presentarse como regeneración completa de toda la aplicación.

## Cuatro skills públicas v3

La superficie pública v3.0.0 conserva las 37 skills internas y publica cuatro coordinadoras:

| ID | Alcance |
|---|---|
| `tamv-creator-os` | Estrategia, calendario, contenido, comunidad, lanzamientos y aprendizaje. |
| `tamv-audio-intelligence` | Música local, voz característica, DSP, video, visuales y masterización. |
| `tamv-growth-engine` | SEO, contenido, conversión, monetización ética, analítica y experimentación. |
| `tamv-sovereign-platform` | Gobernanza, integridad, datos, seguridad, frontend y pruebas. |

Las cuatro viven en `tamv-genesis/v3/skills/` y son las únicas que declara [skills.sh.json](skills.sh.json). No duplican los 37 contratos: los referencian como biblioteca interna en `tamv-pack/skills/`. La matriz de fusión de patrones externos, sin copiar su texto ni su implementación, está en [tamv-genesis/v3/pack.json](tamv-genesis/v3/pack.json).

El paquete se protege con un sello por skill y una raíz de paquete SHA-256 firmada con Ed25519. Quitar, editar, mover o añadir una skill rompe el sello y el runtime deniega la ejecución. **El sello actual no está firmado:** `UNSIGNED_RELEASE_PENDING` significa que las capacidades certificadas no se habilitan, no que exista una certificación. La política completa, el modelo de amenaza y la migración desde 1.2.1 están en [docs/SOVEREIGN-V3.md](docs/SOVEREIGN-V3.md).

Publicar cuatro contratos no crea cuatro ejecutores: la única capacidad de inferencia implementada sigue siendo `creator.review`. El sello impide que una copia parcial o alterada pase como certificada; no vuelve “imposible de piratear” un texto que se distribuye en claro.

Los patrones externos se absorben como capacidades abstractas; no autorizan copiar código, contratos ni marcas de terceros sin revisar sus licencias.

## HyperCore

### Componentes presentes

- **Govern Core:** política `tamv.govern.policy.v2`, versión `2.0.0`, con denegación por defecto y autorización por capacidad, certificación y consentimiento. Fuente: [policy.ts](src/lib/hypercore-turbo/policy.ts).
- **Integrity Core:** comprobación de la distribución mediante manifiesto y firma. Fuente: [tamv-certification.ts](src/lib/tamv-certification.ts).
- **Velocity Core:** ejecución asíncrona con concurrencia acotada, resultados por tarea, timeout y reintentos condicionados. Fuente: [parallel-runner.ts](src/lib/hypercore-turbo/parallel-runner.ts).
- **Observabilidad:** contadores, gauge e histogramas locales en formato Prometheus. Fuente: [metrics.ts](src/lib/hypercore-turbo/metrics.ts).

La política contiene requisitos como retención, registro append-only, revocación de consentimiento, RBAC, respaldos y procedencia. Validar esa configuración **no demuestra que todos esos mecanismos estén implementados**. La autorización concreta por capacidad no equivale a un sistema RBAC multi-tenant completo.

El runner admite concurrencia de 1 a 64, con valor predeterminado 8 y timeout predeterminado de 30 segundos. Permite hasta tres intentos solo cuando la tarea se declara idempotente y el error se marca como reintentable. Es concurrencia de promesas, no paralelismo de CPU ni una cola BullMQ/Redis. La cancelación depende de que la tarea respete `AbortSignal`; un timeout no garantiza detener trabajo externo.

### Orquestación hot/cold

[hyper-core-orchestrator.ts](src/lib/hyper-core-orchestrator.ts) define puertos inyectables de gobernanza, ejecución, verificación, auditoría y checkpoints. El fallback a cold exige operación idempotente, adaptador disponible y error marcado como reintentable.

Estas primitivas no están conectadas al flujo de revisión creativa. Las interfaces de auditoría y standby no son por sí solas almacenamiento durable, recuperación probada ni alta disponibilidad desplegada.

### Diagnóstico y procedencia

La auditoría HTTP ejecuta comprobaciones de política, certificación y un probe de tres tareas que devuelven valores booleanos. **No es una prueba de carga.** La procedencia permanece explícitamente `verified: false`, `status: "not-integrated"`; por ello su certificación global es falsa.

El evaluador de [runtime.ts](src/lib/hypercore-turbo/runtime.ts) también deniega ante procedencia no verificada y no ejecuta capacidades. No debe confundirse con una capa ya aplicada a todas las rutas del producto.

### Métricas protegidas

El endpoint exige `Authorization: Bearer <token>` y la variable de servidor `TAMV_METRICS_TOKEN`. La validación acepta entre 32 y 4.096 caracteres sin espacios; el operador debe generar un secreto aleatorio adecuado.

- Configuración ausente o inválida: `503`.
- Credencial ausente o incorrecta: `401`.
- Credencial válida: texto Prometheus `0.0.4`.

La comparación usa digests de longitud fija y `timingSafeEqual`. El token nunca debe exponerse mediante una variable `VITE_`. Los registros son locales al proceso, limitan series por métrica y pueden estar vacíos si no hubo instrumentación; exponer el endpoint no demuestra que exista un scraper, dashboard o sistema de alertas conectado.

## TAMV Genesis

Genesis organiza claims, metadatos de evidencia, capacidades, scorecards, perfiles, corpus y un work ledger local. **No ejecuta modelos de IA ni sustituye una auditoría independiente.**

### Instantáneas y evaluación

[src/lib/genesis-bundle.ts](src/lib/genesis-bundle.ts) importa [tamv-genesis/dist/public.json](tamv-genesis/dist/public.json). Tanto `/sovereignty` como `/api/tamv/genesis` usan ese bundle: no recalculan la auditoría en cada visita.

El snapshot regenerado en este commit muestra **58,6/100, grado D**, y **19 chequeos** alineados con el CLI, incluido `K-19` para el sello v3. Generar el bundle no cambia el puntaje ni la firma: tanto el manifiesto raíz como el sello v3 siguen sin firma Ed25519 y las capacidades premium siguen bloqueadas.

El score se calcula a partir de puntuaciones, pesos y compuertas introducidos en los datos del proyecto. Las compuertas no se derivan automáticamente de todos los chequeos actuales. El evaluador también contiene una fecha de evaluación fijada: regenerar archivos no garantiza por sí solo actualizar la referencia temporal.

La escala declarada es `M0-declared → M1-contracted → M2-implemented → M3-tested → M4-operated → M5-audited`. Sus niveles automáticos dependen de referencias y metadatos: una referencia de tipo test no prueba que ese test haya pasado; una referencia de atestación no autentica por sí sola a un revisor independiente. El PDP de Genesis y el campo `runnable` del catálogo no aplican exactamente las mismas condiciones y no son equivalentes.

### CLI

Requiere Node con soporte de `--experimental-strip-types` y el repositorio completo. Desde su raíz:

```bash
node --experimental-strip-types tamv-genesis/cli/sovereign.mjs audit
node --experimental-strip-types tamv-genesis/cli/sovereign.mjs verify
node --experimental-strip-types tamv-genesis/cli/sovereign.mjs score
node --experimental-strip-types --test tamv-genesis/tests/*.test.ts
```

| Comando | Comportamiento relevante |
|---|---|
| `audit` | Evalúa datos y archivos locales; termina con error ante chequeos fallidos bloqueantes. |
| `verify` | Comprueba cadena del ledger y hashes de atribución; puede terminar correctamente sin firma. No reemplaza `tamv:verify`. |
| `score` | Recalcula la aritmética del scorecard declarado. |
| `profiles` / `corpus` | Resumen inventarios locales existentes; no consultan GitHub ni reconstruyen el corpus. |
| `report` | Sobrescribe el informe generado en `docs/audit/2026-11-13/GENERATED.md`. |
| `build` / `packet` | Escriben bundle completo, proyección pública, paquete de revisión y manifiesto de hashes en `tamv-genesis/dist/`. |

El sello público v3 tiene su propio CLI:

```bash
node --experimental-strip-types tamv-genesis/scripts/v3-seal.mjs --write
node --experimental-strip-types tamv-genesis/scripts/v3-seal.mjs --verify
```

`--write` reconstruye `tamv-genesis/v3/seals/pack-seal.json` y deja la firma en `UNSIGNED_RELEASE_PENDING`. `--verify` sin `TAMV_V3_PUBLIC_KEY` devuelve `TAMV_SEAL_KEY_MISSING` y código 1; con la clave pública exige `--require-signature` para aceptar solo un sello firmado. El sobre híbrido (X25519 + HKDF-SHA256 + AES-256-GCM) se opera con `tamv-genesis/scripts/v3-hybrid.mjs seal|open`.

Todos los comandos reconocidos pasan por la evaluación local y dependen de sus archivos de entrada. `build` y `packet` pueden generar artefactos aunque existan fallos bloqueantes: **generar no significa aprobar**. Los inventariadores de perfiles y corpus son procesos separados; revisa sus rutas y tratamiento de datos antes de ejecutarlos.

### Inventarios reproducibles

Los dos inventarios son código, no documentos escritos a mano:

```bash
# Perfiles: normaliza snapshots de la API pública y audita totales/forks/fechas.
node --experimental-strip-types tamv-genesis/scripts/profile-inventory.mjs \
  --input OsoPanda1=oso1.json --input OsoPanda1=oso2.json \
  --input AnubisVillasenor1=anubis.json \
  --user OsoPanda1=oso-user.json --user AnubisVillasenor1=anubis-user.json --write

# Corpus: hashea el árbol local, extrae texto permitido y publica solo agregados.
node --experimental-strip-types tamv-genesis/scripts/corpus-inventory.mjs \
  --root .. --date 2026-11-13
```

El inventario de perfiles registra **154 repositorios** (144 de `OsoPanda1`, 10 de `AnubisVillasenor1`), de los cuales **41 son forks** y **109 originales tienen 0 estrellas**. Un fork no es autoría; una estrella no es revisión. El resumen del corpus cubre **9,948 archivos** y **4.24 GB**, retiene **129** archivos P0/P1 como bytes opacos y detecta **2,358 grupos duplicados**; el detalle con rutas queda en `tamv-genesis/.corpus/`, fuera de Git. Los conteos no prueban horas, calidad ni originalidad: describen lo que el árbol y la API muestran.

### Alcance del ledger

El work ledger procede de JSON local. Su cadena cubre partes de las procedencias y atestaciones, no todo el documento ni la identidad de los firmantes. El CLI no implementa incorporación durable de eventos de revisión ni impide reescribir los datos y recalcular la cadena.

No se presenta como ledger inmutable, append-only, prueba de horas trabajadas ni certificación de autoría. Los bundles pueden contener identidad y claims personales: revisarlos antes de compartirlos es necesario; “público” no equivale a anonimizado.

## Interfaces y endpoints

| Interfaz | Función | Estado |
|---|---|---|
| `/` | Monitor, revisión, skills, modelos, gobernanza y documentación | UI implementada; no validada en navegador durante esta actualización. |
| `/hypercore` | Consulta la auditoría HyperCore | Diagnóstico, no certificación externa. |
| `/sovereignty` | Panel Genesis | Snapshot importado. |
| `reviewContent` (`POST`, RPC de TanStack) | Revisión creativa | Inferencia implementada detrás de sus guardas. |
| `GET /api/tamv/status` | Consulta `getTamvCertification()` | `200` con estado, razón y booleanos; `200` no significa certificado. |
| `GET /api/tamv/genesis` | Proyección del bundle Genesis | `200`, datos guardados, sin recálculo. |
| `GET /api/tamv/hypercore/audit` | Política, integridad, probe y procedencia | `200` con estado global bloqueado mientras falta SLSA runtime. |
| `GET /api/tamv/hypercore/metrics` | Métricas de proceso | Bearer obligatorio; `401` o `503` ante fallos de acceso/configuración. |
| `POST /api/generation` | `music.generation` | Sin ejecutor conectado. |
| `POST /api/voice/generate` | `voice.generation` | Sin ejecutor conectado. |
| `POST /api/audiocore/advanced` | `audiocore.advanced` | Sin ejecutor conectado. |
| `POST /api/agent` | `agent.orchestration` | Sin ejecutor conectado. |

Las cuatro rutas no implementadas aplican la respuesta compartida de certificación y licencia: `403` si una guarda falla y `501` si ambas permiten continuar pero falta el ejecutor. La lista de features de la licencia actual solo contiene `creator.review`; firmar el paquete no habilita automáticamente las demás.

Los endpoints de estado, Genesis, auditoría y métricas envían `Cache-Control: no-store`; eso evita caché HTTP, pero no convierte un bundle importado o métricas de proceso en datos durables o en tiempo real.

## Arquitectura

```text
TAMV Creator Intelligence
├── src/
│   ├── components/          Interfaz, revisión y explorador de modelos
│   ├── integrations/        Supabase y autenticación
│   ├── lib/                 Contratos, guardas, certificación y orquestación
│   ├── routes/              Páginas y endpoints TanStack
│   └── test/                Pruebas de aplicación y utilidades
├── tamv-pack/               Manifiesto, 37 skills, instalador e integridad
├── tamv-genesis/            Kernel, CLI, datos, pruebas y bundles
├── hypercore/               Políticas y configuración complementaria
├── scripts/                 Certificación, hooks e instrumentos de release
├── .github/workflows/       Validación y preparación de artefactos
├── docs/                    Documentación y auditorías fechadas
├── tamv-attribution.json    Manifiesto protegido
└── tamv-attribution.sig     Firma o marcador de firma pendiente
```

La aplicación usa **React 19**, **TypeScript 5.8**, **TanStack Start/Router**, **Vite 8**, **Tailwind CSS 4**, componentes **Radix/shadcn**, **Zod**, **Supabase** y **Lovable AI Gateway**. Las pruebas usan **Vitest**, **Testing Library** y **jsdom**. Los scripts combinan Node, Bash y Python.

Las versiones y dependencias declaradas están en [package.json](package.json) y el lockfile. Next.js, BullMQ, Redis y Stripe aparecen en contratos o recomendaciones del pack; no deben anunciarse como servicios instalados de esta aplicación. Las siete federaciones TAMV describen una arquitectura conceptual, no siete despliegues comprobados.

## Instalación

### Requisitos

- Git para obtener y revisar el repositorio.
- Bun compatible con el lockfile; el workflow de release fija **Bun 1.3.5**.
- Node compatible con Vite/TanStack y, para Genesis, con eliminación de tipos mediante `--experimental-strip-types`. `package.json` no fija un campo `engines`.
- Bash y Python 3 para validadores e instalador; CI usa Python 3.12.
- OpenSSL solo si se generan claves con el script correspondiente; ShellCheck para su comprobación específica.

### Obtener el proyecto y abrir la aplicación

```bash
git clone https://github.com/AnubisVillasenor1/tamv-creator-intelligence.git
cd tamv-creator-intelligence
bun install --frozen-lockfile
bun run dev
```

Usa la dirección que muestre Vite. Abrir la interfaz no habilita la inferencia: la revisión necesita autenticación, proveedor y distribución válida.

### Configuración por ámbito

No copies valores privados a este README ni al repositorio. Configura las integraciones y secretos mediante los mecanismos del entorno de despliegue/Lovable.

| Variable | Ámbito y finalidad |
|---|---|
| `VITE_SUPABASE_URL` | URL pública del backend utilizada por el cliente. |
| `VITE_SUPABASE_PUBLISHABLE_KEY` | Clave publicable del cliente; nunca sustituir por una clave secreta o de servicio. |
| `SUPABASE_URL` | URL del backend en servidor. |
| `SUPABASE_PUBLISHABLE_KEY` | Configuración Supabase usada por el middleware de servidor. |
| `LOVABLE_API_KEY` | Credencial del gateway, solo servidor. |
| `TAMV_ATTRIBUTION_PUBLIC_KEY` | Clave pública confiable para verificar firmas. |
| `TAMV_ATTRIBUTION_PRIVATE_KEY` | Solo proceso autorizado de firma; nunca frontend ni artefactos públicos. |
| `TAMV_CERTIFICATION_REQUIRED` | Exigencia estricta de firma en la comprobación de certificación. |
| `TAMV_METRICS_TOKEN` | Autenticación del endpoint de métricas, solo servidor. |

El middleware [auth-attacher.ts](src/integrations/supabase/auth-attacher.ts), registrado en [start.ts](src/start.ts), adjunta una sesión Supabase existente a las server functions. Esto no demuestra un flujo completo de registro/inicio de sesión autónomo ni una sesión disponible en cualquier instalación. La protección CSRF se aplica a las server functions.

### Instalar el pack en otro proyecto

La configuración [skills.sh.json](skills.sh.json) apunta a `./tamv-pack/skills`. La vía documentada con el CLI externo es:

```bash
npx skills add AnubisVillasenor1/tamv-creator-intelligence
```

Revisa el código y las opciones del instalador externo antes de ejecutarlo. Su instalación no equivale a desplegar la aplicación ni a ejecutar el instalador TAMV. La configuración de descubrimiento tampoco certifica el estado actual de indexación remota; los antecedentes están en [PUBLISHING.md](docs/PUBLISHING.md).

Para usar el instalador incluido, primero valida el pack desde su repositorio:

```bash
bash tamv-pack/scripts/validate-pack.sh
bash tamv-pack/scripts/test-scripts.sh
```

Después, **desde el proyecto destino**, ajusta la ruta y ejecuta:

```bash
bash "/ruta/al/repositorio/tamv-creator-intelligence/tamv-pack/install.sh"
```

El instalador valida manifiesto e integridad antes de solicitar consentimiento. Copia skills a `.agents/skills` por defecto, admite `TAMV_SKILLS_DIR`, instala el manifiesto en `.tamv/pack.json`, crea documentos de atribución/gobernanza y puede modificar el README del destino.

Respalda archivos preexistentes en `.tamv/backups/backup-XXXXXXXX` y registra operaciones. **No incluye rollback automático:** revisa el diff y restaura selectivamente los respaldos si es necesario, distinguiendo archivos sustituidos de archivos nuevos.

### Instalar desde un repositorio existente sin reemplazarlo

Usa una copia del paquete **fuera del proyecto destino**. No copies su `.git`,
`package.json`, `.env` ni configuración de la aplicación a tu proyecto.
Guarda primero tus cambios locales. Con Git Bash o Bash/WSL:

```bash
git clone https://github.com/AnubisVillasenor1/tamv-creator-intelligence.git /tmp/tamv-source
bash /tmp/tamv-source/tamv-pack/scripts/validate-pack.sh
bash /tmp/tamv-source/tamv-pack/scripts/test-scripts.sh
# En otra terminal, abierta en la raíz de TU proyecto existente:
bash /tmp/tamv-source/tamv-pack/install.sh
git diff -- README.md TAMV_ATTRIBUTION.md TAMV_GOVERNANCE.md
git status --short
```

Acepta únicamente después de revisar los contratos y scripts. Se instalan
`.agents/skills/`, `.tamv/pack.json`, atribución y gobernanza; el README del destino
solo recibe la atribución si no existe. Los archivos previos se respaldan en
`.tamv/backups/backup-XXXXXXXX`; el resultado queda en `.tamv/install.log`.
No se activa automáticamente ningún skill de Lovable ni se aprovisionan servicios.

### Actualizar y revertir una instalación existente

1. Guarda o confirma los cambios del **proyecto destino**, especialmente tus skills
   personalizados. No actualices mientras tengas modificaciones sin respaldo.
2. Obtén una copia nueva del repositorio del paquete en una carpeta separada; usa
   un tag o SHA revisado para fijar la versión. No hagas un pull del paquete dentro
   de un repositorio de otra aplicación.
3. Ejecuta `validate-pack.sh` y `test-scripts.sh` en esa copia; compara sus contratos
   con los instalados y revisa licencias y dependencias.
4. Desde el proyecto destino, ejecuta el instalador nuevo y acepta. Conserva la
   misma variable `TAMV_SKILLS_DIR` si elegiste una ruta distinta en la instalación
   original. El instalador crea un respaldo nuevo antes de reemplazar archivos.
5. Revisa el diff y prueba tu aplicación antes de confirmar cambios. Los skills
   retirados del nuevo catálogo no se borran automáticamente: revísalos aparte.

Para revertir, consulta la ruta `backup=` de la última instalación en
`.tamv/install.log`. Compara y restaura solo los archivos reemplazados desde ese
respaldo; los archivos creados por primera vez no tienen una copia anterior.
No restaures todo el repositorio ni elimines skills de terceros. En Windows,
ejecuta el instalador con Git Bash o WSL; PowerShell no ejecuta Bash directamente.

La revisión con IA permanece bloqueada si falta una sesión válida o la firma
oficial Ed25519 del release. Instalar los contratos no habilita esa capacidad.

## Desarrollo y pruebas

**Estado de esta actualización:** se ejecutaron las pruebas del kernel de Genesis (**52/52**) y la auditoría local. No se ejecutaron Vitest, lint, typecheck, build ni validación de la interfaz en navegador; no se declara la suite completa “en verde”.

Las mejoras locales incluyen pruebas en [model-catalog.test.ts](src/test/model-catalog.test.ts), [model-explorer.test.tsx](src/test/model-explorer.test.tsx) y [creator-review.test.tsx](src/test/creator-review.test.tsx): validación, datos desconocidos, costes, límites, importación local, filtros, comparación, carreras de lectura, errores, doble envío y exportación. Sus mocks no sustituyen una prueba real de autenticación o inferencia.

Genesis contiene **52 pruebas en ocho archivos**, ejecutadas en esta actualización con `node --experimental-strip-types --test tamv-genesis/tests/*.test.ts` (**52 aprobadas**). Eso cubre el kernel, los inventarios y los datos; no cubre la aplicación web, la autenticación real ni un despliegue. La cobertura de la app sigue pendiente de Vitest y del navegador.

Después de instalar dependencias, ejecutar desde la raíz:

```bash
bun run lint
bunx tsc --noEmit
bun run test
bun run tamv:check
bun run build
bash tamv-pack/scripts/test-scripts.sh
bun run hooks:test
bun run slsa:test
node --experimental-strip-types --test tamv-genesis/tests/*.test.ts
```

| Comando adicional | Efecto |
|---|---|
| `bun run test:watch` | Vitest en modo observación. |
| `bun run preview` | Previsualización del build existente. |
| `bun run build:dev` | Build de desarrollo sin la comprobación previa de certificación del script `build`; no valida un release. |
| `bun run format` | Reescribe formato en el repositorio; no es una comprobación de solo lectura. |
| `bun run hooks:install` | Instala guardas Git locales y modifica `core.hooksPath`; acción opcional, no ejecutada aquí. |

`tamv:check` combina la comprobación de certificación con la validación del pack. `build` comprueba certificación antes de ejecutar Vite: con el hash del README desactualizado no debe esperarse un build aprobado. Los tests de SLSA usan ejecutables simulados y validan argumentos y errores, no la procedencia de un artefacto real.

Antes de publicar, comprobar en navegador el flujo satisfactorio y los casos de sesión ausente, consentimiento ausente, integridad/licencia inválidas, saturación, timeout, archivo de catálogo inválido, importación repetida, comparación, vaciado y descarga. Conservar commit, entorno, logs y resultados.

## Certificación y releases

### Controles distintos

| Mecanismo | Qué comprueba | Qué no demuestra |
|---|---|---|
| Inventario del pack `GIT-BLOB-SHA1` | Correspondencia de archivos con su inventario; rechaza enlaces simbólicos. | Identidad autenticada del distribuidor. |
| Manifiesto SHA-256 | Correspondencia de 22 archivos obligatorios, incluido este README, con hashes registrados. | Firma del autor o ausencia de vulnerabilidades. |
| Ed25519 | Firma del manifiesto JSON canonicalizado respecto de una clave pública confiable. | Calidad funcional, derechos de terceros o auditoría independiente. |
| Sello v3 | Raíces SHA-256 por skill y raíz del paquete firmadas con Ed25519; `K-19` recalcula el contenido real. | Sin `TAMV_V3_PUBLIC_KEY` solo se comprueba estructura; no demuestra autoría ni imposibilita copiar el paquete completo. |
| Procedencia SLSA / atestaciones | Evidencia verificable de origen y construcción, conforme a la política aplicada. | No se deduce de la firma Ed25519. |
| SBOM CycloneDX | Inventario de componentes del artefacto. | Ausencia de CVE, cumplimiento legal o remediación. |
| CI | Resultado de comprobaciones concretas para un commit y entorno. | Disponibilidad del servicio o certificación universal. |

El inventario del pack es independiente del manifiesto raíz. Regenerarlo con `python3 tamv-pack/scripts/validate-integrity.py --write` modifica datos y no autentica por sí solo el cambio.

### Actualizar una distribución protegida

Tras revisar el contenido final, el responsable autorizado del release ejecuta:

```bash
bun run tamv:hash
bun run tamv:sign
bun run tamv:verify
```

`tamv:hash` modifica el manifiesto e invalida la firma anterior. `tamv:sign` necesita la clave privada suministrada de forma segura; `tamv:verify` exige hashes y firma válidos con la clave pública correspondiente. `tamv:keygen` es una herramienta de generación de claves, no una autorización para sustituir la identidad de firma oficial.

El sello v3 se actualiza después de revisar el contenido final:

```bash
node --experimental-strip-types tamv-genesis/scripts/v3-seal.mjs --write
TAMV_V3_PRIVATE_KEY="$(cat release.pem)" TAMV_V3_PUBLIC_KEY="$(cat release.pub.pem)" \
  node --experimental-strip-types tamv-genesis/scripts/v3-seal.mjs --write --sign
TAMV_V3_PUBLIC_KEY="$(cat release.pub.pem)" \
  node --experimental-strip-types tamv-genesis/scripts/v3-seal.mjs --verify --require-signature
```

Reconstruir el sello sin `--sign` es un paso válido y deja el release explícitamente sin certificar. No se debe presentar ese estado como firmado.

La comprobación ordinaria puede advertir sobre firma ausente y terminar correctamente si los hashes son válidos y no se exige modo estricto. **Por eso `tamv:check` no equivale a `tamv:verify`.** El runtime aplica sus propias guardas y no habilita una distribución sin certificar solo porque una comprobación no estricta termine con código cero.

No se deben desactivar verificaciones para conseguir un build ni reemplazar `UNSIGNED_RELEASE_PENDING` por texto que simule una firma. La clave privada no debe aparecer en Git, logs, artefactos, frontend ni mensajes de error.

### CI y artefactos

[validate-pack.yml](.github/workflows/validate-pack.yml) configura comprobaciones de higiene, hooks, SLSA, hashes, pack, instalación, ShellCheck, lint, pruebas y build. La presencia del workflow no acredita sus últimos resultados ni la protección de ramas remotas.

[release-sign.yml](.github/workflows/release-sign.yml) se activa con tags `v*`, comprueba pertenencia al historial de `origin/main` y configura firma, verificación, build, SBOM y atestaciones. Requiere claves, permisos y contexto de GitHub adecuados.

El bundle de aplicación incluye manifiesto, firma, salidas de build y SBOM; **no incluye el pack instalable**. El workflow conserva artefactos durante 90 días, pero no crea por sí mismo una GitHub Release ni despliega el servicio.

[verify-slsa.sh](scripts/verify-slsa.sh) ofrece verificación con `gh` y una modalidad con `slsa-verifier`. El modo GitHub requiere `GH_TOKEN` y `TAMV_SOURCE_DIGEST`, además del artefacto, repositorio y tag esperados. No se verificó aquí una atestación real ni la correspondencia con un despliegue.

## Gobernanza de IA y derechos

La gobernanza combina contratos, configuración y guardas concretas; su existencia no es una acreditación legal o institucional. NIST CSF 2.0, NIST AI RMF y los principios UNESCO son referencias, no avales al producto.

Reglas de operación:

- Mantener supervisión humana y autorización específica para acciones sensibles.
- No introducir secretos, sesiones, backups privados ni datos personales innecesarios en solicitudes, catálogos, logs o repositorios.
- Mantener el gateway y sus credenciales en servidor; no usar prefijos `VITE_` para secretos.
- No publicar ni redistribuir voces, obras, muestras, imágenes o datos sin permisos suficientes. La atribución no reemplaza esos permisos.
- Tratar el contenido enviado al modelo como datos no confiables. Las instrucciones de seguridad del prompt no constituyen una garantía de detección o bloqueo exhaustivo.
- Diferenciar el consentimiento puntual del formulario de un registro durable de consentimiento con revocación, caducidad y auditoría: este último sigue pendiente.
- No declarar aislamiento multi-tenant, cumplimiento normativo, entrenamiento libre de datos personales o eliminación de información sin evidencia específica.

Los borradores de revisión y el catálogo importado no se guardan de forma durable por esos componentes; eso no implica que toda la aplicación, la autenticación o el proveedor remoto carezcan de almacenamiento.

## Auditoría y evidencia

- [Auditoría fechada y evidencia](docs/audit/2026-11-13/README.md).
- [Remediación](docs/audit/2026-11-13/REMEDIATION.md).
- [Protocolo de evaluación](docs/ACADEMIC-EVALUATION.md).
- [Distribución y publicación](docs/PUBLISHING.md).
- [Sello, firma y cifrado híbrido v3](docs/SOVEREIGN-V3.md).
- [Inventario histórico de perfiles](docs/PROFILES.md).
- [Catálogo agregado del corpus local](docs/CORPUS-CATALOG.md).
- [Gobernanza](GOVERNANCE.md) y [seguridad](SECURITY.md).

Son materiales fechados, no garantías del estado presente. Las cifras de actividad, instalaciones, horas o perfiles autopublicados no prueban usuarios únicos, calidad, autoría independiente ni validación académica. Ante discrepancias, contrastar el documento con código, pruebas y evidencia del commit objetivo. Un DOI, repositorio o número de archivos no constituye por sí solo revisión por pares.

## Deuda técnica

Prioridades que no se cierran reescribiendo documentación:

1. Ejecutar y corregir las suites de la aplicación (Vitest), typecheck, lint, build y pruebas reales de interfaz; el kernel de Genesis se ejecutó localmente (65/65), pero el resultado de CI para este commit debe confirmarse en GitHub Actions.
2. Completar una firma Ed25519 real y verificar la distribución; cada edición posterior del README exige `tamv:hash`.
3. Probar el flujo de sesión y revisión extremo a extremo, incluyendo la normalización de errores de autenticación y el acceso efectivo al modelo configurado.
4. Conectar verificación de procedencia confiable al runtime/despliegue y unificar su aplicación a las capacidades que deban exigirla.
5. Sincronizar los bundles Genesis con el evaluador y revisar sus fechas, scorecards, niveles de madurez y criterios de autorización.
6. Implementar cuotas distribuidas si se usan varias instancias, sin perder control sobre trabajos que continúan tras timeout.
7. Implementar persistencia, consentimiento durable, control de acceso, aislamiento de datos, respaldo y recuperación cuando el producto los requiera.
8. Conectar y probar adaptadores reales antes de habilitar música, voz, DSP o agentes; los contratos por sí solos no los activan.
9. Integrar observabilidad externa, análisis de vulnerabilidades y política de bloqueo por release.
10. Firmar el sello v3 con la clave Ed25519 de release y verificar `--require-signature`; mientras siga en `UNSIGNED_RELEASE_PENDING`, las capacidades certificadas permanecen deshabilitadas.

Priorizar por riesgo y dependencia, no por número de commits ni porcentajes sin método reproducible.

## Contribuciones y seguridad

Seguir [AGENTS.md](AGENTS.md), declarar alcance y pruebas y revisar las obligaciones de integridad antes de modificar archivos protegidos. Mantener la inferencia en Lovable AI Gateway y no editar manualmente archivos marcados como generados. Los cambios de esquema en `supabase/migrations/` o `drizzle/` deben gestionarse mediante Lovable según las reglas del proyecto.

No reescribir historial publicado, introducir credenciales ni instalar cambios de infraestructura como efecto colateral. Los hooks locales son opcionales y no sustituyen CI o protección de ramas. Reportar vulnerabilidades por un canal privado verificado; las pruebas contra sistemas desplegados requieren autorización.

Si una credencial se expone, revocarla y rotarla; borrar el archivo en un commit posterior no elimina el historial.

## Licencias

El núcleo declara **AGPL-3.0-only**, con excepciones comerciales explícitamente marcadas y marcas reservadas. El alcance exacto depende de los archivos vigentes en el commit distribuido:

- [LICENSE](LICENSE).
- [LICENSE-MAP.md](LICENSE-MAP.md).
- [NOTICE](NOTICE).
- [ATTRIBUTION.md](ATTRIBUTION.md).

No debe suponerse que existen términos comerciales completos para cualquier activo: revisar su licencia específica y acuerdo aplicable. Las dependencias, modelos, datasets, voces y medios mantienen sus propios términos. Una licencia de software no concede derechos de marca, imagen, voz, obras ajenas ni autorización para tratar datos personales.

## Gate de producción

- [ ] Alcance y diff final revisados, sin secretos ni datos no redistribuibles.
- [ ] Catálogo, contratos, manifiestos, registro y documentación coherentes.
- [ ] Tests, typecheck, lint y build aprobados para el commit de release.
- [ ] Flujo real probado en navegador, con casos de rechazo y fallo.
- [ ] Hashes finales y firma Ed25519 válidos; clave pública confiable configurada.
- [ ] Sello v3 firmado y `v3-seal.mjs --verify --require-signature` en `TAMV_SEAL_VALID`.
- [ ] Procedencia y SBOM verificables vinculados al artefacto correcto.
- [ ] Autenticación, consentimiento, autorización, cuotas y límites probados.
- [ ] Almacenamiento, aislamiento, recuperación y monitoreo demostrados donde apliquen.
- [ ] Licencias, derechos, variables y secretos revisados para el entorno destino.
- [ ] Despliegue y reversión comprobados, con evidencias archivadas.
- [ ] Afirmaciones públicas limitadas a lo efectivamente verificado.

Si un control crítico no puede verificarse, mantener deshabilitada la capacidad afectada; no presentar un servicio limitado como plenamente certificado.

**TAMV ONLINE NETWORK · PLAY & GO · The Paradigm Killer**

Proyecto impulsado con colaboración de tecnología latinoamericana TAMV ONLINE NETWORK Orgullosamente Realmontenses.
