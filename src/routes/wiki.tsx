import { createFileRoute, Link } from "@tanstack/react-router";
import { BookOpen, GitBranch, ShieldCheck, Wrench } from "lucide-react";

export const Route = createFileRoute("/wiki")({
  head: () => ({ meta: [{ title: "Wiki y documentación · TAMV" }, { name: "description", content: "Documentación operativa, arquitectura y procedimientos de TAMV Creator Intelligence." }] }),
  component: WikiPage,
});

const topics = [
  { title: "Comenzar como usuario", description: "Objetivos, proyectos, selección de skills y verificación de resultados.", href: "/guide", icon: BookOpen },
  { title: "Atlas y catálogo de skills", description: "Distingue contratos implementados de blueprints que aún requieren desarrollo.", href: "/atlas", icon: GitBranch },
  { title: "Seguridad y gobernanza", description: "Autenticación, permisos mínimos, datos sensibles y supervisión humana.", href: "/sovereignty", icon: ShieldCheck },
  { title: "Operación y diagnóstico", description: "Pruebas, errores conocidos, evidencia y límites de despliegue.", href: "/hypercore", icon: Wrench },
] as const;

function WikiPage() {
  return <div className="mx-auto w-full max-w-6xl space-y-8 p-4 md:p-8">
    <header className="max-w-3xl space-y-3"><p className="text-sm font-semibold uppercase tracking-[.18em] text-primary">Centro de conocimiento</p><h1 className="text-4xl font-semibold tracking-tight md:text-5xl">Wiki de TAMV</h1><p className="text-lg text-muted-foreground">Documentación por tarea y nivel de experiencia. El README es el índice corto; las decisiones, procedimientos y referencias extensas deben mantenerse en la carpeta docs/.</p></header>
    <div className="grid gap-4 sm:grid-cols-2">{topics.map(({title,description,href,icon:Icon})=><Link key={href} to={href} className="group rounded-2xl border bg-card p-6 transition-colors hover:border-primary/50 hover:bg-accent/40"><Icon className="mb-4 text-primary" size={22}/><h2 className="text-xl font-semibold">{title}</h2><p className="mt-2 text-sm leading-6 text-muted-foreground">{description}</p><span className="mt-5 inline-flex text-sm font-medium text-primary">Abrir sección →</span></Link>)}</div>
    <section className="rounded-2xl border p-6"><h2 className="text-xl font-semibold">Modelo de documentación</h2><p className="mt-2 text-sm text-muted-foreground">Cada capacidad debe declarar estado, responsable, requisitos, procedimiento, comprobación, fallos comunes y evidencia. No describas un blueprint como funcionalidad disponible.</p><pre className="mt-4 overflow-x-auto rounded-xl bg-muted p-4 text-sm"><code>{`flowchart TD
  A[README breve] --> B[Índice docs/]
  B --> C[Guía de usuario]
  B --> D[Arquitectura y decisiones]
  B --> E[Seguridad y operaciones]
  C --> F[Verificación del resultado]
  D --> F
  E --> F`}</code></pre></section>
    <p className="text-sm text-muted-foreground">Para contribuir a esta wiki, actualiza primero la página temática y agrega aquí un enlace. Evita copiar el mismo contenido en README, wiki y auditorías.</p>
  </div>;
}
