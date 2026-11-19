// state: draft | engine-generated — pruebas del agente de dirección musical (regla local).
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { createLocalPlan, planMusic } from '../../src/music/agent';

describe('Music · agente de dirección', () => {
  it('el plan local es determinista para el mismo prompt', () => {
    const a = createLocalPlan('lo-fi soñador para estudiar de noche');
    const b = createLocalPlan('lo-fi soñador para estudiar de noche');
    expect(a).toEqual(b);
    expect(a.engine).toBe('local-rule-agent');
  });

  it('extrae género, tempo e instrumentos del lenguaje natural', () => {
    const plan = createLocalPlan('jazz relajado a 120 bpm con piano y bass');
    expect(plan.genre).toBe('jazz');
    expect(plan.tempo).toBe(120);
    expect(plan.instruments).toContain('piano');
    expect(plan.instruments).toContain('bass');
  });

  it('extrae la tonalidad cuando encabeza el prompt', () => {
    const plan = createLocalPlan('A minor jazz suave de medianoche');
    expect(plan.key).toBe('A minor');
  });

  it('limitación conocida del heurístico portado: el artículo "a" se confunde con tónica', () => {
    // El regex /\b([A-G]...)/i del agente original captura la primera palabra que empieza
    // por A-G; en "… a 120 bpm en A minor" gana el artículo "a", no la tonalidad real.
    // Se documenta el comportamiento real en vez de reescribir el módulo (AGENTS.md §6).
    const plan = createLocalPlan('jazz relajado a 120 bpm en A minor');
    expect(plan.key).not.toBe('A minor');
    expect(plan.key.toLowerCase().startsWith('a')).toBe(true);
  });

  it('acota tempo, título e instrumentos a los límites del contrato', () => {
    const plan = createLocalPlan('una idea larguísima '.repeat(20) + ' a 999 bpm');
    expect(plan.tempo).toBeLessThanOrEqual(180);
    expect(plan.tempo).toBeGreaterThanOrEqual(50);
    expect(plan.title.length).toBeLessThanOrEqual(60);
    expect(plan.instruments.length).toBeLessThanOrEqual(5);
    expect(plan.structure.length).toBeGreaterThan(0);
  });

  describe('planMusic sin Ollama configurado', () => {
    let previous: string | undefined;
    beforeEach(() => {
      previous = process.env.OLLAMA_BASE_URL;
      delete process.env.OLLAMA_BASE_URL;
    });
    afterEach(() => {
      if (previous === undefined) delete process.env.OLLAMA_BASE_URL;
      else process.env.OLLAMA_BASE_URL = previous;
    });

    it('cae al agente de regla local, sin red y sin fingir un modelo', async () => {
      const plan = await planMusic('ambient cinematográfico para un documental');
      expect(plan.engine).toBe('local-rule-agent');
      expect(plan.prompt).toBe('ambient cinematográfico para un documental');
    });
  });
});