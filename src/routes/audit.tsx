import { useEffect, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { Download, FileClock, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useGovernedProjects } from "@/hooks/use-governed-projects";
import { readProjectAudit } from "@/lib/project.functions";
import { downloadJson } from "@/components/governance-projects";
export const Route = createFileRoute("/audit")({
  validateSearch: (search: Record<string, unknown>): { projectId?: string } => {
    const projectId = search["projectId"];
    return typeof projectId === "string" && /^[a-f0-9-]{36}$/i.test(projectId) ? { projectId } : {};
  },
  head: () => ({
    meta: [
      { title: "Auditoría de proyectos · TAMV" },
      {
        name: "description",
        content:
          "Registro privado exportable de políticas, cambios de configuración y aprobaciones de proyectos TAMV.",
      },
      { property: "og:title", content: "Auditoría de proyectos · TAMV" },
      {
        property: "og:description",
        content: "Trazabilidad de decisiones y aprobaciones con marcas de tiempo.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Audit,
});
const labels: Record<string, string> = {
  "project.created": "Proyecto integrado",
  "configuration.changed": "Configuración actualizada",
  "project.approved": "Versión aprobada",
  "assessment.generated": "Evaluación IA generada",
  "policy.evaluated": "Políticas evaluadas",
};
function Audit() {
  const search = Route.useSearch();
  const { projects, session } = useGovernedProjects();
  const read = useServerFn(readProjectAudit);
  const [id, setId] = useState(search.projectId ?? "");
  const [events, setEvents] = useState<Awaited<ReturnType<typeof readProjectAudit>>>([]);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [refresh, setRefresh] = useState(0);
  const project = projects.find((p) => p.id === id) ?? projects[0];
  const projectId = project?.id;
  const [eventProjectId, setEventProjectId] = useState<string>();
  const visibleEvents = projectId && projectId === eventProjectId ? events : [];
  useEffect(() => {
    let active = true;
    setEvents([]);
    setEventProjectId(undefined);
    setBusy(Boolean(projectId));
    setError("");
    if (!projectId) return;
    void read({ data: { projectId } })
      .then((rows) => {
        if (active) {
          setEvents(rows);
          setEventProjectId(projectId);
        }
      })
      .catch(() => {
        if (active) setError("No se pudo cargar la auditoría.");
      })
      .finally(() => {
        if (active) setBusy(false);
      });
    return () => {
      active = false;
    };
  }, [projectId, read, refresh]);
  return (
    <>
      <div className="page-heading">
        <span className="eyebrow">EVIDENCE LEDGER</span>
        <h1>Registro de auditoría</h1>
        <p>Políticas, configuración y aprobaciones · evidencia por proyecto.</p>
      </div>
      <div className="flex flex-wrap gap-3 mb-8">
        <select
          aria-label="Proyecto auditado"
          className="field max-w-sm"
          value={projectId ?? ""}
          onChange={(e) => setId(e.target.value)}
        >
          <option value="" disabled>
            Selecciona un proyecto
          </option>
          {projects.map((p) => (
            <option key={p.id} value={p.id}>
              {p.name}
            </option>
          ))}
        </select>
        <Button
          variant="outline"
          size="icon"
          title="Actualizar auditoría"
          aria-label="Actualizar auditoría"
          disabled={!projectId || busy}
          onClick={() => setRefresh((n) => n + 1)}
        >
          <RefreshCw />
        </Button>
        <Button
          variant="outline"
          disabled={!projectId || busy || eventProjectId !== projectId}
          onClick={() =>
            downloadJson(
              {
                schema: "tamv.project.audit.v1",
                exportedAt: new Date().toISOString(),
                project,
                events: visibleEvents,
              },
              `tamv-audit-${projectId}.json`,
            )
          }
        >
          <Download />
          Exportar JSON
        </Button>
      </div>
      {error && (
        <p role="alert" className="text-destructive text-sm">
          {error}
        </p>
      )}
      {busy && <p className="text-muted-foreground">Cargando evidencia…</p>}
      {!visibleEvents.length && !busy && (
        <div className="empty-ledger">
          <FileClock size={38} />
          <h2>
            {session.status === "anonymous" ? "Auditoría privada" : "Sin eventos registrados"}
          </h2>
          <p>
            {session.status === "anonymous"
              ? "Inicia sesión para consultar tus proyectos."
              : "Los eventos aparecerán al integrar un proyecto y registrar sus decisiones."}
          </p>
        </div>
      )}
      <div className="audit-timeline">
        {visibleEvents.map((event) => (
          <article key={event.id}>
            <div className="audit-marker">
              <FileClock size={16} />
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap justify-between gap-3">
                <h2>{labels[event.kind] ?? event.kind}</h2>
                <time className="text-xs text-muted-foreground" dateTime={event.created_at}>
                  {new Date(event.created_at).toLocaleString("es-MX", { timeZone: "UTC" })} UTC
                </time>
              </div>
              <div className="text-xs text-primary mt-2">
                {event.policy_version} / versión {event.project_version}
              </div>
              <details className="mt-4">
                <summary className="text-xs text-muted-foreground cursor-pointer">
                  Evidencias y cambios
                </summary>
                <pre className="code-block mt-3">{JSON.stringify(event.details, null, 2)}</pre>
              </details>
              <p className="text-xs text-muted-foreground mt-4 break-all">
                Actor: {event.actor_id}
              </p>
            </div>
          </article>
        ))}
      </div>
    </>
  );
}
