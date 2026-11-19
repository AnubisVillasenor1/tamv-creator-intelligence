import { useState, type FormEvent } from "react";
import { Bot, LoaderCircle, Send, ShieldCheck, UserRound } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

type ChatMessage = { role: "user" | "assistant"; content: string };

export function AtlasAiAssistant() {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [draft, setDraft] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [remaining, setRemaining] = useState<number | null>(null);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const message = draft.trim();
    if (!message || loading) return;
    const prior = messages.slice(-8);
    setMessages((current) => [...current, { role: "user", content: message }]);
    setDraft("");
    setError("");
    setLoading(true);
    try {
      const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
      if (sessionError || !sessionData.session?.access_token) throw new Error("Inicia sesión para utilizar el asistente conversacional.");
      const response = await fetch("/api/guide", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: "Bearer " + sessionData.session.access_token },
        body: JSON.stringify({ message, history: prior, context: "Pantalla Atlas de TAMV Creator Intelligence; guía y catálogo de skills." }),
      });
      const payload: unknown = await response.json().catch(() => null);
      if (!response.ok) {
        const code = payload && typeof payload === "object" ? (payload as { code?: string }).code : undefined;
        if (code === "GUIDE_AI_NOT_CONFIGURED") throw new Error("El servicio de IA todavía no está configurado en el servidor. El resto del Atlas sigue disponible.");
        if (response.status === 401) throw new Error("Inicia sesión para utilizar el asistente conversacional.");
        if (response.status === 429 || response.status === 503) throw new Error("Se alcanzó un límite temporal o el servicio está ocupado. Espera un momento y vuelve a intentarlo.");
        throw new Error("No se pudo completar la consulta. Comprueba la conexión e inténtalo de nuevo.");
      }
      if (!payload || typeof payload !== "object" || typeof (payload as { answer?: unknown }).answer !== "string") throw new Error("La respuesta del asistente no tiene el formato esperado.");
      setMessages((current) => [...current, { role: "assistant", content: (payload as { answer: string }).answer }]);
      const disclosure = (payload as { disclosure?: { remainingToday?: unknown } }).disclosure;
      if (typeof disclosure?.remainingToday === "number") setRemaining(disclosure.remainingToday);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Error inesperado al consultar el asistente.");
    } finally {
      setLoading(false);
    }
  }

  return <section className="atlas-ai-panel" aria-labelledby="atlas-ai-title">
    <div className="atlas-ai-heading"><div className="atlas-ai-icon"><Bot size={20}/></div><div><span className="atlas-eyebrow">ASISTENTE CONVERSACIONAL</span><h3 id="atlas-ai-title">Pregunta cómo hacerlo</h3><p>Solicita instrucciones adaptadas a tu nivel y al proceso que estás realizando.</p></div></div>
    <div className="atlas-ai-disclosure"><ShieldCheck size={16}/><span>Solo orientación: no ejecuta herramientas ni publica cambios. Las consultas requieren sesión y configuración segura del proveedor.</span></div>
    {messages.length > 0 && <div className="atlas-ai-messages" aria-live="polite">{messages.map((message, index) => <article key={index} className={"atlas-ai-message " + message.role}><span>{message.role === "assistant" ? <Bot size={15}/> : <UserRound size={15}/>} {message.role === "assistant" ? "TAMV Guide" : "Tú"}</span><p>{message.content}</p></article>)}</div>}
    {error && <p className="atlas-ai-error" role="alert">{error}</p>}
    <form onSubmit={submit} className="atlas-ai-form"><label className="sr-only" htmlFor="atlas-ai-question">Pregunta para el asistente</label><textarea id="atlas-ai-question" value={draft} onChange={(event) => setDraft(event.target.value)} maxLength={6000} rows={3} placeholder="Ej. Explícame paso a paso cómo crear un proyecto y comprobar sus permisos…" disabled={loading}/><div><span>{remaining === null ? "No compartas contraseñas ni claves API." : remaining + " consultas disponibles hoy según la cuota del servidor."}</span><button type="submit" disabled={loading || !draft.trim()}>{loading ? <LoaderCircle size={16} className="atlas-spin"/> : <Send size={16}/>} {loading ? "Consultando…" : "Consultar"}</button></div></form>
  </section>;
}
