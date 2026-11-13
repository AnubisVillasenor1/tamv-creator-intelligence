# Auditoría técnica y plan de remediación — TAMV Creator Intelligence

**Fecha:** 2026-11-13  
**Repositorio:** AnubisVillasenor1/tamv-creator-intelligence  
**Baseline revisado:** rama main, commit 9e4ff4ad78d0db89d038dad7f879a8b40bb073de, más el ZIP entregado por el responsable.  
**Alcance:** estructura del repositorio, rutas, función de revisión IA, autenticación Supabase, certificación, scripts, paquete de skills, CI y la nueva capa Hyper-Core Ω.  
**Limitación:** no se dispuso de credenciales del entorno de producción, telemetría real, acceso a la base desplegada ni pruebas de carga contra proveedores. Los puntos que dependen de esos recursos se declaran pendientes, no como fallos observados en producción.

## Dictamen ejecutivo

El proyecto tiene controles de integridad útiles y un flujo de revisión creativa real en el código, pero **no debe declararse 100 % productivo ni altamente disponible**. La distribución del baseline no está firmada; cuatro endpoints son guardas de capacidad no conectadas; la función de revisión no aplica explícitamente el middleware de autenticación del usuario; el esquema Drizzle está vacío; y no existe evidencia de un ledger durable, un standby restaurable, un proveedor frío conectado ni métricas de carga.

La rama de mejora agrega un orquestador Hyper-Core Ω y pruebas unitarias para sus contratos. La implementación define tres núcleos lógicos —gobernanza, ejecución y verificación— y permite failover hot/cold condicionado por errores reintentables e idempotencia. Los puertos de auditoría y standby son obligatorios y fallan cerrados. **Todavía son puertos inyectables, no adaptadores productivos conectados**; no debe confundirse la abstracción probada con un clúster desplegado.

## Hallazgos priorizados

### H0 — Bloqueo de release: distribución sin firma oficial

**Evidencia:** `tamv-attribution.sig` contiene `UNSIGNED_RELEASE_PENDING`; el README y el runtime describen `signature-missing` como estado esperado.  
**Impacto:** la certificación falla cerrada y las capacidades protegidas quedan bloqueadas.  
**Acción requerida:** custodiar una clave privada Ed25519 oficial en un gestor de secretos, verificar que la clave pública desplegada corresponda, actualizar hashes de los archivos cubiertos, firmar el manifest en un entorno controlado y ejecutar `bun run tamv:verify`. No fabricar ni incluir claves privadas en Git.

### H1 — Capacidades anunciadas, pero no conectadas

**Evidencia:** `src/routes/api.generation.ts`, `src/routes/api.voice.generate.ts`, `src/routes/api.audiocore.advanced.ts` y `src/routes/api.agent.ts` delegan en `unavailableTamvCapabilityResponse`.  
**Impacto:** generación musical, generación de voz, AudioCore avanzado y ejecución de agente no están operativos a través de esas rutas. La respuesta 501 en distribución certificada es honesta y preferible a simular resultados.  
**Acción requerida:** conectar y probar cada adaptador por separado; no habilitarlo en el manifest de licencias hasta completar sus pruebas de autorización, validación, cuotas, seguridad, coste y observabilidad.

### H1 — La revisión creativa no aplica explícitamente autenticación obligatoria

**Evidencia:** existe `requireSupabaseAuth` en `src/integrations/supabase/auth-middleware.ts`, y `src/start.ts` adjunta el token de sesión del cliente; sin embargo, `src/lib/content.functions.ts` no encadena explícitamente `requireSupabaseAuth` a `reviewContent`. Adjuntar un token no equivale a verificarlo ni a denegar solicitudes anónimas.  
**Impacto:** la política efectiva de acceso depende de controles que no están conectados en esta función. Puede habilitar abuso de proveedor o consumo de créditos si el endpoint se invoca sin sesión válida.  
**Acción requerida:** decidir el modelo de acceso (solo usuarios autenticados o cuota anónima explícita), aplicar middleware servidor, verificar identidad y permisos en servidor, probar solicitudes sin token/token inválido/token válido y no confiar en datos de usuario enviados por el cliente. Coordinar el cambio con el onboarding para no romper el flujo de producto.

### H1 — Sin límites de consumo visibles en el flujo de revisión

**Evidencia:** la función valida tamaños de entrada con Zod y registra run ID/hash, pero no se observa limitación distribuida por usuario/tenant, cuota de tokens, presupuesto, semáforo de concurrencia, circuit breaker ni timeout propio de la operación.  
**Impacto:** un usuario o automatización puede aumentar coste, latencia y saturación; el manejo de errores no sustituye un sistema de cuotas.  
**Acción requerida:** aplicar rate limit distribuido, cuota por identidad, presupuesto de tokens/coste, concurrencia acotada, timeout, retry budget y circuit breaker. Reintentar solo errores transitorios y únicamente operaciones idempotentes.

### H1 — Hyper-Core Ω aún no está conectado al camino de ejecución de la aplicación

**Evidencia:** `src/lib/hyper-core-orchestrator.ts` define puertos y política de ejecución; los adaptadores y la función actual de revisión no lo invocan.  
**Impacto:** la nueva capa no cambia todavía el comportamiento real del endpoint de revisión.  
**Acción requerida:** implementar adaptadores servidor durables para auditoría y standby, integrar el orquestador en el flujo de revisión, configurar un proveedor frío independiente y mantenerlo deshabilitado hasta que sus secretos y pruebas estén listos. La rama actual es una base comprobable, no la declaración de que el sistema ya usa tres núcleos en producción.

### H1 — No hay evidencia de respaldo restaurable o recuperación ante desastre

**Evidencia:** `drizzle/schema.ts` está intencionalmente vacío; no se encontró un esquema de aplicación que sustente un ledger Hyper-Core o checkpoints durables. Los tests del orquestador usan adaptadores simulados.  
**Impacto:** no se puede afirmar recuperación tras caída de proceso/región ni ausencia de pérdida de datos. Un checkpoint en memoria no sería suficiente.  
**Acción requerida:** definir persistencia duradera con permisos mínimos, cifrado, retención, exportación, idempotencia, restauración ensayada y separación de dominio de fallo. Mantener el payload creativo fuera del ledger salvo consentimiento explícito y política de retención.

### H2 — Falta un proveedor frío independiente y probado

**Evidencia:** la revisión actual llama a un único AI Gateway; no hay configuración de un segundo proveedor en el flujo.  
**Impacto:** el failover de proveedor no existe hoy. Un segundo nombre de pipeline sin credenciales, contrato y pruebas no es redundancia.  
**Acción requerida:** conectar un adaptador alternativo con esquemas compatibles, límites de coste, política de privacidad equivalente, timeout y pruebas de fallo. Confirmar compatibilidad de salida antes de habilitarlo.

### H2 — Falta instrumentación de rendimiento y saturación

**Evidencia:** la auditoría de revisión visible guarda run ID, hash, modelo y timestamp; no se identifican métricas operativas completas de latencia, cola, coste, fallos, fallback ni saturación.  
**Impacto:** no hay base para fijar SLO ni demostrar mejoras de velocidad.  
**Acción requerida:** instrumentar OpenTelemetry o equivalente y medir p50/p95/p99, tiempo de cola, tasa de éxito, tasa de fallback, errores de auditoría, edad del último checkpoint, concurrencia y coste por tarea exitosa.

### H2 — Riesgo de correlación incorrecta en captura global de errores

**Evidencia:** `src/lib/error-capture.ts` conserva una sola referencia global al último error con una ventana TTL de 5 segundos.  
**Impacto:** ante solicitudes concurrentes, el error que consume el wrapper SSR puede no corresponder a la solicitud que originó la respuesta, dificultando diagnóstico y auditoría.  
**Acción requerida:** asociar errores a un contexto/request ID por petición, evitar estado global mutable compartido y agregar pruebas concurrentes.

### H2 — Cobertura de CI sin umbral de rendimiento ni auditoría de dependencias explícita

**Evidencia:** el workflow ejecuta higiene, hashes, validación del pack, ShellCheck, lint, pruebas y build; no se observa un job dedicado a auditoría de dependencias/SBOM ni pruebas de carga/failover. Las acciones de terceros se referencian por tags mayores.  
**Impacto:** los checks actuales validan calidad básica, pero no acreditan seguridad de cadena de suministro ni rendimiento bajo estrés.  
**Acción requerida:** incorporar auditoría de dependencias y SBOM, revisar advisories, considerar pinning de acciones a SHA, ejecutar pruebas de integración y fallos controlados, y mantener una política de actualización de dependencias.

### H3 — Catálogo de skills no equivale a 37 ejecutores autónomos

**Evidencia:** `src/lib/skill-registry.ts` representa metadatos del catálogo y sus dependencias.  
**Impacto:** mostrar una skill en la interfaz no demuestra que exista un runtime independiente que la ejecute.  
**Acción requerida:** mantener un registro explícito de estado por skill: declarada, validada, conectada, probada y habilitada. No presentar las 37 como servicios operativos si solo algunas se invocan desde código.

## Cambios introducidos en la rama Hyper-Core

- Nuevo `src/lib/hyper-core-orchestrator.ts`: contratos hexagonales para gobernanza, ejecución, verificación, auditoría y standby.
- Failover cold solo ante error marcado como reintentable, con adaptador frío presente y solicitud idempotente.
- Auditoría y checkpoint obligatorios; una falla de esos puertos detiene la operación.
- Nuevo `src/test/hyper-core-orchestrator.test.ts`: pruebas de autorización denegada, camino hot, failover controlado, protección de operaciones no idempotentes, salida inválida, ledger no disponible, standby no disponible y hash inválido.
- Nuevo `docs/HYPER-CORE-OMEGA.md`: arquitectura, límites, controles y criterios de producción.

## Diseño de los tres núcleos y doble pipeline

| Componente | Responsabilidad | Control crítico |
|---|---|---|
| Governance Core | Autorizar antes de ejecutar | Denegación terminal |
| Execution Core / Hot | Camino primario | Timeouts y límites del adaptador |
| Execution Core / Cold | Recuperación ante fallo transitorio | Solo idempotente y con error reintentable |
| Verification Core | Validar el resultado | No retornar salida inválida |
| Audit Port | Evidencia de eventos | Append durable; fail-closed |
| Standby Port | Checkpoints de recuperación | Confirmación durable antes de avanzar |

Los tres núcleos son responsabilidades lógicas en la versión actual. Para independencia real deben desplegarse en procesos/servicios y dominios de fallo distintos. El pipeline cold debe usar proveedor/recursos independientes para cubrir fallos del primario. El standby debe estar respaldado por almacenamiento duradero y restauraciones ensayadas.

## Plan de remediación recomendado

### P0 — antes de declarar un release certificado
- [ ] Custodiar y verificar la clave oficial Ed25519.
- [ ] Actualizar los hashes cubiertos y firmar el manifest.
- [ ] Ejecutar `bun run tamv:verify` y verificar el endpoint de estado del despliegue.
- [ ] No habilitar funciones protegidas mientras el runtime informe una certificación distinta de `certified`.

### P1 — antes de exponer el servicio a usuarios reales
- [ ] Aplicar autenticación y autorización servidor explícitas a revisión creativa.
- [ ] Definir cuota, rate limit distribuido, timeout y presupuesto por usuario/tenant.
- [ ] Conectar auditoría y standby durables, aplicar migraciones y probar restauración.
- [ ] Integrar Hyper-Core al camino real de revisión.
- [ ] Conectar el proveedor frío y probar compatibilidad de salida.
- [ ] Mantener bloqueadas las capacidades que sigan en 501.

### P2 — antes de declarar alta disponibilidad o alto rendimiento
- [ ] Ejecutar pruebas de carga escalonadas y de estrés con límites acordados.
- [ ] Simular caída del hot, cold, ledger, standby y proceso servidor.
- [ ] Medir p50/p95/p99, throughput, error rate, coste y tiempo de recuperación.
- [ ] Añadir trazas por petición, métricas y alertas de saturación.
- [ ] Realizar análisis de dependencias, SBOM y revisión de cadena de suministro.

## Criterio de aceptación

El proyecto solo puede declararse listo para producción cuando: la certificación sea válida; la autenticación y cuotas estén probadas; cada capacidad habilitada tenga un adaptador real; la auditoría y el standby sean durables; el failover y la restauración pasen pruebas; CI esté verde; y los SLO estén respaldados por mediciones repetibles. Un build exitoso o una prueba unitaria no bastan por sí solos.

## Referencias internas

- `src/lib/content.functions.ts`
- `src/integrations/supabase/auth-middleware.ts`
- `src/start.ts`
- `src/routes/api.generation.ts`
- `src/routes/api.voice.generate.ts`
- `src/routes/api.audiocore.advanced.ts`
- `src/routes/api.agent.ts`
- `src/lib/tamv-certification.ts`
- `src/lib/error-capture.ts`
- `drizzle/schema.ts`
- `.github/workflows/validate-pack.yml`
