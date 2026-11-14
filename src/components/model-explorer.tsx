import { useMemo, useRef, useState } from 'react';
import { Cpu, FileJson, ShieldCheck, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  MAX_CATALOG_BYTES,
  estimateModelCost,
  filterModels,
  fitsTokenBudget,
  parseModelCatalog,
  type CatalogModel,
  type ModelCatalog,
  type ModelFilters,
} from '@/lib/model-catalog';

const PAGE_SIZE = 25;
const initialFilters: ModelFilters = { query: '', provider: '', inputModality: '', tools: false, reasoning: false, minContext: 0 };
const capabilityLabel = (value: boolean | null) => value === null ? 'Sin datos' : value ? 'Sí' : 'No';
const costLabel = (value: number | null) => value === null ? 'Sin estimación' : `USD ${value.toLocaleString('es-MX', { maximumSignificantDigits: 6 })}`;

export function ModelExplorer() {
  const [catalog, setCatalog] = useState<ModelCatalog>();
  const [filters, setFilters] = useState(initialFilters);
  const [inputTokens, setInputTokens] = useState('1000');
  const [outputTokens, setOutputTokens] = useState('2400');
  const [confirmedUnits, setConfirmedUnits] = useState(false);
  const [sort, setSort] = useState('name');
  const [page, setPage] = useState(0);
  const [selected, setSelected] = useState<string[]>([]);
  const [error, setError] = useState('');
  const [importing, setImporting] = useState(false);
  const importSequence = useRef(0);
  const inputBudget = inputTokens.trim() ? Number(inputTokens) : NaN;
  const outputBudget = outputTokens.trim() ? Number(outputTokens) : NaN;
  const budgetValid = Number.isSafeInteger(inputBudget) && inputBudget >= 0 && Number.isSafeInteger(outputBudget) && outputBudget >= 0 && Number.isSafeInteger(inputBudget + outputBudget);
  const providers = useMemo(() => [...new Set(catalog?.models.map(model => model.provider) ?? [])].sort(), [catalog]);
  const inputModalities = useMemo(() => [...new Set(catalog?.models.flatMap(model => model.inputModalities) ?? [])].sort(), [catalog]);
  const filtered = useMemo(() => filterModels(catalog?.models ?? [], filters).sort((a, b) => {
    if (sort === 'cost') {
      const first = estimateModelCost(a, inputBudget, outputBudget, confirmedUnits);
      const second = estimateModelCost(b, inputBudget, outputBudget, confirmedUnits);
      if (first === null && second !== null) return 1;
      if (first !== null && second === null) return -1;
      if (first !== null && second !== null && first !== second) return first - second;
    }
    return a.name.localeCompare(b.name) || a.provider.localeCompare(b.provider) || a.id.localeCompare(b.id);
  }), [catalog, filters, sort, inputBudget, outputBudget, confirmedUnits]);
  const pages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const currentPage = Math.min(page, pages - 1);
  const visible = filtered.slice(currentPage * PAGE_SIZE, (currentPage + 1) * PAGE_SIZE);
  const comparison = catalog?.models.filter(model => selected.includes(model.key)) ?? [];

  function updateFilters(change: Partial<ModelFilters>) {
    setFilters(previous => ({ ...previous, ...change }));
    setPage(0);
  }

  async function importCatalog(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.currentTarget.files?.[0];
    event.currentTarget.value = '';
    if (!file) return;
    const sequence = ++importSequence.current;
    setError('');
    setImporting(true);
    try {
      if (file.size > MAX_CATALOG_BYTES) throw new Error('El archivo supera el límite de 16 MiB.');
      const parsed = parseModelCatalog(await file.text());
      if (sequence !== importSequence.current) return;
      setCatalog(parsed);
      setFilters(initialFilters);
      setSelected([]);
      setPage(0);
      setConfirmedUnits(false);
      setSort('name');
    } catch (caught) {
      if (sequence === importSequence.current) setError(caught instanceof Error ? caught.message : 'No se pudo leer el catálogo.');
    } finally {
      if (sequence === importSequence.current) setImporting(false);
    }
  }

  function clearCatalog() {
    importSequence.current += 1;
    setCatalog(undefined);
    setSelected([]);
    setFilters(initialFilters);
    setError('');
    setImporting(false);
    setConfirmedUnits(false);
    setSort('name');
    setPage(0);
  }

  function budgetLabel(model: CatalogModel) {
    if (!budgetValid) return 'Revisa los tokens';
    const fits = fitsTokenBudget(model, inputBudget, outputBudget);
    return fits === null ? 'Límites incompletos' : fits ? 'Dentro de los límites declarados' : 'Supera los límites declarados';
  }

  return <section aria-labelledby="model-explorer-title">
    <div className="page-title">
      <div><span className="eyebrow">PLANIFICACIÓN LOCAL / SIN INFERENCIA</span><h1 id="model-explorer-title">Modelos y costes</h1><p>Compara capacidades declaradas antes de elegir una integración.</p></div>
      <Cpu size={30} className="text-primary shrink-0"/>
    </div>
    <div className="rounded-xl border border-border p-5 space-y-4">
      <div className="flex gap-3 items-start"><ShieldCheck size={20} className="text-primary shrink-0"/><p className="text-sm text-muted-foreground">El archivo se procesa en este navegador, sin subirlo, guardarlo ni enviarlo a IA. Solo se conservan metadatos de modelos en memoria. No importes credenciales, sesiones ni copias completas de herramientas.</p></div>
      <label htmlFor="model-catalog-file" className="field-label flex items-center gap-2"><FileJson size={16}/>Importar models_dev.json</label>
      <input id="model-catalog-file" type="file" accept=".json,application/json" onChange={importCatalog} className="field" aria-describedby="catalog-format"/>
      <p id="catalog-format" className="text-xs text-muted-foreground">Formato: database.providers → models. Máximo 16 MiB. Reemplazar un catálogo no modifica el archivo original.</p>
      {importing && <p role="status" className="text-sm">Leyendo catálogo local…</p>}
      {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
      {(catalog || importing) && <Button variant="outline" onClick={clearCatalog}><X size={16}/>Vaciar catálogo local</Button>}
    </div>
    {!catalog && <div className="py-12 text-center text-muted-foreground"><h2 className="text-lg font-medium text-foreground">Convierte tu catálogo en decisiones comparables.</h2><p className="mt-3 text-sm">Busca por proveedor, filtra texto, imagen o audio y compara hasta tres modelos. Importar un modelo no lo habilita en Lovable.</p></div>}
    {catalog && <>
      <div className="my-6 space-y-2 text-sm" aria-live="polite">
        <p><strong>{catalog.models.length.toLocaleString('es-MX')}</strong> modelos · {providers.length} proveedores · {catalog.skippedModels} entradas inválidas omitidas.</p>
        <p className="text-muted-foreground">Fecha declarada por el archivo: {catalog.refreshedAt ? new Date(catalog.refreshedAt).toLocaleDateString('es-MX') : 'no disponible'}. No es una verificación en vivo.</p>
        {catalog.refreshedAt && Date.now() - Date.parse(catalog.refreshedAt) > 30 * 86_400_000 && <p className="text-amber-700 dark:text-amber-400">El catálogo tiene más de 30 días. Confirma precios, límites y disponibilidad antes de contratar o ejecutar.</p>}
      </div>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div><label htmlFor="model-search" className="field-label">Buscar modelo</label><input id="model-search" className="field" value={filters.query} onChange={event => updateFilters({ query: event.target.value })} placeholder="Nombre, ID o proveedor"/></div>
        <div><label htmlFor="model-provider" className="field-label">Proveedor</label><select id="model-provider" className="field" value={filters.provider} onChange={event => updateFilters({ provider: event.target.value })}><option value="">Todos</option>{providers.map(provider => <option key={provider} value={provider}>{provider}</option>)}</select></div>
        <div><label htmlFor="model-modality" className="field-label">Modalidad de entrada</label><select id="model-modality" className="field" value={filters.inputModality} onChange={event => updateFilters({ inputModality: event.target.value })}><option value="">Todas</option>{inputModalities.map(modality => <option key={modality} value={modality}>{modality}</option>)}</select></div>
        <div><label htmlFor="model-context" className="field-label">Contexto mínimo</label><select id="model-context" className="field" value={filters.minContext} onChange={event => updateFilters({ minContext: Number(event.target.value) })}>{[0, 32000, 128000, 1000000].map(value => <option key={value} value={value}>{value ? value.toLocaleString('es-MX') : 'Sin mínimo'}</option>)}</select></div>
      </div>
      <div className="flex flex-wrap gap-5 my-4 text-sm">
        <label className="flex items-center gap-2"><input type="checkbox" checked={filters.tools} onChange={event => updateFilters({ tools: event.target.checked })}/>Llamada a herramientas</label>
        <label className="flex items-center gap-2"><input type="checkbox" checked={filters.reasoning} onChange={event => updateFilters({ reasoning: event.target.checked })}/>Razonamiento</label>
      </div>
      <fieldset className="border border-border rounded-xl p-5 my-6 space-y-4">
        <legend className="px-2 font-medium">Presupuesto orientativo por solicitud de texto</legend>
        <div className="grid sm:grid-cols-2 gap-4">
          <div><label htmlFor="model-input-tokens" className="field-label">Tokens de entrada</label><input id="model-input-tokens" className="field" type="number" min="0" step="1" value={inputTokens} onChange={event => setInputTokens(event.target.value)}/></div>
          <div><label htmlFor="model-output-tokens" className="field-label">Tokens de salida</label><input id="model-output-tokens" className="field" type="number" min="0" step="1" value={outputTokens} onChange={event => setOutputTokens(event.target.value)}/></div>
        </div>
        <label className="flex gap-2 items-start text-sm"><input type="checkbox" checked={confirmedUnits} className="mt-1" onChange={event => { setConfirmedUnits(event.target.checked); if (!event.target.checked) setSort('name'); }}/>He verificado que las tarifas del archivo están expresadas en USD por millón de tokens.</label>
        <p className="text-xs text-muted-foreground">El archivo no certifica moneda ni unidad. Estimación = entrada × tarifa de entrada / 1.000.000 + salida × tarifa de salida / 1.000.000. Incluye instrucciones y contexto en tu presupuesto; no se tokeniza ningún borrador. No incluye descuentos de caché, cargos de razonamiento, otras modalidades ni créditos de Lovable.</p>
        {!budgetValid && <p role="alert" className="text-sm text-destructive">Introduce cantidades enteras de tokens, iguales o mayores que cero.</p>}
      </fieldset>
      {comparison.length > 0 && <section aria-label="Comparación de modelos" className="my-6">
        <h2 className="text-lg font-medium mb-4">Comparación ({comparison.length}/3)</h2>
        <div className="grid gap-4 lg:grid-cols-3">{comparison.map(model => <article key={model.key} className="border border-border rounded-xl p-5 min-w-0 space-y-3">
          <div className="flex justify-between gap-2"><h3 className="font-medium break-words">{model.name}</h3><Button variant="ghost" size="icon" aria-label={`Quitar ${model.name} de ${model.provider}`} onClick={() => setSelected(previous => previous.filter(key => key !== model.key))}><X size={16}/></Button></div>
          <p className="text-xs text-muted-foreground break-all">{model.provider} / {model.id}</p>
          <dl className="text-sm space-y-2">
            <div><dt className="text-muted-foreground">Entrada / salida</dt><dd>{model.inputModalities.join(', ') || 'Sin datos'} / {model.outputModalities.join(', ') || 'Sin datos'}</dd></div>
            <div><dt className="text-muted-foreground">Contexto / salida máxima</dt><dd>{model.contextLimit?.toLocaleString('es-MX') ?? 'Sin datos'} / {model.outputLimit?.toLocaleString('es-MX') ?? 'Sin datos'}</dd></div>
            <div><dt className="text-muted-foreground">Herramientas / razonamiento</dt><dd>{capabilityLabel(model.tools)} / {capabilityLabel(model.reasoning)}</dd></div>
            <div><dt className="text-muted-foreground">Coste estimado</dt><dd>{costLabel(estimateModelCost(model, inputBudget, outputBudget, confirmedUnits))}</dd></div>
          </dl>
          <p className="text-xs text-muted-foreground">{budgetLabel(model)}</p>
        </article>)}</div>
      </section>}
      <div className="flex flex-wrap justify-between items-center gap-4 mb-4">
        <p role="status" className="text-sm">{filtered.length} modelos coinciden. Compara hasta tres.</p>
        <div><label htmlFor="model-sort" className="field-label">Ordenar</label><select id="model-sort" className="field" value={sort} onChange={event => { setSort(event.target.value); setPage(0); }}><option value="name">Nombre</option><option value="cost" disabled={!confirmedUnits || !budgetValid}>Menor coste estimado</option></select></div>
      </div>
      <div className="overflow-x-auto rounded-xl border border-border">
        <table className="w-full text-sm text-left">
          <caption className="sr-only">Modelos declarados en el catálogo importado; disponibilidad no verificada</caption>
          <thead className="bg-muted"><tr>{['Modelo / proveedor', 'Entrada', 'Contexto', 'Coste estimado', 'Comparar'].map(label => <th key={label} scope="col" className="p-3 font-medium">{label}</th>)}</tr></thead>
          <tbody>{visible.map(model => <tr key={model.key} className="border-t border-border">
            <th scope="row" className="p-3 font-normal max-w-72 break-words"><span className="font-medium">{model.name}</span><span className="block text-xs text-muted-foreground break-all mt-1">{model.provider} / {model.id}</span></th>
            <td className="p-3">{model.inputModalities.join(', ') || 'Sin datos'}</td>
            <td className="p-3">{model.contextLimit?.toLocaleString('es-MX') ?? 'Sin datos'}</td>
            <td className="p-3"><span>{costLabel(estimateModelCost(model, inputBudget, outputBudget, confirmedUnits))}</span><span className="block text-xs text-muted-foreground mt-1">{budgetLabel(model)}</span></td>
            <td className="p-3"><input type="checkbox" aria-label={`Comparar ${model.name} de ${model.provider} (${model.id})`} checked={selected.includes(model.key)} disabled={selected.length >= 3 && !selected.includes(model.key)} onChange={event => { const checked = event.target.checked; setSelected(previous => checked ? previous.length < 3 ? [...previous, model.key] : previous : previous.filter(key => key !== model.key)); }}/></td>
          </tr>)}</tbody>
        </table>
        {!filtered.length && <p className="p-8 text-muted-foreground">No hay modelos con esos criterios. Los valores desconocidos no se consideran capacidades confirmadas.</p>}
      </div>
      <div className="flex flex-wrap items-center justify-between gap-3 my-5">
        <Button variant="outline" disabled={currentPage === 0} onClick={() => setPage(currentPage - 1)}>Anterior</Button>
        <span className="text-sm text-muted-foreground">Página {currentPage + 1} de {pages}</span>
        <Button variant="outline" disabled={currentPage + 1 >= pages} onClick={() => setPage(currentPage + 1)}>Siguiente</Button>
      </div>
      <p className="text-sm text-muted-foreground mb-8">Este comparador no ejecuta modelos ni modifica la revisión creativa. Una capacidad declarada no demuestra compatibilidad con JSON estructurado, conexión al gateway, licencia ni disponibilidad operativa.</p>
    </>}
  </section>;
}
