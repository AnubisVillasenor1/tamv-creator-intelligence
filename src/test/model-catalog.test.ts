import { describe, expect, it } from 'vitest';
import {
  MAX_CATALOG_BYTES,
  estimateModelCost,
  filterModels,
  fitsTokenBudget,
  parseModelCatalog,
  type CatalogModel,
  type ModelFilters,
} from '@/lib/model-catalog';

function catalogText(models: Record<string, unknown>, metadata: Record<string, unknown> = {}) {
  return JSON.stringify({ ...metadata, database: { providers: { fixture: { models } } } });
}

function model(overrides: Partial<CatalogModel> = {}): CatalogModel {
  return {
    key: JSON.stringify(['fixture', 'atlas']),
    provider: 'fixture',
    id: 'atlas',
    name: 'Atlas',
    inputPrice: 2,
    outputPrice: 4,
    contextLimit: 10_000,
    outputLimit: 3_000,
    inputModalities: ['text', 'image'],
    outputModalities: ['text'],
    tools: true,
    reasoning: true,
    ...overrides,
  };
}

const noFilters: ModelFilters = {
  query: '', provider: '', inputModality: '', tools: false, reasoning: false, minContext: 0,
};

const invalidBudgets = [
  { label: 'entrada negativa', input: -1, output: 0 },
  { label: 'salida negativa', input: 0, output: -1 },
  { label: 'entrada fraccionaria', input: 1.5, output: 0 },
  { label: 'salida fraccionaria', input: 0, output: 1.5 },
  { label: 'entrada NaN', input: NaN, output: 0 },
  { label: 'salida NaN', input: 0, output: NaN },
  { label: 'entrada infinita', input: Infinity, output: 0 },
  { label: 'salida infinita', input: 0, output: Infinity },
  { label: 'entrada no segura', input: Number.MAX_SAFE_INTEGER + 1, output: 0 },
  { label: 'salida no segura', input: 0, output: Number.MAX_SAFE_INTEGER + 1 },
  { label: 'suma no segura', input: Number.MAX_SAFE_INTEGER, output: 1 },
];

describe('parseModelCatalog', () => {
  it('normaliza database.providers.models y conserva el mismo ID en proveedores distintos', () => {
    const result = parseModelCatalog(JSON.stringify({
      database: { providers: {
        alpha: { models: { shared: {
          name: '  Atlas  ',
          cost: { input: 0, output: 4 },
          limit: { context: 128_000, output: 8_000 },
          modalities: { input: [' text ', 'image'], output: ['text'] },
          tool_call: false,
          reasoning: true,
        } } },
        beta: { models: { shared: {} } },
      } },
    }));

    expect(result).toEqual({
      refreshedAt: null,
      skippedModels: 0,
      models: [
        {
          key: JSON.stringify(['alpha', 'shared']), provider: 'alpha', id: 'shared', name: 'Atlas',
          inputPrice: 0, outputPrice: 4, contextLimit: 128_000, outputLimit: 8_000,
          inputModalities: ['text', 'image'], outputModalities: ['text'], tools: false, reasoning: true,
        },
        {
          key: JSON.stringify(['beta', 'shared']), provider: 'beta', id: 'shared', name: 'shared',
          inputPrice: null, outputPrice: null, contextLimit: null, outputLimit: null,
          inputModalities: [], outputModalities: [], tools: null, reasoning: null,
        },
      ],
    });
    expect(new Set(result.models.map(entry => entry.key)).size).toBe(2);
  });

  it('descarta campos extra de auth y url en todas las capas sin conservar sus marcadores', () => {
    // Son marcadores inertes: no contienen credenciales ni direcciones reales.
    const extras = { auth: 'AUTH_FIELD_MARKER_NOT_A_CREDENTIAL', url: 'URL_FIELD_MARKER_NOT_A_URL' };
    const result = parseModelCatalog(JSON.stringify({
      ...extras,
      database: { ...extras, providers: { fixture: {
        ...extras,
        models: { atlas: {
          ...extras,
          cost: { input: 2, ...extras },
          limit: { context: 10_000, ...extras },
          modalities: { input: ['text'], ...extras },
        } },
      } } },
    }));

    expect(result.models).toEqual([model({
      name: 'atlas', outputPrice: null, outputLimit: null,
      inputModalities: ['text'], outputModalities: [], tools: null, reasoning: null,
    })]);
    expect(JSON.stringify(result)).not.toContain(extras.auth);
    expect(JSON.stringify(result)).not.toContain(extras.url);
  });

  it('distingue precios ausentes de cero y capacidades false de desconocidas', () => {
    const { models } = parseModelCatalog(catalogText({
      missing: {},
      empty: { cost: {} },
      zero: { cost: { input: 0, output: 0 }, tool_call: false, reasoning: false },
      partial: { cost: { input: 0 }, tool_call: true, reasoning: true },
    }));

    expect(models.map(({ id, inputPrice, outputPrice, tools, reasoning }) =>
      ({ id, inputPrice, outputPrice, tools, reasoning }),
    )).toEqual([
      { id: 'missing', inputPrice: null, outputPrice: null, tools: null, reasoning: null },
      { id: 'empty', inputPrice: null, outputPrice: null, tools: null, reasoning: null },
      { id: 'zero', inputPrice: 0, outputPrice: 0, tools: false, reasoning: false },
      { id: 'partial', inputPrice: 0, outputPrice: null, tools: true, reasoning: true },
    ]);
  });

  it.each(['', ' ', '{', '{"database":', catalogText({ atlas: {} }).slice(0, -1)])(
    'rechaza JSON vacío, inválido o truncado: %j', text => {
      expect(() => parseModelCatalog(text)).toThrow('El archivo no contiene JSON válido.');
    },
  );

  it.each([
    null, [], 42, 'texto', {},
    { providers: {} },
    { database: null },
    { database: { providers: [] } },
    { database: { providers: { fixture: {} } } },
    { database: { providers: { fixture: { models: [] } } } },
    { database: { providers: { fixture: { models: null } } } },
  ].map(raw => ({ raw })))('rechaza una raíz que no cumple el formato: %j', ({ raw }) => {
    expect(() => parseModelCatalog(JSON.stringify(raw))).toThrow('Se esperaba database.providers');
  });

  it.each([
    { database: { providers: {} } },
    { database: { providers: { fixture: { models: {} } } } },
    { database: { providers: { fixture: { models: { bad: { cost: { input: -1 } } } } } } },
  ])('rechaza catálogos sin modelos válidos: %j', raw => {
    expect(() => parseModelCatalog(JSON.stringify(raw))).toThrow('El archivo no contiene modelos válidos');
  });

  it.each([
    { cost: { input: -1 } },
    { cost: { output: -0.01 } },
    { cost: { input: '0' } },
    { cost: { input: null } },
    { limit: { context: -1 } },
    { limit: { output: -1 } },
    { limit: { context: 1.5 } },
    { tool_call: 'false' },
    { reasoning: null },
    { name: ' ' },
    { modalities: { input: [''] } },
    null,
  ])('omite una entrada inválida sin perder las válidas: %j', invalid => {
    const result = parseModelCatalog(catalogText({ valid: {}, invalid }));
    expect(result.models.map(entry => entry.id)).toEqual(['valid']);
    expect(result.skippedModels).toBe(1);
  });

  it('conserva modelos de imagen con límites cero como límites desconocidos', () => {
    const result = parseModelCatalog(catalogText({ image: {
      limit: { context: 0, output: 0 },
      modalities: { input: ['text', 'image'], output: ['image'] },
    } }));
    expect(result.skippedModels).toBe(0);
    expect(result.models[0]).toMatchObject({ id: 'image', contextLimit: null, outputLimit: null, outputModalities: ['image'] });
  });

  it('omite identificadores vacíos o demasiado largos', () => {
    const result = parseModelCatalog(JSON.stringify({ database: { providers: {
      ' ': { models: { ignored: {} } },
      valid: { models: { '': {}, ['x'.repeat(241)]: {}, kept: {} } },
    } } }));
    expect(result.models.map(entry => [entry.provider, entry.id])).toEqual([['valid', 'kept']]);
    expect(result.skippedModels).toBe(3);
  });

  it('normaliza last_refresh a ISO UTC sin sustituirla por la fecha actual', () => {
    expect(parseModelCatalog(catalogText({ atlas: {} }, {
      last_refresh: '2026-11-13T03:04:05-06:00',
    })).refreshedAt).toBe('2026-11-13T09:04:05.000Z');
  });

  it.each([{}, { last_refresh: '' }, { last_refresh: 'fecha-desconocida' }])(
    'representa como null una fecha ausente o no interpretable: %j', metadata => {
      expect(parseModelCatalog(catalogText({ atlas: {} }, metadata)).refreshedAt).toBeNull();
    },
  );

  it('acepta el límite de tamaño exacto y rechaza el exceso, sin truncarlo', () => {
    const text = catalogText({ atlas: {} });
    const atLimit = text.padEnd(MAX_CATALOG_BYTES, ' ');
    expect(parseModelCatalog(atLimit).models.map(entry => entry.id)).toEqual(['atlas']);
    expect(() => parseModelCatalog(`${atLimit} `)).toThrow('El catálogo supera el límite de 16 MiB.');
  });

  it('rechaza más de 50.000 modelos en vez de devolver un catálogo parcial', () => {
    const models = Object.fromEntries(Array.from({ length: 50_001 }, (_, index) => [`model-${index}`, {}]));
    expect(() => parseModelCatalog(catalogText(models))).toThrow('El catálogo supera el límite de 50.000 modelos.');
  }, 10_000);
});

describe('filterModels', () => {
  const variants: Partial<CatalogModel>[] = [
    {}, { provider: 'other' }, { name: 'Different' }, { inputModalities: ['audio'] },
    { tools: false }, { tools: null }, { reasoning: false }, { reasoning: null },
    { contextLimit: 9_999 }, { contextLimit: null },
  ];
  const models = variants.map((overrides, index) => model({
    key: JSON.stringify(['fixture', `id-${index}`]), id: `id-${index}`, ...overrides,
  }));

  it('no filtra capacidades false/desconocidas ni límites desconocidos sin pedir confirmación', () => {
    expect(filterModels(models, noFilters)).toEqual(models);
  });

  it.each(['  aTlAs  ', 'ID-0', 'FIXTURE'])('busca sin distinguir mayúsculas en nombre, ID y proveedor: %s', query => {
    const result = filterModels([model({ id: 'id-0' })], { ...noFilters, query });
    expect(result).toHaveLength(1);
  });

  it('combina todos los filtros con AND y admite el contexto mínimo exacto', () => {
    const snapshot = models.map(entry => ({
      ...entry, inputModalities: [...entry.inputModalities], outputModalities: [...entry.outputModalities],
    }));
    const result = filterModels(models, {
      query: '  ATLAS  ', provider: 'fixture', inputModality: 'image',
      tools: true, reasoning: true, minContext: 10_000,
    });
    expect(result.map(entry => entry.id)).toEqual(['id-0']);
    expect(models).toEqual(snapshot);
  });

  it('no usa modalidades de salida como modalidades de entrada', () => {
    expect(filterModels([model({ inputModalities: ['text'], outputModalities: ['image'] })], {
      ...noFilters, inputModality: 'image',
    })).toEqual([]);
  });
});

describe('fitsTokenBudget', () => {
  it.each([
    { input: 0, output: 0, expected: true },
    { input: 10_000, output: 0, expected: true },
    { input: 7_000, output: 3_000, expected: true },
    { input: 7_001, output: 3_000, expected: false },
    { input: 6_000, output: 3_001, expected: false },
    { input: 10_001, output: 0, expected: false },
  ])('comprueba entrada + salida y salida máxima: $input / $output → $expected', ({ input, output, expected }) => {
    expect(fitsTokenBudget(model(), input, output)).toBe(expected);
  });

  it.each([
    { contextLimit: null, outputLimit: 3_000, input: 100, output: 100, expected: null },
    { contextLimit: 10_000, outputLimit: null, input: 100, output: 100, expected: null },
    { contextLimit: null, outputLimit: null, input: 0, output: 0, expected: null },
    { contextLimit: null, outputLimit: 3_000, input: 0, output: 3_001, expected: false },
    { contextLimit: 10_000, outputLimit: null, input: 9_000, output: 1_001, expected: false },
  ])('distingue límites desconocidos de una infracción conocida: %j', ({ contextLimit, outputLimit, input, output, expected }) => {
    expect(fitsTokenBudget(model({ contextLimit, outputLimit }), input, output)).toBe(expected);
  });

  it.each(invalidBudgets)('rechaza $label, incluso sin límites declarados', ({ input, output }) => {
    expect(fitsTokenBudget(model({ contextLimit: null, outputLimit: null }), input, output)).toBe(false);
  });
});

describe('estimateModelCost', () => {
  it('solo calcula USD por millón tras confirmar explícitamente las unidades', () => {
    expect(estimateModelCost(model(), 1_000, 2_000, false)).toBeNull();
    expect(estimateModelCost(model(), 1_000, 2_000, true)).toBeCloseTo(0.01, 10);
    expect(estimateModelCost(model({ inputPrice: 0, outputPrice: 0 }), 1_000, 2_000, false)).toBeNull();
    expect(estimateModelCost(model({ inputPrice: 0, outputPrice: 0 }), 1_000, 2_000, true)).toBe(0);
  });

  it.each([
    { inputPrice: null, outputPrice: 4, input: 1, output: 0, expected: null },
    { inputPrice: 2, outputPrice: null, input: 0, output: 1, expected: null },
    { inputPrice: null, outputPrice: 4, input: 0, output: 1_000, expected: 0.004 },
    { inputPrice: 2, outputPrice: null, input: 1_000, output: 0, expected: 0.002 },
    { inputPrice: null, outputPrice: null, input: 0, output: 0, expected: 0 },
  ])('solo exige tarifas para las direcciones con tokens consumidos: %j', ({ inputPrice, outputPrice, input, output, expected }) => {
    expect(estimateModelCost(model({ inputPrice, outputPrice }), input, output, true)).toBe(expected);
  });

  it.each([{ input: 7_001, output: 3_000 }, { input: 1, output: 3_001 }])(
    'no estima al superar contexto total o salida máxima: %j', ({ input, output }) => {
      expect(estimateModelCost(model(), input, output, true)).toBeNull();
    },
  );

  it('permite una estimación con tarifas conocidas sin afirmar que los límites desconocidos se cumplen', () => {
    const incomplete = model({ contextLimit: null, outputLimit: null });
    expect(fitsTokenBudget(incomplete, 1_000, 2_000)).toBeNull();
    expect(estimateModelCost(incomplete, 1_000, 2_000, true)).toBeCloseTo(0.01, 10);
  });

  it.each(invalidBudgets)('no estima con $label', ({ input, output }) => {
    expect(estimateModelCost(model(), input, output, true)).toBeNull();
  });

  it.each([
    { inputModalities: ['audio'] },
    { outputModalities: ['image'] },
    { inputModalities: [] },
    { outputModalities: [] },
  ])('no aplica tarifas de tokens de texto a modalidades distintas o desconocidas: %j', modalities => {
    expect(estimateModelCost(model(modalities), 1_000, 500, true)).toBeNull();
  });

  it('no devuelve una estimación infinita por desbordamiento', () => {
    expect(estimateModelCost(model({
      inputPrice: Number.MAX_VALUE, contextLimit: null, outputLimit: null,
    }), 2_000_000, 0, true)).toBeNull();
  });
});
