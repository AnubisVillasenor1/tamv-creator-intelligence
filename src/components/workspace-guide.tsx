import { useEffect, useRef, useState } from "react";
import { Link } from "@tanstack/react-router";
import {
  ArrowLeft,
  ArrowRight,
  AudioWaveform,
  Check,
  Compass,
  FolderKanban,
  PlugZap,
  RotateCcw,
  ShieldCheck,
  Workflow,
} from "lucide-react";
import { Button } from "@/components/ui/button";

const steps = [
  {
    title: "Tu creatividad, con dirección",
    short: "Conoce TAMV",
    icon: Compass,
    label: "01 / TU PUNTO DE PARTIDA",
    body: "TAMV es un espacio para organizar proyectos de IA, crear audio local, integrar señales de tus canales y revisar decisiones con controles humanos. No es una red social ni un sistema que publica por ti.",
    example:
      "Por ejemplo: prepara una campaña, genera una base sonora y documenta quién revisó los derechos antes de usarla.",
    action: "Explorar el espacio",
    to: "/",
    note: "Puedes recorrer la plataforma sin una cuenta. Tus proyectos y el estudio requieren iniciar sesión.",
  },
  {
    title: "Dale un lugar a cada idea",
    short: "Organiza",
    icon: FolderKanban,
    label: "02 / PROYECTOS",
    body: "Un proyecto reúne tu caso de uso, su configuración, los controles aplicables y las aprobaciones. Empieza con un objetivo concreto y revisa su política antes de solicitar una evaluación.",
    example:
      "Define el objetivo, responsable, audiencia y datos permitidos. Una nueva versión de la configuración necesita su propia revisión.",
    action: "Ir a proyectos",
    to: "/projects",
    note: "La persistencia depende de Supabase y sus políticas de acceso. Una evaluación IA necesita el gateway configurado.",
  },
  {
    title: "Crea con evidencia, no con promesas",
    short: "Crea",
    icon: AudioWaveform,
    label: "03 / ESTUDIO CREATIVO",
    body: "El estudio produce WAV mediante síntesis procedural local y mide su sonoridad. También permite ejecutar planes deterministas de audio y SHA-256. No genera canto ni usa un agente autónomo.",
    example:
      "Escribe un prompt, elige duración, declara los derechos y marca el consentimiento. Si la certificación y la cuota lo permiten, descarga el WAV y su hash.",
    action: "Abrir el estudio",
    to: "/studio",
    note: "Sin firma de release, sesión o cuotas configuradas, la ejecución se bloquea. No se inventa un resultado.",
  },
  {
    title: "Conecta señales, no permisos ilimitados",
    short: "Conecta",
    icon: PlugZap,
    label: "04 / INTEGRACIONES",
    body: "Un webhook permite que un proveedor avise a TAMV cuando ocurre un evento. El receptor verifica su autenticidad y entrega un sobre firmado al destino configurado por tu operador.",
    example:
      "Un evento de GitHub puede alimentar tu automatización externa. Una notificación de WhatsApp no concede permiso para responder ni publicar.",
    action: "Explorar integraciones",
    to: "/integrations",
    note: "Cada red requiere su app, permisos y secretos de servidor. La entrega no sustituye la aprobación humana ni habilita publicación social.",
  },
  {
    title: "Entiende qué gobierna cada skill",
    short: "Gobierna",
    icon: Workflow,
    label: "05 / CONTRATOS Y CONTROLES",
    body: "Las skills describen reglas, responsabilidades y dependencias. El catálogo muestra cómo se relacionan y la revisión creativa utiliza contratos resueltos como instrucciones y metadatos.",
    example:
      "Revisar contenido incorpora contratos de derechos, gobernanza y crecimiento. Resolver un contrato no significa ejecutar un servicio independiente.",
    action: "Explorar skills",
    to: "/marketplace",
    note: "Los contratos no prueban disponibilidad de modelos, workers ni proveedores. La evidencia manda sobre el catálogo.",
  },
  {
    title: "Cada decisión merece una explicación",
    short: "Verifica",
    icon: ShieldCheck,
    label: "06 / AUDITORÍA",
    body: "Consulta políticas, cambios y aprobaciones de tus proyectos. Exporta la evidencia y verifica el estado del entorno antes de promover un trabajo. Mantén separadas creación, revisión y publicación.",
    example:
      "Comprueba responsable, versión, derechos y resultados. Un HTTP 200 de diagnóstico no equivale a una plataforma certificada.",
    action: "Abrir auditoría",
    to: "/audit",
    note: "Completar este recorrido solo registra tu progreso de lectura en este navegador; no certifica tu cuenta ni ejecuta acciones.",
  },
] as const;
const storageKey = "tamv.guide.v1";

export function WorkspaceGuide() {
  const [index, setIndex] = useState(0);
  const [completed, setCompleted] = useState(false);
  const [storageUnavailable, setStorageUnavailable] = useState(false);
  const title = useRef<HTMLHeadingElement>(null);
  useEffect(() => {
    try {
      const saved: unknown = JSON.parse(localStorage.getItem(storageKey) ?? "null");
      if (
        saved &&
        typeof saved === "object" &&
        "index" in saved &&
        Number.isInteger(saved.index) &&
        Number(saved.index) >= 0 &&
        Number(saved.index) < steps.length
      ) {
        setIndex(Number(saved.index));
        setCompleted("completed" in saved && saved.completed === true);
      }
    } catch {
      setStorageUnavailable(true);
    }
  }, []);
  function move(next: number, done = false) {
    setIndex(next);
    setCompleted(done);
    try {
      localStorage.setItem(storageKey, JSON.stringify({ index: next, completed: done }));
    } catch {
      setStorageUnavailable(true);
    }
    title.current?.focus();
  }
  const step = steps[index]!;
  return (
    <>
      <div className="page-heading">
        <span className="eyebrow">TAMV ACADEMY / PRIMEROS PASOS</span>
        <h1>De la idea al control.</h1>
        <p>Seis pasos para entender tu espacio. A tu ritmo, sin configurar secretos.</p>
      </div>
      <div className="guide-layout">
        <nav className="guide-steps" aria-label="Pasos del tutorial">
          {steps.map((item, i) => (
            <button
              key={item.short}
              onClick={() => move(i)}
              aria-current={i === index ? "step" : undefined}
            >
              <span>
                {completed || i < index ? <Check size={16} /> : String(i + 1).padStart(2, "0")}
              </span>
              <div>
                <small>Paso {i + 1}</small>
                <strong>{item.short}</strong>
              </div>
            </button>
          ))}
        </nav>
        <section className="guide-card">
          <div className="guide-meta">
            <span className="eyebrow">{step.label}</span>
            <span>
              {index + 1} de {steps.length}
            </span>
          </div>
          <progress
            aria-label="Progreso del tutorial"
            value={completed ? steps.length : index}
            max={steps.length}
          />
          <div className="guide-illustration" aria-hidden="true">
            <step.icon size={52} strokeWidth={1.2} />
            <span>APRENDE · EXPLORA · DECIDE</span>
          </div>
          <div aria-live="polite">
            <h2 ref={title} tabIndex={-1}>
              {completed ? "Tu recorrido está completo." : step.title}
            </h2>
            <p className="guide-body">
              {completed
                ? "Ya conoces las herramientas y sus límites. Elige tu siguiente paso; la decisión sigue siendo tuya."
                : step.body}
            </p>
          </div>
          <div className="guide-example">
            <span>EN LA PRÁCTICA</span>
            <p>{step.example}</p>
          </div>
          <p className="guide-note">
            <ShieldCheck size={18} />
            {step.note}
          </p>
          <Button asChild variant="outline">
            <Link to={step.to}>
              {step.action}
              <ArrowRight size={16} />
            </Link>
          </Button>
          <div className="guide-controls">
            <Button variant="ghost" disabled={index === 0} onClick={() => move(index - 1)}>
              <ArrowLeft />
              Anterior
            </Button>
            {completed ? (
              <Button onClick={() => move(0)}>
                <RotateCcw />
                Reiniciar recorrido
              </Button>
            ) : (
              <Button
                onClick={() => (index === steps.length - 1 ? move(index, true) : move(index + 1))}
              >
                {index === steps.length - 1 ? "Finalizar recorrido" : "Entendido, continuar"}
                <ArrowRight />
              </Button>
            )}
          </div>
          {storageUnavailable && (
            <p role="status" className="text-sm text-muted-foreground">
              Tu navegador no permite guardar el progreso; puedes seguir con el tutorial.
            </p>
          )}
        </section>
      </div>
    </>
  );
}
