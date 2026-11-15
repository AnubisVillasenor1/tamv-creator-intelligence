import test from "node:test";
import assert from "node:assert/strict";

import {
  assertTransition,
  AUDIO_JOB_SCHEMA,
  AudioMetricsRegistry,
  AudioPipelineError,
  AudioWorker,
  canTransition,
  classifyAudioFailure,
  createAudioPipeline,
  createJobRecord,
  createMutableClock,
  MemoryAudioAudit,
  MemoryAudioStorage,
  nextRetryDelayMs,
  SequentialAudioIds,
  TamvAudioError,
  type AudioJobRecord,
  type AudioWorkerRun,
} from "../src/audio/index.ts";

const START = "2026-11-15T00:00:00.000Z";

function request(overrides: Record<string, unknown> = {}) {
  return {
    schema: "tamv.audio.request.v1",
    mode: "instrumental",
    prompt: "A warm analogue synth bed with no vocals.",
    durationSeconds: 30,
    sampleRate: 48000,
    format: "wav",
    rights: { license: "original", attestationId: "rights-2026-0001" },
    consent: { granted: true, subject: "creator-01", scope: "audio.production" },
    metadata: { title: "Opening bed", language: "es-MX" },
    ...overrides,
  };
}

function bytes(seed = 1, length = 64): Uint8Array {
  return new Uint8Array(Array.from({ length }, (_, index) => (seed + index) % 256));
}

function certification(deny = false) {
  const calls: { capability: string; consentGranted: boolean }[] = [];
  return {
    calls,
    port: {
      async requireCapability(input: { capability: string; consentGranted: boolean }) {
        calls.push(input);
        if (deny) throw new Error("capability denied");
      },
    },
  };
}

function recordOf(result: AudioWorkerRun): AudioJobRecord {
  if (!("record" in result)) throw new Error(`expected a record, received ${result.status}`);
  return result.record;
}

test("lifecycle rejects impossible transitions and bounds retries", () => {
  assert.equal(canTransition("queued", "running"), true);
  assert.equal(canTransition("running", "queued"), false);
  assert.equal(canTransition("succeeded", "running"), false);
  assert.throws(() => assertTransition("succeeded", "running"), /TAMV_AUDIO_LIFECYCLE_INVALID/);

  assert.equal(nextRetryDelayMs(1, { baseMs: 1_000, maxMs: 60_000 }), 1_000);
  assert.equal(nextRetryDelayMs(2, { baseMs: 1_000, maxMs: 60_000 }), 2_000);
  assert.equal(nextRetryDelayMs(4, { baseMs: 1_000, maxMs: 5_000 }), 5_000);
  assert.throws(() => nextRetryDelayMs(0), TamvAudioError);

  const record = createJobRecord({ jobId: "job-1", requestId: "req-1", at: START, maxAttempts: 3 });
  assert.equal(record.schema, AUDIO_JOB_SCHEMA);
  assert.equal(record.status, "queued");
  assert.equal(record.attempts, 0);
});

test("failure classification keeps adapter codes and rejects invented ones", () => {
  const classified = classifyAudioFailure(
    new AudioPipelineError("timeout", "provider exceeded the deadline", true),
    2,
    START,
  );
  assert.equal(classified.code, "timeout");
  assert.equal(classified.retryable, true);
  assert.equal(classified.attempt, 2);

  const unknown = classifyAudioFailure({ code: "made-up", retryable: true }, 1, START);
  assert.equal(unknown.code, "unknown");

  const tamv = classifyAudioFailure(new TamvAudioError("TAMV_AUDIO_INVALID", "bad request"), 1, START);
  assert.equal(tamv.code, "provider-rejected");
  assert.equal(tamv.retryable, false);
});

test("a valid job succeeds, stores an artifact and reports real analysis", async () => {
  const clock = createMutableClock(START);
  const audit = new MemoryAudioAudit();
  const metrics = new AudioMetricsRegistry();
  const cert = certification();
  let generated = 0;

  const pipeline = createAudioPipeline({
    certification: cert.port,
    clock,
    audit,
    metrics,
    maxAttempts: 2,
    provider: {
      async generate() {
        generated += 1;
        clock.advance(1_500);
        return {
          bytes: bytes(7),
          contentType: "audio/wav",
          sampleRate: 48000,
          durationSeconds: 30,
          provider: "fixture-provider",
          model: "fixture-model",
        };
      },
    },
    analysis: {
      async analyze() {
        return {
          truePeakDb: -1.2,
          integratedLufs: -14.1,
          chroma: [0.1, 0.2, 0.3, 0.4, 0.5, 0.6, 0.7, 0.8, 0.9, 1, 1.1, 1.2],
        };
      },
    },
  });

  const submission = await pipeline.gateway.submit(request());
  assert.equal(submission.status, "queued");
  assert.equal(cert.calls.length, 1);

  const result = await pipeline.worker.runOnce();
  assert.equal(result.status, "succeeded");
  const record = recordOf(result);
  assert.equal(record.status, "succeeded");
  assert.equal(record.attempts, 1);
  assert.equal(generated, 1);
  assert.ok(record.artifact);
  assert.match(record.artifact.sha256, /^sha256:[0-9a-f]{64}$/);
  assert.equal(record.artifact.contentType, "audio/wav");
  assert.equal(record.artifact.model, "fixture-model");
  assert.equal(record.analysis?.status, "computed");
  assert.equal(record.analysis?.truePeakDb, -1.2);
  assert.equal(record.analysis?.integratedLufs, -14.1);

  const stored = await pipeline.storage.get(record.artifact.key);
  assert.ok(stored instanceof Uint8Array);
  assert.equal(stored.byteLength, 64);

  const exposition = metrics.render();
  assert.match(exposition, /tamv_audio_jobs_received_total 1/);
  assert.match(exposition, /tamv_audio_jobs_started_total 1/);
  assert.match(exposition, /tamv_audio_jobs_succeeded_total 1/);
  assert.match(exposition, /tamv_audio_generation_seconds_count 1/);
  assert.match(exposition, /tamv_audio_analysis_total\{status="computed"\} 1/);
  assert.equal(audit.count("audio.job.succeeded"), 1);
  assert.equal(audit.count("audio.analysis.computed"), 1);
});

test("retryable failures are requeued with a deterministic delay", async () => {
  const clock = createMutableClock(START);
  const audit = new MemoryAudioAudit();
  const metrics = new AudioMetricsRegistry();
  let attempts = 0;

  const pipeline = createAudioPipeline({
    certification: certification().port,
    clock,
    audit,
    metrics,
    maxAttempts: 2,
    retryBaseMs: 1_000,
    provider: {
      async generate() {
        attempts += 1;
        if (attempts === 1) {
          throw new AudioPipelineError("provider-unavailable", "provider is offline", true);
        }
        return {
          bytes: bytes(3),
          contentType: "audio/wav",
          sampleRate: 48000,
          durationSeconds: 30,
          provider: "fixture-provider",
        };
      },
    },
  });

  await pipeline.gateway.submit(request());
  const first = await pipeline.worker.runOnce();
  assert.equal(first.status, "retry-scheduled");
  assert.equal(first.status === "retry-scheduled" ? first.delayMs : 0, 1_000);
  assert.equal(recordOf(first).status, "queued");
  assert.equal(recordOf(first).nextAttemptAt, "2026-11-15T00:00:01.000Z");
  assert.equal(pipeline.queue.delayedSize(), 1);

  const tooSoon = await pipeline.worker.runOnce();
  assert.equal(tooSoon.status, "idle");

  clock.advance(1_000);
  const second = await pipeline.worker.runOnce();
  assert.equal(second.status, "succeeded");
  assert.equal(recordOf(second).attempts, 2);
  assert.equal(attempts, 2);

  const exposition = metrics.render();
  assert.match(exposition, /tamv_audio_jobs_errors_total\{code="provider-unavailable"\} 1/);
  assert.match(exposition, /tamv_audio_jobs_retried_total 1/);
  assert.match(exposition, /tamv_audio_jobs_succeeded_total 1/);
  assert.equal(audit.count("audio.job.retry-scheduled"), 1);
});

test("non-retryable failures terminate without requeueing", async () => {
  const clock = createMutableClock(START);
  const metrics = new AudioMetricsRegistry();
  const pipeline = createAudioPipeline({
    certification: certification().port,
    clock,
    metrics,
    maxAttempts: 3,
    provider: {
      async generate() {
        throw new AudioPipelineError("invalid-output", "provider returned silence", false);
      },
    },
  });

  await pipeline.gateway.submit(request());
  const result = await pipeline.worker.runOnce();
  assert.equal(result.status, "failed");
  assert.equal(recordOf(result).status, "failed");
  assert.equal(recordOf(result).attempts, 1);
  assert.equal(pipeline.queue.size(), 0);
  assert.match(metrics.render(), /tamv_audio_jobs_failed_total 1/);
});

test("artifacts must match the requested format, rate and duration", async () => {
  const clock = createMutableClock(START);
  const pipeline = createAudioPipeline({
    certification: certification().port,
    clock,
    provider: {
      async generate() {
        return {
          bytes: bytes(1),
          contentType: "audio/wav",
          sampleRate: 44100,
          durationSeconds: 30,
          provider: "fixture-provider",
        };
      },
    },
  });

  await pipeline.gateway.submit(request());
  const result = await pipeline.worker.runOnce();
  assert.equal(result.status, "failed");
  assert.equal(recordOf(result).failure?.code, "invalid-output");
  assert.equal(await pipeline.storage.get("audio/req-1/job-1.wav"), null);
});

test("analysis failures leave honest nulls instead of fabricated values", async () => {
  const metrics = new AudioMetricsRegistry();
  const pipeline = createAudioPipeline({
    certification: certification().port,
    clock: createMutableClock(START),
    metrics,
    provider: {
      async generate() {
        return {
          bytes: bytes(9),
          contentType: "audio/wav",
          sampleRate: 48000,
          durationSeconds: 30,
          provider: "fixture-provider",
        };
      },
    },
    analysis: {
      async analyze() {
        throw new Error("DSP worker offline");
      },
    },
  });

  await pipeline.gateway.submit(request());
  const result = await pipeline.worker.runOnce();
  assert.equal(result.status, "succeeded");
  const record = recordOf(result);
  assert.equal(record.analysis?.status, "not-computed");
  assert.equal(record.analysis?.truePeakDb, null);
  assert.equal(record.analysis?.integratedLufs, null);
  assert.equal(record.analysis?.chroma, null);
  assert.ok(record.analysis?.notes.some((note) => note.includes("DSP worker offline")));
  assert.match(metrics.render(), /tamv_audio_analysis_total\{status="not-computed"\} 1/);
});

test("idempotency keys return the first submission and enqueue once", async () => {
  const queueCalls: string[] = [];
  const pipeline = createAudioPipeline({
    certification: certification().port,
    clock: createMutableClock(START),
    provider: {
      async generate() {
        throw new Error("not used");
      },
    },
  });

  const original = pipeline.queue.enqueue.bind(pipeline.queue);
  pipeline.queue.enqueue = async (job, options) => {
    queueCalls.push(job.jobId);
    return original(job, options);
  };

  const first = await pipeline.gateway.submit(request(), { idempotencyKey: "draft-42" });
  const second = await pipeline.gateway.submit(request(), { idempotencyKey: "draft-42" });
  assert.equal(first.jobId, second.jobId);
  assert.equal(queueCalls.length, 1);
  assert.equal(pipeline.queue.size(), 1);
});

test("cancelled jobs are never executed", async () => {
  const metrics = new AudioMetricsRegistry();
  const pipeline = createAudioPipeline({
    certification: certification().port,
    clock: createMutableClock(START),
    metrics,
    provider: {
      async generate() {
        throw new Error("must not run");
      },
    },
  });

  const submission = await pipeline.gateway.submit(request());
  const cancelled = await pipeline.worker.cancel(submission.jobId);
  assert.equal(cancelled?.status, "cancelled");

  const result = await pipeline.worker.runOnce();
  assert.equal(result.status, "idle");
  assert.match(metrics.render(), /tamv_audio_jobs_cancelled_total 1/);
});

test("metrics reject invalid names and non-finite values", () => {
  const metrics = new AudioMetricsRegistry();
  assert.throws(() => metrics.inc("not a metric"), /Invalid Prometheus metric name/);
  assert.throws(() => metrics.inc("valid_total", { "__reserved": "x" }), /Invalid Prometheus label/);
  assert.throws(() => metrics.observe("valid_seconds", -1), /cannot be negative/);
  assert.throws(() => metrics.set("valid_gauge", Number.NaN), /finite number/);

  metrics.inc("valid_total", { kind: "a\"b\nc" }, 2);
  const rendered = metrics.render();
  assert.match(rendered, /valid_total\{kind="a\\"b\\nc"\} 2/);
});

test("memory adapters keep copies and sequential ids are deterministic", async () => {
  const clock = createMutableClock(START);
  const storage = new MemoryAudioStorage();
  const first = bytes(1);
  const stored = await storage.put({ key: "audio/req-1/job-1.wav", bytes: first, contentType: "audio/wav" });
  first[0] = 99;
  const read = await storage.get("audio/req-1/job-1.wav");
  assert.notEqual(read?.[0], 99);
  assert.match(stored.sha256, /^sha256:[0-9a-f]{64}$/);
  assert.equal(storage.contentType("audio/req-1/job-1.wav"), "audio/wav");

  const ids = new SequentialAudioIds();
  assert.equal(ids.next("job"), "job-1");
  assert.equal(ids.next("req"), "req-2");
  assert.equal(clock.now(), START);
  clock.advance(500);
  assert.equal(clock.nowMs(), Date.parse(START) + 500);
});

test("the worker constructor enforces bounded retry budgets", () => {
  const common = {
    queue: { enqueue: async () => ({ jobId: "x" }), dequeue: async () => null, size: () => 0 },
    store: { get: async () => null, put: async () => {}, list: async () => [] },
    provider: { generate: async () => ({ bytes: bytes(1), contentType: "audio/wav" as const, sampleRate: 48000, durationSeconds: 30, provider: "p" }) },
    storage: new MemoryAudioStorage(),
    audit: new MemoryAudioAudit(),
    metrics: new AudioMetricsRegistry(),
    clock: createMutableClock(START),
  };
  assert.throws(() => new AudioWorker({ ...common, maxAttempts: 0 }), /maxAttempts/);
  assert.throws(() => new AudioWorker({ ...common, maxAttempts: 11 }), /maxAttempts/);
  assert.throws(() => new AudioWorker({ ...common, retryBaseMs: 0 }), /retryBaseMs/);
  assert.doesNotThrow(() => new AudioWorker({ ...common, maxAttempts: 3, retryBaseMs: 1_000 }));
});
