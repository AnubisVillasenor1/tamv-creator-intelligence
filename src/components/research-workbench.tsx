import { useEffect, useState } from "react";
import { FlaskConical, Download, Search, ShieldCheck } from "lucide-react";
import { analyzeResearchCounts } from "@/lib/research-analysis";
import { researchCatalog, researchProtocols } from "@/lib/research-protocols";

export function ResearchWorkbench() {
  const [query, setQuery] = useState("");
  const [selectedId, setSelectedId] = useState("T01");
  const [raw, setRaw] = useState("");
  const [error, setError] = useState("");
  const [analysis, setAnalysis] = useState<ReturnType<typeof analyzeResearchCounts> | null>(null);
  const [download, setDownload] = useState<string | null>(null);
  const selected = researchProtocols.find((p) => p.id === selectedId)!;
  const filtered = researchProtocols.filter((p) =>
    `${p.id} ${p.nombre}`.toLocaleLowerCase("es").includes(query.toLocaleLowerCase("es")),
  );
  useEffect(
    () => () => {
      if (download) URL.revokeObjectURL(download);
    },
    [download],
  );
  function prepare() {
    const dossier = {
      schema: "tamv.research.experiment.v1",
      protocol: selected,
      executionStatus: "not-run",
      commit: null,
      artifactDigest: null,
      environment: null,
      rawDataReference: null,
      independentReviewer: null,
      analysis: null,
      deviations: [],
      sourceManifestSigned: false,
    };
    setDownload(
      URL.createObjectURL(
        new Blob([JSON.stringify(dossier, null, 2)], { type: "application/json" }),
      ),
    );
  }
  return (
    <div className="workspace-page space-y-8">
      <header className="page-heading">
        <div>
          <p className="eyebrow flex items-center gap-2">
            <FlaskConical size={14} /> INVESTIGACIÓN · ISA-FLOW
          </p>
          <h1>De la hipótesis a la evidencia.</h1>
          <p>Protocolos reproducibles, criterios explícitos y resultados sin sobreafirmaciones.</p>
        </div>
      </header>
      <section
        className="rounded-2xl border border-primary/20 bg-primary/5 p-5"
        aria-label="Alcance de investigación"
      >
        <p className="font-semibold flex items-center gap-2">
          <ShieldCheck size={18} /> Protocolo propuesto, no certificación
        </p>
        <p className="mt-2 text-sm text-muted-foreground">
          20 protocolos · 7 marcos · 22 fuentes documentales. Las pruebas de software en sandbox no
          son ensayos científicos confirmatorios, revisión por pares ni aprobación para producción.
        </p>
        <p className="mt-2 text-sm text-muted-foreground">
          Cuatro archivos coinciden con el manifiesto SHA-512 sin firma. Los Word tienen el mismo
          texto, pero no están cubiertos por ese manifiesto.
        </p>
      </section>
      <section
        className="grid gap-5 lg:grid-cols-[minmax(240px,1fr)_2fr]"
        aria-label="Explorador de protocolos"
      >
        <div className="rounded-2xl border border-border bg-card p-5">
          <label htmlFor="research-search" className="mb-2 block text-sm font-medium">
            <Search size={15} className="inline mr-2" />
            Buscar protocolo
          </label>
          <input
            id="research-search"
            className="w-full rounded-lg border border-border bg-background p-3"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Nonce, presupuesto, EOCT…"
          />
          <div className="mt-3 max-h-96 overflow-auto space-y-1">
            {filtered.map((p) => (
              <button
                key={p.id}
                type="button"
                aria-pressed={selectedId === p.id}
                onClick={() => {
                  setSelectedId(p.id);
                  setDownload(null);
                }}
                className={`w-full min-h-11 rounded-lg p-3 text-left text-sm ${selectedId === p.id ? "bg-primary/10 text-primary" : "hover:bg-muted"}`}
              >
                <span className="font-mono mr-2">{p.id}</span>
                {p.nombre}
              </button>
            ))}
            {filtered.length === 0 && (
              <p className="py-4 text-sm text-muted-foreground">
                No hay protocolos con ese término.
              </p>
            )}
          </div>
        </div>
        <article className="rounded-2xl border border-border bg-card p-6">
          <p className="text-xs uppercase tracking-wider text-primary">
            {selected.id} · Ensayo confirmatorio pendiente
          </p>
          <h2 className="my-3 text-2xl font-semibold">{selected.nombre}</h2>
          <dl className="space-y-4 text-sm">
            {[
              ["Precondición", selected.precondicion],
              ["Intervención", selected.intervencion],
              ["Resultado esperado", selected.esperado],
              ["Evidencia necesaria", selected.evidencia],
              ["Límite interpretativo", selected.limite],
            ].map(([label, value]) => (
              <div key={label}>
                <dt className="font-semibold mb-1">{label}</dt>
                <dd className="text-muted-foreground leading-relaxed">{value}</dd>
              </div>
            ))}
            <div>
              <dt className="font-semibold mb-1">Implementación local</dt>
              <dd className="text-muted-foreground">
                {selected.implementation ?? "Pendiente de implementación experimental"}.{" "}
                {selected.implementationLimit}.
              </dd>
            </div>
          </dl>
          <button
            type="button"
            onClick={prepare}
            className="mt-6 min-h-11 rounded-xl bg-primary px-4 py-3 text-sm font-semibold text-primary-foreground inline-flex items-center gap-2"
          >
            <Download size={16} />
            Preparar expediente vacío
          </button>
          {download && (
            <a
              className="ml-4 inline-block py-3 text-sm underline"
              href={download}
              download={`${selected.id}-expediente.json`}
            >
              Descargar expediente JSON
            </a>
          )}
        </article>
      </section>
      <section
        className="rounded-2xl border border-border bg-card p-6"
        aria-label="Análisis de conteos"
      >
        <h2 className="text-xl font-semibold">Análisis sin resultados inventados</h2>
        <p className="my-3 text-sm text-muted-foreground">
          Pega solo conteos agregados, nunca datos personales. El cálculo ocurre en tu navegador y
          no valida el origen de los datos. Un denominador vacío se informa como no evaluable.
        </p>
        <details className="mb-3 text-sm">
          <summary className="cursor-pointer py-2">Campos JSON requeridos</summary>
          <code className="block break-words p-3 bg-muted rounded-lg">
            unauthorizedAttempts, unauthorizedEffects, legitimateAttempts, legitimateBlocked,
            legitimateCompleted, evaluated, answered, incorrectAnswers (enteros);
            independentBernoulliTrials (booleano)
          </code>
        </details>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            setError("");
            setAnalysis(null);
            try {
              if (raw.length > 8192) throw new Error();
              setAnalysis(analyzeResearchCounts(JSON.parse(raw)));
            } catch {
              setError(
                "Usa JSON válido con todos los campos y conteos coherentes (máximo 8192 caracteres).",
              );
            }
          }}
        >
          <label htmlFor="research-counts" className="block mb-2 text-sm font-medium">
            Conteos observados en JSON
          </label>
          <textarea
            id="research-counts"
            className="min-h-32 w-full rounded-lg border border-border bg-background p-3 font-mono text-sm"
            maxLength={8192}
            value={raw}
            onChange={(e) => {
              setRaw(e.target.value);
              setAnalysis(null);
              setError("");
            }}
          />
          <button
            className="mt-3 min-h-11 rounded-xl border border-border px-4 py-2 text-sm"
            type="submit"
          >
            Calcular métricas
          </button>
        </form>
        {error && (
          <p role="alert" className="mt-3 text-sm text-destructive">
            {error}
          </p>
        )}
        {analysis && (
          <div role="status" className="mt-4 space-y-2 text-sm">
            {[
              ["Efectos no autorizados", analysis.unauthorizedEffectRate],
              ["Falso bloqueo", analysis.falseBlockRate],
              ["Finalización legítima", analysis.legitimateCompletionRate],
              ["Cobertura", analysis.coverage],
              ["Error selectivo", analysis.selectiveError],
              [
                "Límite superior 95% con cero fallos e independencia declarada",
                analysis.zeroFailureUpper95,
              ],
            ].map(([label, value]) => (
              <p key={String(label)}>
                {label}:{" "}
                <strong>
                  {value === null ? "No evaluable" : `${(Number(value) * 100).toFixed(2)}%`}
                </strong>
              </p>
            ))}
            <p className="text-muted-foreground">
              Cálculo descriptivo sobre datos aportados; no autoriza despliegues ni demuestra riesgo
              cero.
            </p>
          </div>
        )}
      </section>
      <section aria-label="Marcos y límites">
        <h2 className="mb-4 text-xl font-semibold">Correspondencia normativa, no equivalencia</h2>
        <div className="grid gap-3 md:grid-cols-2">
          {researchCatalog.frameworks.map((f) => (
            <article key={f.marco} className="rounded-xl border border-border p-4">
              <h3 className="font-semibold">{f.marco}</h3>
              <p className="mt-2 text-sm text-muted-foreground">{f.mecanismo_propuesto}</p>
              <p className="mt-2 text-sm">{f.limite}.</p>
            </article>
          ))}
        </div>
      </section>
    </div>
  );
}
