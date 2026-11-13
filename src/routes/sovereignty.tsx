import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { AlertTriangle, CheckCircle2, CircleSlash, FileCheck2, GitBranch, Scale, ShieldCheck } from "lucide-react";

import { GENESIS, STATUS_TONE, type GenesisClaim } from "@/lib/genesis-bundle";

export const Route = createFileRoute("/sovereignty")({
  head: () => ({
    meta: [
      { title: "TAMV Soberanía — evidencia, claims y madurez" },
      {
        name: "description",
        content: "Panel de solo lectura: scorecard, claims, capacidades y ledger de trabajo de TAMV Creator Intelligence.",
      },
    ],
  }),
  component: SovereigntyPage,
});

const STATUS_FILTERS = ["todos", "verified", "corroborated", "unverified", "declared", "contradicted"] as const;

function Pill({ ok, children }: { ok: boolean; children: React.ReactNode }) {
  return (
    <span
      className={
        ok
          ? "inline-flex items-center gap-1 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-2.5 py-1 text-xs font-semibold text-emerald-700 dark:text-emerald-300"
          : "inline-flex items-center gap-1 rounded-full border border-rose-500/30 bg-rose-500/10 px-2.5 py-1 text-xs font-semibold text-rose-700 dark:text-rose-300"
      }
    >
      {ok ? <CheckCircle2 size={13} /> : <AlertTriangle size={13} />}
      {children}
    </span>
  );
}

function SovereigntyPage() {
  const [filter, setFilter] = useState<(typeof STATUS_FILTERS)[number]>("todos");
  const { scorecard, claims, claimSummary, capabilities, workLedger, knowledge, certification, checks } = GENESIS;
  const visible = claims.filter((claim) => filter === "todos" || claim.status === filter);

  return (
    <main className="main-content">
      <div className="page-body">
        <div className="page-title">
          <div>
            <div className="eyebrow">TAMV GENESIS Ω · v{GENESIS.version}</div>
            <h1>Soberanía de evidencia</h1>
            <p>
              Qué se declara, qué se prueba y qué falta. Panel de solo lectura; no ejecuta ninguna capacidad.
            </p>
          </div>
          <div className="text-right">
            <div className="text-5xl font-bold leading-none">{scorecard.weightedScore}</div>
            <div className="text-sm text-muted-foreground">
              /100 · grado {scorecard.grade}
              {scorecard.gateCapApplied ? " · tope por compuerta" : ""}
            </div>
          </div>
        </div>

        <section className="grid gap-4 md:grid-cols-4">
          {[
            { label: "Claims auditados", value: String(claimSummary.total), note: `${claimSummary.independentClaims} con evidencia independiente` },
            { label: "Horas declaradas", value: workLedger.claim.hours.toLocaleString("es-MX"), note: `${workLedger.independentHours.toLocaleString("es-MX")} h atestiguadas` },
            { label: "Capacidades", value: String(capabilities.length), note: `${capabilities.filter((c) => c.runnable).length} ejecutables` },
            { label: "Corpus", value: String(knowledge.total), note: `${knowledge.excluded} excluidas · ${knowledge.sensitive} sensibles` },
          ].map((stat) => (
            <div key={stat.label} className="rounded-xl border border-border bg-card p-4">
              <div className="text-xs uppercase tracking-wide text-muted-foreground">{stat.label}</div>
              <div className="mt-1 text-3xl font-semibold">{stat.value}</div>
              <div className="text-xs text-muted-foreground">{stat.note}</div>
            </div>
          ))}
        </section>

        <section className="mt-8 rounded-xl border border-border bg-card p-5">
          <div className="flex flex-wrap items-center gap-3">
            <ShieldCheck className="text-primary" size={20} />
            <h2 className="text-lg font-semibold">Veredicto</h2>
            <Pill ok={certification.hashesValid}>Hashes {certification.hashesValid ? "válidos" : "alterados"}</Pill>
            <Pill ok={certification.signed}>{certification.signed ? "Release firmado" : "Release sin firma"}</Pill>
          </div>
          <p className="mt-3 text-sm text-muted-foreground">{scorecard.verdict}</p>
          <div className="mt-4 grid gap-2 md:grid-cols-2">
            {scorecard.gates.map((gate) => (
              <div key={gate.id} className="flex items-start gap-2 rounded-lg border border-border/70 p-3 text-sm">
                {gate.passed ? (
                  <CheckCircle2 size={16} className="mt-0.5 text-emerald-600" />
                ) : (
                  <CircleSlash size={16} className={`mt-0.5 ${gate.blocking ? "text-rose-600" : "text-amber-600"}`} />
                )}
                <div>
                  <div className="font-medium">
                    {gate.label} {gate.blocking ? <span className="text-xs text-muted-foreground">(bloqueante)</span> : null}
                  </div>
                  <div className="text-xs text-muted-foreground">{gate.detail}</div>
                </div>
              </div>
            ))}
          </div>
        </section>

        <section className="mt-8">
          <div className="flex items-center gap-2">
            <Scale size={18} className="text-primary" />
            <h2 className="text-lg font-semibold">Dimensiones del scorecard</h2>
          </div>
          <div className="mt-3 overflow-x-auto rounded-xl border border-border">
            <table className="w-full text-sm">
              <thead className="bg-muted/50 text-left">
                <tr>
                  <th className="p-3">Dimensión</th>
                  <th className="p-3">Peso</th>
                  <th className="p-3">Puntaje</th>
                  <th className="p-3">Evidencia</th>
                  <th className="p-3">Siguiente punto</th>
                </tr>
              </thead>
              <tbody>
                {scorecard.dimensions.map((dimension) => (
                  <tr key={dimension.id} className="border-t border-border align-top">
                    <td className="p-3 font-medium">{dimension.label}</td>
                    <td className="p-3">{dimension.weight}</td>
                    <td className="p-3">
                      <div className="flex items-center gap-2">
                        <span className="w-8 tabular-nums">{dimension.score}</span>
                        <span className="h-1.5 w-24 overflow-hidden rounded-full bg-muted">
                          <span className="block h-full bg-primary" style={{ width: `${dimension.score}%` }} />
                        </span>
                      </div>
                    </td>
                    <td className="p-3 text-muted-foreground">{dimension.evidence}</td>
                    <td className="p-3 text-muted-foreground">{dimension.nextPoint}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        <section className="mt-8">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <FileCheck2 size={18} className="text-primary" />
              <h2 className="text-lg font-semibold">Claims</h2>
            </div>
            <div className="flex flex-wrap gap-1">
              {STATUS_FILTERS.map((status) => (
                <button
                  key={status}
                  type="button"
                  onClick={() => setFilter(status)}
                  className={`rounded-full border px-3 py-1 text-xs font-medium ${
                    filter === status ? "border-primary bg-primary/10 text-primary" : "border-border text-muted-foreground"
                  }`}
                >
                  {status}
                </button>
              ))}
            </div>
          </div>
          <div className="mt-3 space-y-2">
            {visible.map((claim) => (
              <ClaimRow key={claim.id} claim={claim} />
            ))}
            {visible.length === 0 && <p className="py-6 text-sm text-muted-foreground">No hay claims con ese estado.</p>}
          </div>
        </section>

        <section className="mt-8">
          <div className="flex items-center gap-2">
            <GitBranch size={18} className="text-primary" />
            <h2 className="text-lg font-semibold">Capacidades y madurez</h2>
          </div>
          <div className="mt-3 grid gap-3 md:grid-cols-2">
            {capabilities.map((capability) => (
              <div key={capability.id} className="rounded-xl border border-border bg-card p-4">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <div className="font-semibold">{capability.label}</div>
                    <code className="text-xs text-muted-foreground">{capability.id}</code>
                  </div>
                  <Pill ok={capability.runnable}>{capability.runnable ? "habilitada" : "bloqueada"}</Pill>
                </div>
                <p className="mt-2 text-sm text-muted-foreground">{capability.summary}</p>
                <div className="mt-3 flex flex-wrap items-center gap-2 text-xs">
                  <span className="rounded bg-muted px-2 py-1">{capability.riskTier}</span>
                  <span className="rounded bg-muted px-2 py-1">declarado {capability.maturity}</span>
                  <span className="rounded bg-muted px-2 py-1">logrado {capability.earnedMaturity}</span>
                </div>
                {capability.blockedBy.length > 0 && (
                  <div className="mt-2 text-xs text-muted-foreground">Bloqueos: {capability.blockedBy.join(", ")}</div>
                )}
              </div>
            ))}
          </div>
        </section>

        <section className="mt-8 rounded-xl border border-border bg-card p-5">
          <h2 className="text-lg font-semibold">Ledger de trabajo</h2>
          <p className="mt-1 text-sm text-muted-foreground">{workLedger.claim.attribution}</p>
          <div className="mt-4 overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="text-left">
                <tr className="border-b border-border">
                  <th className="p-2">Fecha</th>
                  <th className="p-2">Horas</th>
                  <th className="p-2">Declaración</th>
                  <th className="p-2">Fuente</th>
                  <th className="p-2">Estado</th>
                </tr>
              </thead>
              <tbody>
                {workLedger.provenanceChain.map((entry) => (
                  <tr key={`${entry.date}-${entry.hours}`} className="border-b border-border/60 align-top">
                    <td className="p-2 whitespace-nowrap">{entry.date}</td>
                    <td className="p-2 tabular-nums">{entry.hours.toLocaleString("es-MX")}</td>
                    <td className="p-2 text-muted-foreground">{entry.statement}</td>
                    <td className="p-2 text-xs text-muted-foreground">{entry.sourceId}</td>
                    <td className={`p-2 text-xs font-medium ${STATUS_TONE[entry.status] ?? ""}`}>{entry.status}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="mt-4 grid gap-3 md:grid-cols-3">
            {workLedger.windows.map((window) => (
              <div key={window.id} className="rounded-lg border border-border/70 p-3 text-sm">
                <div className="font-medium">{window.id}</div>
                <div className="text-xs text-muted-foreground">
                  {window.from} → {window.to} · {window.years} años
                </div>
                <div className="mt-1">
                  {window.hoursPerDay} h/día · {window.hoursPerWeek} h/semana
                </div>
                <div className="mt-1 text-xs text-muted-foreground">{window.note}</div>
              </div>
            ))}
          </div>
          <div className="mt-3 text-xs text-muted-foreground">
            Cadena: {workLedger.integrity.entries} entradas · <code>{workLedger.integrity.chainHead.slice(0, 24)}…</code>
          </div>
        </section>

        <section className="mt-8">
          <h2 className="text-lg font-semibold">Chequeos reproducibles</h2>
          <div className="mt-3 grid gap-2 md:grid-cols-2">
            {checks.map((check) => (
              <div key={check.id} className="flex items-start gap-2 rounded-lg border border-border/70 p-3 text-sm">
                {check.status === "pass" ? (
                  <CheckCircle2 size={16} className="mt-0.5 text-emerald-600" />
                ) : check.status === "warn" ? (
                  <AlertTriangle size={16} className="mt-0.5 text-amber-600" />
                ) : (
                  <CircleSlash size={16} className="mt-0.5 text-rose-600" />
                )}
                <div>
                  <div className="font-medium">
                    {check.id} · {check.label}
                  </div>
                  <div className="text-xs text-muted-foreground">{check.detail}</div>
                </div>
              </div>
            ))}
          </div>
        </section>

        <p className="mt-8 text-xs text-muted-foreground">
          Generado el {GENESIS.generatedAt}. Este panel no certifica el release ni valida las horas declaradas: expone la
          evidencia disponible y lo que falta para subir de nivel.
        </p>
      </div>
    </main>
  );
}

function ClaimRow({ claim }: { claim: GenesisClaim }) {
  return (
    <details className="rounded-xl border border-border bg-card p-4">
      <summary className="flex cursor-pointer list-none flex-wrap items-center gap-3">
        <code className="text-xs text-muted-foreground">{claim.id}</code>
        <span className={`text-xs font-semibold uppercase ${STATUS_TONE[claim.status] ?? ""}`}>{claim.status}</span>
        <span className="flex-1 text-sm">{claim.statement}</span>
        <span className="text-xs text-muted-foreground">{claim.evidenceCount} evidencias</span>
      </summary>
      <div className="mt-3 grid gap-2 text-xs text-muted-foreground md:grid-cols-2">
        <div>
          <span className="font-medium text-foreground">Estado efectivo:</span> {claim.effectiveStatus}
        </div>
        <div>
          <span className="font-medium text-foreground">Independiente:</span> {claim.independent ? "sí" : "no"}
        </div>
        <div className="md:col-span-2">
          <span className="font-medium text-foreground">Qué lo cambiaría:</span> {claim.whatWouldChangeIt}
        </div>
        {claim.issues.length > 0 && (
          <div className="md:col-span-2">
            <span className="font-medium text-foreground">Observaciones:</span> {claim.issues.join(", ")}
          </div>
        )}
      </div>
    </details>
  );
}
