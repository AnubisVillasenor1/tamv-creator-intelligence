import { createFileRoute, Link } from "@tanstack/react-router";
import {
  Activity,
  ArrowRight,
  ArrowUpRight,
  Bot,
  Braces,
  Check,
  FileClock,
  GitBranch,
  Network,
  ShieldCheck,
  Workflow,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { useGovernedProjects } from "@/hooks/use-governed-projects";
import { skillRegistry } from "@/lib/skill-registry";
import { CORE_CONTROLS } from "../../sdk/index.mjs";
import logo from "@/assets/tamv-online-official.jpg.asset.json";
export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "TAMV Creator Intelligence · Centro de gobernanza" },
      {
        name: "description",
        content:
          "Centro de control TAMV para integrar gobernanza ética, transparente y profesional en proyectos de IA de cualquier sector o proveedor.",
      },
      { property: "og:title", content: "TAMV Creator Intelligence · Gobernanza agnóstica de IA" },
      {
        property: "og:description",
        content: "Proyectos, políticas, evaluación IA, SDK y auditoría con supervisión humana.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Dashboard,
});
function Dashboard() {
  const { projects, session } = useGovernedProjects();
  const approved = projects.filter((p) => p.approved_version === p.version).length;
  const connections = skillRegistry.reduce((sum, s) => sum + s.dependencies.length, 0);
  return (
    <>
      <div className="page-heading dashboard-heading">
        <div>
          <span className="eyebrow">TAMV / GOVERNANCE COMMAND CENTER</span>
          <h1>TAMV Creator Intelligence</h1>
          <p>Inteligencia soberana. Ecosistemas responsables.</p>
        </div>
        <span className="protocol-badge">
          <ShieldCheck size={14} /> HUMAN GOVERNED
        </span>
      </div>
      <section className="command-band">
        <div className="command-copy">
          <span className="text-primary text-xs flex gap-2 items-center">
            <Network size={15} /> UNIVERSAL AI GOVERNANCE
          </span>
          <h2>
            Tu IA, bajo control.
            <br />
            <span>Sin fronteras de sector.</span>
          </h2>
          <p>Profesional · Ética · Transparente · Gobernada</p>
          <div className="flex flex-wrap gap-3 mt-7">
            <Button asChild>
              <Link to="/projects">
                <Bot />
                Integrar proyecto
                <ArrowUpRight />
              </Link>
            </Button>
            <Button asChild variant="outline">
              <Link to="/sdk">
                <Braces />
                Explorar SDK
              </Link>
            </Button>
          </div>
          <div className="command-foot">
            <span>CONTROL HUMANO</span>
            <span>PROVEEDOR AGNÓSTICO</span>
            <span>FAIL CLOSED</span>
          </div>
        </div>
        <img
          className="official-logo"
          src={logo.url}
          alt="TAMV ONLINE — Tecnología Avanzada Mexicana Versátil"
        />
      </section>
      <div className="command-metrics">
        {[
          {
            label: "Proyectos integrados",
            value: session.status === "authenticated" ? String(projects.length) : "—",
            note:
              session.status === "authenticated" ? "Tus proyectos privados" : "Sesión requerida",
            icon: Bot,
          },
          {
            label: "Contratos de skills",
            value: String(skillRegistry.length),
            note: "Inventario validado del paquete",
            icon: Workflow,
          },
          {
            label: "Conexiones gobernadas",
            value: String(connections),
            note: "Dependencias entre contratos",
            icon: GitBranch,
          },
          {
            label: "Versiones aprobadas",
            value: session.status === "authenticated" ? String(approved) : "—",
            note: "Aprobaciones del responsable",
            icon: ShieldCheck,
          },
        ].map((m) => (
          <div key={m.label}>
            <div className="metric-label">
              {m.label}
              <m.icon size={15} />
            </div>
            <strong>{m.value}</strong>
            <span>{m.note}</span>
          </div>
        ))}
      </div>
      <div className="dashboard-grid">
        <section>
          <div className="section-heading">
            <div>
              <span className="eyebrow">POLICY ENGINE</span>
              <h2>Mapa de control</h2>
            </div>
            <span className="quiet-label">
              <Activity size={13} /> {CORE_CONTROLS.length} controles
            </span>
          </div>
          <div className="govern-map">
            <div className="map-core">
              <ShieldCheck size={30} />
              <strong>TAMV CORE</strong>
              <span>DENY BY DEFAULT</span>
            </div>
            <div className="map-controls">
              {CORE_CONTROLS.map((c, i) => (
                <div key={c.id}>
                  <span className="map-index">{String(i + 1).padStart(2, "0")}</span>
                  <span>{c.title}</span>
                  <Check size={12} />
                </div>
              ))}
            </div>
          </div>
          <div className="pipeline-strip">
            {["Identidad", "Políticas", "Evidencia", "Decisión"].map((p, i) => (
              <div key={p}>
                <span>{String(i + 1).padStart(2, "0")}</span>
                {p}
                {i < 3 && <ArrowRight size={12} />}
              </div>
            ))}
          </div>
        </section>
        <section>
          <div className="section-heading">
            <div>
              <span className="eyebrow">PROJECT WORKSPACE</span>
              <h2>Proyectos recientes</h2>
            </div>
            <Button asChild variant="ghost" size="icon" title="Ver proyectos">
              <Link to="/projects" aria-label="Ver proyectos">
                <ArrowUpRight />
              </Link>
            </Button>
          </div>
          <div className="recent-projects">
            {projects.length ? (
              projects.slice(0, 4).map((p) => (
                <Link to="/projects" key={p.id} className="recent-project">
                  <Bot size={19} />
                  <div>
                    <strong>{p.name}</strong>
                    <span>
                      Versión {p.version} ·{" "}
                      {p.approved_version === p.version ? "Aprobada" : "Revisión pendiente"}
                    </span>
                  </div>
                  <ArrowUpRight size={15} />
                </Link>
              ))
            ) : (
              <div className="project-empty">
                <Bot size={30} />
                <h3>
                  {session.status === "authenticated" ? "Tu primer proyecto" : "Workspace privado"}
                </h3>
                <p>
                  {session.status === "authenticated"
                    ? "Integra un caso de uso para comenzar."
                    : "Inicia sesión para ver tus proyectos."}
                </p>
                <Button asChild variant="outline" size="sm">
                  <Link to="/projects">
                    Integrar proyecto
                    <ArrowRight />
                  </Link>
                </Button>
              </div>
            )}
          </div>
          <div className="audit-shortcut">
            <FileClock size={23} />
            <div>
              <h3>Evidencia de cada decisión</h3>
              <p>Políticas, cambios y aprobaciones.</p>
            </div>
            <Button variant="ghost" size="icon" asChild>
              <Link to="/audit" aria-label="Abrir auditoría">
                <ArrowUpRight />
              </Link>
            </Button>
          </div>
        </section>
      </div>
      <section className="integration-strip">
        <div>
          <span className="eyebrow">INTEGRATION LAYER</span>
          <h2>Un ecosistema conectado</h2>
        </div>
        {[
          { to: "/sdk", label: "SDK & hooks", icon: Braces },
          { to: "/marketplace", label: "Marketplace", icon: Workflow },
          { to: "/models", label: "Modelos de IA", icon: Bot },
        ].map((item) => (
          <Button key={item.to} variant="outline" asChild>
            <Link to={item.to}>
              <item.icon size={16} />
              {item.label}
              <ArrowUpRight size={13} />
            </Link>
          </Button>
        ))}
      </section>
    </>
  );
}
