import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";
import { useAuthSession } from "@/hooks/use-auth-session";
import { Button } from "@/components/ui/button";
import { ShieldCheck, RefreshCw } from "lucide-react";

type Summary = { total: number; by_status: Record<string, number>; by_plan: Record<string, number>; as_of: string };

export const Route = createFileRoute("/admin/memberships")({
  head: () => ({ meta: [{ title: "Monitor administrativo de membresías · TAMV" }, { name: "robots", content: "noindex, nofollow" }] }),
  component: AdminMembershipsPage,
});

function AdminMembershipsPage() {
  const session = useAuthSession();
  const [summary, setSummary] = useState<Summary | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function refresh() {
    setLoading(true);
    setError("");
    try {
      const { data, error: sessionError } = await supabase.auth.getSession();
      const token = data.session?.access_token;
      if (sessionError || !token) throw new Error("Inicia sesión con una cuenta administrativa para consultar el monitor.");
      const response = await fetch("/api/admin/memberships", {
        headers: { Authorization: `Bearer ${token}` },
        cache: "no-store",
      });
      const payload = await response.json() as { summary?: Summary; error?: string };
      if (!response.ok || !payload.summary) throw new Error(payload.error ?? "No se pudo cargar el resumen administrativo.");
      setSummary(payload.summary);
    } catch (cause) {
      setSummary(null);
      setError(cause instanceof Error ? cause.message : "Error inesperado.");
    } finally {
      setLoading(false);
    }
  }

  return <main className="mx-auto w-full max-w-5xl space-y-6 p-4 md:p-8">
    <header className="space-y-3">
      <div className="flex items-center gap-2 text-primary"><ShieldCheck size={22}/><span className="text-xs font-semibold uppercase tracking-[.18em]">Área restringida</span></div>
      <h1 className="text-3xl font-semibold tracking-tight">Monitor de membresías</h1>
      <p className="max-w-3xl text-sm leading-6 text-muted-foreground">Resumen agregado de la fuente de facturación. El servidor valida el rol en app_metadata; la interfaz no concede privilegios. No se muestran datos personales ni registros individuales.</p>
    </header>
    {session.status !== "authenticated" ? <section className="rounded-xl border p-5 text-sm text-muted-foreground">Se requiere una sesión autenticada y el rol administrativo asignado por el servidor.</section> : null}
    <div className="flex flex-wrap items-center gap-3"><Button onClick={() => void refresh()} disabled={loading}><RefreshCw size={16} className={loading ? "animate-spin" : ""}/> {loading ? "Consultando…" : "Actualizar resumen"}</Button>{summary ? <span className="text-xs text-muted-foreground">Actualizado: {new Date(summary.as_of).toLocaleString()}</span> : null}</div>
    {error ? <p role="alert" className="rounded-lg border border-destructive/40 p-3 text-sm text-destructive">{error}</p> : null}
    {summary ? <>
      <section className="rounded-2xl border bg-card p-5"><p className="text-sm text-muted-foreground">Membresías registradas</p><p className="mt-2 text-4xl font-semibold tabular-nums">{summary.total}</p></section>
      <div className="grid gap-4 md:grid-cols-2">
        <section className="rounded-2xl border p-5"><h2 className="font-semibold">Por estado</h2><dl className="mt-3 space-y-2">{Object.entries(summary.by_status).map(([key,value]) => <div key={key} className="flex justify-between gap-4 text-sm"><dt className="text-muted-foreground">{key}</dt><dd className="font-medium tabular-nums">{value}</dd></div>)}</dl></section>
        <section className="rounded-2xl border p-5"><h2 className="font-semibold">Por plan</h2><dl className="mt-3 space-y-2">{Object.entries(summary.by_plan).map(([key,value]) => <div key={key} className="flex justify-between gap-4 text-sm"><dt className="text-muted-foreground">{key}</dt><dd className="font-medium tabular-nums">{value}</dd></div>)}</dl></section>
      </div>
    </> : <p className="text-sm text-muted-foreground">No se muestran datos hasta que el servidor confirme la autorización y exista una migración aplicada con datos reales.</p>}
  </main>;
}
