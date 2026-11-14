import { z } from 'zod';

export const MAX_CATALOG_BYTES = 16 * 1024 * 1024;
const MAX_MODELS = 50_000;
const identifier = z.string().trim().min(1).max(240);
const price = z.number().finite().nonnegative();
const tokenLimit = z.number().int().nonnegative().max(Number.MAX_SAFE_INTEGER);
const modalities = z.array(z.string().trim().min(1).max(32)).max(16);
const modelSchema = z.object({
  name: identifier.optional(),
  cost: z.object({ input: price.optional(), output: price.optional() }).optional(),
  limit: z.object({ context: tokenLimit.optional(), output: tokenLimit.optional() }).optional(),
  modalities: z.object({ input: modalities.optional(), output: modalities.optional() }).optional(),
  tool_call: z.boolean().optional(),
  reasoning: z.boolean().optional(),
});
const catalogSchema = z.object({
  database: z.object({
    providers: z.record(z.object({ models: z.record(z.unknown()) })),
  }),
  last_refresh: z.string().max(80).optional(),
});

export type CatalogModel = {
  key: string;
  provider: string;
  id: string;
  name: string;
  inputPrice: number | null;
  outputPrice: number | null;
  contextLimit: number | null;
  outputLimit: number | null;
  inputModalities: string[];
  outputModalities: string[];
  tools: boolean | null;
  reasoning: boolean | null;
};

export type ModelCatalog = {
  models: CatalogModel[];
  refreshedAt: string | null;
  skippedModels: number;
};

export type ModelFilters = {
  query: string;
  provider: string;
  inputModality: string;
  tools: boolean;
  reasoning: boolean;
  minContext: number;
};

export function parseModelCatalog(text: string): ModelCatalog {
  if (text.length > MAX_CATALOG_BYTES) throw new Error('El catálogo supera el límite de 16 MiB.');
  let raw: unknown;
  try {
    raw = JSON.parse(text);
  } catch {
    throw new Error('El archivo no contiene JSON válido.');
  }
  const parsed = catalogSchema.safeParse(raw);
  if (!parsed.success) throw new Error('Se esperaba database.providers con un objeto models por proveedor.');

  const models: CatalogModel[] = [];
  let skippedModels = 0;
  let totalModels = 0;
  for (const [provider, data] of Object.entries(parsed.data.database.providers)) {
    for (const [id, value] of Object.entries(data.models)) {
      totalModels += 1;
      if (totalModels > MAX_MODELS) throw new Error('El catálogo supera el límite de 50.000 modelos.');
      const entry = modelSchema.safeParse(value);
      if (!identifier.safeParse(provider).success || !identifier.safeParse(id).success || !entry.success) {
        skippedModels += 1;
        continue;
      }
      const model = entry.data;
      models.push({
        key: JSON.stringify([provider, id]),
        provider,
        id,
        name: model.name ?? id,
        inputPrice: model.cost?.input ?? null,
        outputPrice: model.cost?.output ?? null,
        // Zero is also used for non-token models, not a confirmed zero-token capacity.
        contextLimit: model.limit?.context || null,
        outputLimit: model.limit?.output || null,
        inputModalities: model.modalities?.input ?? [],
        outputModalities: model.modalities?.output ?? [],
        tools: model.tool_call ?? null,
        reasoning: model.reasoning ?? null,
      });
    }
  }
  if (!models.length) throw new Error('El archivo no contiene modelos válidos; el catálogo anterior se conserva.');
  const refreshed = parsed.data.last_refresh ? Date.parse(parsed.data.last_refresh) : NaN;
  return {
    models,
    refreshedAt: Number.isFinite(refreshed) ? new Date(refreshed).toISOString() : null,
    skippedModels,
  };
}

export function filterModels(models: CatalogModel[], filters: ModelFilters): CatalogModel[] {
  const query = filters.query.trim().toLocaleLowerCase();
  return models.filter(model =>
    (!query || `${model.provider} ${model.id} ${model.name}`.toLocaleLowerCase().includes(query)) &&
    (!filters.provider || model.provider === filters.provider) &&
    (!filters.inputModality || model.inputModalities.includes(filters.inputModality)) &&
    (!filters.tools || model.tools === true) &&
    (!filters.reasoning || model.reasoning === true) &&
    (filters.minContext === 0 || (model.contextLimit !== null && model.contextLimit >= filters.minContext)),
  );
}

export function fitsTokenBudget(model: CatalogModel, inputTokens: number, outputTokens: number): boolean | null {
  if (!Number.isSafeInteger(inputTokens) || inputTokens < 0 || !Number.isSafeInteger(outputTokens) || outputTokens < 0 || !Number.isSafeInteger(inputTokens + outputTokens)) return false;
  if (model.contextLimit !== null && inputTokens + outputTokens > model.contextLimit) return false;
  if (model.outputLimit !== null && outputTokens > model.outputLimit) return false;
  if (model.contextLimit === null || model.outputLimit === null) return null;
  return true;
}

export function estimateModelCost(
  model: CatalogModel,
  inputTokens: number,
  outputTokens: number,
  usdPerMillionConfirmed: boolean,
): number | null {
  if (!usdPerMillionConfirmed || fitsTokenBudget(model, inputTokens, outputTokens) === false) return null;
  if ((inputTokens > 0 && !model.inputModalities.includes('text')) || (outputTokens > 0 && !model.outputModalities.includes('text'))) return null;
  if ((inputTokens > 0 && model.inputPrice === null) || (outputTokens > 0 && model.outputPrice === null)) return null;
  const total = inputTokens / 1_000_000 * (model.inputPrice ?? 0) + outputTokens / 1_000_000 * (model.outputPrice ?? 0);
  return Number.isFinite(total) ? total : null;
}
