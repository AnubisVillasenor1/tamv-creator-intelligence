# TAMV Audio Pipeline — implementación real y límites

Este documento describe el pipeline de audio que **existe y se prueba** en el
repositorio, y separa lo implementado de lo que depende de infraestructura que
no está desplegada. La propuesta de `paquetefinal.md` se adaptó a la arquitectura
real (TanStack Start, sin Redis/BullMQ/MinIO/Postgres propios) en lugar de
copiarse literalmente.

## 1. Qué se implementó

| Pieza | Ruta | Estado |
|---|---|---|
| Contratos estrictos de petición y análisis | `tamv-genesis/src/audio/contracts.ts` | Implementado y probado. |
| Gateway de admisión | `tamv-genesis/src/audio/gateway.ts` | Implementado y probado. |
| Ciclo de vida y reintentos | `tamv-genesis/src/audio/lifecycle.ts` | Implementado y probado. |
| Puertos de generación, cola, almacenamiento y métricas | `tamv-genesis/src/audio/ports.ts` | Implementado. |
| Adaptadores en memoria | `tamv-genesis/src/audio/memory.ts` | Implementados y probados. |
| Worker in-process | `tamv-genesis/src/audio/worker.ts` | Implementado y probado. |
| Métricas Prometheus sin dependencias | `tamv-genesis/src/audio/metrics.ts` | Implementado y probado. |
| Composición del pipeline | `tamv-genesis/src/audio/pipeline.ts` | Implementado y probado. |
| Pruebas | `tamv-genesis/tests/audio-pipeline.test.ts` | 12 pruebas locales. |
| Pruebas del contrato previo | `tamv-genesis/tests/audio-gateway.test.ts` | 11 pruebas locales. |

El pipeline completo se ejecuta en un solo proceso: `submit()` valida, exige
consentimiento y derechos, autoriza por sello y encola; `runOnce()` toma un
trabajo, genera, verifica el artefacto, calcula el digest, guarda, analiza si hay
puerto y transiciona el estado. Nada se declara terminado antes de que el
almacenamiento devuelva un SHA-256.

## 2. Máquina de estados

```text
queued ──► running ──► succeeded
  │           │
  │           ├──► failed ──► queued (reintento programado)
  │           │        │
  │           │        └──► cancelled
  │           └──► cancelled
  └──► cancelled
```

- `succeeded` y `cancelled` son terminales.
- Un reintento vuelve a `queued` con `nextAttemptAt`; no se reintenta en el acto.
- `running` al arrancar el worker se trata como caída del proceso anterior: se
  registra como fallo recuperable y consume un intento.
- El backoff es exponencial y determinista (`1s`, `2s`, `4s`, …) con techo
  configurable. La cola puede añadir jitter si lo necesita.

Códigos de fallo: `provider-unavailable`, `provider-rejected`, `invalid-output`,
`analysis-failed`, `storage-failed`, `timeout`, `cancelled`, `unknown`.

## 3. Garantías

1. **Consentimiento y derechos antes de encolar.** Sin `consent.granted === true`
   y sin `rights.attestationId` no se crea trabajo.
2. **Autorización por capacidad.** El gateway usa el puerto de certificación,
   normalmente `requireCapability()` del sello v3.
3. **Validación del artefacto.** Formato, frecuencia de muestreo, duración,
   tamaño y nombre del proveedor deben coincidir con la petición. Un artefacto
   inválido falla; no se guarda como éxito.
4. **Integridad.** El almacenamiento devuelve `sha256:<64 hex>`. Si se inyecta un
   digest independiente, debe coincidir.
5. **DSP honesto.** `truePeakDb`, `integratedLufs` y `chroma` son `null` si el
   proveedor no los entrega. Un fallo del analizador no invalida la generación,
   pero deja el análisis en `not-computed`.
6. **Auditoría.** Se registran admisión, inicio, éxito, fallo, reintento,
   cancelación y análisis, sin guardar el prompt completo.
7. **Idempotencia.** La composición incluye un almacén de idempotencia en memoria;
   una clave repetida devuelve la primera sumisión y no vuelve a encolar.

## 4. Métricas

`AudioMetricsRegistry.render()` produce texto Prometheus estándar, solo con
eventos observados:

```text
tamv_audio_jobs_received_total
tamv_audio_jobs_started_total
tamv_audio_jobs_succeeded_total
tamv_audio_jobs_failed_total
tamv_audio_jobs_retried_total
tamv_audio_jobs_cancelled_total
tamv_audio_jobs_errors_total{code="..."}
tamv_audio_analysis_total{status="computed|not-computed"}
tamv_audio_generation_seconds_count / _sum
tamv_audio_artifact_bytes_count / _sum
```

No hay gauges de loudness inventados ni contadores en cero para proveedores
inexistentes.

## 5. Uso

```ts
import {
  createAudioPipeline,
  createMutableClock,
  AUDIO_REQUEST_SCHEMA,
} from "./tamv-genesis/src/audio/index.ts";

const pipeline = createAudioPipeline({
  certification: { requireCapability: async () => {} }, // conectar al sello real
  provider: {
    async generate({ job }) {
      // Adaptador real: MusicGen local, API autorizada o motor propio.
      return {
        bytes: pcmBytes,
        contentType: "audio/wav",
        sampleRate: job.request.sampleRate,
        durationSeconds: job.request.durationSeconds,
        provider: "musicgen-local",
      };
    },
  },
  analysis: dspPort, // opcional; si falta, el análisis queda null
  clock: createMutableClock("2026-11-15T00:00:00.000Z"),
});

const submission = await pipeline.gateway.submit({
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

const run = await pipeline.worker.runOnce();
if (run.status === "succeeded") {
  console.log(run.record.artifact?.sha256, run.record.analysis?.status);
}
```

Para producción, sustituir los adaptadores en memoria por implementaciones de
los puertos:

- `AudioWorkQueue` → BullMQ/Redis, SQS, Cloud Tasks o una tabla con `SELECT … FOR UPDATE SKIP LOCKED`.
- `AudioJobStore` → PostgreSQL/Drizzle.
- `AudioStoragePort` → S3/MinIO con verificación de digest.
- `AudioAuditSink` → el log de auditoría existente.
- `AudioGenerationPort` → MusicGen, un servicio HTTP autorizado o un motor local.

## 6. Qué no se implementó y por qué

| Propuesta de `paquetefinal.md` | Estado | Motivo |
|---|---|---|
| Esquema Drizzle/Postgres y migraciones | **No implementado** | `AGENTS.md` prohíbe editar `drizzle/` y `supabase/migrations/`; la base la gestiona Lovable. |
| Redis + BullMQ | **No implementado** | No hay servicio ni dependencia instalada; se dejó el puerto `AudioWorkQueue`. |
| MinIO / S3 | **No implementado** | No hay bucket ni credenciales; se dejó `AudioStoragePort` y un adaptador en memoria. |
| Worker Python/MusicGen | **No implementado** | No hay runtime ni modelo desplegado; se dejó `AudioGenerationPort`. |
| Docker Compose de audio | **No implementado** | No se puede declarar un despliegue inexistente. |
| DSP en C++ (true peak/LUFS/chroma) | **No implementado** | Requiere motor nativo y vectores de referencia; las métricas permanecen `null`. |
| Rutas Next.js | **No aplicable** | El proyecto usa TanStack Start; las rutas serían `src/routes/api.*.ts`. |
| Landing y copy de marca | **Documentado** | Ver `docs/PRODUCT-POSITIONING.md`; la UI existente ya usa PLAY & GO. |

## 7. Reproducción

```bash
node --experimental-strip-types --test tamv-genesis/tests/audio-pipeline.test.ts
node --experimental-strip-types --test tamv-genesis/tests/audio-gateway.test.ts
node --experimental-strip-types --test tamv-genesis/tests/*.test.ts
```

El pipeline no afirma horas verificadas, validación académica, producción 24/7
ni un proveedor conectado. Esa separación es deliberada.
