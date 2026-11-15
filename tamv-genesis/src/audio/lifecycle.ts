/**
 * Audio job lifecycle.
 *
 * A job is a small, explicit state machine. Transitions that are not listed in
 * AUDIO_TRANSITIONS are rejected, so a worker cannot move a finished job back to
 * `running`, and a retry cannot be confused with a first attempt.
 *
 * The lifecycle is transport agnostic: the same record is valid for an in-memory
 * queue, a Redis-backed queue or a database row. Nothing here assumes a vendor.
 */

import type { AudioAnalysis } from "./contracts.ts";
import { TamvAudioError } from "./contracts.ts";

export const AUDIO_JOB_SCHEMA = "tamv.audio.job.v1";

export const AUDIO_JOB_STATUSES = [
  "queued",
  "running",
  "succeeded",
  "failed",
  "cancelled",
] as const;

export type AudioJobStatus = (typeof AUDIO_JOB_STATUSES)[number];

export const AUDIO_FAILURE_CODES = [
  "provider-unavailable",
  "provider-rejected",
  "invalid-output",
  "analysis-failed",
  "storage-failed",
  "timeout",
  "cancelled",
  "unknown",
] as const;

export type AudioFailureCode = (typeof AUDIO_FAILURE_CODES)[number];

export type AudioArtifactRef = {
  key: string;
  sha256: string;
  bytes: number;
  contentType: "audio/wav" | "audio/flac";
  sampleRate: number;
  durationSeconds: number;
  provider: string;
  model?: string;
  createdAt: string;
};

export type AudioFailure = {
  code: AudioFailureCode;
  detail: string;
  retryable: boolean;
  attempt: number;
  at: string;
};

export type AudioJobRecord = {
  schema: typeof AUDIO_JOB_SCHEMA;
  jobId: string;
  requestId: string;
  status: AudioJobStatus;
  attempts: number;
  maxAttempts: number;
  createdAt: string;
  updatedAt: string;
  nextAttemptAt?: string;
  failure?: AudioFailure;
  artifact?: AudioArtifactRef;
  analysis?: AudioAnalysis;
};

export const AUDIO_TRANSITIONS: Record<AudioJobStatus, readonly AudioJobStatus[]> = {
  queued: ["running", "cancelled"],
  running: ["succeeded", "failed", "cancelled"],
  failed: ["queued", "cancelled"],
  succeeded: [],
  cancelled: [],
};

export class AudioLifecycleError extends Error {
  readonly from: AudioJobStatus;
  readonly to: AudioJobStatus;

  constructor(from: AudioJobStatus, to: AudioJobStatus) {
    super(`TAMV_AUDIO_LIFECYCLE_INVALID: ${from} -> ${to} is not allowed.`);
    this.name = "AudioLifecycleError";
    this.from = from;
    this.to = to;
  }
}

export class AudioPipelineError extends Error {
  readonly code: Exclude<AudioFailureCode, "cancelled">;
  readonly retryable: boolean;

  constructor(code: Exclude<AudioFailureCode, "cancelled">, detail: string, retryable: boolean) {
    super(`${code}: ${detail}`);
    this.name = "AudioPipelineError";
    this.code = code;
    this.retryable = retryable;
  }
}

export function isTerminalStatus(status: AudioJobStatus): boolean {
  return status === "succeeded" || status === "cancelled";
}

export function canTransition(from: AudioJobStatus, to: AudioJobStatus): boolean {
  return AUDIO_TRANSITIONS[from].includes(to);
}

export function assertTransition(from: AudioJobStatus, to: AudioJobStatus): void {
  if (!canTransition(from, to)) throw new AudioLifecycleError(from, to);
}

/**
 * Deterministic exponential backoff without jitter. Jitter belongs to the queue
 * adapter (which can add it), not to the contract, so tests and audits can
 * reproduce the delay exactly.
 */
export function nextRetryDelayMs(
  attempt: number,
  options: { baseMs?: number; maxMs?: number } = {},
): number {
  const baseMs = options.baseMs ?? 1_000;
  const maxMs = options.maxMs ?? 60_000;
  if (!Number.isInteger(attempt) || attempt < 1) {
    throw new TamvAudioError("TAMV_AUDIO_INVALID", "attempt must be an integer greater than zero.");
  }
  if (!Number.isFinite(baseMs) || baseMs < 1 || !Number.isFinite(maxMs) || maxMs < baseMs) {
    throw new TamvAudioError("TAMV_AUDIO_INVALID", "retry bounds are invalid.");
  }
  const exponent = Math.min(attempt - 1, 16);
  return Math.min(maxMs, baseMs * 2 ** exponent);
}

export function createJobRecord(input: {
  jobId: string;
  requestId: string;
  at: string;
  maxAttempts: number;
}): AudioJobRecord {
  return {
    schema: AUDIO_JOB_SCHEMA,
    jobId: input.jobId,
    requestId: input.requestId,
    status: "queued",
    attempts: 0,
    maxAttempts: input.maxAttempts,
    createdAt: input.at,
    updatedAt: input.at,
  };
}

/**
 * Classify an arbitrary failure without inventing a cause. Adapters can throw
 * AudioPipelineError to be precise; everything else is reported as an unknown
 * provider failure and retried within the configured budget.
 */
export function classifyAudioFailure(error: unknown, attempt: number, at: string): AudioFailure {
  const detail = error instanceof Error ? error.message : String(error ?? "unknown error");
  const bounded = detail.replace(/[\r\n]+/g, " ").slice(0, 500);

  if (error instanceof AudioPipelineError) {
    return { code: error.code, detail: bounded, retryable: error.retryable, attempt, at };
  }
  if (error instanceof TamvAudioError) {
    return { code: "provider-rejected", detail: bounded, retryable: false, attempt, at };
  }
  const candidate = error as { code?: unknown; retryable?: unknown } | null;
  if (candidate && typeof candidate.code === "string") {
    const code = AUDIO_FAILURE_CODES.includes(candidate.code as AudioFailureCode)
      ? (candidate.code as AudioFailureCode)
      : "unknown";
    return {
      code,
      detail: bounded,
      retryable: candidate.retryable === true,
      attempt,
      at,
    };
  }
  return { code: "unknown", detail: bounded, retryable: true, attempt, at };
}
