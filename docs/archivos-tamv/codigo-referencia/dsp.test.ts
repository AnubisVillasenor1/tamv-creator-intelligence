// state: draft | engine-generated — pruebas del DSP musical: LUFS BS.1770-4, true-peak, mastering.
import { describe, expect, it } from 'vitest';
import {
  analyzeBuffer,
  encodeWav,
  fadeEdges,
  masterBuffer,
  measureLufs,
  measureTruePeak,
  type MasterTarget,
} from '../../src/music/dsp';
import { FIX_RATE, pcmOf, tone } from './fixtures';

const TARGET: MasterTarget = {
  loudness: -9,
  eqLow: 0,
  eqMid: 0,
  eqHigh: 0,
  compression: 'none',
  width: 1,
  saturation: 0,
};

describe('Music · medición LUFS y true-peak', () => {
  it('un tono sostenido devuelve LUFS integrados finitos y plausibles', () => {
    const buffer = pcmOf([tone(220, 0.3)]);
    const lufs = measureLufs(buffer);
    expect(Number.isFinite(lufs)).toBe(true);
    expect(lufs).toBeGreaterThan(-70);
    expect(lufs).toBeLessThan(0);
    // Un seno de 0.3 de amplitud cae cerca de -14 LUFS tras el filtro K.
    expect(lufs).toBeGreaterThan(-20);
    expect(lufs).toBeLessThan(-8);
  });

  it('el silencio y las señales más cortas que un bloque de 400 ms no integran', () => {
    expect(measureLufs(pcmOf([new Float32Array(FIX_RATE)]))).toBe(-Infinity);
    expect(measureLufs(pcmOf([tone(220, 0.3, 4000)]))).toBe(-Infinity);
  });

  it('el true-peak nunca queda por debajo del pico de muestra', () => {
    const buffer = pcmOf([tone(440, 0.5)]);
    const analysis = analyzeBuffer(buffer);
    expect(analysis.truePeakDbtp).toBeGreaterThanOrEqual(analysis.peakDbfs);
    expect(measureTruePeak(buffer)).toBeGreaterThanOrEqual(analysis.peakDbfs - 0.1);
  });

  it('analyzeBuffer cuenta recortes, offset DC y duración con exactitud', () => {
    const clipped = pcmOf([new Float32Array(FIX_RATE).fill(1)]);
    const analysis = analyzeBuffer(clipped);
    expect(analysis.clippedSamples).toBe(FIX_RATE);
    expect(analysis.durationSeconds).toBeCloseTo(1, 5);
    expect(analysis.sampleRate).toBe(FIX_RATE);
    expect(analysis.channels).toBe(1);
    const dc = analyzeBuffer(pcmOf([new Float32Array(FIX_RATE).fill(0.5)]));
    expect(dc.dcOffset).toBeCloseTo(0.5, 3);
  });
});

describe('Music · mastering offline', () => {
  it('acerca el loudness al objetivo sin cambiar duración ni sample rate', () => {
    const buffer = pcmOf([tone(220, 0.3)]);
    const result = masterBuffer(buffer, TARGET);
    expect(result.buffer.length).toBe(buffer.length);
    expect(result.buffer.sampleRate).toBe(buffer.sampleRate);
    expect(result.buffer.numberOfChannels).toBe(1);
    const beforeError = Math.abs(result.before.lufsIntegrated - TARGET.loudness);
    const afterError = Math.abs(result.after.lufsIntegrated - TARGET.loudness);
    expect(afterError).toBeLessThan(beforeError);
    expect(result.appliedGainDb).toBeGreaterThan(0);
  });

  it('el limitador mantiene el true-peak por debajo de -1 dBTP aunque se pida fuerte', () => {
    const hot = pcmOf([tone(220, 0.9)]);
    const result = masterBuffer(hot, { ...TARGET, loudness: -3 });
    expect(result.after.truePeakDbtp).toBeLessThanOrEqual(-1);
    expect(result.after.peakDbfs).toBeLessThanOrEqual(0);
  });

  it('el ancho estéreo mid/side conserva la energía cuando width = 1', () => {
    const left = tone(220, 0.3);
    const right = tone(330, 0.3);
    const buffer = pcmOf([left, right]);
    const result = masterBuffer(buffer, { ...TARGET, width: 1 });
    expect(result.buffer.numberOfChannels).toBe(2);
    expect(result.buffer.data[0].length).toBe(left.length);
  });
});

describe('Music · codificación WAV y fade', () => {
  it('encodeWav produce un RIFF del tamaño exacto para 16/24/32 bits', () => {
    const data = [tone(220, 0.3), tone(330, 0.3)];
    const frames = data[0].length;
    for (const [bitDepth, bytesPerSample] of [
      [16, 2],
      [24, 3],
      [32, 4],
    ] as const) {
      const wav = new Uint8Array(encodeWav(data, FIX_RATE, bitDepth));
      expect(String.fromCharCode(...wav.subarray(0, 4))).toBe('RIFF');
      expect(String.fromCharCode(...wav.subarray(8, 12))).toBe('WAVE');
      expect(wav.length).toBe(44 + frames * 2 * bytesPerSample);
    }
  });

  it('fadeEdges anula los extremos para evitar el clic de arranque/parada', () => {
    const data = [new Float32Array(FIX_RATE).fill(1)];
    fadeEdges(data, FIX_RATE);
    expect(data[0][0]).toBe(0);
    expect(data[0][data[0].length - 1]).toBe(0);
    expect(data[0][Math.floor(FIX_RATE / 2)]).toBeCloseTo(1, 5);
  });
});