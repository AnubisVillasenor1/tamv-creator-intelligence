import { createFileRoute } from "@tanstack/react-router";
import { useCallback, useEffect, useState, type ReactNode } from "react";
import { Activity, AlertTriangle, CheckCircle2, Clock3, Fingerprint, Gauge, RefreshCw, ShieldCheck, ShieldX } from "lucide-react";
import { Button } from "@/components/ui/button";

type AuditReport = {
  status: "certified" | "blocked";
  certified: boolean;
  certifiedFeaturesEnabled: boolean;
  checkedAt: string;
  durationMs: number;
  policy: { id: string; version: string; framework: { name: string; version: string; functions: string[] }; validationErrors: string[] };
  cores: {
    governCore: { status: string; checks: { valid: boolean; errors: string[] } | null };
    integrityCore: { status: string; certification: { status: string; certified: boolean; reason: string; checkedAt: string } | null };
    velocityCore: { status: string; probe: { passed: boolean; completed: number; total: number } | null };
  };
  provenance: { status: string; verified: boolean; reason: string };
  checks: Record<string, boolean>;
  attribution: string;
  note: string;
};

export const Route = createFileRoute("/hypercore")({
  head: () => ({
    meta: [
      { title: "TAMV HyperCore Turbo — Auditoría" },
      { name: "description", content: "Panel de verificación de gobernanza, integridad y concurrencia de TAMV HyperCore Turbo." },
      { property: "og:title", content: "TAMV HyperCore Turbo — Auditoría" },
      { property: "og:description", content: "Estado verificable de gobernanza, integridad y concurrencia de TAMV." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: HyperCorePage,
});

function StatusPill({ ok, children }: { ok: boolean; children: ReactNode }) {
  return <span className={ok
    ? "inline-flex items-center gap-1 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-2.5 py-1 text-xs font-semibold text-emerald-700 dark:text-emerald-300"
    : "inline-flex items-center gap-1 rounded-full border border-amber-500/30 bg-amber-500/10 px-2.5 py-1 text-xs font-semibold text-amber-800 dark:text-amber-200"}>
    {ok ? <CheckCircle2 size={13} /> : <AlertTriangle size={13} />}
    {children}
  </span>;
}

function HyperCorePage() {
  const [report, setReport] = useState<AuditReport | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const runAudit = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch("/api/tamv/hypercore/audit", { cache: "no-store" });
      if (!response.ok) throw new Error("El endpoint de auditoría no respondió correctamente.");
      setReport(await response.json() as AuditReport);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "No fue posible ejecutar la auditoría.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void runAudit(); }, [runAudit]);

  const coreCards = [
    {
      title: "Govern Core",
      subtitle: "Política, consentimiento y control humano",
      icon: ShieldCheck,
      status: report?.cores.governCore.status,
      ok: report?.checks['governCore'] === true,
      detail: report?.cores.governCore.checks?.valid
        ? "Política estructural válida; el endpoint no sustituye la autorización de cada capacidad."
        : "La política no superó la validación o la comprobación no terminó.",
    },
    {
      title: "Integrity Core",
      subtitle: "Manifiesto, firma y certificación runtime",
      icon: Fingerprint,
      status: report?.cores.integrityCore.status,
      ok: report?.checks['integrityCore'] === true,
      detail: report?.cores.integrityCore.certification?.reason
        ?? "No se recibió resultado de certificación.",
    },
    {
      title: "Velocity Core",
      subtitle: "Concurrencia acotada y resultados trazables",
      icon: Gauge,
      status: report?.cores.velocityCore.status,
      ok: report?.checks['velocityCore'] === true,
      detail: report?.cores.velocityCore.probe
        ? "Probe de concurrencia: " + report.cores.velocityCore.probe.completed + "/" + report.cores.velocityCore.probe.total + " tareas completadas."
        : "El probe de concurrencia no terminó.",
    },
  ];

  return <main className="min-h-screen bg-background text-foreground">
    <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6 lg:px-8">
      <div className="flex flex-col gap-5 border-b border-border pb-7 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.2em] text-primary">TAMV ONLINE NETWORK / SECURITY OPERATIONS</p>
          <h1 className="mt-2 text-3xl font-semibold tracking-tight sm:text-4xl">HyperCore Turbo</h1>
          <p className="mt-2 max-w-2xl text-sm text-muted-foreground">Gobernanza, integridad y ejecución concurrente con evidencia verificable. Las comprobaciones reflejan el runtime actual; no simulan una certificación de release.</p>
        </div>
        <Button onClick={() => void runAudit()} disabled={loading} className="gap-2">
          <RefreshCw size={16} className={loading ? "animate-spin" : ""} />
          {loading ? "Auditando…" : "Ejecutar auditoría"}
        </Button>
      </div>

      {error && <div role="alert" className="mt-6 rounded-xl border border-destructive/30 bg-destructive/5 p-4 text-sm">
        <div className="flex items-center gap-2 font-semibold"><ShieldX size={17} />No se pudo completar la auditoría</div>
        <p className="mt-1 text-muted-foreground">{error}</p>
      </div>}

      <section className="mt-7 grid gap-4 md:grid-cols-3" aria-label="Estado de HyperCore">
        {coreCards.map((core) => {
          const Icon = core.icon;
          return <article key={core.title} className="rounded-2xl border border-border bg-card p-5 shadow-sm">
            <div className="flex items-start justify-between gap-3">
              <span className="flex size-11 items-center justify-center rounded-xl bg-primary/10 text-primary"><Icon size={22} /></span>
              {report && <StatusPill ok={core.ok}>{core.ok ? "APROBADO" : "BLOQUEADO"}</StatusPill>}
            </div>
            <h2 className="mt-5 text-lg font-semibold">{core.title}</h2>
            <p className="mt-1 text-xs text-muted-foreground">{core.subtitle}</p>
            <p className="mt-4 min-h-12 text-sm leading-6 text-muted-foreground">{core.detail}</p>
            <div className="mt-4 border-t border-border pt-3 text-xs uppercase tracking-wider text-muted-foreground">Estado: {core.status ?? "pendiente"}</div>
          </article>;
        })}
      </section>

      <section className="mt-5 grid gap-4 lg:grid-cols-[1.1fr_0.9fr]">
        <article className="rounded-2xl border border-border bg-card p-5">
          <div className="flex items-center gap-2"><Activity size={18} className="text-primary" /><h2 className="font-semibold">Certificación global</h2></div>
          <div className="mt-4 flex flex-wrap items-center gap-3">
            <StatusPill ok={report?.certified === true}>{report?.certified ? "CERTIFICADO" : "NO CERTIFICADO"}</StatusPill>
            <span className="text-sm text-muted-foreground">Las capacidades certificadas permanecen bloqueadas si cualquier control obligatorio falla.</span>
          </div>
          <dl className="mt-5 grid gap-3 sm:grid-cols-2">
            <div className="rounded-lg bg-muted/40 p-3"><dt className="text-xs text-muted-foreground">Política</dt><dd className="mt-1 font-medium">{report?.policy.id ?? "—"} · v{report?.policy.version ?? "—"}</dd></div>
            <div className="rounded-lg bg-muted/40 p-3"><dt className="text-xs text-muted-foreground">Framework</dt><dd className="mt-1 font-medium">{report?.policy.framework.name ?? "NIST CSF"} {report?.policy.framework.version ?? "2.0"}</dd></div>
            <div className="rounded-lg bg-muted/40 p-3"><dt className="text-xs text-muted-foreground">Tiempo de auditoría</dt><dd className="mt-1 flex items-center gap-2 font-medium"><Clock3 size={14} />{report ? report.durationMs + " ms" : "—"}</dd></div>
            <div className="rounded-lg bg-muted/40 p-3"><dt className="text-xs text-muted-foreground">Última comprobación</dt><dd className="mt-1 font-medium">{report ? new Date(report.checkedAt).toLocaleString() : "—"}</dd></div>
          </dl>
          {report?.policy.validationErrors.length ? <div className="mt-4 rounded-lg border border-amber-500/30 bg-amber-500/5 p-3 text-sm"><strong>Incidencias de política:</strong> {report.policy.validationErrors.join(", ")}</div> : null}
        </article>

        <article className="rounded-2xl border border-border bg-card p-5">
          <div className="flex items-center gap-2"><Fingerprint size={18} className="text-primary" /><h2 className="font-semibold">Procedencia de release (SLSA)</h2></div>
          <div className="mt-4"><StatusPill ok={report?.provenance.verified === true}>{report?.provenance.verified ? "VERIFICADA" : "NO VERIFICADA"}</StatusPill></div>
          <p className="mt-3 text-sm leading-6 text-muted-foreground">{report?.provenance.reason ?? "Esperando resultado de auditoría."}</p>
          <p className="mt-4 rounded-lg bg-muted/40 p-3 text-xs leading-5 text-muted-foreground">Una firma del manifiesto no sustituye la attestation SLSA. El estado se mantiene como no verificado hasta integrar un verificador de procedencia confiable en el pipeline de release.</p>
        </article>
      </section>

      <section className="mt-5 rounded-2xl border border-border bg-card p-5">
        <h2 className="font-semibold">Marco de gobernanza</h2>
        <div className="mt-4 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
          {(report?.policy.framework.functions ?? ["GOVERN", "IDENTIFY", "PROTECT", "DETECT", "RESPOND", "RECOVER"]).map((name) =>
            <div key={name} className="rounded-lg border border-border px-3 py-3 text-sm"><span className="font-semibold">{name}</span><span className="ml-2 text-muted-foreground">NIST CSF 2.0</span></div>
          )}
        </div>
        <p className="mt-4 text-xs leading-5 text-muted-foreground">{report?.note ?? "La auditoría se ejecuta en el servidor. Los resultados no se guardan como un ledger persistente; la persistencia y retención de eventos siguen siendo un requisito de integración."}</p>
      </section>

      <footer className="mt-8 border-t border-border pt-5 text-xs leading-5 text-muted-foreground">
        {report?.attribution ?? "Proyecto impulsado con colaboración de tecnología latinoamericana TAMV ONLINE NETWORK Orgullosamente Realmontenses."}
      </footer>
    </div>
  </main>;
}