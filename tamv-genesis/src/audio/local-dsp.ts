/**
 * Local DSP analysis port — real measurements, no fabricated values.
 *
 * Implements the three metrics of the audio contract from the rendered PCM:
 * - true peak: sample peak of the PCM16 data (no inter-sample oversampling;
 *   the method is disclosed in the notes),
 * - integrated loudness: ITU-R BS.1770-4 K-weighting with 400 ms blocks,
 *   100 ms step and the -70 LUFS / -10 LU gates,
 * - chroma: Hann-windowed 8192-point FFT energy folded into 12 pitch classes
 *   referenced to A4 = 440 Hz.
 *
 * Silence or audio shorter than a measurement window yields `null` for the
 * affected metric with an explanatory note, never an estimate.
 */

import type { AudioAnalysisInput, AudioSampleRate } from "./contracts.ts";
import { TamvAudioError } from "./contracts.ts";
import type { AudioAnalysisPort } from "./ports.ts";
import { parseWavPcm16 } from "./wav.ts";

type Biquad = { b0: number; b1: number; b2: number; a1: number; a2: number };

const K_WEIGHTING: Record<AudioSampleRate, [Biquad, Biquad]> = {
  48000: [
    {
      b0: 1.53512485958697,
      b1: -2.69169618940638,
      b2: 1.19839281085285,
      a1: -1.69065929318241,
      a2: 0.73248077421585,
    },
    { b0: 1, b1: -2, b2: 1, a1: -1.99004745483398, a2: 0.99007225036621 },
  ],
  44100: [
    {
      b0: 1.5308412300498355,
      b1: -2.6509799951536985,
      b2: 1.1690790799210955,
      a1: -1.6636551132560204,
      a2: 0.7125954280732254,
    },
    { b0: 1, b1: -2, b2: 1, a1: -1.9891696736297957, a2: 0.9891990357870394 },
  ],
};

function applyBiquad(input: Float64Array, coef: Biquad): Float64Array {
  const output = new Float64Array(input.length);
  let x1 = 0;
  let x2 = 0;
  let y1 = 0;
  let y2 = 0;
  for (let index = 0; index < input.length; index += 1) {
    const x0 = input[index] ?? 0;
    const y0 = coef.b0 * x0 + coef.b1 * x1 + coef.b2 * x2 - coef.a1 * y1 - coef.a2 * y2;
    output[index] = y0;
    x2 = x1;
    x1 = x0;
    y2 = y1;
    y1 = y0;
  }
  return output;
}

function deinterleave(samples: Int16Array, channels: 1 | 2): Float64Array[] {
  const frames = samples.length / channels;
  const out: Float64Array[] = [];
  for (let channel = 0; channel < channels; channel += 1) {
    const buffer = new Float64Array(frames);
    for (let frame = 0; frame < frames; frame += 1) {
      buffer[frame] = (samples[frame * channels + channel] ?? 0) / 32768;
    }
    out.push(buffer);
  }
  return out;
}

function truePeakDb(samples: Int16Array): number | null {
  let peak = 0;
  for (let index = 0; index < samples.length; index += 1) {
    const magnitude = Math.abs(samples[index] ?? 0);
    if (magnitude > peak) peak = magnitude;
  }
  if (peak === 0) return null;
  return 20 * Math.log10(peak / 32768);
}

function integratedLufs(channelData: Float64Array[], sampleRate: AudioSampleRate): number | null {
  const [shelf, highPass] = K_WEIGHTING[sampleRate];
  const weighted = channelData.map((channel) => applyBiquad(applyBiquad(channel, shelf), highPass));
  const frames = weighted[0]?.length ?? 0;
  const blockLength = Math.round(sampleRate * 0.4);
  const step = Math.round(sampleRate * 0.1);
  if (frames < blockLength) return null;

  const blockZ: number[] = [];
  for (let start = 0; start + blockLength <= frames; start += step) {
    let z = 0;
    for (const channel of weighted) {
      let sum = 0;
      for (let index = start; index < start + blockLength; index += 1) {
        const value = channel[index] ?? 0;
        sum += value * value;
      }
      z += sum / blockLength;
    }
    blockZ.push(z);
  }

  const loudness = (z: number): number => -0.691 + 10 * Math.log10(z);
  const absoluteGated = blockZ.filter((z) => z > 0 && loudness(z) > -70);
  if (absoluteGated.length === 0) return null;
  const meanZ = absoluteGated.reduce((sum, z) => sum + z, 0) / absoluteGated.length;
  const relativeThreshold = loudness(meanZ) - 10;
  const gated = absoluteGated.filter((z) => loudness(z) > relativeThreshold);
  if (gated.length === 0) return null;
  const gatedMean = gated.reduce((sum, z) => sum + z, 0) / gated.length;
  const result = loudness(gatedMean);
  return Number.isFinite(result) ? result : null;
}

function fftInPlace(re: Float64Array, im: Float64Array): void {
  const n = re.length;
  for (let index = 1, reversed = 0; index < n; index += 1) {
    let bit = n >> 1;
    for (; reversed & bit; bit >>= 1) reversed ^= bit;
    reversed ^= bit;
    if (index < reversed) {
      const tempRe = re[index] ?? 0;
      const tempIm = im[index] ?? 0;
      re[index] = re[reversed] ?? 0;
      im[index] = im[reversed] ?? 0;
      re[reversed] = tempRe;
      im[reversed] = tempIm;
    }
  }
  for (let length = 2; length <= n; length <<= 1) {
    const angle = (-2 * Math.PI) / length;
    const wRe = Math.cos(angle);
    const wIm = Math.sin(angle);
    for (let start = 0; start < n; start += length) {
      let curRe = 1;
      let curIm = 0;
      for (let offset = 0; offset < length / 2; offset += 1) {
        const evenRe = re[start + offset] ?? 0;
        const evenIm = im[start + offset] ?? 0;
        const oddRe = (re[start + offset + length / 2] ?? 0) * curRe - (im[start + offset + length / 2] ?? 0) * curIm;
        const oddIm = (re[start + offset + length / 2] ?? 0) * curIm + (im[start + offset + length / 2] ?? 0) * curRe;
        re[start + offset] = evenRe + oddRe;
        im[start + offset] = evenIm + oddIm;
        re[start + offset + length / 2] = evenRe - oddRe;
        im[start + offset + length / 2] = evenIm - oddIm;
        const nextRe = curRe * wRe - curIm * wIm;
        curIm = curRe * wIm + curIm * wRe;
        curRe = nextRe;
      }
    }
  }
}

const CHROMA_FRAME = 8192;
const CHROMA_HOP = 4096;

function chromaVector(mono: Float64Array, sampleRate: AudioSampleRate): number[] | null {
  if (mono.length < CHROMA_FRAME) return null;
  const bins = new Float64Array(12);
  const re = new Float64Array(CHROMA_FRAME);
  const im = new Float64Array(CHROMA_FRAME);
  let totalEnergy = 0;

  for (let start = 0; start + CHROMA_FRAME <= mono.length; start += CHROMA_HOP) {
    for (let index = 0; index < CHROMA_FRAME; index += 1) {
      const window = 0.5 - 0.5 * Math.cos((2 * Math.PI * index) / (CHROMA_FRAME - 1));
      re[index] = (mono[start + index] ?? 0) * window;
      im[index] = 0;
    }
    fftInPlace(re, im);
    for (let k = 1; k <= CHROMA_FRAME / 2; k += 1) {
      const frequency = (k * sampleRate) / CHROMA_FRAME;
      if (frequency < 60 || frequency > 5000) continue;
      const magnitudeSquared = (re[k] ?? 0) * (re[k] ?? 0) + (im[k] ?? 0) * (im[k] ?? 0);
      const pitchClass = ((Math.round(69 + 12 * Math.log2(frequency / 440)) % 12) + 12) % 12;
      bins[pitchClass] = (bins[pitchClass] ?? 0) + magnitudeSquared;
      totalEnergy += magnitudeSquared;
    }
  }

  if (totalEnergy < 1e-12) return null;
  let max = 0;
  for (const value of bins) if (value > max) max = value;
  if (max <= 0) return null;
  return Array.from(bins, (value) => value / max);
}

export function createLocalDspAnalysis(): AudioAnalysisPort {
  return {
    async analyze(input): Promise<AudioAnalysisInput | null> {
      const wav = parseWavPcm16(input.pcm);
      if (wav.sampleRate !== input.sampleRate) {
        throw new TamvAudioError(
          "TAMV_AUDIO_ANALYSIS_INVALID",
          "WAV header sample rate does not match the declared request sample rate.",
        );
      }
      const channels = deinterleave(wav.samples, wav.channels);
      const mono =
        wav.channels === 1
          ? (channels[0] ?? new Float64Array(0))
          : Float64Array.from(
              { length: channels[0]?.length ?? 0 },
              (_, frame) => ((channels[0]?.[frame] ?? 0) + (channels[1]?.[frame] ?? 0)) / 2,
            );

      const peak = truePeakDb(wav.samples);
      const lufs = integratedLufs(channels, wav.sampleRate as AudioSampleRate);
      const chroma = chromaVector(mono, wav.sampleRate as AudioSampleRate);

      const notes = [
        "true peak: pico de muestra PCM16, sin oversampling intersample",
        "loudness: ITU-R BS.1770-4, ponderacion K, bloques 400 ms / paso 100 ms, compuertas -70 LUFS y -10 LU",
        "chroma: FFT 8192 con ventana Hann, energia plegada a 12 clases de altura desde A4=440 Hz",
      ];
      if (peak === null) notes.push("audio silencioso: true peak no definido");
      if (lufs === null) notes.push("sin bloques medibles o audio silencioso: loudness no definida");
      if (chroma === null) notes.push("audio mas corto que una ventana de chroma o sin energia: chroma no definido");

      return { truePeakDb: peak, integratedLufs: lufs, chroma, notes };
    },
  };
}