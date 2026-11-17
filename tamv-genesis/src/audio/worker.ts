/**
 * Audio worker: one job at a time, explicit transitions, bounded retries.
 *
 * `runOnce()` is deliberately synchronous in shape: a caller decides when to
 * poll, which keeps the contract portable. A production adapter can wrap it in a
 * Redis/BullMQ consumer, a serverless cron or a desktop loop without changing the
 * state machine. The worker never reports `succeeded` before storage returns a
 * digest, and it never invents analysis values.
 */

import { normalizeAudioAnalysis, TamvAudioError, type AudioRequest } from "./contracts.ts";
import type { AudioJob } from "./gateway.ts";
import {
  assertTransition,
  AUDIO_JOB_SCHEMA,
  AudioPipelineError,
  classifyAudioFailure,
  createJobRecord,
  nextRetryDelayMs,
  type AudioJobRecord,
} from "./lifecycle.ts";
import type {
  AudioAnalysisPort,
  AudioAuditSink,
  AudioClock,
  AudioGeneratedArtifact,
  AudioGenerationPort,
  AudioJobStore,
  AudioMetrics,
  AudioStoragePort,
  AudioWorkQueue,
} from "./ports.ts";

export type AudioWorkerPorts = {
  queue: AudioWorkQueue;
  store: AudioJobStore;
  provider: AudioGenerationPort;
  storage: AudioStoragePort;
  audit: AudioAuditSink;
  metrics: AudioMetrics;
  clock: AudioClock;
  analysis?: AudioAnalysisPort;
  /** Optional independent digest; when present it must match storage. */
  digest?: (bytes: Uint8Array) => Promise<string>;
  maxAttempts?: number;
  retryBaseMs?: number;
  retryMaxMs?: number;
};

export type AudioWorkerRun =
  | { status: "idle" }
  | { status: "succeeded"; record: AudioJobRecord }
  | { status: "retry-scheduled"; record: AudioJobRecord; delayMs: number }
  | { status: "failed"; record: AudioJobRecord };

const MAX_ARTIFACT_BYTES = 64 * 1024 * 1024;

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function safeSegment(value: string): string {
  const cleaned = value.replace(/[^A-Za-z0-9._-]/g, "_").replace(/\.{2,}/g, "_");
  return cleaned.length === 0 ? "unknown" : cleaned.slice(0, 120);
}

function expectedContentType(request: AudioRequest): "audio/wav" | "audio/flac" {
  return request.format === "wav" ? "audio/wav" : "audio/flac";
}

function normalizeArtifact(raw: unknown, request: AudioRequest): AudioGeneratedArtifact {
  if (!isRecord(raw)) {
    throw new AudioPipelineError("invalid-output", "provider returned no artifact object.", false);
  }
  const bytes = raw["bytes"];
  if (!(bytes instanceof Uint8Array) || bytes.byteLength === 0) {
    throw new AudioPipelineError("invalid-output", "provider artifact has no audio bytes.", false);
  }
  if (bytes.byteLength > MAX_ARTIFACT_BYTES) {
    throw new AudioPipelineError("invalid-output", "provider artifact exceeds the byte budget.", false);
  }
  const contentType = raw["contentType"];
  if (contentType !== expectedContentType(request)) {
    throw new AudioPipelineError(
      "invalid-output",
      `provider content type does not match the requested ${request.format} format.`,
      false,
    );
  }
  if (!Number.isInteger(raw["sampleRate"]) || raw["sampleRate"] !== request.sampleRate) {
    throw new AudioPipelineError("invalid-output", "provider sample rate does not match the request.", false);
  }
  if (
    typeof raw["durationSeconds"] !== "number" ||
    !Number.isFinite(raw["durationSeconds"]) ||
    raw["durationSeconds"] <= 0 ||
    raw["durationSeconds"] > request.durationSeconds + 10
  ) {
    throw new AudioPipelineError("invalid-output", "provider duration is outside the accepted window.", false);
  }
  if (typeof raw["provider"] !== "string" || raw["provider"].trim().length === 0 || raw["provider"].length > 200) {
    throw new AudioPipelineError("invalid-output", "provider name is missing.", false);
  }
  if (
    raw["model"] !== undefined &&
    (typeof raw["model"] !== "string" || raw["model"].trim().length === 0 || raw["model"].length > 200)
  ) {
    throw new AudioPipelineError("invalid-output", "provider model is invalid.", false);
  }
  return {
    bytes,
    contentType: contentType as "audio/wav" | "audio/flac",
    sampleRate: raw["sampleRate"] as number,
    durationSeconds: raw["durationSeconds"],
    provider: raw["provider"],
    ...(raw["model"] === undefined ? {} : { model: raw["model"] }),
  };
}

export class AudioWorker {
  readonly #ports: AudioWorkerPorts;
  readonly #maxAttempts: number;
  readonly #retryBaseMs: number;
  readonly #retryMaxMs: number;

  constructor(ports: AudioWorkerPorts) {
    if (!ports || typeof ports !== "object") throw new Error("AudioWorker requires ports.");
    const maxAttempts = ports.maxAttempts ?? 3;
    if (!Number.isInteger(maxAttempts) || maxAttempts < 1 || maxAttempts > 10) {
      throw new Error("maxAttempts must be an integer between 1 and 10.");
    }
    const retryBaseMs = ports.retryBaseMs ?? 1_000;
    const retryMaxMs = ports.retryMaxMs ?? 60_000;
    if (!Number.isFinite(retryBaseMs) || retryBaseMs < 1) throw new Error("retryBaseMs is invalid.");
    if (!Number.isFinite(retryMaxMs) || retryMaxMs < retryBaseMs) throw new Error("retryMaxMs is invalid.");
    this.#ports = ports;
    this.#maxAttempts = maxAttempts;
    this.#retryBaseMs = retryBaseMs;
    this.#retryMaxMs = retryMaxMs;
  }

  async runOnce(): Promise<AudioWorkerRun> {
    const job = await this.#ports.queue.dequeue();
    if (!job) return { status: "idle" };

    const existing = await this.#ports.store.get(job.jobId);
    if (existing?.status === "succeeded" || existing?.status === "cancelled") {
      return { status: "idle" };
    }

    const now = this.#ports.clock.now();
    let record: AudioJobRecord =
      existing ??
      createJobRecord({
        jobId: job.jobId,
        requestId: job.requestId,
        at: job.queuedAt,
        maxAttempts: this.#maxAttempts,
      });

    if (record.status === "running") {
      // Crash recovery: a previous worker died after marking the job running.
      // The attempt is already counted, so this path can exhaust the budget.
      record = await this.#scheduleFailure(
        job,
        record,
        {
          code: "unknown",
          detail: "worker restarted while the job was running.",
          retryable: true,
          attempt: record.attempts,
          at: now,
        },
        this.#retryBaseMs,
        true,
      );
      return record.status === "queued"
        ? {
            status: "retry-scheduled",
            record,
            delayMs: nextRetryDelayMs(record.attempts, {
              baseMs: this.#retryBaseMs,
              maxMs: this.#retryMaxMs,
            }),
          }
        : { status: "failed", record };
    }

    if (record.status === "failed") {
      if (record.attempts >= record.maxAttempts) {
        return { status: "failed", record };
      }
      assertTransition("failed", "queued");
      record.status = "queued";
    }
    assertTransition(record.status, "running");
    record.status = "running";
    record.attempts += 1;
    record.updatedAt = now;
    delete record.nextAttemptAt;
    await this.#ports.store.put(record);

    this.#ports.metrics.inc("tamv_audio_jobs_started_total");
    await this.#ports.audit.record({
      type: "audio.job.started",
      at: now,
      requestId: record.requestId,
      jobId: record.jobId,
      detail: { attempt: record.attempts, maxAttempts: record.maxAttempts },
    });

    const startedMs = this.#ports.clock.nowMs();

    try {
      const rawArtifact = await this.#ports.provider.generate({ job, attempt: record.attempts });
      const artifact = normalizeArtifact(rawArtifact, job.request);
      const extension = job.request.format;
      const key = `audio/${safeSegment(job.requestId)}/${safeSegment(job.jobId)}.${extension}`;

      let stored;
      try {
        stored = await this.#ports.storage.put({
          key,
          bytes: artifact.bytes,
          contentType: artifact.contentType,
        });
      } catch (error) {
        throw new AudioPipelineError(
          "storage-failed",
          error instanceof Error ? error.message : "storage rejected the artifact.",
          true,
        );
      }

      if (this.#ports.digest) {
        const expected = await this.#ports.digest(artifact.bytes);
        if (expected !== stored.sha256) {
          throw new AudioPipelineError("invalid-output", "stored digest does not match the artifact.", false);
        }
      }

      let analysis = normalizeAudioAnalysis(null);
      if (this.#ports.analysis) {
        try {
          const rawAnalysis = await this.#ports.analysis.analyze({
            requestId: record.requestId,
            pcm: artifact.bytes,
            sampleRate: job.request.sampleRate,
          });
          analysis = normalizeAudioAnalysis(rawAnalysis);
        } catch (error) {
          analysis = normalizeAudioAnalysis(null);
          analysis.notes.push(
            `analysis provider failed: ${error instanceof Error ? error.message.slice(0, 160) : "unknown error"}`,
          );
        }
      }

      const completedAt = this.#ports.clock.now();
      record.status = "succeeded";
      record.updatedAt = completedAt;
      delete record.failure;
      record.artifact = {
        key: stored.key,
        sha256: stored.sha256,
        bytes: stored.bytes,
        contentType: artifact.contentType,
        sampleRate: artifact.sampleRate,
        durationSeconds: artifact.durationSeconds,
        provider: artifact.provider,
        ...(artifact.model === undefined ? {} : { model: artifact.model }),
        createdAt: completedAt,
      };
      record.analysis = analysis;
      await this.#ports.store.put(record);

      const elapsedSeconds = Math.max(0, this.#ports.clock.nowMs() - startedMs) / 1_000;
      this.#ports.metrics.inc("tamv_audio_jobs_succeeded_total");
      this.#ports.metrics.observe("tamv_audio_generation_seconds", elapsedSeconds);
      this.#ports.metrics.observe("tamv_audio_artifact_bytes", stored.bytes);
      this.#ports.metrics.inc("tamv_audio_analysis_total", { status: analysis.status });
      await this.#ports.audit.record({
        type: "audio.job.succeeded",
        at: completedAt,
        requestId: record.requestId,
        jobId: record.jobId,
        detail: {
          key: stored.key,
          sha256: stored.sha256,
          bytes: stored.bytes,
          analysis: analysis.status,
        },
      });
      await this.#ports.audit.record({
        type: analysis.status === "computed" ? "audio.analysis.computed" : "audio.analysis.not-computed",
        at: completedAt,
        requestId: record.requestId,
        jobId: record.jobId,
        detail: {
          truePeakDb: analysis.truePeakDb,
          integratedLufs: analysis.integratedLufs,
          chromaBins: analysis.chroma ? analysis.chroma.length : 0,
        },
      });
      return { status: "succeeded", record };
    } catch (error) {
      const failure = classifyAudioFailure(error, record.attempts, this.#ports.clock.now());
      const retryable = failure.retryable && record.attempts < record.maxAttempts;
      const saved = await this.#scheduleFailure(
        job,
        record,
        failure,
        nextRetryDelayMs(record.attempts, { baseMs: this.#retryBaseMs, maxMs: this.#retryMaxMs }),
        retryable,
      );
      if (saved.status === "queued") {
        return {
          status: "retry-scheduled",
          record: saved,
          delayMs: nextRetryDelayMs(record.attempts, { baseMs: this.#retryBaseMs, maxMs: this.#retryMaxMs }),
        };
      }
      return { status: "failed", record: saved };
    }
  }

  async runUntilIdle(maxRuns = 100): Promise<AudioWorkerRun[]> {
    if (!Number.isInteger(maxRuns) || maxRuns < 1 || maxRuns > 10_000) {
      throw new Error("maxRuns must be an integer between 1 and 10000.");
    }
    const results: AudioWorkerRun[] = [];
    for (let index = 0; index < maxRuns; index += 1) {
      const result = await this.runOnce();
      if (result.status === "idle") break;
      results.push(result);
      if (result.status === "retry-scheduled") break;
    }
    return results;
  }

  async cancel(jobId: string): Promise<AudioJobRecord | null> {
    const record = await this.#ports.store.get(jobId);
    if (!record) return null;
    if (record.status === "succeeded" || record.status === "cancelled") return record;
    assertTransition(record.status, "cancelled");
    record.status = "cancelled";
    record.updatedAt = this.#ports.clock.now();
    await this.#ports.store.put(record);
    this.#ports.metrics.inc("tamv_audio_jobs_cancelled_total");
    await this.#ports.audit.record({
      type: "audio.job.cancelled",
      at: record.updatedAt,
      requestId: record.requestId,
      jobId: record.jobId,
      detail: { attempt: record.attempts },
    });
    return record;
  }

  async #scheduleFailure(
    job: AudioJob,
    record: AudioJobRecord,
    failure: AudioJobRecord["failure"],
    delayMs: number,
    retryable = false,
  ): Promise<AudioJobRecord> {
    if (!failure) throw new Error("scheduleFailure requires a failure.");
    record.failure = failure;
    record.updatedAt = failure.at;
    this.#ports.metrics.inc("tamv_audio_jobs_errors_total", { code: failure.code });
    await this.#ports.audit.record({
      type: "audio.job.failed",
      at: failure.at,
      requestId: record.requestId,
      jobId: record.jobId,
      detail: {
        code: failure.code,
        detail: failure.detail,
        retryable: failure.retryable,
        attempt: failure.attempt,
      },
    });

    if (record.status === "running") {
      assertTransition("running", "failed");
      record.status = "failed";
    }
    const canRetry = retryable && record.attempts < record.maxAttempts;
    if (!canRetry) {
      await this.#ports.store.put(record);
      this.#ports.metrics.inc("tamv_audio_jobs_failed_total");
      return record;
    }

    assertTransition("failed", "queued");
    record.status = "queued";
    record.nextAttemptAt = new Date(this.#ports.clock.nowMs() + delayMs).toISOString();
    await this.#ports.store.put(record);
    try {
      await this.#ports.queue.enqueue(job, { delayMs });
    } catch (error) {
      record.status = "failed";
      record.failure = {
        code: "unknown",
        detail: `could not requeue: ${error instanceof Error ? error.message.slice(0, 200) : "unknown error"}`,
        retryable: false,
        attempt: record.attempts,
        at: this.#ports.clock.now(),
      };
      await this.#ports.store.put(record);
      this.#ports.metrics.inc("tamv_audio_jobs_failed_total");
      return record;
    }
    this.#ports.metrics.inc("tamv_audio_jobs_retried_total");
    await this.#ports.audit.record({
      type: "audio.job.retry-scheduled",
      at: failure.at,
      requestId: record.requestId,
      jobId: record.jobId,
      detail: { delayMs, nextAttemptAt: record.nextAttemptAt, attempt: record.attempts },
    });
    return record;
  }
}

export { AUDIO_JOB_SCHEMA, AudioPipelineError, TamvAudioError };
