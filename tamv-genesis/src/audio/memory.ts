/**
 * In-memory adapters.
 *
 * They are real implementations of the ports, intended for tests, local demos
 * and single-process workers. They are not a substitute for Redis, a database or
 * object storage, and the documentation says so explicitly.
 */

import { sha256Hex } from "../sovereign/digest.ts";
import type { AudioJob } from "./gateway.ts";
import type {
  AudioAuditRecord,
  AudioAuditSink,
  AudioClock,
  AudioIds,
  AudioJobStore,
  AudioMetrics,
  AudioStorageObject,
  AudioStoragePort,
  AudioStoragePut,
  AudioWorkQueue,
} from "./ports.ts";
import type { AudioJobRecord } from "./lifecycle.ts";

function clampDetail(value: unknown, max = 500): string {
  return String(value ?? "").replace(/[\r\n]+/g, " ").slice(0, max);
}

export type MutableAudioClock = AudioClock & {
  advance(ms: number): void;
  set(iso: string): void;
};

export function createMutableClock(startIso: string): MutableAudioClock {
  let current = Date.parse(startIso);
  if (!Number.isFinite(current)) throw new Error("startIso must be a valid ISO-8601 timestamp.");
  return {
    now: () => new Date(current).toISOString(),
    nowMs: () => current,
    advance(ms: number) {
      if (!Number.isFinite(ms) || ms < 0) throw new Error("advance(ms) must be a non-negative number.");
      current += ms;
    },
    set(iso: string) {
      const next = Date.parse(iso);
      if (!Number.isFinite(next)) throw new Error("set(iso) must receive a valid ISO-8601 timestamp.");
      current = next;
    },
  };
}

export function createSystemClock(): AudioClock {
  return {
    now: () => new Date().toISOString(),
    nowMs: () => Date.now(),
  };
}

export class SequentialAudioIds implements AudioIds {
  #counter = 0;

  next(prefix: string): string {
    if (typeof prefix !== "string" || !/^[a-z][a-z0-9-]{0,30}$/i.test(prefix)) {
      throw new Error("id prefix must be alphanumeric with optional dashes.");
    }
    this.#counter += 1;
    return `${prefix}-${this.#counter}`;
  }
}

type QueueEntry = {
  job: AudioJob;
  availableAt: number;
};

export class MemoryAudioQueue implements AudioWorkQueue {
  readonly #clock: AudioClock;
  readonly #entries: QueueEntry[] = [];

  constructor(clock: AudioClock) {
    this.#clock = clock;
  }

  async enqueue(job: AudioJob, options: { delayMs?: number } = {}): Promise<{ jobId: string }> {
    if (!job || typeof job.jobId !== "string" || job.jobId.length === 0) {
      throw new Error("queue.enqueue requires a job with a jobId.");
    }
    const delayMs = options.delayMs ?? 0;
    if (!Number.isFinite(delayMs) || delayMs < 0) {
      throw new Error("queue delay must be a non-negative number of milliseconds.");
    }
    if (this.#entries.some((entry) => entry.job.jobId === job.jobId)) {
      throw new Error(`job ${job.jobId} is already queued.`);
    }
    this.#entries.push({ job, availableAt: this.#clock.nowMs() + delayMs });
    return { jobId: job.jobId };
  }

  async dequeue(): Promise<AudioJob | null> {
    const now = this.#clock.nowMs();
    const index = this.#entries.findIndex((entry) => entry.availableAt <= now);
    if (index === -1) return null;
    const entry = this.#entries.splice(index, 1)[0];
    if (!entry) return null;
    return entry.job;
  }

  size(): number {
    return this.#entries.length;
  }

  /** Jobs whose delay has not elapsed yet, useful for honest local diagnostics. */
  delayedSize(): number {
    const now = this.#clock.nowMs();
    return this.#entries.filter((entry) => entry.availableAt > now).length;
  }
}

export class MemoryAudioJobStore implements AudioJobStore {
  readonly #records = new Map<string, AudioJobRecord>();

  async get(jobId: string): Promise<AudioJobRecord | null> {
    const record = this.#records.get(jobId);
    return record ? structuredClone(record) : null;
  }

  async put(record: AudioJobRecord): Promise<void> {
    this.#records.set(record.jobId, structuredClone(record));
  }

  async list(): Promise<AudioJobRecord[]> {
    return [...this.#records.values()].map((record) => structuredClone(record));
  }
}

type StoredObject = {
  bytes: Uint8Array;
  contentType: string;
  sha256: string;
};

export class MemoryAudioStorage implements AudioStoragePort {
  readonly #objects = new Map<string, StoredObject>();

  async put(input: AudioStoragePut): Promise<AudioStorageObject> {
    if (!input || typeof input.key !== "string" || !/^[a-zA-Z0-9][a-zA-Z0-9/._-]{0,200}$/.test(input.key)) {
      throw new Error("storage key is not a safe relative object key.");
    }
    if (input.key.includes("..")) throw new Error("storage key must not contain '..'.");
    if (!(input.bytes instanceof Uint8Array) || input.bytes.byteLength === 0) {
      throw new Error("storage requires non-empty Uint8Array bytes.");
    }
    if (typeof input.contentType !== "string" || input.contentType.length === 0) {
      throw new Error("storage requires a content type.");
    }
    const sha256 = await sha256Hex(input.bytes);
    this.#objects.set(input.key, {
      bytes: Uint8Array.from(input.bytes),
      contentType: input.contentType,
      sha256,
    });
    return {
      key: input.key,
      sha256,
      bytes: input.bytes.byteLength,
    };
  }

  async get(key: string): Promise<Uint8Array | null> {
    const object = this.#objects.get(key);
    return object ? Uint8Array.from(object.bytes) : null;
  }

  contentType(key: string): string | null {
    return this.#objects.get(key)?.contentType ?? null;
  }

  size(): number {
    return this.#objects.size;
  }
}

export class MemoryAudioAudit implements AudioAuditSink {
  readonly #events: AudioAuditRecord[] = [];

  async record(event: AudioAuditRecord): Promise<void> {
    const detail: Record<string, string | number | boolean | null> = {};
    for (const [key, value] of Object.entries(event.detail ?? {})) {
      detail[key] =
        typeof value === "string"
          ? clampDetail(value)
          : typeof value === "number" || typeof value === "boolean" || value === null
            ? value
            : clampDetail(value);
    }
    this.#events.push({ ...event, detail });
  }

  list(): AudioAuditRecord[] {
    return this.#events.map((event) => structuredClone(event));
  }

  count(type: AudioAuditRecord["type"]): number {
    return this.#events.filter((event) => event.type === type).length;
  }
}

export class MemoryAudioIdempotency {
  readonly #entries = new Map<string, unknown>();

  async get<T>(key: string): Promise<T | null> {
    const value = this.#entries.get(key);
    return value === undefined ? null : (structuredClone(value) as T);
  }

  async put(key: string, value: unknown): Promise<void> {
    if (typeof key !== "string" || key.trim().length === 0 || key.length > 160) {
      throw new Error("idempotency key must be a non-empty string of at most 160 characters.");
    }
    this.#entries.set(key, structuredClone(value));
  }

  size(): number {
    return this.#entries.size;
  }
}

/**
 * Counts requests at the audit boundary. The worker owns job outcome metrics so
 * a retry is not double counted as a new request.
 */
export class MetricsAuditSink implements AudioAuditSink {
  readonly #metrics: AudioMetrics;
  readonly #inner: AudioAuditSink | undefined;

  constructor(metrics: AudioMetrics, inner?: AudioAuditSink) {
    this.#metrics = metrics;
    this.#inner = inner;
  }

  async record(event: AudioAuditRecord): Promise<void> {
    if (event.type === "audio.request.queued") {
      this.#metrics.inc("tamv_audio_jobs_received_total");
    }
    await this.#inner?.record(event);
  }
}
