# TAMV Agent Orchestration — contrato v1

Este documento describe el motor de orquestación de agentes que **sí** existe
en el repositorio y lo que **no** existe. No hay LLM en el circuito: la
ejecución es determinista, local y acotada. Declarar un "agente autónomo con
IA" aquí sería una afirmación falsa.

## 1. Qué está implementado

| Pieza | Ruta | Estado |
|---|---|---|
| Contrato de plan | `tamv-genesis/src/agent/contracts.ts` | Validación estricta: campos desconocidos rechazados, consentimiento obligatorio, 1..8 pasos, ids únicos, herramientas de la lista cerrada. Probado. |
| Motor de ejecución | `tamv-genesis/src/agent/engine.ts` | Ejecuta paso a paso, se detiene al primer fallo, observa cancelación entre pasos, audita cada paso y niega efectos externos por defecto. Probado. |
| Herramientas locales | `tamv-genesis/src/agent/engine.ts` | `digest.sha256` (SHA-256 de texto acotado) y `audio.render` (pipeline de audio local con DSP medido; devuelve referencia de artefacto, nunca bytes crudos). |
| Ruta HTTP | `src/routes/api.agent.ts` + `src/lib/agent-orchestration.server.ts` | POST autenticado, certificado y con cuota por actor que ejecuta el plan en proceso. |
| Pruebas del motor | `tamv-genesis/tests/agent-orchestration.test.ts` | 10 pruebas: vector SHA-256 publicado, determinismo, límites, consentimiento, herramienta desconocida, fallo que detiene el plan, cancelación, efectos denegados por defecto, auditoría por paso. |
| Pruebas de la ruta | `src/test/agent-orchestration.test.ts` | 16 pruebas: compuertas, límites por paso, ejecución real medida, determinismo, revocación de certificación a mitad de plan, cuotas 429/503. |
| Registro de cierre | `tamv-genesis/v3/closure.json` | Módulo `agent.orchestration.local` = `closed`. |

## 2. Qué no está implementado

- No hay modelo de lenguaje ni toma de decisiones autónoma: el plan lo escribe
  el llamante y el motor solo lo ejecuta. `disclosure.llm` es `false`.
- No hay herramientas con efectos externos (red, escritura fuera del proceso,
  despliegues). El registro local declara `effects: []`; cualquier herramienta
  que declare un efecto externo se deniega salvo autorización explícita por el
  puerto `effects.authorize`, y el valor por defecto es denegar.
- No hay memoria persistente, ni cola durable, ni daemon: cada petición crea
  su pipeline en memoria y lo ejecuta en proceso.
- `agent.orchestration` **no** es una capacidad declarada en `v3/pack.json`
  (sellado e ineditable). Por eso el módulo de cierre usa `capabilities: []` y
  se ancla a la skill pública `tamv-sovereign-platform`.

## 3. Contrato del plan

```json
{
  "schema": "tamv.agent.plan.v1",
  "requestId": "agent-2026-0001",
  "consent": { "granted": true, "subject": "creator-01", "scope": "agent.orchestration" },
  "steps": [
    { "id": "hash", "tool": "digest.sha256", "input": { "text": "abc" } },
    { "id": "bed", "tool": "audio.render", "input": { "schema": "tamv.audio.request.v1", "mode": "instrumental", "prompt": "Cama instrumental cálida, sin voces.", "durationSeconds": 5, "sampleRate": 44100, "format": "wav", "rights": { "license": "original", "attestationId": "rights-2026-0001" }, "consent": { "granted": true, "subject": "creator-01", "scope": "audio.production" }, "metadata": { "title": "Agent bed", "language": "es-MX" } } }
  ]
}
```

Reglas duras:

- `consent.granted === true` es obligatorio; sin él, 403
  `TAMV_AGENT_CONSENT_REQUIRED`.
- Máximo 8 pasos (`TAMV_AGENT_LIMIT`), ids únicos de 1..40 caracteres.
- Solo `audio.render` y `digest.sha256`; otra herramienta → 501
  `TAMV_AGENT_TOOL_UNKNOWN`.
- Cada `input` se valida en el momento de validar el plan, no a mitad de la
  ejecución: `digest.sha256` acepta exactamente `{ text }` (1..8000
  caracteres); `audio.render` acepta el contrato completo de audio.
- El resultado del motor no lleva marcas de tiempo. El artefacto de audio sí
  registra su `createdAt` real; lo que es determinista entre ejecuciones son
  los bytes del WAV, su SHA-256, el análisis DSP y las salidas de digest.

## 4. Ruta HTTP `POST /api/agent`

Implementada en `src/lib/agent-orchestration.server.ts`. La ruta
`src/routes/api.agent.ts` está protegida por certificación TAMV: tras editarla
hay que regenerar hashes con `npm run tamv:hash` y el propietario debe firmar
el release.

Orden de compuertas, todas fail-closed:

1. Certificación TAMV de la feature `agent.orchestration` (403 sin sello
   firmado o sin la feature en `license.features`).
2. `Content-Type: application/json` (415 si no).
3. Cuerpo acotado a 32 KiB (413/400).
4. Autenticación Supabase (401), reutilizando `supabaseAuthenticate` de
   audiocore; el actor se deriva con salt y nunca se expone el id crudo.
5. Cuota distribuida por actor (`checkCapabilityQuota` sobre
   `agent.orchestration`): 429 con `Retry-After`, 503 fail-closed sin backend
   Redis fuera de desarrollo local. Concurrencia por proceso: 503
   `TAMV_AGENT_BUSY`.
6. `validateAgentPlan`: campos desconocidos → 400, consentimiento → 403,
   límites → 400, herramienta desconocida → 501.
7. Límites por paso de `audio.render`: `durationSeconds ≤ 30` (400
   `TAMV_AGENT_AUDIO_DURATION_LIMIT`) y solo WAV (FLAC → 501).
8. Ejecución con `AbortSignal.timeout(60000)`; cada paso de audio recertifica
   la feature antes de encolar.

Respuesta 200 (`tamv.agent.orchestration.response.v1`): `result`
(`tamv.agent.result.v1`: estado, `requestId`, pasos con salidas medidas),
`disclosure` (`llm: false`, `externalEffects: false`, herramientas, `actorRef`,
`quota.source`, `quota.remainingToday`) y `limits`. Un plan fallido devuelve
502 con el código del primer paso fallido; un plan cancelado o expirado
devuelve 503 `TAMV_AGENT_CANCELLED` sin reclamar resultado.

`license.features` en `tamv-attribution.json` incluye ahora
`agent.orchestration`; la ruta permanece fail-closed hasta que el propietario
firme el release con esa lista.

Estados prohibidos en este repositorio: `completed`, `operational`, `24/7
running` o métricas inventadas. Si no se midió, se declara `null`.