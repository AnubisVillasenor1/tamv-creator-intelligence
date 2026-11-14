import { act, cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { ModelExplorer } from '@/components/model-explorer';
import { MAX_CATALOG_BYTES } from '@/lib/model-catalog';

const pricedModel = {
  cost: { input: 2, output: 4 },
  limit: { context: 128_000, output: 8_000 },
  modalities: { input: ['text', 'image'], output: ['text'] },
  tool_call: true,
  reasoning: true,
};

const fixture = {
  last_refresh: '2026-11-13T12:00:00.000Z',
  database: { providers: {
    alpha: { models: {
      shared: { ...pricedModel, name: 'Atlas' },
      basic: {
        name: 'Basic', cost: { input: 0, output: 0 },
        limit: { context: 32_000, output: 8_000 },
        modalities: { input: ['text'], output: ['text'] },
        tool_call: false, reasoning: false,
      },
      unknown: { name: 'Mystery' },
    } },
    beta: { models: { shared: {
      ...pricedModel, name: 'Atlas', cost: { input: 8, output: 16 },
      modalities: { input: ['audio'], output: ['text'] }, reasoning: false,
    } } },
  } },
};

function singleCatalog(name: string) {
  return { database: { providers: { local: { models: { only: { ...pricedModel, name } } } } } };
}

function localFile(contents: string, readText: () => Promise<string> = () => Promise.resolve(contents)) {
  const file = new File([contents], 'models_dev.json', { type: 'application/json' });
  // jsdom 20 puede no implementar File.text; el mock se limita a este archivo.
  Object.defineProperty(file, 'text', { configurable: true, value: vi.fn(readText) });
  return file;
}

function chooseFile(file: File) {
  fireEvent.change(screen.getByLabelText('Importar models_dev.json'), { target: { files: [file] } });
}

async function importFixture(data: unknown = fixture) {
  const file = localFile(JSON.stringify(data));
  await act(async () => { chooseFile(file); });
  expect(screen.getByRole('table')).toBeInTheDocument();
  expect(screen.queryByText('Leyendo catálogo local…')).not.toBeInTheDocument();
  expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  return file;
}

function tableRow(name: string, provider: string, id: string) {
  return within(screen.getByRole('table')).getByRole('row', {
    name: accessibleName => accessibleName.includes(name) && accessibleName.includes(`${provider} / ${id}`),
  });
}

function compare(name: string, provider: string, id: string) {
  return screen.getByRole('checkbox', { name: `Comparar ${name} de ${provider} (${id})` });
}

function confirmation() {
  return screen.getByRole('checkbox', { name: /He verificado que las tarifas/ });
}

function comparison() {
  return screen.getByRole('region', { name: 'Comparación de modelos' });
}

function deferred<T>() {
  let resolve!: (value: T | PromiseLike<T>) => void;
  let reject!: (reason?: unknown) => void;
  const promise = new Promise<T>((resolvePromise, rejectPromise) => {
    resolve = resolvePromise;
    reject = rejectPromise;
  });
  return { promise, resolve, reject };
}

beforeEach(() => {
  vi.stubGlobal('fetch', vi.fn(() => { throw new Error('Red prohibida en estas pruebas'); }));
  vi.spyOn(XMLHttpRequest.prototype, 'open').mockImplementation(() => {
    throw new Error('Red prohibida en estas pruebas');
  });
});

afterEach(() => {
  cleanup();
  try {
    expect(fetch).not.toHaveBeenCalled();
    expect(XMLHttpRequest.prototype.open).not.toHaveBeenCalled();
  } finally {
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  }
});

describe('ModelExplorer: importación y filtros locales', () => {
  it('empieza vacío e importa el fixture por el input sin llamadas de red', async () => {
    render(<ModelExplorer />);
    expect(screen.getByRole('heading', { name: 'Modelos y costes' })).toBeInTheDocument();
    expect(screen.getByText('Convierte tu catálogo en decisiones comparables.')).toBeInTheDocument();
    expect(screen.queryByRole('table')).not.toBeInTheDocument();

    const file = await importFixture();

    expect(file.text).toHaveBeenCalledTimes(1);
    expect(screen.getByLabelText('Importar models_dev.json')).toHaveValue('');
    expect(screen.getByText(/4 modelos coinciden/)).toBeInTheDocument();
    expect(screen.getByText(/modelos · 2 proveedores · 0 entradas inválidas omitidas/)).toBeInTheDocument();
    expect(within(screen.getByRole('table')).getAllByRole('row')).toHaveLength(5);
    expect(compare('Atlas', 'alpha', 'shared')).toBeEnabled();
    expect(compare('Atlas', 'beta', 'shared')).toBeEnabled();
  });

  it('muestra la fecha declarada y advierte de un catálogo con más de 30 días', async () => {
    vi.spyOn(Date, 'now').mockReturnValue(Date.parse('2026-12-20T12:00:00Z'));
    render(<ModelExplorer />);
    await importFixture();
    const declaredDate = new Date(fixture.last_refresh).toLocaleDateString('es-MX');
    expect(screen.getByText(`Fecha declarada por el archivo: ${declaredDate}. No es una verificación en vivo.`)).toBeInTheDocument();
    expect(screen.getByText(/El catálogo tiene más de 30 días/)).toBeInTheDocument();
  });

  it('combina búsqueda, proveedor, modalidad, contexto y capacidades, incluido el estado sin resultados', async () => {
    render(<ModelExplorer />);
    await importFixture();
    fireEvent.change(screen.getByLabelText('Buscar modelo'), { target: { value: '  SHARED  ' } });
    expect(screen.getByText(/2 modelos coinciden/)).toBeInTheDocument();
    fireEvent.change(screen.getByLabelText('Proveedor'), { target: { value: 'alpha' } });
    expect(screen.getByText(/1 modelos coinciden/)).toBeInTheDocument();
    fireEvent.change(screen.getByLabelText('Buscar modelo'), { target: { value: '' } });
    expect(screen.getByText(/3 modelos coinciden/)).toBeInTheDocument();
    fireEvent.change(screen.getByLabelText('Modalidad de entrada'), { target: { value: 'text' } });
    expect(screen.getByText(/2 modelos coinciden/)).toBeInTheDocument();
    fireEvent.change(screen.getByLabelText('Contexto mínimo'), { target: { value: '128000' } });
    expect(screen.getByText(/1 modelos coinciden/)).toBeInTheDocument();
    fireEvent.click(screen.getByLabelText('Llamada a herramientas'));
    fireEvent.click(screen.getByLabelText('Razonamiento'));
    fireEvent.change(screen.getByLabelText('Buscar modelo'), { target: { value: ' ATLAS ' } });
    expect(compare('Atlas', 'alpha', 'shared')).toBeInTheDocument();
    expect(screen.queryByRole('checkbox', { name: 'Comparar Atlas de beta (shared)' })).not.toBeInTheDocument();

    fireEvent.change(screen.getByLabelText('Buscar modelo'), { target: { value: 'no-existe' } });
    expect(screen.getByText(/0 modelos coinciden/)).toBeInTheDocument();
    expect(screen.getByText(/No hay modelos con esos criterios/)).toBeInTheDocument();
    expect(within(screen.getByRole('table')).getAllByRole('row')).toHaveLength(1);
  });

  it('no interpreta false ni datos ausentes como capacidades confirmadas', async () => {
    render(<ModelExplorer />);
    await importFixture();
    fireEvent.click(compare('Basic', 'alpha', 'basic'));
    fireEvent.click(compare('Mystery', 'alpha', 'unknown'));
    expect(within(comparison()).getByText('No / No')).toBeInTheDocument();
    expect(within(comparison()).getAllByText('Sin datos / Sin datos')).toHaveLength(3);

    fireEvent.click(screen.getByLabelText('Llamada a herramientas'));
    expect(screen.getByText(/2 modelos coinciden/)).toBeInTheDocument();
    fireEvent.click(screen.getByLabelText('Llamada a herramientas'));
    fireEvent.click(screen.getByLabelText('Razonamiento'));
    expect(screen.getByText(/1 modelos coinciden/)).toBeInTheDocument();
    expect(compare('Atlas', 'alpha', 'shared')).toBeInTheDocument();
    // Filtrar no borra la selección de comparación.
    expect(within(comparison()).getAllByRole('article')).toHaveLength(2);
  });

  it.each([
    { text: '{', message: /JSON válido/ },
    { text: JSON.stringify({ providers: {} }), message: /Se esperaba database.providers/ },
    { text: JSON.stringify({ database: { providers: {} } }), message: /no contiene modelos válidos/ },
    {
      text: JSON.stringify({ database: { providers: { bad: { models: { negative: { cost: { input: -1 } } } } } } }),
      message: /no contiene modelos válidos/,
    },
  ])('conserva catálogo, filtros, selección y unidades cuando falla la importación: $text', async ({ text, message }) => {
    render(<ModelExplorer />);
    await importFixture();
    fireEvent.click(compare('Atlas', 'alpha', 'shared'));
    fireEvent.click(confirmation());
    fireEvent.change(screen.getByLabelText('Proveedor'), { target: { value: 'alpha' } });

    chooseFile(localFile(text));
    expect(await screen.findByRole('alert')).toHaveTextContent(message);
    expect(screen.getByLabelText('Proveedor')).toHaveValue('alpha');
    expect(confirmation()).toBeChecked();
    expect(compare('Atlas', 'alpha', 'shared')).toBeChecked();
    expect(within(comparison()).getByRole('heading', { name: 'Atlas' })).toBeInTheDocument();
    expect(screen.getByText(/3 modelos coinciden/)).toBeInTheDocument();
    expect(screen.queryByText('Leyendo catálogo local…')).not.toBeInTheDocument();
  });

  it('conserva el catálogo si falla la lectura del archivo', async () => {
    render(<ModelExplorer />);
    await importFixture();
    chooseFile(localFile('', () => Promise.reject(new Error('Lectura local fallida'))));
    expect(await screen.findByRole('alert')).toHaveTextContent('Lectura local fallida');
    expect(screen.getByText(/4 modelos coinciden/)).toBeInTheDocument();
    expect(compare('Atlas', 'alpha', 'shared')).toBeInTheDocument();
  });

  it('rechaza archivos mayores de 16 MiB antes de leerlos, sin truncar ni borrar el catálogo', async () => {
    render(<ModelExplorer />);
    await importFixture();
    const oversized = localFile(JSON.stringify(singleCatalog('Demasiado grande')));
    Object.defineProperty(oversized, 'size', { value: MAX_CATALOG_BYTES + 1 });
    chooseFile(oversized);
    expect(await screen.findByRole('alert')).toHaveTextContent('El archivo supera el límite de 16 MiB.');
    expect(oversized.text).not.toHaveBeenCalled();
    expect(screen.getByText(/4 modelos coinciden/)).toBeInTheDocument();
  });

  it('reemplaza el catálogo tras una importación válida y reinicia filtros, comparación y confirmación', async () => {
    render(<ModelExplorer />);
    await importFixture();
    fireEvent.click(compare('Atlas', 'alpha', 'shared'));
    fireEvent.click(confirmation());
    fireEvent.change(screen.getByLabelText('Ordenar'), { target: { value: 'cost' } });
    fireEvent.change(screen.getByLabelText('Buscar modelo'), { target: { value: 'Atlas' } });
    fireEvent.change(screen.getByLabelText('Proveedor'), { target: { value: 'alpha' } });

    await importFixture(singleCatalog('Reemplazo'));
    expect(compare('Reemplazo', 'local', 'only')).toBeInTheDocument();
    expect(screen.getByText(/1 modelos coinciden/)).toBeInTheDocument();
    expect(screen.getByLabelText('Buscar modelo')).toHaveValue('');
    expect(screen.getByLabelText('Proveedor')).toHaveValue('');
    expect(screen.getByLabelText('Ordenar')).toHaveValue('name');
    expect(confirmation()).not.toBeChecked();
    expect(screen.queryByRole('region', { name: 'Comparación de modelos' })).not.toBeInTheDocument();
    expect(screen.queryByText('Basic')).not.toBeInTheDocument();
    expect(screen.getByText(/Fecha declarada por el archivo: no disponible/)).toBeInTheDocument();
  });
});

describe('ModelExplorer: comparación, paginación y presupuestos', () => {
  it('permite hasta tres selecciones, distingue IDs compartidos y libera una plaza al quitar un modelo', async () => {
    render(<ModelExplorer />);
    await importFixture();
    fireEvent.click(compare('Atlas', 'alpha', 'shared'));
    fireEvent.click(compare('Atlas', 'beta', 'shared'));
    fireEvent.click(compare('Basic', 'alpha', 'basic'));
    expect(screen.getByRole('heading', { name: 'Comparación (3/3)' })).toBeInTheDocument();
    expect(within(comparison()).getAllByRole('article')).toHaveLength(3);
    expect(compare('Mystery', 'alpha', 'unknown')).toBeDisabled();
    expect(compare('Atlas', 'alpha', 'shared')).toBeEnabled();
    expect(compare('Atlas', 'beta', 'shared')).toBeChecked();

    fireEvent.click(screen.getByRole('button', { name: 'Quitar Atlas de alpha' }));
    expect(compare('Atlas', 'alpha', 'shared')).not.toBeChecked();
    expect(compare('Atlas', 'beta', 'shared')).toBeChecked();
    expect(compare('Mystery', 'alpha', 'unknown')).toBeEnabled();
    fireEvent.click(compare('Mystery', 'alpha', 'unknown'));
    expect(within(comparison()).getAllByRole('article')).toHaveLength(3);
    fireEvent.click(compare('Basic', 'alpha', 'basic'));
    expect(screen.getByRole('heading', { name: 'Comparación (2/3)' })).toBeInTheDocument();
  });

  it('pagina 26 modelos en 25 + 1, mantiene selección entre páginas y vuelve al inicio al filtrar', async () => {
    const models = Object.fromEntries(Array.from({ length: 26 }, (_, index) => {
      const number = String(index + 1).padStart(2, '0');
      return [`model-${number}`, { ...pricedModel, name: `Modelo ${number}` }];
    }));
    render(<ModelExplorer />);
    await importFixture({ database: { providers: { local: { models } } } });
    expect(screen.getByText('Página 1 de 2')).toBeInTheDocument();
    expect(within(screen.getByRole('table')).getAllByRole('row')).toHaveLength(26);
    expect(screen.getByRole('button', { name: 'Anterior' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Siguiente' })).toBeEnabled();
    expect(screen.queryByRole('checkbox', { name: 'Comparar Modelo 26 de local (model-26)' })).not.toBeInTheDocument();
    fireEvent.click(compare('Modelo 01', 'local', 'model-01'));

    fireEvent.click(screen.getByRole('button', { name: 'Siguiente' }));
    expect(screen.getByText('Página 2 de 2')).toBeInTheDocument();
    expect(within(screen.getByRole('table')).getAllByRole('row')).toHaveLength(2);
    expect(screen.getByRole('button', { name: 'Anterior' })).toBeEnabled();
    expect(screen.getByRole('button', { name: 'Siguiente' })).toBeDisabled();
    fireEvent.click(compare('Modelo 26', 'local', 'model-26'));
    expect(within(comparison()).getAllByRole('article')).toHaveLength(2);
    fireEvent.click(screen.getByRole('button', { name: 'Anterior' }));
    expect(compare('Modelo 01', 'local', 'model-01')).toBeChecked();
    fireEvent.click(screen.getByRole('button', { name: 'Siguiente' }));
    expect(compare('Modelo 26', 'local', 'model-26')).toBeChecked();

    fireEvent.change(screen.getByLabelText('Buscar modelo'), { target: { value: 'Modelo 01' } });
    expect(screen.getByText('Página 1 de 1')).toBeInTheDocument();
    expect(compare('Modelo 01', 'local', 'model-01')).toBeChecked();
    expect(screen.getByRole('button', { name: 'Anterior' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Siguiente' })).toBeDisabled();
  });

  it('requiere confirmar unidades, distingue coste cero/desconocido y ordena los desconocidos al final', async () => {
    render(<ModelExplorer />);
    await importFixture();
    fireEvent.change(screen.getByLabelText('Tokens de entrada'), { target: { value: '1000' } });
    fireEvent.change(screen.getByLabelText('Tokens de salida'), { target: { value: '500' } });
    fireEvent.click(compare('Atlas', 'alpha', 'shared'));
    expect(within(screen.getByRole('table')).getAllByText('Sin estimación')).toHaveLength(4);
    expect(within(comparison()).getByText('Sin estimación')).toBeInTheDocument();
    expect(screen.getByRole('option', { name: 'Menor coste estimado' })).toBeDisabled();

    fireEvent.click(confirmation());
    expect(within(tableRow('Atlas', 'alpha', 'shared')).getByText('USD 0.004')).toBeInTheDocument();
    expect(within(comparison()).getByText('USD 0.004')).toBeInTheDocument();
    expect(within(tableRow('Basic', 'alpha', 'basic')).getByText('USD 0')).toBeInTheDocument();
    expect(within(tableRow('Mystery', 'alpha', 'unknown')).getByText('Sin estimación')).toBeInTheDocument();
    expect(within(tableRow('Mystery', 'alpha', 'unknown')).getByText('Límites incompletos')).toBeInTheDocument();
    expect(screen.getByRole('option', { name: 'Menor coste estimado' })).toBeEnabled();
    fireEvent.change(screen.getByLabelText('Ordenar'), { target: { value: 'cost' } });
    expect(within(screen.getByRole('table')).getAllByRole('checkbox').map(checkbox => checkbox.getAttribute('aria-label'))).toEqual([
      'Comparar Basic de alpha (basic)', 'Comparar Atlas de alpha (shared)',
      'Comparar Atlas de beta (shared)', 'Comparar Mystery de alpha (unknown)',
    ]);

    fireEvent.click(confirmation());
    expect(screen.getByLabelText('Ordenar')).toHaveValue('name');
    expect(screen.getByRole('option', { name: 'Menor coste estimado' })).toBeDisabled();
    expect(within(screen.getByRole('table')).getAllByText('Sin estimación')).toHaveLength(4);
    expect(within(comparison()).getByText('Sin estimación')).toBeInTheDocument();
  });

  it('avisa al superar entrada + salida o salida máxima y admite sus fronteras exactas', async () => {
    render(<ModelExplorer />);
    await importFixture();
    fireEvent.click(confirmation());
    const row = within(tableRow('Atlas', 'alpha', 'shared'));
    fireEvent.change(screen.getByLabelText('Tokens de entrada'), { target: { value: '127000' } });
    fireEvent.change(screen.getByLabelText('Tokens de salida'), { target: { value: '1000' } });
    expect(row.getByText('Dentro de los límites declarados')).toBeInTheDocument();
    fireEvent.change(screen.getByLabelText('Tokens de salida'), { target: { value: '1001' } });
    expect(row.getByText('Supera los límites declarados')).toBeInTheDocument();
    expect(row.getByText('Sin estimación')).toBeInTheDocument();
    fireEvent.change(screen.getByLabelText('Tokens de entrada'), { target: { value: '0' } });
    fireEvent.change(screen.getByLabelText('Tokens de salida'), { target: { value: '8001' } });
    expect(row.getByText('Supera los límites declarados')).toBeInTheDocument();
    fireEvent.change(screen.getByLabelText('Tokens de salida'), { target: { value: '8000' } });
    expect(row.getByText('Dentro de los límites declarados')).toBeInTheDocument();
    expect(row.getByText('USD 0.032')).toBeInTheDocument();
  });

  it.each([
    { field: 'Tokens de entrada', value: '' },
    { field: 'Tokens de entrada', value: '-1' },
    { field: 'Tokens de salida', value: '1.5' },
    { field: 'Tokens de salida', value: 'no-numérico' },
    { field: 'Tokens de entrada', value: String(Number.MAX_SAFE_INTEGER + 1) },
  ])('rechaza un presupuesto inválido en $field: $value', async ({ field, value }) => {
    render(<ModelExplorer />);
    await importFixture();
    fireEvent.click(confirmation());
    fireEvent.change(screen.getByLabelText(field), { target: { value } });
    expect(screen.getByRole('alert')).toHaveTextContent('Introduce cantidades enteras de tokens, iguales o mayores que cero.');
    expect(within(screen.getByRole('table')).getAllByText('Revisa los tokens')).toHaveLength(4);
    expect(within(screen.getByRole('table')).getAllByText('Sin estimación')).toHaveLength(4);
    expect(screen.getByRole('option', { name: 'Menor coste estimado' })).toBeDisabled();
  });
});

describe('ModelExplorer: importaciones diferidas y vaciado', () => {
  it.each(['éxito', 'error'] as const)('ignora una importación antigua que termina con %s después de la más reciente', async outcome => {
    render(<ModelExplorer />);
    const older = deferred<string>();
    const newer = deferred<string>();
    chooseFile(localFile('', () => older.promise));
    chooseFile(localFile('', () => newer.promise));
    expect(screen.getByText('Leyendo catálogo local…')).toBeInTheDocument();

    await act(async () => { newer.resolve(JSON.stringify(singleCatalog('Reciente'))); });
    expect(compare('Reciente', 'local', 'only')).toBeInTheDocument();
    expect(screen.queryByText('Leyendo catálogo local…')).not.toBeInTheDocument();
    await act(async () => {
      if (outcome === 'éxito') older.resolve(JSON.stringify(singleCatalog('Antiguo')));
      else older.reject(new Error('Error de importación antigua'));
    });
    expect(compare('Reciente', 'local', 'only')).toBeInTheDocument();
    expect(screen.queryByText('Antiguo')).not.toBeInTheDocument();
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
    expect(screen.queryByText('Leyendo catálogo local…')).not.toBeInTheDocument();
  });

  it('mantiene el indicador de lectura si termina una importación antigua mientras la actual sigue pendiente', async () => {
    render(<ModelExplorer />);
    const older = deferred<string>();
    const newer = deferred<string>();
    chooseFile(localFile('', () => older.promise));
    chooseFile(localFile('', () => newer.promise));
    await act(async () => { older.resolve(JSON.stringify(singleCatalog('Antiguo'))); });
    expect(screen.getByText('Leyendo catálogo local…')).toBeInTheDocument();
    expect(screen.queryByRole('table')).not.toBeInTheDocument();
    await act(async () => { newer.resolve(JSON.stringify(singleCatalog('Reciente'))); });
    expect(compare('Reciente', 'local', 'only')).toBeInTheDocument();
    expect(screen.queryByText('Leyendo catálogo local…')).not.toBeInTheDocument();
  });

  it.each(['éxito', 'error'] as const)('vacía el catálogo y cancela lógicamente una lectura pendiente que termina con %s', async outcome => {
    render(<ModelExplorer />);
    await importFixture();
    fireEvent.click(compare('Atlas', 'alpha', 'shared'));
    fireEvent.click(confirmation());
    fireEvent.change(screen.getByLabelText('Ordenar'), { target: { value: 'cost' } });
    fireEvent.change(screen.getByLabelText('Buscar modelo'), { target: { value: 'Atlas' } });
    const pending = deferred<string>();
    chooseFile(localFile('', () => pending.promise));
    expect(screen.getByText('Leyendo catálogo local…')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Vaciar catálogo local' }));
    expect(screen.queryByRole('table')).not.toBeInTheDocument();
    expect(screen.queryByRole('region', { name: 'Comparación de modelos' })).not.toBeInTheDocument();
    expect(screen.queryByText('Leyendo catálogo local…')).not.toBeInTheDocument();
    expect(screen.getByText('Convierte tu catálogo en decisiones comparables.')).toBeInTheDocument();

    await act(async () => {
      if (outcome === 'éxito') pending.resolve(JSON.stringify(singleCatalog('Cancelado')));
      else pending.reject(new Error('Error de lectura cancelada'));
    });
    expect(screen.queryByRole('table')).not.toBeInTheDocument();
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Vaciar catálogo local' })).not.toBeInTheDocument();

    await importFixture();
    expect(screen.getByLabelText('Buscar modelo')).toHaveValue('');
    expect(screen.getByLabelText('Ordenar')).toHaveValue('name');
    expect(confirmation()).not.toBeChecked();
    expect(screen.queryByRole('region', { name: 'Comparación de modelos' })).not.toBeInTheDocument();
    expect(screen.getByText(/4 modelos coinciden/)).toBeInTheDocument();
  });
});
