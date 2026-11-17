/**
 * Minimal RIFF/WAVE PCM16 codec shared by the local synthesis provider and the
 * local DSP analysis port. Only what the audio contract accepts is parsed:
 * PCM format 1, 16 bits, one or two channels. Anything else is rejected instead
 * of being guessed, so no analysis value is ever derived from misread bytes.
 */

import { TamvAudioError } from "./contracts.ts";

export const WAV_MAX_BYTES = 32 * 1024 * 1024;

export type WavPcm16 = {
  sampleRate: number;
  channels: 1 | 2;
  /** Interleaved signed 16-bit samples. */
  samples: Int16Array;
};

function fail(detail: string): never {
  throw new TamvAudioError("TAMV_AUDIO_ANALYSIS_INVALID", detail);
}

function ascii(bytes: Uint8Array, offset: number, length: number): string {
  let out = "";
  for (let index = 0; index < length; index += 1) {
    const byte = bytes[offset + index];
    if (byte === undefined) fail("truncated RIFF header.");
    out += String.fromCharCode(byte);
  }
  return out;
}

function readU32LE(bytes: Uint8Array, offset: number): number {
  const a = bytes[offset];
  const b = bytes[offset + 1];
  const c = bytes[offset + 2];
  const d = bytes[offset + 3];
  if (a === undefined || b === undefined || c === undefined || d === undefined) {
    fail("truncated 32-bit field.");
  }
  return (a | (b << 8) | (c << 16) | (d << 24)) >>> 0;
}

function readU16LE(bytes: Uint8Array, offset: number): number {
  const a = bytes[offset];
  const b = bytes[offset + 1];
  if (a === undefined || b === undefined) fail("truncated 16-bit field.");
  return a | (b << 8);
}

export function parseWavPcm16(bytes: Uint8Array): WavPcm16 {
  if (!(bytes instanceof Uint8Array) || bytes.byteLength < 44) {
    fail("WAV input is empty or too short.");
  }
  if (bytes.byteLength > WAV_MAX_BYTES) fail("WAV input exceeds the analysis byte budget.");
  if (ascii(bytes, 0, 4) !== "RIFF" || ascii(bytes, 8, 4) !== "WAVE") {
    fail("input is not a RIFF/WAVE file.");
  }
  const riffSize = readU32LE(bytes, 4);
  if (riffSize + 8 > bytes.byteLength) fail("declared RIFF size exceeds the actual bytes.");

  let offset = 12;
  let sampleRate = 0;
  let channels = 0;
  let bitsPerSample = 0;
  let audioFormat = 0;
  let dataOffset = -1;
  let dataLength = 0;

  while (offset + 8 <= bytes.byteLength) {
    const chunkId = ascii(bytes, offset, 4);
    const chunkSize = readU32LE(bytes, offset + 4);
    const body = offset + 8;
    if (body + chunkSize > bytes.byteLength) fail(`truncated ${chunkId} chunk.`);
    if (chunkId === "fmt ") {
      if (chunkSize < 16) fail("fmt chunk is too short.");
      audioFormat = readU16LE(bytes, body);
      channels = readU16LE(bytes, body + 2);
      sampleRate = readU32LE(bytes, body + 4);
      bitsPerSample = readU16LE(bytes, body + 14);
    } else if (chunkId === "data") {
      dataOffset = body;
      dataLength = chunkSize;
    }
    offset = body + chunkSize + (chunkSize % 2);
  }

  if (audioFormat !== 1) fail("only uncompressed PCM (format 1) is supported.");
  if (bitsPerSample !== 16) fail("only 16-bit samples are supported.");
  if (channels !== 1 && channels !== 2) fail("only mono or stereo is supported.");
  if (sampleRate !== 44100 && sampleRate !== 48000) fail("unsupported sample rate.");
  if (dataOffset < 0 || dataLength === 0) fail("missing or empty data chunk.");
  if (dataLength % (2 * channels) !== 0) fail("data chunk is not aligned to whole frames.");

  const frames = dataLength / (2 * channels);
  const samples = new Int16Array(frames * channels);
  for (let index = 0; index < samples.length; index += 1) {
    const low = bytes[dataOffset + index * 2];
    const high = bytes[dataOffset + index * 2 + 1];
    if (low === undefined || high === undefined) fail("truncated sample data.");
    samples[index] = (low | (high << 8)) << 16 >> 16;
  }
  return { sampleRate, channels: channels as 1 | 2, samples };
}

export function encodeWavPcm16Mono(samples: Int16Array, sampleRate: number): Uint8Array {
  const dataBytes = samples.length * 2;
  const out = new Uint8Array(44 + dataBytes);
  const view = new DataView(out.buffer);
  const writeTag = (offset: number, tag: string): void => {
    for (let index = 0; index < 4; index += 1) out[offset + index] = tag.charCodeAt(index);
  };
  writeTag(0, "RIFF");
  view.setUint32(4, 36 + dataBytes, true);
  writeTag(8, "WAVE");
  writeTag(12, "fmt ");
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true);
  view.setUint16(22, 1, true);
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, sampleRate * 2, true);
  view.setUint16(32, 2, true);
  view.setUint16(34, 16, true);
  writeTag(36, "data");
  view.setUint32(40, dataBytes, true);
  for (let index = 0; index < samples.length; index += 1) {
    view.setInt16(44 + index * 2, samples[index] ?? 0, true);
  }
  return out;
}