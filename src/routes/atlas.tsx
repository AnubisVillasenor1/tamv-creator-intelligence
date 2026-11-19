import { useMemo, useState, type CSSProperties } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { ArrowRight, Bot, CheckCircle2, ChevronLeft, ChevronRight, GitBranch, Network, Search, ShieldCheck, Sparkles } from "lucide-react";
import { skillRegistry } from "@/lib/skill-registry";
import { AtlasAiAssistant } from "@/components/atlas-ai-assistant";
import { skillRoadmap } from "@/lib/skill-roadmap";

export const Route = createFileRoute("/atlas")({
  head: () => ({ meta: [
    { title: "TAMV Atlas · Skills, guía y grafos" },
    { name: "description", content: "Atlas operativo de skills, guía paso a paso, Mermaid y visualización de dependencias de proyectos TAMV." }
  ] }),
  component: AtlasPage,
});

const guide = [
  { title: "Define qué quieres lograr", detail: "Escribe el resultado que buscas en una frase. Evita empezar por herramientas: primero define el problema, quién lo tiene y cómo sabrás que está resuelto.", action: "Redacta un objetivo observable.", check: "¿Puedes comprobar el resultado sin depender de una opinión?" },
  { title: "Crea o selecciona un proyecto", detail: "Abre Proyectos, identifica el proyecto correcto y confirma su responsable. Si aún no existe, crea uno con un nombre claro, alcance inicial y límites conocidos.", action: "Registra nombre, responsable y objetivo.", check: "¿El alcance evita mezclar tareas no relacionadas?" },
  { title: "Elige los contratos adecuados", detail: "Busca skills por tarea, revisa entradas, salidas y dependencias. Un contrato describe un flujo de trabajo; por sí solo no instala un modelo, no ejecuta código y no concede permisos.", action: "Selecciona solo las skills relevantes.", check: "¿Conoces los datos que se entregarán y el resultado esperado?" },
  { title: "Prepara evidencia y permisos", detail: "Verifica procedencia de los datos, licencias, consentimiento, permisos del proveedor y variables de entorno. No pegues secretos en chats ni en artefactos públicos.", action: "Completa el control de derechos y seguridad.", check: "¿Cada dato y activo tiene una base de uso válida?" },
  { title: "Ejecuta una prueba pequeña", detail: "Empieza con una entrada no sensible y un alcance reducido. Comprueba el resultado, revisa errores y compara contra criterios de aceptación antes de ampliar.", action: "Ejecuta un caso de prueba reversible.", check: "¿Puedes repetirlo y explicar qué produjo el resultado?" },
  { title: "Revisa, aprueba y documenta", detail: "Inspecciona calidad, riesgos y limitaciones. Las acciones externas o destructivas requieren autorización explícita y controles reales del servidor; la interfaz no sustituye esa autorización.", action: "Guarda decisión, versión y evidencia.", check: "¿Queda claro quién aprobó qué versión y con qué pruebas?" }
];

function AtlasPage() {
  const [query, setQuery] = useState("");
  const [step, setStep] = useState(0);
  const [done, setDone] = useState<number[]>([]);
  const [view, setView] = useState<"graph" | "mermaid" | "catalog">("graph");
  const [selected, setSelected] = useState("tamv-core-governance");
  const skills = useMemo(() => {
    const implemented = skillRegistry.map((s) => ({ ...s, stage: "Contrato existente" }));
    const planned = skillRoadmap.slice(0, 59).map((s) => ({ ...s, stage: "Blueprint · no ejecutable" }));
    const all = [...implemented, ...planned];
    const q = query.trim().toLocaleLowerCase("es");
    return q ? all.filter((s) => [s.id, s.name, s.category, s.description].join(" ").toLocaleLowerCase("es").includes(q)) : all;
  }, [query]);
  const active = guide[step]!;
  const toggleDone = () => setDone((old) => old.includes(step) ? old.filter((n) => n !== step) : [...old, step]);
  const nodes = [
    { id: "govern", label: "Govern Core", x: 50, y: 18, color: "#8fb7ff" },
    { id: "skills", label: "Skills / contratos", x: 24, y: 45, color: "#8bd9d0" },
    { id: "project", label: "Proyecto", x: 50, y: 51, color: "#c5b5ff" },
    { id: "evidence", label: "Evidencia", x: 76, y: 45, color: "#f0c58a" },
    { id: "human", label: "Aprobación humana", x: 50, y: 82, color: "#f5a8c8" }
  ];
  return <main className="atlas-page">
    <section className="atlas-hero">
      <div className="atlas-kicker"><Sparkles size={15}/> TAMV CREATOR INTELLIGENCE · ATLAS</div>
      <h1>Comprende el sistema. <span>Domina el flujo.</span></h1>
      <p>Un espacio unificado para explorar contratos, seguir un recorrido guiado y comprender cómo se relacionan los proyectos, las skills, la evidencia y las decisiones humanas.</p>
      <div className="atlas-metrics"><div><strong>100</strong><span>Catálogo inicial</span></div><div><strong>41</strong><span>Contratos actuales</span></div><div><strong>59</strong><span>Blueprints propuestos</span></div><div><strong>6</strong><span>Pasos de aprendizaje</span></div></div>
      <p className="atlas-disclaimer">Importante: los 41 contratos existentes y los 59 blueprints se distinguen explícitamente. Los blueprints son diseños de alcance, no skills instalables ni capacidades certificadas.</p>
    </section>
    <section className="atlas-section">
      <div className="atlas-section-heading"><div><span className="atlas-eyebrow">01 / ASISTENTE DE ORIENTACIÓN</span><h2>Tu guía paso a paso</h2><p>Orientación detallada para principiantes, sin atribuirse acciones que no ha ejecutado.</p></div><div className="atlas-progress"><span>{done.length} de {guide.length} pasos marcados</span><div><i style={{ width: (done.length / guide.length * 100) + "%" }}/></div></div></div>
      <div className="atlas-guide">
        <aside className="atlas-guide-steps">{guide.map((g, i) => <button key={g.title} onClick={() => setStep(i)} className={step === i ? "selected" : ""}><span>{done.includes(i) ? <CheckCircle2 size={17}/> : String(i + 1).padStart(2, "0")}</span>{g.title}</button>)}</aside>
        <article className="atlas-guide-card"><div className="atlas-card-label"><Bot size={16}/> GUÍA INTERACTIVA · PASO {String(step + 1).padStart(2, "0")}</div><h3>{active.title}</h3><p>{active.detail}</p><div className="atlas-action"><strong>Qué hacer ahora</strong><span>{active.action}</span></div><div className="atlas-check"><ShieldCheck size={18}/><div><strong>Verifica antes de continuar</strong><p>{active.check}</p></div></div><div className="atlas-guide-controls"><button className="atlas-secondary" disabled={step === 0} onClick={() => setStep((s) => Math.max(0, s - 1))}><ChevronLeft size={16}/> Anterior</button><button className="atlas-secondary" onClick={toggleDone}>{done.includes(step) ? "Desmarcar paso" : "Marcar completado"}</button><button className="atlas-primary" disabled={step === guide.length - 1} onClick={() => setStep((s) => Math.min(guide.length - 1, s + 1))}>Siguiente <ChevronRight size={16}/></button></div><p className="atlas-honesty">Este asistente es una guía interactiva local. No llama a un modelo de IA ni modifica tus proyectos; la integración con un proveedor de IA requiere un endpoint seguro, autorización y configuración de servidor.</p></article>
      </div>
    </section>
    <AtlasAiAssistant />
    <section className="atlas-section">
      <div className="atlas-section-heading"><div><span className="atlas-eyebrow">02 / VISUALIZACIÓN VIVA</span><h2>Mapa mental y grafo de dependencias</h2><p>Explora la relación conceptual entre gobernanza, proyectos, contratos y evidencia. El mapa usa perspectiva 3D CSS y no representa telemetría en tiempo real.</p></div><div className="atlas-tabs"><button className={view === "graph" ? "active" : ""} onClick={() => setView("graph")}><Network size={15}/> Grafo</button><button className={view === "mermaid" ? "active" : ""} onClick={() => setView("mermaid")}><GitBranch size={15}/> Mermaid</button><button className={view === "catalog" ? "active" : ""} onClick={() => setView("catalog")}><Search size={15}/> Catálogo</button></div></div>
      {view === "graph" && <div className="atlas-graph-shell"><div className="atlas-graph" aria-label="Grafo conceptual con cinco nodos y conexiones en perspectiva 3D CSS"><svg viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true"><path d="M50 18 L24 45 L50 51 L76 45 L50 18 M24 45 L50 82 L76 45 M50 51 L50 82" /></svg>{nodes.map(n => <button key={n.id} onClick={() => setSelected(n.id)} className={"atlas-node " + (selected === n.id ? "chosen" : "")} style={{ left: n.x + "%", top: n.y + "%", "--node-accent": n.color, "--node-depth": selected === n.id ? "36px" : "12px" } as CSSProperties}>{n.label}</button>)}</div><aside className="atlas-node-info"><span className="atlas-eyebrow">NODO SELECCIONADO</span><h3>{nodes.find(n => n.id === selected)?.label ?? "Gobernanza"}</h3><p>{selected === "human" ? "La revisión humana decide sobre cambios sensibles y efectos externos. Una visualización no concede permisos." : selected === "evidence" ? "Los resultados necesitan procedencia, pruebas, fecha, versión y límites declarados." : selected === "skills" ? "Cada contrato especifica entradas, salidas y dependencias; su existencia no prueba que un proveedor esté disponible." : selected === "project" ? "El proyecto agrupa objetivo, configuración, versión, controles y entregables." : "La gobernanza define políticas y límites. La ausencia de evidencia debe detener capacidades certificadas."}</p><span className="atlas-node-badge">Modelo conceptual · no telemetría en vivo</span></aside></div>}
      {view === "mermaid" && <div className="atlas-mermaid"><div><span className="atlas-eyebrow">DIAGRAMA MERMAID</span><p>Fuente editable y exportable. La vista es textual de Mermaid para conservar compatibilidad sin cargar un renderer externo.</p></div><pre>{`flowchart TD
  A[Objetivo del usuario] --> B[Proyecto TAMV]
  B --> C[Selección de skills]
  C --> D[Govern Core]
  D --> E{¿Evidencia y permisos válidos?}
  E -->|No| F[Detener y explicar brechas]
  E -->|Sí| G[Prueba acotada]
  G --> H[Revisión humana]
  H --> I[Registro de decisión y evidencia]
  I --> J[Iterar o cerrar]`}</pre><button className="atlas-secondary" onClick={() => void navigator.clipboard?.writeText(`flowchart TD\n A[Objetivo del usuario] --> B[Proyecto TAMV]\n B --> C[Selección de skills]\n C --> D[Govern Core]\n D --> E{¿Evidencia y permisos válidos?}\n E -->|No| F[Detener y explicar brechas]\n E -->|Sí| G[Prueba acotada]\n G --> H[Revisión humana]\n H --> I[Registro de decisión y evidencia]\n I --> J[Iterar o cerrar]`)}>Copiar Mermaid</button></div>}
      {view === "catalog" && <div className="atlas-catalog"><label htmlFor="skill-search">Buscar por nombre, categoría o descripción</label><div className="atlas-search"><Search size={17}/><input id="skill-search" value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Ej. seguridad, audio, investigación…"/></div><div className="atlas-skill-grid">{skills.map(s => <article key={s.id} className="atlas-skill-card"><div><span className={s.stage === "Contrato existente" ? "atlas-stage live" : "atlas-stage"}>{s.stage}</span><span className="atlas-category">{s.category}</span></div><h3>{s.name}</h3><p>{s.description}</p><dl><dt>Entrada</dt><dd>{s.inputs}</dd><dt>Salida</dt><dd>{s.outputs}</dd></dl><button onClick={() => { setSelected(s.category === "Seguridad" || s.category === "Gobernanza" ? "govern" : s.category === "Datos" || s.category === "Investigación" ? "evidence" : "skills"); setView("graph"); }} className="atlas-link">Ver en el mapa <ArrowRight size={14}/></button></article>)}</div><p className="atlas-count">Mostrando {skills.length} de 100 entradas del catálogo inicial. Las propuestas requieren implementación, pruebas, revisión de seguridad y evidencia antes de considerarse operativas.</p></div>}
    </section>
  </main>;
}
