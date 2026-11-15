/**
 * Pipeline composition.
 *
 * `createAudioPipeline` wires the validated gateway to an in-process worker and
 * in-memory ports by default. Production deployments can replace any port
 * (queue, store, storage, metrics, audit) without touching the domain.
 */

import { UnifiedAudioGateway, type AudioGatewayPorts } from "./gateway.ts";
import { createJobRecord } from "./lifecycle.ts";
import {
  createSystemClock,
  MemoryAudioAudit,
  MemoryAudioIdempotency,
  MemoryAudioJobStore,
  MemoryAudioQueue,
  MemoryAudioStorage,
  MetricsAuditSink,
  SequentialAudioIds,
} from "./memory.ts";
import { AudioMetricsRegistry } from "./metrics.ts";
import type {
  AudioAnalysisPort,
  AudioAuditSink,
  AudioClock,
  AudioGenerationPort,
  AudioIds,
  AudioJobStore,
  AudioMetrics,
  AudioStoragePort,
  AudioWorkQueue,
} from "./ports.ts";
import { AudioWorker } from "./worker.ts";

export type AudioPipeline = {
  gateway: UnifiedAudioGateway;
  worker: AudioWorker;
  queue: AudioWorkQueue;
  store: AudioJobStore;
  storage: AudioStoragePort;
  metrics: AudioMetrics;
  audit: AudioAuditSink;
  clock: AudioClock;
  ids: AudioIds;
  idempotency: NonNullable<AudioGatewayPorts["idempotency"]>;
};

export type CreateAudioPipelineOptions = {
  certification: AudioGatewayPorts["certification"];
  provider: AudioGenerationPort;
  clock?: AudioClock;
  ids?: AudioIds;
  queue?: AudioWorkQueue;
  store?: AudioJobStore;
  storage?: AudioStoragePort;
  audit?: AudioAuditSink;
  metrics?: AudioMetrics;
  analysis?: AudioAnalysisPort;
  idempotency?: AudioGatewayPorts["idempotency"];
  digest?: (bytes: Uint8Array) => Promise<string>;
  maxAttempts?: number;
  retryBaseMs?: number;
  retryMaxMs?: number;
};

export function createAudioPipeline(options: CreateAudioPipelineOptions): AudioPipeline {
  const clock = options.clock ?? createSystemClock();
  const ids = options.ids ?? new SequentialAudioIds();
  const metrics = options.metrics ?? new AudioMetricsRegistry();
  const sink = options.audit ?? new MemoryAudioAudit();
  const audit = new MetricsAuditSink(metrics, sink);
  const transport = options.queue ?? new MemoryAudioQueue(clock);
  const store = options.store ?? new MemoryAudioJobStore();
  const storage = options.storage ?? new MemoryAudioStorage();
  const idempotency = options.idempotency ?? new MemoryAudioIdempotency();
  const maxAttempts = options.maxAttempts ?? 3;

  /**
   * A submission becomes visible to `cancel()` and to the audit trail before
   * the worker starts. Without this record, cancelling a queued job would look
   * like a no-op even though the job is sitting in the transport.
   */
  const queue: AudioWorkQueue = {
    async enqueue(job, enqueueOptions) {
      const existing = await store.get(job.jobId);
      if (!existing) {
        await store.put(
          createJobRecord({
            jobId: job.jobId,
            requestId: job.requestId,
            at: job.queuedAt,
            maxAttempts,
          }),
        );
      }
      return transport.enqueue(job, enqueueOptions);
    },
    dequeue: () => transport.dequeue(),
    size: () => transport.size(),
    ...(typeof transport.delayedSize === "function"
      ? { delayedSize: () => transport.delayedSize!() }
      : {}),
  };

  const gateway = new UnifiedAudioGateway({
    certification: options.certification,
    queue,
    audit,
    clock,
    ids,
    idempotency,
  });

  const worker = new AudioWorker({
    queue,
    store,
    provider: options.provider,
    storage,
    audit,
    metrics,
    clock,
    ...(options.analysis === undefined ? {} : { analysis: options.analysis }),
    ...(options.digest === undefined ? {} : { digest: options.digest }),
    maxAttempts,
    ...(options.retryBaseMs === undefined ? {} : { retryBaseMs: options.retryBaseMs }),
    ...(options.retryMaxMs === undefined ? {} : { retryMaxMs: options.retryMaxMs }),
  });

  return { gateway, worker, queue, store, storage, metrics, audit, clock, ids, idempotency };
}
