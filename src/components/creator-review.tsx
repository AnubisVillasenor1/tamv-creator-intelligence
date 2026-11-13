import { useState } from 'react';
import { ArrowUpRight, Check, Copy, LoaderCircle, ShieldCheck, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { contentSchema, type Review } from '@/lib/content-schema';
import { reviewContent } from '@/lib/content.functions';

export function CreatorReview({ onComplete }: { onComplete: () => void }) {
  const [draft, setDraft] = useState('');
  const [audience, setAudience] = useState('');
  const [goal, setGoal] = useState('');
  const [channel, setChannel] = useState('Instagram');
  const [consent, setConsent] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [result, setResult] = useState<Review>();
  const [audit, setAudit] = useState<{ hash: string; runId: string; timestamp: string }>();
  const [copied, setCopied] = useState(false);
  async function submit(event: React.FormEvent) {
    event.preventDefault();
    const parsed = contentSchema.safeParse({ draft, audience, goal, channel, consent });
    if (!parsed.success) { setError(parsed.error.issues[0]?.message ?? 'Revisa los campos.'); return; }
    setBusy(true); setError(''); setResult(undefined); setAudit(undefined);
    try {
      const response = await reviewContent({ data: parsed.data });
      if (response.ok) { setResult(response.review); setAudit(response.audit); onComplete(); }
      else setError(response.error);
    } catch (caught) {
      if (caught instanceof Response) {
        try {
          const payload = await caught.clone().json() as { error?: string; reason?: string };
          setError(payload.error ? `${payload.error}. ${payload.reason ?? "Revisa la certificación TAMV."}` : "La distribución TAMV no está certificada; la revisión se bloqueó antes de enviar el texto.");
        } catch {
          setError("La distribución TAMV no está certificada; la revisión se bloqueó antes de enviar el texto.");
        }
      } else {
        setError('No se pudo conectar con la revisión. Tu texto sigue intacto.');
      }
    }
    finally { setBusy(false); }
  }
  return <section id="review" className="scroll-mt-8">
    <div className="section-heading"><div><span className="eyebrow">CREATOR INTELLIGENCE</span><h2>Tu próxima mejor versión.</h2></div><span className="quiet-label"><Sparkles size={14}/> AI Gateway</span></div>
    <div className="review-grid">
      <form onSubmit={submit} className="review-form">
        <div className="flex items-center justify-between mb-6"><h3 className="font-medium">Comparte tu borrador</h3><span className="text-xs text-muted-foreground">01 / CONTEXTO</span></div>
        <label className="field-label" htmlFor="draft">Contenido</label>
        <textarea id="draft" value={draft} onChange={e => setDraft(e.target.value)} maxLength={12000} placeholder="La idea comienza aquí…" className="field min-h-40 resize-y" disabled={busy}/>
        <div className="text-right text-xs text-muted-foreground mt-2">{draft.length.toLocaleString()} / 12,000</div>
        <div className="grid sm:grid-cols-2 gap-4 mt-4">
          <div><label className="field-label" htmlFor="audience">Tu audiencia</label><input id="audience" className="field" value={audience} maxLength={600} onChange={e => setAudience(e.target.value)} placeholder="Ej. músicos independientes de México" disabled={busy}/></div>
          <div><label className="field-label" htmlFor="channel">Canal</label><select id="channel" className="field" value={channel} onChange={e => setChannel(e.target.value)} disabled={busy}>{['Instagram','YouTube','TikTok','Newsletter','Otro'].map(c => <option key={c}>{c}</option>)}</select></div>
        </div>
        <label className="field-label mt-4" htmlFor="goal">¿Qué quieres lograr?</label><input id="goal" className="field" maxLength={600} value={goal} onChange={e => setGoal(e.target.value)} placeholder="Ej. invitar a mi comunidad a un taller musical" disabled={busy}/>
        <label className="flex gap-3 text-xs leading-5 text-muted-foreground mt-5"><input type="checkbox" checked={consent} onChange={e => setConsent(e.target.checked)} disabled={busy} className="accent-primary mt-1 shrink-0"/>Soy titular o tengo permiso sobre este contenido y autorizo enviarlo a AI Gateway para esta revisión. No incluyo datos privados.</label>
        {error && <p role="alert" className="text-sm text-destructive mt-4">{error}</p>}
        <Button type="submit" disabled={busy} className="w-full mt-5 h-11">{busy ? <><LoaderCircle className="animate-spin"/>Analizando tu contenido…</> : <><Sparkles/>Proponer mejoras<ArrowUpRight/></>}</Button>
      </form>
      <div className="review-output" aria-live="polite">
        <div className="flex justify-between items-center"><h3 className="font-medium">Perspectiva creativa</h3><span className="text-xs text-muted-foreground">02 / PROPUESTA</span></div>
        {result ? <div className="mt-6 space-y-6"><p className="text-sm leading-6">{result.diagnosis}</p>{result.improvements.map((r,i) => <div key={i} className="border-t border-border pt-4"><span className="eyebrow">0{i+1}</span><h4 className="font-medium mt-1">{r.title}</h4><p className="text-sm text-muted-foreground mt-2">{r.reason}</p><p className="text-sm mt-2">{r.action}</p></div>)}<div className="border-t border-border pt-5"><div className="flex justify-between items-center"><h4 className="font-medium">Borrador propuesto</h4><Button variant="ghost" size="icon" title="Copiar propuesta" aria-label="Copiar propuesta" onClick={async () => { try { await navigator.clipboard.writeText(result.revised); setCopied(true); } catch { setError('No pudimos copiar; selecciona el texto de la propuesta.'); } }}>{copied ? <Check/> : <Copy/>}</Button></div><p className="whitespace-pre-wrap text-sm leading-6 mt-3">{result.revised}</p></div><p className="text-xs text-muted-foreground flex gap-2"><ShieldCheck size={16} className="shrink-0"/>{result.safety}</p><details className="text-xs text-muted-foreground"><summary className="cursor-pointer">Trazabilidad de la revisión</summary><p className="break-all mt-3">SHA-256: {audit?.hash}</p><p className="mt-2">{audit?.timestamp} · {audit?.runId}</p></details></div> : <div className="empty-review"><div className="intelligence-symbol"><Sparkles size={30}/></div><h4>{busy ? 'Una nueva perspectiva en camino.' : 'Tu creatividad, con otra perspectiva.'}</h4><p>{busy ? 'Revisando audiencia, intención y contenido.' : 'Las propuestas de tu revisión aparecerán aquí.'}</p><div className="flex gap-2 flex-wrap justify-center mt-7"><span className="micro-tag">Audiencia</span><span className="micro-tag">Objetivos</span><span className="micro-tag">Tu identidad</span></div></div>}
        <div className="text-xs text-muted-foreground mt-6 pt-4 border-t border-border flex gap-2"><ShieldCheck size={14}/>Tu criterio siempre tiene la última palabra.</div>
      </div>
    </div>
  </section>;
}