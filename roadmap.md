# Actualización TAMV

## Unificación Isabella / Horizon y aceptación
- [ ] Incorporar controles de Isabella y acciones de Horizon en una experiencia única.
- [ ] Añadir pruebas E2E reproducibles de aprobación, evidencia, consentimiento y sellado.
- [ ] Conectar servicios externos disponibles y comprobar respuestas reales.
- [ ] Verificación autenticada: requiere una cuenta registrada y correo verificado.
- [ ] Migrar datos de proyectos de origen: requiere exportaciones CSV de sus respectivos chats.

## Integración funcional del ZIP
- [ ] Unificar cuatro coordinadoras, tres HyperCores y flujos Exagon con el proyecto existente.
- [ ] Implementar controles de política, permisos, evidencia e idempotencia sin debilitar la certificación.
- [ ] Integrar y probar sellado SHA-512 + Ed25519 del proyecto unificado.
- [ ] Verificar pruebas y flujos visibles; documentar conexiones externas pendientes.

- [x] Comparación de main y correcciones previas registradas en la entrega anterior; no se repitió la importación.
## Cableado GovCore y cierre funcional (2026-11-18)
- [ ] Corregir el bloqueo del scheduler y verificar las regresiones de gobernanza.
- [ ] Integrar los controles ejecutables de la referencia GovCore con el SDK y la app, sin sustituir autorización real por datos declarados.
- [ ] Verificar proyectos, auditoría, navegación y documentar los bloqueos externos restantes.

## Workspace, estudio e integraciones (2026-11-17)
- [x] Navegación Crear/Conectar/Gobernar/Aprender, búsqueda, tema claro/oscuro y menú móvil.
- [x] Tutorial de seis pasos con progreso local y reinicio; no certifica cuentas ni ejecuta capacidades.
- [x] Cliente de estudio con consentimiento, validación WAV/SHA-256, reproducción y descarga; pruebas de cambios de sesión, solicitudes duplicadas y respuestas tardías.
- [x] Métricas compartidas de audio/agente y scrape autenticado/certificado; solo eventos observados por instancia.
- [x] Resolución topológica de 37 contratos de skills e inclusión explícita en revisión creativa; sin inventar servicios ejecutados.
- [x] Nueve receptores sociales con protocolos de autenticación y relay HTTPS firmado, probado con transporte controlado. Longe.ai permanece 501.
- [x] Documentación de rutas, secretos por nombre, privacidad, límites e idempotencia del relay.
- [ ] Aceptación autenticada del estudio contra despliegue certificado y evidencia oficial por proveedor social.
- [ ] OAuth/publicación social, cola durable y relay externo: no provisionados. Activación corresponde al operador con permisos del proveedor.

## Integración agnóstica (2026-11-17)
- [ ] SDK independiente con controles, hooks, API y ejemplos.
- [ ] Proyectos privados, evaluación AI Gateway y auditoría persistente exportable.
- [ ] Logotipo oficial, monitor tecnológico y páginas de integración, IA y marketplace.
- [ ] Pruebas, verificación y documentación de límites de activación.

- [x] Comparación de main y correcciones previas registradas en la entrega anterior; no se repitió la importación.
- [x] Correcciones de certificación pendientes de la auditoría resueltas; trabajo externo restante detallado en el manual de despliegue.

- [x] Monitor general verificado; revisión implementada, activación real bloqueada por firma oficial y acceso de usuarios.
- [x] 37 skills validadas: 20 extensiones gobernadas y 17 originales.
- [x] Validación local de estructura y scripts; flujos GitHub Actions existentes, ejecución alojada pendiente del propietario.
- [x] Instrucciones de instalación/actualización existentes y manual complementario de despliegue seguro.
- [x] Pruebas y verificación de la vista previa en escritorio y móvil.

## Orquestación de agentes y cuotas por actor (2026-11-17)
- [x] Motor de agentes local determinista (`tamv-genesis/src/agent/{contracts,engine}.ts`): planes de 1..8 pasos, herramientas cerradas (`digest.sha256`, `audio.render`), consentimiento obligatorio, fallo que detiene el plan, cancelación entre pasos, auditoría por paso y efectos externos denegados por defecto. Sin LLM; `disclosure.llm: false`.
- [x] Ruta `POST /api/agent` conectada al motor con las mismas compuertas fail-closed que audiocore (certificación, auth Supabase, cuerpo 32 KiB, límites por paso 30 s / solo WAV, timeout 60 s); contrato en `docs/AGENT-ORCHESTRATION.md`.
- [x] Cuotas distribuidas por actor para `audiocore.advanced` y `agent.orchestration` (`src/lib/capability-quota.server.ts`): token bucket de día fijo vía Upstash Redis REST, 429 con `Retry-After`, 503 fail-closed sin backend fuera de desarrollo local, cupo de concurrencia por proceso etiquetado como tal.
- [x] Pruebas: 10 Genesis del motor + 16 app de la ruta de agentes + 5 nuevas de cuota en audiocore (15 en total ahí); cierre con módulos `agent.orchestration.local` y `platform.capability-quota` = `closed` (26 módulos, 9 closed).
- [x] `license.features` incluye `agent.orchestration`; hashes TAMV regenerados tras tocar la ruta protegida. Ambas rutas siguen 403 hasta la firma oficial del release.
- [ ] `agent.orchestration` no es capacidad declarada del pack sellado (`v3/pack.json` es ineditable); el módulo de cierre usa `capabilities: []` anclado a `tamv-sovereign-platform`. Declararla en el pack requeriría un nuevo release sellado por el propietario.

## Audio real en proceso (2026-11-16)
- [x] DSP local medido, no simulado: LUFS integrado ITU-R BS.1770-4, true peak de muestra y chroma FFT de 12 clases (`tamv-genesis/src/audio/local-dsp.ts`), probado con vectores físicos conocidos (senoide 0.5 → −6.0206 dBFS; dual-mono → +3.0103 LU; silencio → `null`).
- [x] Proveedor de síntesis procedural determinista sembrado por SHA-256 de la petición (`tamv-genesis/src/audio/local-synth.ts`); WAV PCM16 hasta 60 s; FLAC falla cerrado. Se declara `neuralModel: false`, `voice: false` en cada respuesta.
- [x] Códec WAV estricto (`tamv-genesis/src/audio/wav.ts`): parser RIFF/PCM16 con rechazo de malformed y codificador mono.
- [x] Ruta `POST /api/audiocore/advanced` conectada al pipeline completo con compuertas fail-closed (certificación TAMV, auth Supabase, consentimiento, límites 16 KiB / 30 s) y respuesta determinista byte a byte; contrato en `docs/AUDIO-ORCHESTRATION.md` §6.
- [x] Genesis pasa el programa estricto de la app (`noPropertyAccessFromIndexSignature`, `exactOptionalPropertyTypes`, `noUncheckedIndexedAccess`) sin relajar ningún flag.
- [x] Pruebas: 115 Genesis (10 nuevas DSP/síntesis) y 286 app (10 nuevas de la ruta); hashes TAMV regenerados tras tocar el archivo protegido.
- [x] `license.features` incluye `audiocore.advanced`; la ruta sigue fail-closed (403) hasta que el propietario firme el release con la clave oficial.
- [ ] Persistencia real (cola durable, almacenamiento de objetos, worker desplegado): sin cambios; sigue pendiente de infraestructura y de Lovable para el esquema de datos.
- [ ] Proveedor neuronal de música/voz: no conectado; la síntesis local no debe presentarse como generación neuronal.

## Preparación para despliegue (2026-11-15)
- [x] Corregir bloqueos de compilación conservando la certificación fail-closed; build OK confirmado.
- [x] Ejecutar pruebas, validaciones del paquete y comprobar la vista previa: 187 pruebas app, 105 Genesis y comprobación final de 16 pruebas afectadas.
- [x] Documentar todos los bloqueos restantes en docs/DEPLOYMENT-READINESS-2026-11-15.md.
- [ ] Despliegue completo: pendiente de firma oficial, acceso y comprobación real de servicios.
