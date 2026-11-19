// state: draft | engine-generated — pruebas del exportador MIDI formato 1 real.
import { describe, expect, it } from 'vitest';
import { compose } from '../../src/music/arrangement';
import { arrangementToMidi, createMidi } from '../../src/music/midi';

/** Recorre los chunks MThd/MTrk del archivo: valida el contenedor, no solo el magic. */
function parseMidi(bytes: Uint8Array) {
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  const tag = (offset: number) => String.fromCharCode(...bytes.subarray(offset, offset + 4));
  expect(tag(0)).toBe('MThd');
  expect(view.getUint32(4)).toBe(6);
  const format = view.getUint16(8);
  const trackCount = view.getUint16(10);
  const division = view.getUint16(12);
  const tracks: Array<{ size: number; endsWithEndOfTrack: boolean }> = [];
  let offset = 14;
  while (offset + 8 <= bytes.length) {
    const id = tag(offset);
    const size = view.getUint32(offset + 4);
    const start = offset + 8;
    const end = start + size;
    expect(end).toBeLessThanOrEqual(bytes.length);
    if (id === 'MTrk') {
      const last3 = bytes.subarray(end - 3, end);
      tracks.push({ size, endsWithEndOfTrack: last3[0] === 0xff && last3[1] === 0x2f && last3[2] === 0x00 });
    }
    offset = end;
  }
  expect(offset).toBe(bytes.length);
  return { format, trackCount, division, tracks };
}

describe('Music · exportador MIDI', () => {
  it('emite un archivo formato 1 multitrack con división de 480 ticks', () => {
    const arr = compose({ prompt: 'synthwave ochentero', seed: 'midi' });
    const bytes = arrangementToMidi(arr);
    const parsed = parseMidi(bytes);
    expect(parsed.format).toBe(1);
    expect(parsed.division).toBe(480);
    // 1 conductor + una pista por capa + batería.
    const expectedTracks = 1 + arr.tracks.length + (arr.drums.length ? 1 : 0);
    expect(parsed.trackCount).toBe(expectedTracks);
    expect(parsed.tracks.length).toBe(expectedTracks);
    expect(parsed.tracks.every((t) => t.endsWithEndOfTrack)).toBe(true);
  });

  it('es determinista: el mismo arreglo produce los mismos bytes', () => {
    const arr = compose({ prompt: 'casa tropical', seed: 'determinista' });
    const a = arrangementToMidi(arr);
    const b = arrangementToMidi(arr);
    expect(Buffer.from(a).equals(Buffer.from(b))).toBe(true);
  });

  it('createMidi compone y exporta en un paso, con tempo y tonalidad pedidos', () => {
    const bytes = createMidi('balada triste de piano', 72, 'A minor');
    const parsed = parseMidi(bytes);
    expect(parsed.format).toBe(1);
    expect(parsed.trackCount).toBeGreaterThan(1);
    expect(bytes.length).toBeGreaterThan(100);
  });

  it('el tempo del conductor refleja los BPM del arreglo', () => {
    const arr = compose({ prompt: 'drill oscuro', bpm: 140, seed: 'tempo' });
    const bytes = arrangementToMidi(arr);
    const micros = Math.round(60_000_000 / arr.bpm);
    // El meta de tempo (FF 51 03) vive en la primera pista, al inicio.
    const needle = Buffer.from([0xff, 0x51, 0x03, (micros >>> 16) & 255, (micros >>> 8) & 255, micros & 255]);
    expect(Buffer.from(bytes).includes(needle)).toBe(true);
  });
});