// state: draft | engine-generated — pruebas de la superficie HTTP gobernada TAMV Music.
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import type { Application, Request, Response } from 'express';
import type { FixedWindowRateLimiter } from '../../src/security/rate-limit';
import { registerMusicRoutes } from '../../src/routes/music';
import { GENRES } from '../../src/music/genres';
import { createTask } from '../../src/music/task-store';
import { MUSIC_ENGINE_VERSION, MUSIC_METHOD_IDS, MUSIC_PROMPT_MAX_LENGTH } from '../../src/music/contract';
import { wavDataUrl } from '../music/fixtures';

type Handler = (req: Request, res: Response) => void | Promise<void>;

/**
 * Contrato exacto de la superficie. Las rutas se citan solas porque
 * `scripts/route-inventory.mjs` toma toda literal `/api/v1/...` de un archivo de prueba
 * como evidencia de que la prueba la ejercita: aquí sí la ejercitamos, ruta por ruta.
 */
const MUSIC_CONTRACT: readonly (readonly [string, string])[] = [
  ['GET', '/api/v1/music/status'],
  ['GET', '/api/v1/music/genres'],
  ['POST', '/api/v1/music/plan'],
  ['POST', '/api/v1/music/compose'],
  ['POST', '/api/v1/music/analyze'],
  ['POST', '/api/v1/music/master'],
  ['POST', '/api/v1/music/generate'],
  ['GET', '/api/v1/music/tasks/:taskId'],
];

interface HarnessOptions {
  readonly denyAdmin?: boolean;
  readonly rateLimited?: boolean;
}

interface Captured {
  status: number;
  body: Record<string, unknown>;
}

function harness(options: HarnessOptions = {}) {
  const handlers = new Map<string, Handler>();
  const register = (method: string) => (path: string, handler: Handler) => {
    handlers.set(`${method} ${path}`, handler);
  };
  const app = { get: register('GET'), post: register('POST') } as unknown as Application;
  const evidence: Array<Record<string, unknown>> = [];
  const buckets: string[] = [];

  registerMusicRoutes({
    app,
    enforceRateLimit: (_req, _res, _limiter, bucket) => {
      buckets.push(bucket);
      if (options.rateLimited) {
        _res.status(429).json({ success: false, error: 'RATE_LIMITED' });
        return false;
      }
      return true;
    },
    rateLimiter: {} as FixedWindowRateLimiter,
    authorizeAdmin: (_req, res) => {
      if (!options.denyAdmin) return true;
      res.status(401).json({ success: false, error: 'UNAUTHORIZED' });
      return false;
    },
    recordEvidence: (event) => {
      evidence.push(event as unknown as Record<string, unknown>);
    },
  });

  const call = async (key: string, body?: unknown, params: Record<string, string> = {}): Promise<Captured> => {
    const captured: Captured = { status: 200, body: {} };
    const res = {
      status(code: number) {
        captured.status = code;
        return this;
      },
      json(payload: unknown) {
        captured.body = payload as Record<string, unknown>;
        return this;
      },
    } as unknown as Response;
    const req = { body, params, ip: '127.0.0.1', get: () => undefined, query: {} } as unknown as Request;
    await handlers.get(key)!(req, res);
    return captured;
  };

  return { handlers, evidence, buckets, call };
}

function bodyFor(key: string): Record<string, unknown> {
  if (key.endsWith('/analyze') || key.endsWith('/master')) return { dataUrl: wavDataUrl(220, 0.3) };
  return { prompt: 'lo-fi nocturno para estudiar' };
}

describe('Music rutas · superficie registrada', () => {
  it('las ocho rutas del contrato están montadas sobre /api/v1/music', () => {
    const h = harness();
    expect([...h.handlers.keys()].sort()).toEqual(
      MUSIC_CONTRACT.map(([method, path]) => `${method} ${path}`).sort()
    );
  });

  it('status no exige token y declara capacidades sin afirmar ejecución', async () => {
    const h = harness({ denyAdmin: true });
    const result = await h.call('GET /api/v1/music/status');
    expect(result.status).toBe(200);
    expect(result.body).toMatchObject({
      success: true,
      engineVersion: MUSIC_ENGINE_VERSION,
      midiRendered: false,
      audioRendered: false,
      executionPerformed: false,
    });
    const capabilities = result.body.capabilities as Record<string, unknown>;
    expect(capabilities.deterministicComposition).toBe(true);
    expect(capabilities.midiExport).toBe(true);
    expect(capabilities.lufsBs1770).toBe(true);
    expect(capabilities.truePeak).toBe(true);
    expect(typeof capabilities.externalGeneration).toBe('boolean');
  });

  it('genres lista la biblioteca completa sin dejar evidencia', async () => {
    const h = harness();
    const result = await h.call('GET /api/v1/music/genres');
    expect(result.status).toBe(200);
    expect(result.body.count).toBe(GENRES.length);
    const genres = result.body.genres as Array<Record<string, unknown>>;
    expect(genres).toHaveLength(GENRES.length);
    expect(genres[0].bpm).toBeDefined();
    expect(genres[0].layers).toBeDefined();
    expect(h.evidence).toEqual([]);
  });

  it('las lecturas GET no dejan evidencia: no se finge trazabilidad donde no hubo operación', async () => {
    const h = harness();
    await h.call('GET /api/v1/music/status');
    await h.call('GET /api/v1/music/genres');
    await h.call('GET /api/v1/music/tasks/:taskId', undefined, { taskId: 'no_existe' });
    expect(h.evidence).toEqual([]);
  });
});

describe('Music rutas · gobernanza de los POST', () => {
  const POST_KEYS = [
    'POST /api/v1/music/plan',
    'POST /api/v1/music/compose',
    'POST /api/v1/music/analyze',
    'POST /api/v1/music/master',
    'POST /api/v1/music/generate',
  ] as const;

  for (const key of POST_KEYS) {
    it(`${key} se cierra sin token y no produce evidencia`, async () => {
      const h = harness({ denyAdmin: true });
      const denied = await h.call(key, bodyFor(key));
      expect(denied.status).toBe(401);
      expect(denied.body.success).toBe(false);
      expect(h.evidence).toEqual([]);
      expect(h.buckets).toEqual([]);
    });

    it(`${key} con permiso pero fuera de cuota corta antes de procesar`, async () => {
      const h = harness({ rateLimited: true });
      const limited = await h.call(key, bodyFor(key));
      expect(limited.status).toBe(429);
      expect(h.evidence).toEqual([]);
      expect(h.buckets.length).toBe(1);
    });
  }

  for (const [key, methodId] of [
    ['POST /api/v1/music/plan', MUSIC_METHOD_IDS.plan],
    ['POST /api/v1/music/compose', MUSIC_METHOD_IDS.compose],
    ['POST /api/v1/music/analyze', MUSIC_METHOD_IDS.analyze],
    ['POST /api/v1/music/master', MUSIC_METHOD_IDS.master],
  ] as const) {
    it(`${key} registra su identidad de método al admitir trabajo real`, async () => {
      const h = harness();
      const ok = await h.call(key, bodyFor(key));
      expect(ok.status).toBe(200);
      expect(ok.body.success).toBe(true);
      expect(ok.body.authorizationPerformed).toBe(false);
      expect(ok.body.executionPerformed).toBe(false);
      expect(h.evidence).toHaveLength(1);
      expect(h.evidence[0].methodId).toBe(methodId);
      expect(h.evidence[0].principal).toBe('music');
    });
  }
});

describe('Music rutas · cuerpos de respuesta', () => {
  it('compose emite MIDI real (MThd) y un resumen del arreglo, no una maqueta', async () => {
    const h = harness();
    const result = await h.call('POST /api/v1/music/compose', { prompt: 'synthwave de neón', tempo: 110, key: 'A minor' });
    expect(result.status).toBe(200);
    expect(result.body.midiRendered).toBe(true);
    const midi = Buffer.from(result.body.midiBase64 as string, 'base64');
    expect(midi.subarray(0, 4).toString('ascii')).toBe('MThd');
    expect(result.body.midiBytes).toBe(midi.length);
    const arrangement = result.body.arrangement as Record<string, unknown>;
    expect(arrangement.bpm).toBe(110);
    expect((arrangement.tracks as unknown[]).length).toBeGreaterThan(0);
    expect(h.evidence[0].type).toBe('MUSIC_COMPOSE');
  });

  it('plan devuelve el agente de regla local cuando no hay Ollama', async () => {
    const h = harness();
    const result = await h.call('POST /api/v1/music/plan', { prompt: 'ambient para un documental' });
    expect(result.status).toBe(200);
    expect(result.body.engine).toBe('local-rule-agent');
    expect((result.body.plan as Record<string, unknown>).engine).toBe('local-rule-agent');
    expect(h.evidence[0].type).toBe('MUSIC_PLAN');
  });

  it('analyze mide LUFS y true-peak sobre el WAV recibido', async () => {
    const h = harness();
    const result = await h.call('POST /api/v1/music/analyze', { audio: { dataUrl: wavDataUrl(330, 0.25) } });
    expect(result.status).toBe(200);
    const analysis = result.body.analysis as Record<string, unknown>;
    expect(Number.isFinite(analysis.lufsIntegrated as number)).toBe(true);
    expect(analysis.channels).toBe(1);
    expect(analysis.sampleRate).toBe(22_050);
    expect(h.evidence[0].type).toBe('MUSIC_ANALYSIS');
  });

  it('master devuelve WAV real (RIFF) con before/after y la profundidad pedida', async () => {
    const h = harness();
    const result = await h.call('POST /api/v1/music/master', { dataUrl: wavDataUrl(220, 0.3), loudness: -9, bitDepth: 24 });
    expect(result.status).toBe(200);
    expect(result.body.audioRendered).toBe(true);
    expect(result.body.bitDepth).toBe(24);
    const wav = Buffer.from(result.body.wavBase64 as string, 'base64');
    expect(wav.subarray(0, 4).toString('ascii')).toBe('RIFF');
    expect(result.body.wavBytes).toBe(wav.length);
    expect(result.body.before).toBeDefined();
    expect(result.body.after).toBeDefined();
    expect(h.evidence[0].riskTier).toBe('MEDIUM');
    expect(h.evidence[0].status).toBe('RENDERED_NOT_EXECUTED');
  });

  it('compose y plan rechazan prompt vacío o desmedido antes de gastar CPU', async () => {
    for (const key of ['POST /api/v1/music/compose', 'POST /api/v1/music/plan'] as const) {
      const h = harness();
      const empty = await h.call(key, {});
      expect(empty.status).toBe(400);
      expect(empty.body.error).toBe('MUSIC_PROMPT_EMPTY');
      const long = await h.call(key, { prompt: 'x'.repeat(MUSIC_PROMPT_MAX_LENGTH + 1) });
      expect(long.status).toBe(413);
      expect(long.body.error).toBe('MUSIC_PROMPT_TOO_LONG');
      expect(h.evidence).toEqual([]);
    }
  });

  it('analyze y master rechazan el payload con el motivo exacto mapeado a MUSIC_', async () => {
    const cases: Array<[unknown, string]> = [
      [{}, 'MUSIC_PAYLOAD_EMPTY'],
      [{ dataUrl: 'data:audio/wav;base64,' }, 'MUSIC_PAYLOAD_EMPTY'],
      [{ base64: 'no-es-base64!!', mimeType: 'audio/wav' }, 'MUSIC_BASE64_INVALID'],
      [{ base64: 'QUJD', mimeType: 'audio/mpeg' }, 'MUSIC_MIME_UNSUPPORTED'],
      [{ dataUrl: `data:audio/wav;base64,${'QUJD'.repeat(70_000)}` }, 'MUSIC_PAYLOAD_TOO_LARGE'],
      [{ dataUrl: 'data:image/png;base64,QUJD' }, 'MUSIC_MIME_UNSUPPORTED'],
    ];
    for (const key of ['POST /api/v1/music/analyze', 'POST /api/v1/music/master'] as const) {
      for (const [body, code] of cases) {
        const h = harness();
        const result = await h.call(key, body);
        expect(result.status).toBe(400);
        expect(result.body.error).toBe(code);
        expect(h.evidence).toEqual([]);
      }
    }
  });

  it('un WAV íntegro pero ilegible se devuelve como rechazo, no como análisis vacío', async () => {
    const fake = `data:audio/wav;base64,${Buffer.from('esto no es un RIFF').toString('base64')}`;
    const h = harness();
    const result = await h.call('POST /api/v1/music/analyze', { dataUrl: fake });
    expect(result.status).toBe(400);
    expect(result.body.error).toBe('MUSIC_WAV_UNDECODEABLE');
  });

  it('master valida el objetivo y la profundidad de bits antes de renderizar', async () => {
    const h = harness();
    const badTarget = await h.call('POST /api/v1/music/master', { dataUrl: wavDataUrl(), loudness: 5 });
    expect(badTarget.status).toBe(400);
    expect(badTarget.body.error).toBe('MUSIC_TARGET_INVALID');
    const badDepth = await h.call('POST /api/v1/music/master', { dataUrl: wavDataUrl(), bitDepth: 8 });
    expect(badDepth.status).toBe(400);
    expect(badDepth.body.error).toBe('MUSIC_BITDEPTH_INVALID');
    expect(h.evidence).toEqual([]);
  });
});

describe('Music rutas · generación externa fail-closed', () => {
  let snapshot: Record<string, string | undefined>;
  beforeEach(() => {
    snapshot = {
      MUSIC_PROVIDER: process.env.MUSIC_PROVIDER,
      LOCAL_MUSIC_API_URL: process.env.LOCAL_MUSIC_API_URL,
    };
    process.env.MUSIC_PROVIDER = 'local';
    delete process.env.LOCAL_MUSIC_API_URL;
  });
  afterEach(() => {
    for (const [key, value] of Object.entries(snapshot)) {
      if (value === undefined) delete process.env[key];
      else process.env[key] = value;
    }
  });

  it('generate sin proveedor configurado responde 503 honesto, sin evidencia', async () => {
    const h = harness();
    const result = await h.call('POST /api/v1/music/generate', { prompt: 'una canción' });
    expect(result.status).toBe(503);
    expect(result.body.error).toBe('MUSIC_PROVIDER_NOT_CONFIGURED');
    expect(h.evidence).toEqual([]);
  });

  it('generate exige prompt antes de tocar al proveedor', async () => {
    const h = harness();
    const result = await h.call('POST /api/v1/music/generate', {});
    expect(result.status).toBe(400);
    expect(result.body.error).toBe('MUSIC_PROMPT_EMPTY');
  });
});

describe('Music rutas · consulta de tareas', () => {
  it('devuelve la tarea registrada y 404 con motivo exacto si no existe', async () => {
    createTask({ taskId: 'task_prueba_music', provider: 'local', request: { prompt: 'x' } });
    const h = harness();
    const found = await h.call('GET /api/v1/music/tasks/:taskId', undefined, { taskId: 'task_prueba_music' });
    expect(found.status).toBe(200);
    expect((found.body.task as Record<string, unknown>).taskId).toBe('task_prueba_music');
    expect(found.body.executionPerformed).toBe(false);
    const missing = await h.call('GET /api/v1/music/tasks/:taskId', undefined, { taskId: 'no_existe' });
    expect(missing.status).toBe(404);
    expect(missing.body.error).toBe('MUSIC_TASK_NOT_FOUND');
  });
});