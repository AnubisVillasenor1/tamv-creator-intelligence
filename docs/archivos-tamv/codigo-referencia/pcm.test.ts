// state: draft | engine-generated — pruebas del adaptador WAV → PcmBuffer musical.
import { describe, expect, it } from 'vitest';
import { isMusicPcmFailure, pcmFromWavBytes } from '../../src/music/pcm';
import { FIX_RATE, monoWav, stereoWav, tone } from './fixtures';

describe('Music · adaptador PCM', () => {
  it('decodifica un WAV mono real al PcmBuffer que consume el DSP', () => {
    const pcm = pcmFromWavBytes(monoWav(tone(220, 0.3)));
    expect(isMusicPcmFailure(pcm)).toBe(false);
    if (isMusicPcmFailure(pcm)) throw new Error('inesperado');
    expect(pcm.numberOfChannels).toBe(1);
    expect(pcm.length).toBe(FIX_RATE);
    expect(pcm.sampleRate).toBe(FIX_RATE);
    expect(pcm.getChannelData(0).length).toBe(FIX_RATE);
  });

  it('conserva los dos canales de un WAV estéreo', () => {
    const pcm = pcmFromWavBytes(stereoWav(tone(220, 0.3), tone(330, 0.3)));
    if (isMusicPcmFailure(pcm)) throw new Error('inesperado');
    expect(pcm.numberOfChannels).toBe(2);
    expect(pcm.getChannelData(1).length).toBe(FIX_RATE);
  });

  it('rechaza con el motivo exacto, sin lanzar excepción', () => {
    const cases: Array<[Uint8Array, string]> = [
      [new Uint8Array(0), 'MUSIC_PAYLOAD_EMPTY'],
      [new Uint8Array(180_001), 'MUSIC_PAYLOAD_TOO_LARGE'],
      [new Uint8Array(Buffer.from('esto no es un RIFF')), 'MUSIC_WAV_UNDECODEABLE'],
      [monoWav(tone(220, 0.3, 1000)), 'MUSIC_SIGNAL_TOO_SHORT'],
    ];
    for (const [bytes, code] of cases) {
      const result = pcmFromWavBytes(bytes);
      expect(isMusicPcmFailure(result)).toBe(true);
      if (!isMusicPcmFailure(result)) throw new Error('inesperado');
      expect(result.code).toBe(code);
      expect(typeof result.message).toBe('string');
    }
  });

  it('isMusicPcmFailure distingue el fallo del búfer válido', () => {
    expect(isMusicPcmFailure({ code: 'X', message: 'y' })).toBe(true);
    expect(isMusicPcmFailure({ numberOfChannels: 1 })).toBe(false);
    expect(isMusicPcmFailure(null)).toBe(false);
  });
});