import { createFileRoute, Link } from "@tanstack/react-router";
import { HelpCircle } from "lucide-react";

export const Route = createFileRoute("/faq")({
  head: () => ({ meta: [{ title: "Preguntas frecuentes · TAMV" }, { name: "description", content: "Respuestas sobre skills, asistente, seguridad, pagos y despliegue." }] }),
  component: FaqPage,
});

const questions = [
  ["¿Las 100 entradas son 100 skills operativas?", "No. El catálogo distingue contratos existentes de blueprints propuestos. Un blueprint no debe contarse como capacidad operativa hasta tener implementación, pruebas, permisos, documentación y evidencia."],
  ["¿El asistente de IA puede ejecutar acciones por mí?", "No. La guía conversacional orienta y explica pasos; no ejecuta herramientas ni publica cambios. Requiere sesión autenticada y un proveedor configurado en el servidor."],
  ["¿Puedo utilizar el proyecto sin ser desarrollador?", "Sí para explorar las pantallas y seguir la guía. Para conectar servicios, administrar secretos, migrar datos o desplegar, sigue los prerequisitos y solicita revisión cuando se trate de operaciones sensibles."],
  ["¿Ya se pueden procesar pagos?", "No se debe asumir que los pagos están activos por la existencia de una página. El checkout, los webhooks, la persistencia de suscripciones, la reconciliación y las pruebas deben verificarse en el entorno desplegado."],
  ["¿Cómo se protegen las claves API?", "Las claves privadas deben permanecer en variables de servidor o en un gestor de secretos. Nunca las pegues en el chat, en el frontend ni en archivos versionados."],
  ["¿Un build exitoso significa que está listo para producción?", "No. También se requieren pruebas de integración con servicios reales, comprobación de permisos/RLS, migraciones, observabilidad, restauración, firma del release y aceptación explícita del despliegue."],
  ["¿Dónde está la documentación extensa?", "En la sección Wiki y en docs/. El README raíz debe mantenerse como una portada concisa con enlaces al material especializado."],
];

function FaqPage() {
  return <div className="mx-auto w-full max-w-4xl space-y-8 p-4 md:p-8">
    <header className="space-y-3"><HelpCircle className="text-primary" size={28}/><p className="text-sm font-semibold uppercase tracking-[.18em] text-primary">Ayuda y soporte</p><h1 className="text-4xl font-semibold tracking-tight">Preguntas frecuentes</h1><p className="text-muted-foreground">Respuestas directas sobre el estado real de las capacidades y sus límites.</p></header>
    <div className="space-y-3">{questions.map(([question,answer])=><details key={question} className="group rounded-xl border bg-card p-5"><summary className="cursor-pointer list-none font-semibold marker:hidden">{question}<span className="float-right text-primary">+</span></summary><p className="mt-3 max-w-3xl text-sm leading-6 text-muted-foreground">{answer}</p></details>)}</div>
    <p className="text-sm text-muted-foreground">¿Necesitas una guía específica? Abre el <Link to="/atlas" className="font-medium text-primary underline-offset-4 hover:underline">Atlas inteligente</Link> o consulta la <Link to="/wiki" className="font-medium text-primary underline-offset-4 hover:underline">Wiki</Link>.</p>
  </div>;
}
