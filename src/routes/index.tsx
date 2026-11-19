import { createFileRoute, Link } from "@tanstack/react-router";
import {
  ArrowRight,
  ArrowUpRight,
  AudioWaveform,
  BookOpen,
  Check,
  FileClock,
  FolderKanban,
  GitBranch,
  Layers3,
  LockKeyhole,
  PlugZap,
  ShieldCheck,
  Sparkles,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { TamvLogo } from "@/components/branding/TamvLogo";
import { useGovernedProjects } from "@/hooks/use-governed-projects";
import { skillRegistry } from "@/lib/skill-registry";
import { CORE_CONTROLS } from "../../sdk/index.mjs";
export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Tu espacio creativo · TAMV Creator Intelligence" },
      {
        name: "description",
        content:
          "Organiza proyectos, crea audio y conecta tu ecosistema con gobernanza agnóstica de sector y proveedor y control humano.",
      },
      { property: "og:title", content: "TAMV Creator Intelligence" },
      {
        property: "og:description",
        content: "Un espacio para crear, conectar y decidir con responsabilidad.",
      },
      { name: "twitter:card", content: "summary_large_image" },
      { property: "og:type", content: "website" },
    ],
  }),
  component: Dashboard,
});
function Dashboard() {
  const { projects, session, loading, error } = useGovernedProjects();
  const hasData = session.status === "authenticated" && !loading && !error;
  const approved = projects.filter((p) => p.approved_version === p.version).length;
  return (
    <>
      <div className="page-heading dashboard-heading">
        <div>
          <span className="eyebrow">TU WORKSPACE / VISTA GENERAL</span>
          <h1>Un entorno para crear con criterio.</h1>
          <p>Proyectos, herramientas y conexiones con gobernanza humana y trazabilidad.</p>
        </div>
        <span className="status-pill">
          <ShieldCheck size={14} />
          Gobernanza humana
        </span>
      </div>
      <section className="workspace-hero">
        <div className="hero-editorial">
          <span className="hero-kicker">
            <TamvLogo className="h-5 w-5 rounded object-contain" size={20} priority />
            <span />
            TAMV ONLINE NETWORK · TECNOLOGÍA AVANZADA MEXICANA VERSÁTIL
          </span>
          <h2>
            Grandes ideas.
            <br />
            <em>Decisiones conscientes.</em>
          </h2>
          <p>
            Tu centro de trabajo para proyectos de IA, creación sonora y conexiones sociales. Herramientas con límites explícitos. Decisiones bajo control humano.
          </p>
          <p className="hero-agnostic">
            Agnóstico de sector y proveedor: nació en el ecosistema PLAY &amp; GO, pero no está
            limitado a él. Cualquier proyecto de IA puede integrarse.
          </p>
          <div className="hero-actions">
            <Button asChild>
              <Link to="/projects">
                Crear un proyecto
                <ArrowUpRight size={18} />
              </Link>
            </Button>
            <Button variant="ghost" asChild>
              <Link to="/guide">
                <BookOpen size={18} />
                Explorar la plataforma
              </Link>
            </Button>
          </div>
          <div className="hero-footnote">
            <LockKeyhole size={13} />
            Tecnología latinoamericana · Privacidad por diseño · Sin publicación automática
          </div>
        </div>
        <div
          className="hero-orchestration"
          aria-label="Flujo conceptual: idea, creación y revisión humana"
        >
          <div className="atom-halo" aria-hidden="true" />
          <div className="orbit orbit-one" />
          <div className="orbit orbit-two" />
          <div className="orbit orbit-three" />
          <div className="orbit orbit-four" />
          <div className="orbit orbit-five" />
          <div className="atom-particle particle-one" />
          <div className="atom-particle particle-two" />
          <div className="atom-particle particle-three" />
          <div className="atom-particle particle-four" />
          <div className="atom-particle particle-five" />
          <div className="atom-particle particle-six" />
          <div className="orbit-center">
            <TamvLogo className="h-16 w-16 rounded-xl object-contain" size={64} priority />
            <strong>TAMV</strong>
            <span>ONLINE NETWORK · CREATIVE WORKSPACE</span>
          </div>
          <div className="orbit-label orbit-idea">
            <Sparkles size={17} />
            <span>Tu idea</span>
          </div>
          <div className="orbit-label orbit-create">
            <AudioWaveform size={17} />
            <span>Crear</span>
          </div>
          <div className="orbit-label orbit-review">
            <ShieldCheck size={17} />
            <span>Revisar</span>
          </div>
          <span className="concept-label">UN FLUJO, NO UNA MÉTRICA EN VIVO</span>
        </div>
      </section>
      <section className="executive-principles" aria-label="Principios operativos de TAMV">
        <div className="executive-principles-heading">
          <span className="eyebrow">MARCO OPERATIVO</span>
          <span className="executive-principles-caption">Tres principios. Un mismo estándar.</span>
        </div>
        <div className="executive-principles-grid">
          <article className="executive-principle">
            <span className="executive-principle-index">01</span>
            <div className="executive-principle-icon"><ShieldCheck size={19} /></div>
            <div><h3>Gobernanza</h3><p>Autoridad humana, límites explícitos y decisiones revisables.</p></div>
          </article>
          <article className="executive-principle">
            <span className="executive-principle-index">02</span>
            <div className="executive-principle-icon"><LockKeyhole size={19} /></div>
            <div><h3>Integridad</h3><p>Controles verificables, privacidad por diseño y trazabilidad.</p></div>
          </article>
          <article className="executive-principle">
            <span className="executive-principle-index">03</span>
            <div className="executive-principle-icon"><ArrowRight size={19} /></div>
            <div><h3>Agilidad</h3><p>Flujos claros que reducen fricción sin omitir la revisión.</p></div>
          </article>
        </div>
        <p className="executive-principles-footnote">Rápido cuando es seguro. Fail-closed cuando hay riesgo. Auditable siempre.</p>
      </section>
      <section className="workspace-stats" aria-label="Resumen de tu espacio">
        {[
          {
            icon: FolderKanban,
            value: hasData ? projects.length : "—",
            label: "Tus proyectos",
            note: loading ? "Cargando" : hasData ? "Espacio privado" : "Sesión y datos requeridos",
          },
          {
            icon: Layers3,
            value: skillRegistry.length,
            label: "Contratos de skills",
            note: "Catálogo, no servicios ejecutados",
          },
          {
            icon: GitBranch,
            value: skillRegistry.reduce((sum, skill) => sum + skill.dependencies.length, 0),
            label: "Dependencias",
            note: "Relaciones entre contratos",
          },
          {
            icon: ShieldCheck,
            value: hasData ? approved : "—",
            label: "Versiones aprobadas",
            note: "Decisiones del responsable",
          },
        ].map((item) => (
          <div key={item.label}>
            <div>
              <item.icon size={18} />
              <span>{item.label}</span>
            </div>
            <strong>{item.value}</strong>
            <small>{item.note}</small>
          </div>
        ))}
      </section>
      <section className="workspace-section">
        <div className="section-heading">
          <div>
            <span className="eyebrow">HECHO PARA TU FLUJO</span>
            <h2>¿Qué quieres hacer hoy?</h2>
          </div>
          <span className="section-caption">Menos fricción. Más dirección.</span>
        </div>
        <div className="action-grid">
          {[
            {
              icon: AudioWaveform,
              label: "Crear",
              title: "Dale sonido a tu idea",
              description:
                "Renderiza audio procedural, consulta su análisis y descarga un WAV verificable.",
              image: "/brand/sections/dale-sonido-a-tu-idea.jpg",
              to: "/studio",
              tone: "mint",
              action: "Abrir estudio",
            },
            {
              icon: PlugZap,
              label: "Conectar",
              title: "Acerca tu ecosistema",
              description:
                "Explora los receptores de eventos y prepara conexiones seguras con tus canales.",
              image: "/brand/sections/acerca-tu-ecosistema.jpg",
              to: "/integrations",
              tone: "blue",
              action: "Ver integraciones",
            },
            {
              icon: ShieldCheck,
              label: "Gobernar",
              title: "Haz visible cada decisión",
              description:
                "Revisa políticas, versiones y aprobaciones de tus proyectos en un solo lugar.",
              image: "/brand/sections/haz-visible-cada-decision.jpg",
              to: "/audit",
              tone: "gold",
              action: "Consultar auditoría",
            },
          ].map((item) => (
            <Link
              key={item.title}
              to={item.to}
              className={`action-card action-${item.tone} has-art`}
              style={{ backgroundImage: `url("${item.image}")` }}
            >
              <div className="action-card-top">
                <span className="feature-icon">
                  <item.icon size={25} />
                </span>
                <span>{item.label}</span>
              </div>
              <h3>{item.title}</h3>
              <p>{item.description}</p>
              <div className="action-card-link">
                {item.action}
                <ArrowUpRight size={18} />
              </div>
            </Link>
          ))}
        </div>
      </section>
      <section className="academy-banner">
        <div className="academy-icon">
          <BookOpen size={28} />
        </div>
        <div>
          <span className="eyebrow">NUEVO EN TAMV</span>
          <h2>Tu primera idea empieza por entender.</h2>
          <p>Un recorrido guiado de seis pasos. Sin prisas, sin tecnicismos innecesarios.</p>
        </div>
        <Button asChild variant="outline">
          <Link to="/guide">
            Empezar tutorial
            <ArrowRight size={16} />
          </Link>
        </Button>
      </section>
      <div className="workspace-bottom-grid">
        <section className="workspace-panel">
          <div className="section-heading">
            <div>
              <span className="eyebrow">EN TU MESA</span>
              <h2>Proyectos recientes</h2>
            </div>
            <Link to="/projects" className="text-link">
              Ver todos
              <ArrowUpRight size={16} />
            </Link>
          </div>
          {error ? (
            <p role="alert">No se pudieron cargar tus proyectos. Abre Proyectos para reintentar.</p>
          ) : loading ? (
            <p role="status">Cargando tus proyectos…</p>
          ) : projects.length ? (
            projects.slice(0, 4).map((project) => (
              <Link to="/projects" key={project.id} className="recent-project">
                <FolderKanban size={22} />
                <div>
                  <strong>{project.name}</strong>
                  <span>
                    Versión {project.version} ·{" "}
                    {project.approved_version === project.version
                      ? "Aprobada"
                      : "Revisión pendiente"}
                  </span>
                </div>
                <ArrowUpRight size={16} />
              </Link>
            ))
          ) : (
            <div className="project-empty">
              <FolderKanban size={32} />
              <h3>
                {session.status === "authenticated"
                  ? "Aquí empieza tu próximo proyecto"
                  : "Un espacio solo para tus proyectos"}
              </h3>
              <p>
                {session.status === "authenticated"
                  ? "Reúne propósito, configuración y evidencias."
                  : "Inicia sesión para organizar tus iniciativas."}
              </p>
              <Button asChild variant="outline">
                <Link to="/projects">
                  Ir a proyectos
                  <ArrowRight size={16} />
                </Link>
              </Button>
            </div>
          )}
        </section>
        <section className="workspace-panel">
          <div className="section-heading">
            <div>
              <span className="eyebrow">CONFIANZA POR DISEÑO</span>
              <h2>Las reglas del espacio</h2>
            </div>
            <ShieldCheck className="text-primary" size={22} />
          </div>
          <p className="panel-intro">
            Controles definidos por el SDK; su presencia no certifica el despliegue.
          </p>
          <div className="workspace-controls">
            {CORE_CONTROLS.map((control) => (
              <div key={control.id}>
                <Check size={16} />
                <span>{control.title}</span>
              </div>
            ))}
          </div>
          <Link to="/sdk" className="text-link">
            Explorar los controles
            <ArrowRight size={16} />
          </Link>
          <div className="panel-evidence">
            <FileClock size={18} />
            Los resultados y la disponibilidad dependen de la configuración y certificación del
            entorno.
          </div>
        </section>
      </div>
    </>
  );
}
