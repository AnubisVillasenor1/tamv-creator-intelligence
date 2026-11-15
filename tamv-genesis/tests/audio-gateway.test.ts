import test from "node:test";
import assert from "node:assert/strict";

import {
  AUDIO_REQUEST_SCHEMA,
  AUDIO_SUBMISSION_SCHEMA,
  normalizeAudioAnalysis,
  TamvAudioError,
  UnifiedAudioGateway,
  validateAudioRequest,
  type AudioAnalysisInput,
  type AudioAuditEvent,
  type AudioJob,
  type AudioSubmission,
} from "../src/audio/index.ts";

function request(overrides: Record<string, unknown> = {}) {
  return {
    schema: AUDIO_REQUEST_SCHEMA,
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

function harness(options: {
  deny?: string;
  analysis?: AudioAnalysisInput | null;
  includeAnalysis?: boolean;
  failQueue?: boolean;
} = {}) {
  const jobs: AudioJob[] = [];
  const events: AudioAuditEvent[] = [];
  const certifications: { capability: string; consentGranted: boolean }[] = [];
  const idempotent = new Map<string, AudioSubmission>();
  let sequence = 0;
  let tick = 0;

  const gateway = new UnifiedAudioGateway({
    certification: {
      async requireCapability(input) {
        certifications.push(input);
        if (options.deny) throw new Error(options.deny);
      },
    },
    queue: {
      async enqueue(job) {
        if (options.failQueue) throw new Error("queue offline");
        jobs.push(job);
        return { jobId: `job-${jobs.length}` };
      },
    },
    audit: {
      async record(event) {
        events.push(event);
      },
    },
    clock: {
      now() {
        tick += 1;
        return `2026-11-14T00:00:${String(tick).padStart(2, "0")}.000Z`;
      },
    },
    ids: {
      next(prefix) {
        sequence += 1;
        return `${prefix}-${sequence}`;
      },
    },
    ...(options.includeAnalysis === false
      ? {}
      : {
          analysis: {
            async analyze() {
              return "analysis" in options ? (options.analysis ?? null) : null;
            },
          },
        }),
    idempotency: {
      async get(key) {
        return idempotent.get(key) ?? null;
      },
      async put(key, submission) {
        idempotent.set(key, submission);
      },
    },
  });

  return { gateway, jobs, events, certifications, idempotent };
}

function isAudioError(code: string) {
  return (error: unknown) => error instanceof TamvAudioError && error.code === code;
}

test("a valid request is queued, audited and certified without claiming completion", async () => {
  const { gateway, jobs, events, certifications } = harness();
  const submission = await gateway.submit(request());
  assert.equal(submission.schema, AUDIO_SUBMISSION_SCHEMA);
  assert.equal(submission.status, "queued");
  assert.equal(submission.capability, "audio.production");
  assert.equal(jobs.length, 1);
  assert.equal(jobs[0].request.prompt, "A warm analogue synth bed with no vocals.");
  assert.equal(events.length, 1);
  assert.equal(events[0].type, "audio.request.queued");
  assert.equal(events[0].detail.prompt, undefined);
  assert.deepEqual(certifications, [{ capability: "audio.production", consentGranted: true }]);
  assert.equal(JSON.stringify(submission).includes("completed"), false);
});

test("missing consent is denied before queueing", async () => {
  const { gateway, jobs, certifications } = harness();
  await assert.rejects(
    () => gateway.submit(request({ consent: { granted: false, subject: "creator-01", scope: "audio.production" } })),
    isAudioError("TAMV_AUDIO_CONSENT_REQUIRED"),
  );
  assert.equal(jobs.length, 0);
  assert.equal(certifications.length, 0);
});

test("unknown or missing rights data is rejected instead of forwarded", async () => {
  const { gateway } = harness();
  await assert.rejects(() => gateway.submit(request({ model: "unapproved" })), isAudioError("TAMV_AUDIO_INVALID"));
  await assert.rejects(
    () => gateway.submit(request({ rights: { license: "original" } })),
    isAudioError("TAMV_AUDIO_INVALID"),
  );
  await assert.rejects(
    () => gateway.submit(request({ rights: { license: "unknown", attestationId: "rights-1" } })),
    isAudioError("TAMV_AUDIO_RIGHTS_REQUIRED"),
  );
});

test("a certification denial stops the job from reaching the queue", async () => {
  const { gateway, jobs } = harness({ deny: "TAMV_SEAL_UNSIGNED: unsigned pack" });
  await assert.rejects(() => gateway.submit(request()), /TAMV_SEAL_UNSIGNED/);
  assert.equal(jobs.length, 0);
});

test("idempotent submissions enqueue once and return the same job", async () => {
  const { gateway, jobs, events } = harness();
  const first = await gateway.submit(request(), { idempotencyKey: "creator-01:opening" });
  const second = await gateway.submit(request(), { idempotencyKey: "creator-01:opening" });
  assert.deepEqual(second, first);
  assert.equal(jobs.length, 1);
  assert.equal(events.length, 1);
});

test("a request without a requestId is assigned one", async () => {
  const { gateway } = harness();
  const submission = await gateway.submit(request());
  assert.equal(submission.requestId, "req-1");
  assert.equal(submission.jobId, "job-1");
});

test("analysis fails closed when no DSP provider is connected", async () => {
  const { gateway } = harness({ includeAnalysis: false });
  await assert.rejects(
    () => gateway.analyze({ requestId: "req-9", pcm: new Uint8Array([1, 2]), sampleRate: 48000 }),
    isAudioError("TAMV_AUDIO_PROVIDER_UNAVAILABLE"),
  );
});

test("partial analysis keeps missing metrics null instead of inventing them", async () => {
  const { gateway, events } = harness({ analysis: { truePeakDb: -1.2 } });
  const analysis = await gateway.analyze(
    { requestId: "req-9", pcm: new Uint8Array([1, 2]), sampleRate: 48000 },
    { consentGranted: true },
  );
  assert.equal(analysis.status, "computed");
  assert.equal(analysis.truePeakDb, -1.2);
  assert.equal(analysis.integratedLufs, null);
  assert.equal(analysis.chroma, null);
  assert.equal(events.at(-1)?.type, "audio.analysis.computed");
});

test("an empty provider report is reported as not-computed", async () => {
  const { gateway } = harness({ analysis: null });
  const analysis = await gateway.analyze(
    { requestId: "req-10", pcm: new Uint8Array([1]), sampleRate: 44100 },
    { consentGranted: true },
  );
  assert.equal(analysis.status, "not-computed");
  assert.equal(analysis.truePeakDb, null);
  assert.equal(analysis.integratedLufs, null);
  assert.equal(analysis.chroma, null);
  assert.match(analysis.notes.join(" "), /no (?:numeric )?analysis/);
});

test("malformed chroma is rejected rather than silently dropped", () => {
  assert.throws(
    () => normalizeAudioAnalysis({ chroma: [0, 1, 2] }),
    isAudioError("TAMV_AUDIO_ANALYSIS_INVALID"),
  );
});

test("request validation trims strings and rejects invalid durations", () => {
  const parsed = validateAudioRequest(request({ prompt: "  valid prompt  " }));
  assert.equal(parsed.prompt, "valid prompt");
  assert.throws(() => validateAudioRequest(request({ durationSeconds: 4 })), isAudioError("TAMV_AUDIO_INVALID"));
  assert.throws(() => validateAudioRequest(request({ sampleRate: 22050 })), isAudioError("TAMV_AUDIO_INVALID"));
  assert.throws(
    () => validateAudioRequest(request({ metadata: { title: "x", language: "not a tag" } })),
    isAudioError("TAMV_AUDIO_INVALID"),
  );
});
