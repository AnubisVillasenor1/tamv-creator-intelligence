import { createFileRoute, Link } from "@tanstack/react-router";
import { Activity, ArrowRight, Fingerprint, Gauge, ShieldCheck } from "lucide-react";

import { TamvLogo } from "@/components/branding/TamvLogo";
import { Button } from "@/components/ui/button";
import { useAuthSession } from "@/hooks/use-auth-session";

export const Route = createFileRoute("/exagon")({
  head: () => ({
    meta: [
      { title: "Exagon · Aprobación y evidencia · TAMV" },
      {
        name: "description",
        content:
          "Gobernanza Exagon de TAMV ONLINE NETWORK: aprobación humana, evidencia verificable y memoria consentida.",
      },
      { property: "og:title", content: "Exagon · Aprobación y evidencia · TAMV" },
      {
        property: "og:description",
        content: "La IA propone; el humano decide. Gobernanza agnóstica de sector y proveedor.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: ExagonPage,
});

const CORES = [
  {
    title: "HyperCore Govern",
    subtitle: "Política, consentimiento y control humano",
    icon: ShieldCheck,
    detail:
      "Las capacidades se proponen, no se ejecutan automáticamente. La autorización y la aprobación permanecen bajo control humano.",
  },
  {
    title: "HyperCore Integrity",
    subtitle: "Manifiesto, firma y certificación runtime",
    icon: Fingerprint,
    detail:
      "El estado de integridad se consulta en la auditoría real. Una firma pendiente no se presenta como certificación vigente.",
  },
  {
    title: "HyperCore Velocity",
    subtitle: "Concurrencia acotada y resultados trazables",
    icon: Gauge,
    detail:
      "La ejecución concurrente usa límites explícitos y resultados verificables; el diagnóstico público no equivale a un despliegue productivo.",
  },
] as const;

function ExagonPage() {
  const session = useAuthSession();
  const authenticated = session.status === "authenticated";

  return (
    <main className="min-h-screen bg-background text-foreground">
      <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="flex flex-col gap-5 border-b border-border pb-7 sm:flex-row sm:items-end sm:justify-between">
          <div className="flex items-start gap-4">
            <TamvLogo className="mt-1 size-12 rounded-lg border border-border object-contain" size={48} priority />
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.2em] text-primary">TAMV / EXAGON</p>
              <h1 className="mt-1 text-3xl font-semibold tracking-tight sm:text-4xl">Creator Intelligence</h1>
              <p className="mt-2 max-w-2xl text-sm text-muted-foreground">La IA propone; el humano decide.</p>
            </div>
          </div>
          {session.status === "loading" ? (
            <Button disabled className="gap-2">
              Comprobando sesión…
            </Button>
          ) : authenticated ? (
            <Button asChild className="gap-2">
              <Link to="/projects">
                Cargar proyectos <ArrowRight size={16} />
              </Link>
            </Button>
          ) : (
            <Button asChild className="gap-2">
              <Link to="/auth">Iniciar sesión</Link>
            </Button>
          )}
        </div>

        {!authenticated && session.status === "anonymous" && (
          <p role="status" className="mt-4 text-sm text-muted-foreground">
            Inicia sesión para trabajar con tus proyectos y evidencia.
          </p>
        )}

        <section className="mt-7 grid gap-4 md:grid-cols-3" aria-label="Núcleos HyperCore">
          {CORES.map((core) => {
            const Icon = core.icon;
            return (
              <article key={core.title} className="rounded-2xl border border-border bg-card p-5 shadow-sm">
                <span className="flex size-11 items-center justify-center rounded-xl bg-primary/10 text-primary">
                  <Icon size={22} />
                </span>
                <h2 className="mt-5 text-lg font-semibold">{core.title}</h2>
                <p className="mt-1 text-xs text-muted-foreground">{core.subtitle}</p>
                <p className="mt-4 min-h-20 text-sm leading-6 text-muted-foreground">{core.detail}</p>
              </article>
            );
          })}
        </section>

        <section className="mt-5 rounded-2xl border border-border bg-card p-5 sm:p-6">
          <div className="flex items-center gap-2">
            <Activity size={18} className="text-primary" />
            <h2 className="text-lg font-semibold">Evidencia y control</h2>
          </div>
          <p className="mt-3 max-w-3xl text-sm leading-6 text-muted-foreground">
            La aprobación humana, la evidencia de decisiones y la memoria consentida se consultan en las secciones de
            gobernanza. Los controles no publican nada automáticamente ni sustituyen la firma oficial del release.
          </p>
          <div className="mt-5 flex flex-wrap gap-2">
            <Button variant="outline" asChild>
              <Link to="/audit">Auditoría</Link>
            </Button>
            <Button variant="outline" asChild>
              <Link to="/hypercore">Diagnóstico de HyperCore</Link>
            </Button>
            <Button variant="outline" asChild>
              <Link to="/guide">Primeros pasos</Link>
            </Button>
          </div>
        </section>

        <footer className="mt-8 border-t border-border pt-5 text-xs leading-5 text-muted-foreground">
          <span className="font-semibold text-foreground">TAMV ONLINE NETWORK · Tecnología con responsabilidad</span>
          <div className="mt-2 flex gap-4">
            <Link to="/sovereignty" className="text-primary hover:underline">
              Soberanía
            </Link>
            <Link to="/hypercore" className="text-primary hover:underline">
              Diagnóstico
            </Link>
          </div>
        </footer>
      </div>
    </main>
  );
}
