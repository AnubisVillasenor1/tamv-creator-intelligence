// state: draft | engine-generated — pruebas de selección de proveedor y fail-closed.
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { getMusicProvider, getMusicProviderId } from '../../src/music/providers';
import { LocalMusicProvider } from '../../src/music/providers/local';
import { ProviderNotConfiguredError, isNotConfigured } from '../../src/music/providers/errors';

const ENV_KEYS = [
  'MUSIC_PROVIDER',
  'API_KEY',
  'LOCAL_MUSIC_API_URL',
  'LOCAL_MUSIC_API_KEY',
  'HUGGINGFACEHUB_API_TOKEN',
  'REPLICATE_API_TOKEN',
  'FAL_KEY',
] as const;

describe('Music · selección de proveedor', () => {
  let snapshot: Record<string, string | undefined>;
  beforeEach(() => {
    snapshot = {};
    for (const key of ENV_KEYS) {
      snapshot[key] = process.env[key];
      delete process.env[key];
    }
  });
  afterEach(() => {
    for (const key of ENV_KEYS) {
      const value = snapshot[key];
      if (value === undefined) delete process.env[key];
      else process.env[key] = value;
    }
  });

  it('MUSIC_PROVIDER explícito manda y se valida contra la lista soportada', () => {
    process.env.MUSIC_PROVIDER = 'replicate';
    expect(getMusicProviderId()).toBe('replicate');
    process.env.MUSIC_PROVIDER = 'FAL';
    expect(getMusicProviderId()).toBe('fal');
    process.env.MUSIC_PROVIDER = 'inventado';
    expect(() => getMusicProviderId()).toThrow(ProviderNotConfiguredError);
  });

  it('sin variable explícita autodetecta en orden de coste', () => {
    expect(getMusicProviderId()).toBe('local');
    process.env.FAL_KEY = 'x';
    expect(getMusicProviderId()).toBe('fal');
    process.env.REPLICATE_API_TOKEN = 'x';
    expect(getMusicProviderId()).toBe('replicate');
    process.env.HUGGINGFACEHUB_API_TOKEN = 'x';
    expect(getMusicProviderId()).toBe('huggingface');
    process.env.LOCAL_MUSIC_API_URL = 'http://localhost:8000';
    expect(getMusicProviderId()).toBe('local');
    process.env.API_KEY = 'x';
    expect(getMusicProviderId()).toBe('suno');
  });

  it('getMusicProvider devuelve una instancia cuya identidad coincide', () => {
    process.env.MUSIC_PROVIDER = 'local';
    const provider = getMusicProvider();
    expect(provider.id).toBe('local');
    expect(typeof provider.generate).toBe('function');
  });

  it('el proveedor local sin URL falla cerrado, no inventa un endpoint', async () => {
    const provider = new LocalMusicProvider();
    await expect(provider.generate({ prompt: 'algo' })).rejects.toBeInstanceOf(ProviderNotConfiguredError);
    try {
      await provider.generate({ prompt: 'algo' });
    } catch (error) {
      expect(isNotConfigured(error)).toBe(true);
    }
    expect(isNotConfigured(new Error('caída normal'))).toBe(false);
  });
});