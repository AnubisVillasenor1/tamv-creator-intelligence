# TAMV Audio Orchestration — contrato v1

Este documento describe lo que **sí** existe en el repositorio para audio y lo
que **no** existe todavía. La propuesta de infraestructura con Drizzle/Postgres,
BullMQ/Redis, MinIO y Docker Compose no se importó como dependencia: el proyecto
prohíbe editar `supabase/migrations/` y `drizzle/` fuera de Lovable, y declarar
un worker o una base de datos que no están desplegados sería una afirmación
falsa.

## 1. Qué está implementado

| Pieza | Ruta | Estado |
|---|---|---|
| Validación estricta de peticiones | `tamv-genesis/src/audio/contracts.ts` | Implementada y probada. |
| Gateway de orquestación | `tamv-genesis/src/audio/gateway.ts` | Implementado y probado con puertos inyectados. |
| Ciclo de vida, worker y reintentos | `tamv-genesis/src/audio/{lifecycle,worker}.ts` | Implementados y probados en proceso. |
| Métricas Prometheus | `tamv-genesis/src/audio/metrics.ts` | Implementadas y probadas sin dependencias. |
| Normalización DSP honesta | `tamv-genesis/src/audio/contracts.ts` | Implementada y probada. |
| Códec WAV PCM16 | `tamv-genesis/src/audio/wav.ts` | Parser estricto (RIFF, PCM 16-bit, mono/estéreo, 44.1/48 kHz) y codificador mono. Probado. |
| Síntesis procedural local | `tamv-genesis/src/audio/local-synth.ts` | Proveedor determinista sembrado por SHA-256 de la petición; WAV hasta 60 s; FLAC falla cerrado. No es un modelo neuronal. |
| DSP local real | `tamv-genesis/src/audio/local-dsp.ts` | LUFS integrado ITU-R BS.1770-4 (K-weighting, compuertas −70/−10), true peak de muestra y chroma FFT de 12 clases. Probado con vectores físicos conocidos. |
| Ruta HTTP | `src/routes/api.audiocore.advanced.ts` + `src/lib/audiocore-advanced.server.ts` | POST autenticado y certificado que ejecuta el pipeline completo en proceso y devuelve el WAV medido. |
| Pruebas | `tamv-genesis/tests/audio-gateway.test.ts` | 11 pruebas locales. |
| Pruebas del pipeline | `tamv-genesis/tests/audio-pipeline.test.ts` | 12 pruebas locales. |
| Pruebas DSP/síntesis | `tamv-genesis/tests/audio-local-dsp.test.ts` | 10 pruebas: determinismo, vectores de loudness (−6.0206 dBFS, ±3.0103 LU), chroma por clase de altura, silencio → `null`, pipeline extremo a extremo. |
| Pruebas de la ruta | `src/test/audiocore-advanced.test.ts` | 15 pruebas: certificación, auth, límites de cuerpo/duración, campos desconocidos, consentimiento, FLAC 501, WAV determinista byte a byte y cuotas distribuidas (429 con `Retry-After`, tope diario, fail-closed 503, etiqueta `local-development`, decisión malformada). |
| Registro de cierre | `tamv-genesis/v3/closure.json` | Módulos `audio.gateway.contract` y `audio.pipeline.contract` = `contract`. |

La referencia completa del pipeline está en
[`docs/AUDIO-PIPELINE.md`](AUDIO-PIPELINE.md).

Lo que el gateway hace, en orden:

1. Valida el esquema completo y **rechaza campos desconocidos** en la petición,
   los derechos, el consentimiento y los metadatos.
2. Exige `rights.license` de la lista permitida y un `rights.attestationId`.
3. Exige `consent.granted === true`. Sin consentimiento no se encola nada.
4. Pide autorización al puerto de certificación, normalmente conectado a
   `requireCapability()` del sello v3. Sin sello firmado, la autorización falla.
5. Encola un trabajo y devuelve `status: "queued"`. **Nunca** devuelve
   `completed`; la generación no ocurrió en este proceso.
6. Registra un evento de auditoría sin guardar el prompt completo.

## 2. Qué no está implementado

- No hay proveedor de generación **neuronal** conectado. El proveedor local es
  síntesis procedural determinista (`tamv-local-procedural-synth`): genera WAV
  real a partir de la petición, pero no es música generada por un modelo, no
  produce voces y no debe presentarse como tal. La respuesta HTTP lo declara en
  `disclosure`.
- No hay worker persistente ni daemon; existe un worker in-process invocado por
  `runOnce()`/`runUntilIdle()`, sin Redis ni BullMQ.
- No hay cola durable: el adaptador por defecto vive en memoria.
- No hay tablas Drizzle/Postgres nuevas ni migraciones.
- No hay bucket MinIO ni almacenamiento duradero de audio; la ruta usa
  almacenamiento en memoria por petición.
- No hay Docker Compose de audio.
- El DSP local mide sobre PCM de muestra: el true peak es de muestra, no
  inter-muestra (sin sobre-muestreo 4×). Se declara como tal en las notas.

El gateway devuelve `null` cuando el proveedor no entrega una métrica. Un
`truePeakDb` ausente **no** se sustituye por una estimación. Si no hay puerto de
análisis, `analyze()` lanza `TAMV_AUDIO_PROVIDER_UNAVAILABLE` en lugar de
inventar un resultado.

## 3. Puertos inyectados

```ts
type AudioGatewayPorts = {
  certification: { requireCapability(input: { capability: string; consentGranted: boolean }): Promise<void> };
  queue: { enqueue(job: AudioJob): Promise<{ jobId: string }> };
  audit: { record(event: AudioAuditEvent): Promise<void> };
  clock: { now(): string };
  ids: { next(prefix: string): string };
  analysis?: { analyze(input: { requestId: string; pcm: Uint8Array; sampleRate: AudioSampleRate }): Promise<AudioAnalysisInput | null> };
  idempotency?: { get(key: string): Promise<AudioSubmission | null>; put(key: string, submission: AudioSubmission): Promise<void> };
};
```

La misma clase puede ejecutarse en Node, Bun, una función serverless o una app
de escritorio. Cambiar de infraestructura significa cambiar los puertos, no el
contrato público.

## 4. Uso mínimo

```ts
import { UnifiedAudioGateway, AUDIO_REQUEST_SCHEMA } from "./tamv-genesis/src/audio/index.ts";
import { requireCapability } from "./tamv-genesis/src/sovereign/index.ts";

const gateway = new UnifiedAudioGateway({
  certification: {
    async requireCapability({ capability, consentGranted }) {
      await requireCapability({
        capability,
        consentGranted,
        seal,
        sources,
        manifest,
        publicKey,
      });
    },
  },
  queue: { async enqueue(job) { return { jobId: await myQueue.add(job) }; } },
  audit: { async record(event) { await myAudit.append(event); } },
  clock: { now: () => new Date().toISOString() },
  ids: { next: (prefix) => `${prefix}-${crypto.randomUUID()}` },
});

const submission = await gateway.submit({
  schema: AUDIO_REQUEST_SCHEMA,
  mode: "instrumental",
  prompt: "Cama instrumental cálida, sin voces.",
  durationSeconds: 30,
  sampleRate: 48000,
  format: "wav",
  rights: { license: "original", attestationId: "rights-2026-0001" },
  consent: { granted: true, subject: "creator-01", scope: "audio.production" },
  metadata: { title: "Opening bed", language: "es-MX" },
});
```

## 5. Ruta honesta hacia la propuesta completa

1. **Esquema de datos:** pedirlo a Lovable; no editar `drizzle/` ni
   `supabase/migrations/` a mano.
2. **Cola:** implementar `AudioQueuePort` con BullMQ/Redis cuando el servicio
   exista y esté probado; el contrato no cambia.
3. **Almacenamiento:** implementar un adaptador MinIO/S3 para los artefactos y
   registrar su digest SHA-256; no se declara almacenamiento hasta que exista.
4. **DSP:** hecho en local (`local-dsp.ts`) con vectores conocidos: LUFS
   BS.1770-4, true peak de muestra y chroma. El siguiente paso es un proveedor
   externo o inter-muestra; hasta entonces, lo que no se mide permanece `null`.
5. **Worker:** solo después de 1–4, y con reintentos, cuotas y auditoría
   verificables.

## 6. Ruta HTTP `POST /api/audiocore/advanced`

Implementada en `src/lib/audiocore-advanced.server.ts` (archivo protegido por
certificación TAMV; tras editarlo hay que regenerar hashes con
`npm run tamv:hash` y firmar el release).

Orden de compuertas, todas fail-closed:

1. Certificación TAMV de la feature `audiocore.advanced` (403 sin sello firmado).
2. `Content-Type: application/json` (415 si no).
3. Cuerpo acotado a 16 KiB (413/400).
4. Autenticación Supabase (401); el actor se deriva con salt
   `TAMV_GOVERNANCE_ACTOR_SALT` y nunca se expone el identificador crudo.
5. Cuota distribuida por actor (`checkCapabilityQuota`, token bucket de día
   fijo en Upstash Redis REST): 429 con `Retry-After` al agotar el bucket o el
   tope diario; 503 fail-closed si no hay backend configurado fuera de
   desarrollo local. El cupo de concurrencia por proceso devuelve 503
   `TAMV_AUDIOCORE_BUSY` cuando se satura.
6. `validateAudioRequest` del contrato génesis: campos desconocidos → 400.
7. Límite de la ruta: `durationSeconds ≤ 30` (400 `TAMV_AUDIOCORE_DURATION_LIMIT`);
   `format: "flac"` → 501 (el sintetizador local solo produce WAV).
8. Consentimiento + recertificación dentro del pipeline; sin consentimiento no
   se encola nada (403).
9. Worker in-process (`runUntilIdle`), artefacto en almacenamiento de memoria,
   análisis DSP local sobre el WAV generado.

Respuesta 200 (`tamv.audiocore.advanced.response.v1`): `submission`, `job`
(estado, intentos, artefacto con SHA-256, análisis), `audio` (WAV en base64),
`disclosure` (provider, `neuralModel: false`, `voice: false`, método DSP,
`actorRef`, `quota.source` y `quota.remainingToday`) y `limits`. Dos peticiones
idénticas producen bytes y SHA-256 idénticos: la síntesis es determinista por
diseño.

`license.features` en `tamv-attribution.json` incluye ahora
`audiocore.advanced`; la ruta permanece fail-closed hasta que el propietario
firme el release con esa lista.

Estados prohibidos en este repositorio: `completed`, `operational`, `24/7
running` o un `truePeakDb` inventado. Si no se midió, se declara `null`.
