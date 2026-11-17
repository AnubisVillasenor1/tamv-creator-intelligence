# Superficie API, autenticación y contratos de error

**Revisión incremental del código:** 2026-11-17 (workspace, estudio y webhooks); el commit base siguiente identifica la auditoría histórica, no esta entrega.
**Repositorio:** `AnubisVillasenor1/tamv-creator-intelligence`  
**Commit base de la auditoría profunda:** `e3c13d7ab06e203dadd42e054cccbbca3c4641c1`  
**Naturaleza:** inventario derivado de las rutas actuales. No representa un OpenAPI certificado ni una prueba de disponibilidad del proveedor o de producción.

## 1. Reglas de lectura

Esta aplicación utiliza TanStack Start con enrutamiento por archivos. Algunas capacidades se exponen como handlers HTTP, mientras que la revisión creativa es una **server function** de TanStack y no debe tratarse como un endpoint REST estable inventado.

Diferencias obligatorias:
- **HTTP 200** significa que la petición de diagnóstico respondió; el cuerpo puede informar `blocked`, `certified: false` o checks fallidos.
- **HTTP 202** significa que una intención de gobernanza fue registrada; no significa aprobación, despliegue ni ejecución.
- **HTTP 501** identifica una capacidad sin ejecutor/gateway cuando las verificaciones previas de certificación/licencia permiten llegar a ese punto.
- **Un catálogo o ruta publicada no prueba** que exista modelo, worker, persistencia durable o proveedor operativo.
- Las respuestas descritas se derivan del código. No equivalen a una prueba de aceptación contra el entorno remoto.

## 2. Inventario de endpoints HTTP

| Método y ruta | Implementación | Autenticación visible en ruta | Respuesta normal / comportamiento actual | Límite esencial |
|---|---|---|---|---|
| `GET /api/tamv/status` | [api.tamv.status.ts](../src/routes/api.tamv.status.ts) | No se exige en el handler | HTTP 200 con estado de certificación, `certified`, `premiumFeaturesEnabled`, motivo y hora de comprobación | Es un informe de certificación, no una certificación independiente. No-store. |
| `GET /api/tamv/genesis` | [api.tamv.genesis.ts](../src/routes/api.tamv.genesis.ts) | No se exige en el handler | HTTP 200 con la instantánea `GENESIS`: versión, claims, scorecard, capacidades, work ledger, conocimiento y checks | El handler serializa un bundle importado; no demuestra inferencia, ni que cada claim sea cierto. Tratar todos los campos como públicos. No-store. |
| `GET /api/tamv/hypercore/audit` | [api.tamv.hypercore.audit.ts](../src/routes/api.tamv.hypercore.audit.ts) | No se exige en el handler | HTTP 200 con status `certified` o `blocked`, checks, políticas, resultados de cores, duración y procedencia | Es un endpoint de diagnóstico. No escribe ni valida por sí solo el ledger durable. La procedencia está codificada como `not-integrated` y `verified: false`; el resultado de transporte 200 no significa que la certificación pase. |
| `GET /api/tamv/hypercore/metrics` | [api.tamv.hypercore.metrics.ts](../src/routes/api.tamv.hypercore.metrics.ts) | Bearer token server-side | HTTP 200 en texto Prometheus cuando el token es válido | Sin token fuerte configurado responde 503; token ausente/inválido responde 401. No-store. Sin agregación externa demostrada. |
| `GET /api/governance/receipts?receiptId=…` | [api.governance.receipts.ts](../src/routes/api.governance.receipts.ts) | Bearer token validado con Supabase Auth | HTTP 200 con recibo del actor autenticado | El recibo de otro actor se oculta como 404. Necesita configuración y persistencia disponibles. |
| `POST /api/governance/receipts` | [api.governance.receipts.ts](../src/routes/api.governance.receipts.ts) | Bearer token validado con Supabase Auth | HTTP 202 con `executionStarted: false` y `humanApprovalRequired: true` cuando la intención se persiste o se resuelve idempotentemente | Registra una intención; no aprueba ni ejecuta `install`, `resume`, `update`, `redeploy` o `rollback`. |
| `POST /api/generation` | [api.generation.ts](../src/routes/api.generation.ts) | El handler no contiene autenticación propia; aplica el gate de certificación/licencia | En el estado de release no certificado, se espera 403 por integridad/certificación; con certificación válida y gateway ausente, 501 | No es un motor de generación operativo en esta versión. |
| `POST /api/voice/generate` | [api.voice.generate.ts](../src/routes/api.voice.generate.ts) | El handler no contiene autenticación propia; aplica el gate de certificación/licencia | 403 si falla certificación/licencia; 501 si la capacidad pasa los gates pero sigue sin gateway | No se ha conectado un ejecutor de generación de voz. |
| `POST /api/audiocore/advanced` | [api.audiocore.advanced.ts](../src/routes/api.audiocore.advanced.ts) | Bearer token validado con Supabase Auth, cuota distribuida por actor y gate de certificación/licencia | 403 sin certificación firmada; certificada, ejecuta el pipeline en proceso y devuelve 200 con WAV medido (síntesis procedural local, no neuronal); 429 con `Retry-After` al agotar cuota; 503 fail-closed sin backend de cuota fuera de desarrollo local | No hay worker persistente ni cola durable. Contrato completo en [orquestación de audio](AUDIO-ORCHESTRATION.md). |
| `POST /api/agent` | [api.agent.ts](../src/routes/api.agent.ts) | Bearer token validado con Supabase Auth, cuota distribuida por actor y gate de certificación/licencia | 403 sin certificación firmada; certificado, ejecuta el plan local determinista y devuelve 200 con salidas medidas; 502 si un paso falla; 503 si el plan se cancela o expira | Sin LLM ni efectos externos; no es un agente autónomo. Contrato completo en [orquestación de agentes](AGENT-ORCHESTRATION.md). |
| `GET /api/studio/metrics` | [api.studio.metrics.ts](../src/routes/api.studio.metrics.ts) | Bearer de operador `TAMV_METRICS_BEARER_TOKEN` y certificación audiocore | Texto Prometheus de eventos observados; 503 sin configuración, 401 sin token válido, 403 sin certificación | Registro compartido entre audio/agente en una instancia, no agregado. [Guía](WORKSPACE-AND-STUDIO.md). |
| `GET/POST /api/webhooks/{provider}` | [api.webhooks.$provider.ts](../src/routes/api.webhooks.$provider.ts) | Protocolo nativo del proveedor; secretos solo servidor | GET desafío si aplica; POST 200 solo después de acuse exacto del relay; Longe 501 | Cuerpo 256 KiB, concurrencia local 8, relay explícito HTTPS firmado, sin publicaciones. [Contrato completo](SOCIAL-WEBHOOKS.md). |

Las rutas de capacidad aún no implementada (`/api/generation`, `/api/voice/generate`) llaman a `unavailableTamvCapabilityResponse` en [tamv-certification.ts](../src/lib/tamv-certification.ts). Ese helper deniega con 403 si la distribución no está certificada o la capacidad no está incluida en la licencia, y solo entonces devuelve 501 para indicar que el gateway sigue sin estar conectado. Las rutas de audiocore y agente aplican el mismo gate a través de su cierre `certify` y, cuando la certificación pasa, ejecutan capacidades locales reales en proceso. **No se debe interpretar el 501 condicional como prueba de que la certificación ya se obtuvo.**

### Endpoints de diagnóstico

`/api/tamv/status`, `/api/tamv/genesis` y `/api/tamv/hypercore/audit` no exigen autenticación en sus handlers actuales. Por tanto:
- No deben incluir secretos, tokens, prompts, cuerpos privados o datos personales innecesarios.
- La instantánea Genesis y los detalles de policy/checks deben tratarse como información pública.
- La respuesta de auditoría es un informe calculado. Sus probes de concurrencia ejecutan tareas sintéticas; el código advierte que no son una prueba de carga ni demuestran despliegue BullMQ.
- La propiedad `provenance` del endpoint de auditoría dice explícitamente `status: not-integrated`, `verified: false`; esto no debe cambiarse en documentación/promoción sin implementar un verificador confiable.

## 3. Revisión creativa asistida por IA

La interfaz consume `reviewContent` mediante `useServerFn`, definido en [content.functions.ts](../src/lib/content.functions.ts). Se trata de una función de servidor TanStack con método POST, no de una ruta REST pública cuyo path deba adivinarse.

### Orden de controles que implementa el código

1. Exigir `Authorization: Bearer …` y validar la sesión a través del middleware Supabase.
2. Validar los datos con `contentSchema`, incluido consentimiento explícito.
3. Exigir certificación/licencia de la capacidad `creator.review`.
4. Aplicar `authorizeGovernedCapability`.
5. Reservar capacidad local de concurrencia.
6. Comprobar cuota distribuida con `checkDistributedReviewQuota` antes del gateway.
7. Invocar el gateway server-side con timeout, esquema de salida estricto y límites configurados.
8. Validar la respuesta contra `reviewSchema` y devolver resultado/metadatos al cliente.

### Respuestas y estados relevantes

| Condición | Comportamiento derivado del código | Observación |
|---|---|---|
| No hay Bearer token o sesión | Error HTTP 401 con `TAMV_AUTH_REQUIRED` | Se conserva el borrador en la interfaz. |
| Gobernanza deniega la capacidad | HTTP 403 con `TAMV_GOVERNANCE_DENIED` | Revisar el código de razón; no reintentar como si fuera una falla transitoria. |
| Límite de concurrencia local | HTTP 503 y `Retry-After: 5` | Es un control local al proceso, no un límite global. |
| Cuota agotada | HTTP 429 con `Retry-After` | Puede ser límite de frecuencia o límite diario. |
| Redis/configuración de cuota no disponible | HTTP 503 con `Retry-After` | En producción el gate debe fallar cerrado. |
| Tiempo de espera del modelo | El código devuelve un resultado de error en la función y mantiene el slot ocupado hasta que el trabajo subyacente se asienta | No se debe enviar de nuevo automáticamente como si el primer intento no hubiera ocurrido. |
| Error del gateway o salida inválida | Resultado de revisión con `ok: false` y mensaje no sensible | No prueba que se haya producido una revisión exitosa. |

La interfaz también contempla algunos códigos de error a nivel de transporte; la implementación del handler transforma varios errores del gateway en un envelope `{ ok: false, error }`. Para clientes nuevos, usar el contrato y los tipos presentes en el código del servidor, no asumir que todos los errores del proveedor se convertirán en HTTP 402.

### Datos que no persiste esta función

El estado de revisión y el borrador viven en estado React de la sesión; el resultado devuelto incluye metadatos de auditoría, como `runId`, hash del borrador, modelo, timestamp y decisión de gobernanza. Ese objeto de respuesta **no demuestra una escritura de auditoría durable**. No equivale a publicación, almacenamiento permanente ni ejecución automática de otras skills.

## 4. Contrato de recibos de gobernanza

Ruta: `/api/governance/receipts`; implementación en [api.governance.receipts.ts](../src/routes/api.governance.receipts.ts), store en [governance-receipt-store.server.ts](../src/lib/hypercore-turbo/governance-receipt-store.server.ts).

### Configuración server-side

- `SUPABASE_URL`: URL del proyecto.
- `SUPABASE_PUBLISHABLE_KEY`: clave usada para validar la sesión mediante Supabase Auth.
- `SUPABASE_SERVICE_ROLE_KEY`: usada por el store PostgREST; solo servidor.
- `TAMV_GOVERNANCE_ACTOR_SALT`: secreto de al menos 32 caracteres, estable por entorno, para derivar una referencia seudónima de actor.

Los secretos no se exponen a `VITE_*`, al cliente, a commits ni a logs. El esquema y sus permisos son administrados por Lovable; consultar [GOVERNANCE-RECEIPTS-OPERATIONS.md](GOVERNANCE-RECEIPTS-OPERATIONS.md). La presencia de variables no prueba que la tabla exista.

### Reglas de solicitud

- Cuerpo JSON de máximo 16 KiB.
- `Content-Type: application/json`.
- `Idempotency-Key` obligatoria, con identificador de 8–128 caracteres según el patrón del código.
- `operation`: solo `install`, `resume`, `update`, `redeploy` o `rollback`.
- `targetRef`: identificador válido; `sourceCommitSha`: 40 caracteres hexadecimales; `artifactSha256`: 64 caracteres hexadecimales.
- La referencia de actor se deriva del usuario autenticado y del salt server-side; no se acepta como autoridad desde el cuerpo cliente.
- Reutilizar la misma clave idempotente con una operación distinta debe producir conflicto.

### Códigos de respuesta

| HTTP | Significado |
|---|---|
| 200 | Consulta de un recibo del actor autenticado |
| 202 | Intención registrada/idempotente, sin inicio de ejecución |
| 400 | JSON, campos, clave idempotente o política inválidos |
| 401 | Falta token, token rechazado o identidad inválida |
| 404 | Recibo no existe o pertenece a otro actor |
| 409 | Conflicto de idempotencia o estado |
| 413 | Cuerpo o longitud declarada supera el límite |
| 415 | Tipo de contenido no permitido |
| 503 | Falta configuración, identidad/backend no disponible o policy inválida |

El endpoint no incluye una ruta pública de aprobación administrativa, no ejecuta las operaciones solicitadas y no marca éxito. El factory de store recibe un verificador de éxito que retorna `false` en esta ruta; una transición a `succeeded` requiere un verificador independiente conectado por un llamador de confianza.

## 5. Métricas operativas

`GET /api/tamv/hypercore/metrics` utiliza [metrics-auth.ts](../src/lib/hypercore-turbo/metrics-auth.ts):
- `TAMV_METRICS_TOKEN` debe tener entre 32 y 4096 caracteres y no contener espacios.
- Token ausente o débil: HTTP 503, `TAMV_METRICS_AUTH_UNAVAILABLE`.
- Bearer ausente o inválido: HTTP 401, `TAMV_METRICS_UNAUTHORIZED`.
- Token correcto: texto Prometheus `text/plain; version=0.0.4`.
- No-store y `nosniff` en headers.

La ruta exporta métricas del proceso. La agregación externa, la retención, las alertas y el monitoreo multi-instancia no deben anunciarse como implementados sin configuración y evidencia por separado.

## 6. Procedencia de la descripción

El inventario se verificó contra el árbol del repositorio y sus implementaciones en el commit base anotado arriba. Algunas rutas (por ejemplo, las que usan `unavailableTamvCapabilityResponse`) dependen del estado de certificación y del manifiesto: los códigos pueden cambiar cuando se integren firma y gateways, y esta tabla debe revisarse en cada cambio de ruta, middleware, modelo de respuesta o esquema de base de datos.

Archivos de implementación contrastados: `src/routes/api.tamv.status.ts`, `api.tamv.genesis.ts`, `api.tamv.hypercore.audit.ts`, `api.tamv.hypercore.metrics.ts`, `api.governance.receipts.ts`, `api.generation.ts`, `api.voice.generate.ts`, `api.audiocore.advanced.ts`, `api.agent.ts`, `src/lib/content.functions.ts`, `src/lib/tamv-certification.ts` y `src/lib/hypercore-turbo/metrics-auth.ts`.
