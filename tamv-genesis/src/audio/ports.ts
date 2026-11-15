/**
 * Ports for the audio pipeline.
 *
 * These are interfaces, not implementations. The project deliberately does not
 * ship Redis, BullMQ, Postgres, MinIO or a model runtime here: production
 * adapters can implement these contracts without changing the domain.
 */

import type { AudioAnalysisInput, AudioSampleRate } from "./contracts.ts";
import type { AudioJob } from "./gateway.ts";
import type { AudioFailureCode, AudioJobRecord } from "./lifecycle.ts";

export type AudioClock = {
  /** ISO-8601 timestamp used in audit records. */
  now(): string;
  /** Milliseconds since epoch used for queue delays. */
  nowMs(): number;
};

export type AudioIds = {
  next(prefix: string): string;
};

export type AudioGenerationInput = {
  job: AudioJob;
  attempt: number;
};

export type AudioGeneratedArtifact = {
  bytes: Uint8Array;
  contentType: "audio/wav" | "audio/flac";
  sampleRate: number;
  durationSeconds: number;
  provider: string;
  model?: string;
};

export type AudioGenerationPort = {
  generate(input: AudioGenerationInput): Promise<AudioGeneratedArtifact>;
};

export type AudioAnalysisPort = {
  analyze(input: {
    requestId: string;
    pcm: Uint8Array;
    sampleRate: AudioSampleRate;
  }): Promise<AudioAnalysisInput | null>;
};

export type AudioStoragePut = {
  key: string;
  bytes: Uint8Array;
  contentType: string;
};

export type AudioStorageObject = {
  key: string;
  sha256: string;
  bytes: number;
};

export type AudioStoragePort = {
  put(input: AudioStoragePut): Promise<AudioStorageObject>;
  get(key: string): Promise<Uint8Array | null>;
};

export type AudioJobStore = {
  get(jobId: string): Promise<AudioJobRecord | null>;
  put(record: AudioJobRecord): Promise<void>;
  list(): Promise<AudioJobRecord[]>;
};

export type AudioWorkQueue = {
  enqueue(job: AudioJob, options?: { delayMs?: number }): Promise<{ jobId: string }>;
  dequeue(): Promise<AudioJob | null>;
  size(): number;
  /** Optional diagnostics for delayed retries. Not required by the worker. */
  delayedSize?(): number;
};

export type AudioAuditRecord = {
  type:
    | "audio.request.queued"
    | "audio.job.started"
    | "audio.job.succeeded"
    | "audio.job.failed"
    | "audio.job.retry-scheduled"
    | "audio.job.cancelled"
    | "audio.analysis.computed"
    | "audio.analysis.not-computed";
  at: string;
  requestId: string;
  jobId?: string;
  detail: Record<string, string | number | boolean | null>;
};

export type AudioAuditSink = {
  record(event: AudioAuditRecord): Promise<void>;
};

export type AudioMetricLabels = Record<string, string>;

export type AudioMetrics = {
  inc(name: string, labels?: AudioMetricLabels, value?: number): void;
  set(name: string, value: number, labels?: AudioMetricLabels): void;
  observe(name: string, value: number, labels?: AudioMetricLabels): void;
  render(): string;
};

export type AudioPipelineAuditSummary = {
  received: number;
  started: number;
  succeeded: number;
  failed: number;
  retried: number;
  errorCodes: Partial<Record<AudioFailureCode, number>>;
};
