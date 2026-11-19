import { useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { CircleDollarSign, HeartHandshake, ShieldCheck, ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";

type PlanKey = "creator" | "pro" | "enterprise";

export const Route = createFileRoute("/billing")({
  head: () => ({ meta: [{ title: "Pagos y membresía · TAMV" }, { name: "description", content: "Estado transparente de pagos, membresía y donaciones de TAMV Creator Intelligence." }] }),
  component: BillingPage,
});

function BillingPage() {
  const [busyPlan, setBusyPlan] = useState<PlanKey | null>(null);
  const [checkoutError, setCheckoutError] = useState("");

  async function startCheckout(planKey: PlanKey) {
    if (busyPlan) return;
    setBusyPlan(planKey);
    setCheckoutError("");
    try {
      const { data, error } = await supabase.auth.getSession();
      const token = data.session?.access_token;
      if (error || !token) throw new Error("Inicia sesión antes de solicitar una sesión de pago.");
      const response = await fetch("/api/billing/checkout", {
        method: "POST",
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
        body: JSON.stringify({ planKey }),
        cache: "no-store",
      });
      const payload = await response.json() as { checkoutUrl?: string; error?: string };
      if (!response.ok || !payload.checkoutUrl) throw new Error(payload.error ?? "No se pudo crear la sesión de pago.");
      const checkoutUrl = new URL(payload.checkoutUrl);
      if (checkoutUrl.protocol !== "https:" || checkoutUrl.hostname !== "checkout.stripe.com") throw new Error("La URL de pago no superó la validación de seguridad.");
      window.location.assign(checkoutUrl.toString());
    } catch (cause) {
      setCheckoutError(cause instanceof Error ? cause.message : "Error inesperado al iniciar checkout.");
      setBusyPlan(null);
    }
  }

  return <div className="mx-auto w-full max-w-5xl space-y-8 p-4 md:p-8">
    <header className="space-y-3"><p className="text-sm font-semibold uppercase tracking-[.18em] text-primary">Cuenta y sostenibilidad</p><h1 className="text-4xl font-semibold tracking-tight">Pagos y membresía</h1><p className="max-w-3xl text-lg text-muted-foreground">Los pagos se crean en el servidor mediante Stripe Checkout. La membresía solo cambia cuando un evento Stripe válido se procesa y se persiste en el backend; regresar desde Checkout no demuestra que el pago haya sido completado.</p></header>
    <section className="rounded-2xl border bg-card p-6">
      <div className="flex items-center gap-3"><CircleDollarSign className="text-primary" size={26}/><div><h2 className="text-xl font-semibold">Selecciona un plan</h2><p className="text-sm text-muted-foreground">Los importes y monedas se definen en los precios configurados en Stripe, no en el navegador.</p></div></div>
      <div className="mt-5 grid gap-4 md:grid-cols-3">
        {([{key:"creator",name:"Creator",desc:"Herramientas de creación y flujos guiados"},{key:"pro",name:"Pro",desc:"Capacidades ampliadas para trabajo recurrente"},{key:"enterprise",name:"Enterprise",desc:"Uso organizacional sujeto a configuración contractual"}] as const).map(plan => <article key={plan.key} className="flex flex-col rounded-xl border p-5"><h3 className="text-lg font-semibold">{plan.name}</h3><p className="mt-2 flex-1 text-sm leading-6 text-muted-foreground">{plan.desc}</p><Button className="mt-5" disabled={busyPlan !== null} onClick={() => void startCheckout(plan.key)}>{busyPlan === plan.key ? "Conectando con Stripe…" : "Continuar con Stripe"}<ExternalLink size={15}/></Button></article>)}
      </div>
      {checkoutError ? <p role="alert" className="mt-4 rounded-lg border border-destructive/40 p-3 text-sm text-destructive">{checkoutError}</p> : null}
      <p className="mt-4 text-xs leading-5 text-muted-foreground">Si el servidor no tiene las claves y los IDs de precio configurados, el checkout falla de forma cerrada. No se simula una compra ni se otorgan permisos desde esta pantalla.</p>
    </section>
    <section id="donate" className="rounded-2xl border bg-card p-6"><div className="flex items-center gap-3"><HeartHandshake className="text-primary" size={26}/><h2 className="text-xl font-semibold">Apoyar el proyecto</h2></div><p className="mt-3 text-sm leading-6 text-muted-foreground">El canal oficial de donación todavía no está configurado. No se enlaza una URL de cobro no verificada ni se solicitan datos bancarios dentro de la aplicación.</p><div className="mt-4 rounded-lg border p-4 text-sm text-muted-foreground">Donaciones: pendientes de un canal oficial confirmado.</div></section>
    <section className="rounded-2xl border p-6"><div className="flex gap-3"><ShieldCheck className="shrink-0 text-primary" size={22}/><div><h2 className="font-semibold">Monitor de membresías</h2><p className="mt-2 text-sm leading-6 text-muted-foreground">El resumen agregado requiere una cuenta cuyo rol administrativo haya sido asignado en Supabase app_metadata.</p><Link to="/admin/memberships" className="mt-3 inline-flex text-sm font-medium text-primary underline-offset-4 hover:underline">Abrir monitor administrativo →</Link><p className="mt-2 text-xs text-muted-foreground">El servidor autoriza cada solicitud; ocultar el enlace no sustituye los controles de acceso.</p></div></div></section>
  </div>;
}
