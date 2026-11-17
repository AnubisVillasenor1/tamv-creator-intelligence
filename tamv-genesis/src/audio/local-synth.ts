/**
 * Deterministic local synthesis provider.
 *
 * This is procedural additive synthesis seeded by the request digest — not a
 * neural music model and not a voice clone. It exists so the audio pipeline can
 * be exercised end to end with real, measurable audio while no external
 * generation provider is connected. The artifact is labelled honestly:
 * `provider: "tamv-local-procedural-synth"`, no `model` field. The same request
 * always renders byte-identical audio; a different prompt renders different
 * audio. Only WAV is rendered; FLAC fails closed instead of being faked.
 */

import { TamvAudioError, type AudioRequest } from "./contracts.ts";
import type {
  AudioGeneratedArtifact,
  AudioGenerationInput,
  AudioGenerationPort,
} from "./ports.ts";
import { encodeWavPcm16Mono } from "./wav.ts";

export const LOCAL_SYNTH_PROVIDER = "tamv-local-procedural-synth";
export const LOCAL_SYNTH_MAX_DURATION_SECONDS = 60;

function mulberry32(seed: number): () => number {
  let state = seed >>> 0;
  return () => {
    state = (state + 0x6d2b79f5) >>> 0;
    let t = state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

async function seedFromRequest(request: AudioRequest): Promise<number> {
  const canonical = JSON.stringify({
    mode: request.mode,
    prompt: request.prompt,
    durationSeconds: request.durationSeconds,
    sampleRate: request.sampleRate,
    format: request.format,
    title: request.metadata.title,
  });
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(canonical));
  const view = new DataView(digest);
  return view.getUint32(0, true);
}

type Partial_ = { frequency: number; amplitude: number; phase: number };

function buildPartials(request: AudioRequest, random: () => number): Partial_[] {
  const minor = [0, 2, 3, 5, 7, 8, 10];
  const major = [0, 2, 4, 5, 7, 9, 11];
  const scale = request.mode === "background" ? minor : major;
  const rootSemitone = scale[Math.floor(random() * scale.length)] ?? 0;
  const root = 110 * Math.pow(2, rootSemitone / 12);
  const third = request.mode === "background" ? 3 : 4;
  const chord = [0, third, 7, 12];
  const partials: Partial_[] = [];
  const count = request.mode === "background" ? 3 : 5;
  for (let index = 0; index < count; index += 1) {
    const semitone = chord[index % chord.length] ?? 0;
    const octave = index >= chord.length ? 2 : 1;
    partials.push({
      frequency: root * Math.pow(2, semitone / 12) * octave,
      amplitude: (request.mode === "background" ? 0.18 : 0.3) / (index + 1),
      phase: random() * Math.PI * 2,
    });
  }
  return partials;
}

function renderSamples(request: AudioRequest, partials: Partial_[], random: () => number): Int16Array {
  const total = request.durationSeconds * request.sampleRate;
  const samples = new Int16Array(total);
  const attack = Math.max(1, Math.floor(total * 0.04));
  const release = Math.max(1, Math.floor(total * 0.12));
  const tremoloHz = 0.15 + random() * 0.35;
  const twoPi = Math.PI * 2;

  const oscillators = partials.map((partial) => ({
    cos: Math.cos((twoPi * partial.frequency) / request.sampleRate),
    sin: Math.sin((twoPi * partial.frequency) / request.sampleRate),
    re: Math.cos(partial.phase),
    im: Math.sin(partial.phase),
    amplitude: partial.amplitude,
  }));

  let peak = 0;
  const floats = new Float64Array(total);
  for (let index = 0; index < total; index += 1) {
    let value = 0;
    for (const oscillator of oscillators) {
      value += oscillator.im * oscillator.amplitude;
      const nextRe = oscillator.re * oscillator.cos - oscillator.im * oscillator.sin;
      const nextIm = oscillator.re * oscillator.sin + oscillator.im * oscillator.cos;
      oscillator.re = nextRe;
      oscillator.im = nextIm;
    }
    const tremolo = 1 - 0.12 * (0.5 + 0.5 * Math.sin((twoPi * tremoloHz * index) / request.sampleRate));
    let envelope = 1;
    if (index < attack) envelope = index / attack;
    else if (index >= total - release) envelope = Math.max(0, (total - index) / release);
    const sample = value * tremolo * envelope;
    floats[index] = sample;
    const magnitude = Math.abs(sample);
    if (magnitude > peak) peak = magnitude;
  }

  // Normalize to -1 dBFS so the local provider never ships clipped audio.
  const gain = peak > 0 ? 0.891 / peak : 0;
  for (let index = 0; index < total; index += 1) {
    const scaled = Math.round((floats[index] ?? 0) * gain * 32767);
    samples[index] = Math.max(-32768, Math.min(32767, scaled));
  }
  return samples;
}

export function createLocalSynthesisProvider(): AudioGenerationPort {
  return {
    async generate(input: AudioGenerationInput): Promise<AudioGeneratedArtifact> {
      const request = input.job.request;
      if (request.format !== "wav") {
        throw new TamvAudioError(
          "TAMV_AUDIO_PROVIDER_UNAVAILABLE",
          "the local procedural provider renders WAV only; connect a licensed FLAC encoder before accepting FLAC.",
        );
      }
      if (request.durationSeconds > LOCAL_SYNTH_MAX_DURATION_SECONDS) {
        throw new TamvAudioError(
          "TAMV_AUDIO_PROVIDER_UNAVAILABLE",
          `the local procedural provider renders up to ${LOCAL_SYNTH_MAX_DURATION_SECONDS}s per job.`,
        );
      }
      const seed = await seedFromRequest(request);
      const random = mulberry32(seed);
      const partials = buildPartials(request, random);
      const samples = renderSamples(request, partials, random);
      return {
        bytes: encodeWavPcm16Mono(samples, request.sampleRate),
        contentType: "audio/wav",
        sampleRate: request.sampleRate,
        durationSeconds: request.durationSeconds,
        provider: LOCAL_SYNTH_PROVIDER,
      };
    },
  };
}