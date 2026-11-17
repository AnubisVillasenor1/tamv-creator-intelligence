/**
 * Local synthesis + local DSP: known-vector tests.
 *
 * The DSP assertions use physically verifiable properties (sine peak, 6 dB per
 * amplitude halving, +3 LU for dual-mono stereo, pitch-class of pure tones)
 * instead of magic constants, so a regression in the filters or the FFT fails
 * here before any route reports a fabricated number.
 */

import test from "node:test";
import assert from "node:assert/strict";

import {
  AUDIO_REQUEST_SCHEMA,
  createAudioPipeline,
  createLocalDspAnalysis,
  createLocalSynthesisProvider,
  encodeWavPcm16Mono,
  LOCAL_SYNTH_PROVIDER,
  normalizeAudioAnalysis,
  parseWavPcm16,
  TamvAudioError,
  type AudioJob,
  type AudioRequest,
} from "../src/audio/index.ts";

function baseRequest(overrides: Partial<AudioRequest> = {}): AudioRequest {
  return {
    schema: AUDIO_REQUEST_SCHEMA,
    mode: "instrumental",
    prompt: "Cama instrumental calida para prueba",
    durationSeconds: 5,
    sampleRate: 44100,
    format: "wav",
    rights: { license: "original", attestationId: "rights-test-0001" },
    consent: { granted: true, subject: "creator-test", scope: "audio.production" },
    metadata: { title: "Test bed", language: "es-MX" },
    ...overrides,
  };
}

function jobFor(request: AudioRequest): AudioJob {
  return {
    schema: AUDIO_REQUEST_SCHEMA,
    jobId: "job-test-1",
    requestId: "req-test-1",
    queuedAt: new Date().toISOString(),
    capability: "audio.production",
    request,
  };
}

function sineSamples(frequency: number, amplitude: number, seconds: number, sampleRate: number): Int16Array {
  const total = Math.round(seconds * sampleRate);
  const samples = new Int16Array(total);
  for (let index = 0; index < total; index += 1) {
    samples[index] = Math.round(amplitude * Math.sin((2 * Math.PI * frequency * index) / sampleRate) * 32767);
  }
  return samples;
}

function stereoWav(left: Int16Array, right: Int16Array, sampleRate: number): Uint8Array {
  const frames = Math.min(left.length, right.length);
  const dataBytes = frames * 4;
  const out = new Uint8Array(44 + dataBytes);
  const view = new DataView(out.buffer);
  const tag = (offset: number, text: string): void => {
    for (let index = 0; index < 4; index += 1) out[offset + index] = text.charCodeAt(index);
  };
  tag(0, "RIFF");
  view.setUint32(4, 36 + dataBytes, true);
  tag(8, "WAVE");
  tag(12, "fmt ");
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true);
  view.setUint16(22, 2, true);
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, sampleRate * 4, true);
  view.setUint16(32, 4, true);
  view.setUint16(34, 16, true);
  tag(36, "data");
  view.setUint32(40, dataBytes, true);
  for (let frame = 0; frame < frames; frame += 1) {
    view.setInt16(44 + frame * 4, left[frame] ?? 0, true);
    view.setInt16(46 + frame * 4, right[frame] ?? 0, true);
  }
  return out;
}

const dsp = createLocalDspAnalysis();
const synth = createLocalSynthesisProvider();

test("local synth renders deterministic, parseable WAV labelled as procedural", async () => {
  const request = baseRequest();
  const first = await synth.generate({ job: jobFor(request), attempt: 1 });
  const second = await synth.generate({ job: jobFor(request), attempt: 1 });
  assert.deepEqual(first.bytes, second.bytes);
  assert.equal(first.provider, LOCAL_SYNTH_PROVIDER);
  assert.equal(first.contentType, "audio/wav");
  assert.equal(first.sampleRate, 44100);
  assert.equal(first.durationSeconds, 5);
  assert.equal(first.model, undefined);

  const wav = parseWavPcm16(first.bytes);
  assert.equal(wav.channels, 1);
  assert.equal(wav.sampleRate, 44100);
  assert.equal(wav.samples.length, 5 * 44100);

  const other = await synth.generate({ job: jobFor(baseRequest({ prompt: "Otro prompt distinto" })), attempt: 1 });
  assert.notDeepEqual(first.bytes, other.bytes);
});

test("local synth fails closed for FLAC and over-long durations", async () => {
  await assert.rejects(
    synth.generate({ job: jobFor(baseRequest({ format: "flac" })), attempt: 1 }),
    (error: unknown) => error instanceof TamvAudioError && error.code === "TAMV_AUDIO_PROVIDER_UNAVAILABLE",
  );
  await assert.rejects(
    synth.generate({ job: jobFor(baseRequest({ durationSeconds: 61 })), attempt: 1 }),
    (error: unknown) => error instanceof TamvAudioError && error.code === "TAMV_AUDIO_PROVIDER_UNAVAILABLE",
  );
});

test("true peak of a 0.5 amplitude sine is -6.02 dBFS", async () => {
  const bytes = encodeWavPcm16Mono(sineSamples(1000, 0.5, 2, 48000), 48000);
  const report = await dsp.analyze({ requestId: "req-peak", pcm: bytes, sampleRate: 48000 });
  assert.ok(report);
  assert.ok(report.truePeakDb !== null && report.truePeakDb !== undefined);
  assert.ok(Math.abs(report.truePeakDb - -6.0206) < 0.01, `truePeakDb=${report.truePeakDb}`);
});

test("K-weighted loudness halves by 6 LU and dual-mono stereo adds 3 LU", async () => {
  const loud = encodeWavPcm16Mono(sineSamples(1000, 0.5, 3, 48000), 48000);
  const quiet = encodeWavPcm16Mono(sineSamples(1000, 0.25, 3, 48000), 48000);
  const loudReport = await dsp.analyze({ requestId: "req-loud", pcm: loud, sampleRate: 48000 });
  const quietReport = await dsp.analyze({ requestId: "req-quiet", pcm: quiet, sampleRate: 48000 });
  assert.ok(loudReport?.integratedLufs != null);
  assert.ok(quietReport?.integratedLufs != null);
  assert.ok(loudReport.integratedLufs > -15 && loudReport.integratedLufs < -3);
  assert.ok(Math.abs(loudReport.integratedLufs - quietReport.integratedLufs - 6.0206) < 0.05);

  const sine = sineSamples(1000, 0.5, 3, 48000);
  const stereo = stereoWav(sine, sine, 48000);
  const stereoReport = await dsp.analyze({ requestId: "req-stereo", pcm: stereo, sampleRate: 48000 });
  assert.ok(stereoReport?.integratedLufs != null);
  assert.ok(Math.abs(stereoReport.integratedLufs - loudReport.integratedLufs - 3.0103) < 0.05);
});

test("silence yields null metrics, never estimates", async () => {
  const silence = encodeWavPcm16Mono(new Int16Array(48000 * 2), 48000);
  const report = await dsp.analyze({ requestId: "req-silence", pcm: silence, sampleRate: 48000 });
  assert.ok(report);
  assert.equal(report.truePeakDb, null);
  assert.equal(report.integratedLufs, null);
  assert.equal(report.chroma, null);
  assert.equal(normalizeAudioAnalysis(report).status, "not-computed");
});

test("chroma identifies the pitch class of pure tones", async () => {
  const cases: Array<[number, number]> = [
    [440, 9],
    [261.63, 0],
    [329.63, 4],
  ];
  for (const [frequency, expectedClass] of cases) {
    const bytes = encodeWavPcm16Mono(sineSamples(frequency, 0.6, 3, 48000), 48000);
    const report = await dsp.analyze({ requestId: `req-chroma-${frequency}`, pcm: bytes, sampleRate: 48000 });
    assert.ok(report?.chroma, `chroma missing for ${frequency} Hz`);
    assert.equal(report.chroma.length, 12);
    let argmax = 0;
    for (let index = 1; index < 12; index += 1) {
      if ((report.chroma[index] ?? 0) > (report.chroma[argmax] ?? 0)) argmax = index;
    }
    assert.equal(argmax, expectedClass, `expected class ${expectedClass} for ${frequency} Hz`);
  }
});

test("short audio reports null for windows it cannot fill", async () => {
  const short = encodeWavPcm16Mono(sineSamples(440, 0.5, 0.1, 48000), 48000);
  const report = await dsp.analyze({ requestId: "req-short", pcm: short, sampleRate: 48000 });
  assert.ok(report);
  assert.ok(report.truePeakDb != null);
  assert.equal(report.integratedLufs, null);
  assert.equal(report.chroma, null);
});

test("malformed or mismatched WAV is rejected, not guessed", async () => {
  const garbage = new Uint8Array(64).fill(7);
  await assert.rejects(
    dsp.analyze({ requestId: "req-garbage", pcm: garbage, sampleRate: 48000 }),
    (error: unknown) => error instanceof TamvAudioError && error.code === "TAMV_AUDIO_ANALYSIS_INVALID",
  );
  const wav441 = encodeWavPcm16Mono(sineSamples(440, 0.5, 1, 44100), 44100);
  await assert.rejects(
    dsp.analyze({ requestId: "req-mismatch", pcm: wav441, sampleRate: 48000 }),
    (error: unknown) => error instanceof TamvAudioError && error.code === "TAMV_AUDIO_ANALYSIS_INVALID",
  );
  const truncated = wav441.slice(0, 60);
  await assert.rejects(
    dsp.analyze({ requestId: "req-truncated", pcm: truncated, sampleRate: 44100 }),
    (error: unknown) => error instanceof TamvAudioError,
  );
});

test("pipeline end to end: local synth + local DSP produce a verified succeeded job", async () => {
  const pipeline = createAudioPipeline({
    certification: {
      async requireCapability({ consentGranted }) {
        if (!consentGranted) throw new TamvAudioError("TAMV_AUDIO_CONSENT_REQUIRED", "denied");
      },
    },
    provider: synth,
    analysis: dsp,
  });
  const submission = await pipeline.gateway.submit(baseRequest());
  assert.equal(submission.status, "queued");
  const runs = await pipeline.worker.runUntilIdle(10);
  assert.equal(runs.length, 1);
  const run = runs[0];
  assert.ok(run && run.status === "succeeded");
  if (!run || run.status !== "succeeded") return;
  const record = run.record;
  assert.equal(record.analysis?.status, "computed");
  assert.ok(record.analysis?.truePeakDb != null);
  assert.ok(Math.abs((record.analysis?.truePeakDb ?? 0) - -1.0) < 0.05, "normalized to -1 dBFS");
  assert.equal(record.analysis?.chroma?.length, 12);
  assert.ok(record.artifact);
  if (!record.artifact) return;
  assert.equal(record.artifact.provider, LOCAL_SYNTH_PROVIDER);

  const stored = await pipeline.storage.get(record.artifact.key);
  assert.ok(stored);
  if (!stored) return;
  const digest = await crypto.subtle.digest("SHA-256", stored);
  const hex = Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, "0")).join("");
  assert.equal(record.artifact.sha256, `sha256:${hex}`);
  const wav = parseWavPcm16(stored);
  assert.equal(wav.samples.length, 5 * 44100);
});

test("pipeline denies submission without consent before queueing", async () => {
  const pipeline = createAudioPipeline({
    certification: {
      async requireCapability() {
        throw new TamvAudioError("TAMV_AUDIO_CERTIFICATION_DENIED", "denied");
      },
    },
    provider: synth,
    analysis: dsp,
  });
  await assert.rejects(
    pipeline.gateway.submit(baseRequest({ consent: { granted: false, subject: "creator-test", scope: "audio.production" } })),
    (error: unknown) => error instanceof TamvAudioError && error.code === "TAMV_AUDIO_CONSENT_REQUIRED",
  );
  assert.equal(pipeline.queue.size(), 0);
});