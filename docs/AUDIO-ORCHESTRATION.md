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
| Normalización DSP honesta | `tamv-genesis/src/audio/contracts.ts` | Implementada y probada. |
| Pruebas | `tamv-genesis/tests/audio-gateway.test.ts` | 11 pruebas locales. |
| Registro de cierre | `tamv-genesis/v3/closure.json` | Módulo `audio.gateway.contract` = `contract`. |

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

- No hay proveedor de generación musical conectado.
- No hay worker, cola durable, Redis ni BullMQ.
- No hay tablas Drizzle/Postgres nuevas ni migraciones.
- No hay bucket MinIO ni almacenamiento de audio.
- No hay Docker Compose de audio.
- No hay cálculo real de true peak, LUFS ni chroma.

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
4. **DSP:** conectar un proveedor real de true peak/chroma y probar con vectores
   conocidos. Hasta entonces, las métricas permanecen `null`.
5. **Worker:** solo después de 1–4, y con reintentos, cuotas y auditoría
   verificables.

Estados prohibidos en este repositorio: `completed`, `operational`, `24/7
running` o un `truePeakDb` inventado. Si no se midió, se declara `null`.
