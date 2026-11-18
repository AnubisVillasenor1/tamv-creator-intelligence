import { useState } from "react";
import { Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import {
  Bot,
  Check,
  CheckCheck,
  Download,
  FileClock,
  FolderPlus,
  LoaderCircle,
  Save,
  ShieldCheck,
  Sparkles,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { useGovernedProjects } from "@/hooks/use-governed-projects";
import { assessProject, changeProject } from "@/lib/project.functions";
import { assessmentSchema, type GovernedProject } from "@/lib/project-schema";
import { ProjectPolicyCheck } from "@/components/project-policy-check";

export function downloadJson(value: unknown, name: string) {
  const url = URL.createObjectURL(
    new Blob([JSON.stringify(value, null, 2)], { type: "application/json" }),
  );
  const a = document.createElement("a");
  a.href = url;
  a.download = name;
  a.click();
  URL.revokeObjectURL(url);
}
function ProjectDetail({
  project,
  onChange,
}: {
  project: GovernedProject;
  onChange: () => Promise<void>;
}) {
  const update = useServerFn(changeProject);
  const assess = useServerFn(assessProject);
  const [purpose, setPurpose] = useState(
    typeof project.config["purpose"] === "string" ? project.config["purpose"] : "",
  );
  const [retention, setRetention] = useState(Number(project.config["retentionDays"] ?? 30));
  const [reason, setReason] = useState("");
  const [consent, setConsent] = useState(false);
  const [busy, setBusy] = useState("");
  const [error, setError] = useState("");
  const result = assessmentSchema.safeParse(project.assessment);
  async function act(kind: "configure" | "approve" | "assess") {
    setBusy(kind);
    setError("");
    try {
      if (kind === "configure")
        await update({
          data: {
            action: "configure",
            projectId: project.id,
            expectedVersion: project.version,
            config: {
              requireConsent: true,
              requireDisclosure: true,
              requireHumanApproval: true,
              purpose,
              retentionDays: retention,
            },
          },
        });
      else if (kind === "approve")
        await update({
          data: {
            action: "approve",
            projectId: project.id,
            expectedVersion: project.version,
            reason,
          },
        });
      else {
        const response = await assess({
          data: { projectId: project.id, expectedVersion: project.version, consent: true },
        });
        if (!response.ok) setError(response.error);
      }
      await onChange();
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo registrar la operación.");
    } finally {
      setBusy("");
    }
  }
  return (
    <section className="project-detail">
      <div className="flex flex-wrap justify-between gap-3 items-start mb-6">
        <div>
          <span className="eyebrow">PROYECTO / V{project.version}</span>
          <h2 className="text-2xl font-display mt-2">{project.name}</h2>
          <p className="text-xs text-muted-foreground break-all mt-2">{project.id}</p>
        </div>
        <span
          className={`micro-tag ${project.approved_version === project.version ? "text-primary" : ""}`}
        >
          <ShieldCheck size={13} className="inline mr-1" />
          {project.approved_version === project.version
            ? "Configuración aprobada"
            : "Pendiente de aprobación"}
        </span>
      </div>
      <p className="text-sm leading-7 text-muted-foreground mb-6 whitespace-pre-wrap">
        {project.use_case}
      </p>
      <div className="project-columns">
        <div>
          <h3 className="section-subtitle">
            <ShieldCheck size={17} /> Controles obligatorios
          </h3>
          {["Consentimiento y finalidad", "Supervisión humana", "Transparencia sobre IA"].map(
            (label) => (
              <div key={label} className="control-row">
                <Check size={14} />
                {label}
                <span>ACTIVO</span>
              </div>
            ),
          )}
          <label className="field-label mt-5" htmlFor="purpose">
            Finalidad autorizada
          </label>
          <textarea
            id="purpose"
            className="field"
            rows={3}
            maxLength={1000}
            value={purpose}
            onChange={(e) => setPurpose(e.target.value)}
          />
          <label className="field-label mt-4" htmlFor="retention">
            Retención propuesta (días)
          </label>
          <input
            id="retention"
            className="field"
            type="number"
            min={1}
            max={365}
            value={retention}
            onChange={(e) => setRetention(Number(e.target.value))}
          />
          <Button
            className="mt-4"
            variant="outline"
            disabled={
              Boolean(busy) || !Number.isInteger(retention) || retention < 1 || retention > 365
            }
            onClick={() => void act("configure")}
          >
            <Save />
            Guardar configuración
          </Button>
          <h3 className="section-subtitle mt-8">
            <CheckCheck size={17} /> Aprobación del responsable
          </h3>
          <label className="field-label" htmlFor="approval-reason">
            Justificación
          </label>
          <textarea
            id="approval-reason"
            className="field"
            rows={2}
            value={reason}
            maxLength={1000}
            onChange={(e) => setReason(e.target.value)}
          />
          <Button
            className="mt-4"
            variant="outline"
            disabled={Boolean(busy) || reason.trim().length < 10}
            onClick={() => void act("approve")}
          >
            <CheckCheck />
            Aprobar versión {project.version}
          </Button>
          <p className="text-xs text-muted-foreground mt-3">
            Aprobación interna; no equivale a certificación TAMV ni cumplimiento legal.
          </p>
          <ProjectPolicyCheck project={project} onChange={onChange} />
        </div>
        <div className="assessment-area">
          <h3 className="section-subtitle">
            <Sparkles size={17} /> Evaluación & plan de gobernanza
          </h3>
          <label className="flex gap-3 text-xs leading-6 text-muted-foreground">
            <input
              type="checkbox"
              checked={consent}
              onChange={(e) => setConsent(e.target.checked)}
              className="accent-primary mt-1.5"
            />
            Autorizo enviar este caso de uso a AI Gateway. No incluye secretos ni datos personales
            innecesarios; la evaluación se guardará en este proyecto.
          </label>
          <Button
            className="mt-5"
            disabled={!consent || Boolean(busy)}
            onClick={() => void act("assess")}
          >
            {busy === "assess" ? <LoaderCircle className="animate-spin" /> : <Sparkles />}
            {busy === "assess" ? "Evaluando…" : "Generar evaluación con IA"}
          </Button>
          {result.success ? (
            <div className="mt-7 space-y-5">
              <span className="micro-tag">Riesgo {result.data.riskLevel}</span>
              <p className="text-sm leading-7">{result.data.summary}</p>
              <h4>Riesgos</h4>
              {result.data.risks.map((risk, i) => (
                <div key={i} className="border-l-2 border-destructive pl-4">
                  <strong className="text-sm">{risk.title}</strong>
                  <p className="text-xs text-muted-foreground mt-2">{risk.mitigation}</p>
                </div>
              ))}
              <h4>Plan de gobernanza</h4>
              {result.data.plan.map((step, i) => (
                <div key={i} className="plan-step">
                  <span>{String(i + 1).padStart(2, "0")}</span>
                  <div>
                    <strong>{step.control}</strong>
                    <p>{step.action}</p>
                    <p>Responsable: {step.owner}</p>
                    <p>Evidencia: {step.evidence}</p>
                  </div>
                </div>
              ))}
              <p className="text-xs text-muted-foreground">{result.data.limitations}</p>
              <Button
                variant="outline"
                onClick={() =>
                  downloadJson(
                    {
                      schema: "tamv.project.assessment.v1",
                      projectId: project.id,
                      version: project.version,
                      assessment: result.data,
                    },
                    `tamv-plan-${project.id}.json`,
                  )
                }
              >
                <Download />
                Exportar plan
              </Button>
            </div>
          ) : (
            <div className="assessment-empty">
              <Bot size={45} />
              <h4>Un plan para tu caso de uso</h4>
              <span className="micro-tag">POLÍTICAS · RIESGOS · EVIDENCIAS</span>
            </div>
          )}
        </div>
      </div>
      {error && (
        <p role="alert" className="text-sm text-destructive mt-6 leading-6">
          {error}
        </p>
      )}
      <Button asChild variant="link" className="mt-5 px-0">
        <Link to="/audit" search={{ projectId: project.id }}>
          <FileClock />
          Ver auditoría del proyecto
        </Link>
      </Button>
    </section>
  );
}
export function GovernanceProjects() {
  const { projects, loading, error, session, refresh } = useGovernedProjects();
  const create = useServerFn(changeProject);
  const [name, setName] = useState("");
  const [useCase, setUseCase] = useState("");
  const [selected, setSelected] = useState("");
  const [busy, setBusy] = useState(false);
  const [failure, setFailure] = useState("");
  const current = projects.find((p) => p.id === selected) ?? projects[0];
  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setFailure("");
    try {
      const project = await create({ data: { action: "create", name, useCase } });
      setSelected(project.id);
      await refresh();
      setName("");
      setUseCase("");
    } catch (err) {
      setFailure(session.status === "anonymous"
        ? "Inicia sesión para integrar tu proyecto. Tu caso de uso se conserva."
        : err instanceof Error ? err.message : "No se pudo guardar el proyecto. Tu caso de uso se conserva.");
    } finally {
      setBusy(false);
    }
  }
  return (
    <>
      <div className="page-heading">
        <span className="eyebrow">PROJECT INTELLIGENCE</span>
        <h1>Proyectos & gobernanza de IA</h1>
        <p>Finalidad legítima. Controles verificables. Responsabilidad humana.</p>
      </div>
      {session.status === "anonymous" && (
        <div className="notice-band">
          <ShieldCheck size={17} />
          <span>Inicia sesión para guardar proyectos y su auditoría privada.</span>
          <Button asChild variant="outline" size="sm">
            <Link to="/auth" search={{ redirect: "/projects" }}>
              Iniciar sesión
            </Link>
          </Button>
        </div>
      )}
      <form onSubmit={(e) => void submit(e)} className="new-project-form">
        <h2 className="section-subtitle">
          <FolderPlus size={18} /> Integrar un proyecto
        </h2>
        <div className="grid gap-5 md:grid-cols-[1fr_2fr]">
          <div>
            <label className="field-label" htmlFor="project-name">
              Nombre del proyecto
            </label>
            <input
              id="project-name"
              className="field"
              required
              minLength={2}
              maxLength={120}
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Asistente de investigación"
            />
          </div>
          <div>
            <label className="field-label" htmlFor="use-case">
              Caso de uso de IA
            </label>
            <textarea
              id="use-case"
              className="field"
              required
              minLength={20}
              maxLength={8000}
              rows={3}
              value={useCase}
              onChange={(e) => setUseCase(e.target.value)}
              placeholder="Objetivo, personas afectadas, datos utilizados, decisiones y supervisión humana…"
            />
          </div>
        </div>
        <Button type="submit" disabled={busy} className="mt-5">
          <FolderPlus />
          {busy ? "Guardando…" : "Crear proyecto"}
        </Button>
        {failure && (
          <p role="alert" className="text-sm text-destructive mt-4">
            {failure}
          </p>
        )}
      </form>
      {(error || loading) && (
        <p className="text-sm text-muted-foreground my-5">{error || "Cargando proyectos…"}</p>
      )}
      {projects.length > 0 && (
        <>
          <div className="project-selector" role="group" aria-label="Seleccionar proyecto">
            {projects.map((p) => (
              <Button
                key={p.id}
                variant={current?.id === p.id ? "secondary" : "ghost"}
                onClick={() => setSelected(p.id)}
              >
                <Bot size={14} />
                {p.name}
                <span className="text-muted-foreground text-xs">v{p.version}</span>
              </Button>
            ))}
          </div>
          {current && (
            <ProjectDetail
              key={`${current.id}:${current.version}`}
              project={current}
              onChange={refresh}
            />
          )}
        </>
      )}
    </>
  );
}
