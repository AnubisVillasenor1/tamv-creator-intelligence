import { useEffect, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { MonitorCog, RotateCcw, Save } from "lucide-react";
import { Button } from "@/components/ui/button";

type Preferences = { density: "comfortable" | "compact"; motion: "system" | "reduced"; guidance: boolean };
const defaults: Preferences = { density: "comfortable", motion: "system", guidance: true };
const STORAGE_KEY = "tamv.workspace.preferences.v1";

export const Route = createFileRoute("/settings")({
  head: () => ({ meta: [{ title: "Ajustes · TAMV" }, { name: "description", content: "Personaliza preferencias locales de la experiencia TAMV." }] }),
  component: SettingsPage,
});

function SettingsPage() {
  const [preferences, setPreferences] = useState<Preferences>(defaults);
  const [saved, setSaved] = useState(false);
  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return;
      const parsed: unknown = JSON.parse(raw);
      if (parsed && typeof parsed === "object") {
        const p = parsed as Partial<Preferences>;
        setPreferences({ density: p.density === "compact" ? "compact" : "comfortable", motion: p.motion === "reduced" ? "reduced" : "system", guidance: p.guidance !== false });
      }
    } catch { /* Defaults remain available when browser storage is blocked. */ }
  }, []);
  function save() {
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(preferences)); setSaved(true); }
    catch { setSaved(false); }
  }
  function reset() {
    setPreferences(defaults);
    try { localStorage.removeItem(STORAGE_KEY); setSaved(true); } catch { setSaved(false); }
  }
  return <div className="mx-auto w-full max-w-4xl space-y-8 p-4 md:p-8">
    <header className="space-y-3"><MonitorCog className="text-primary" size={28}/><p className="text-sm font-semibold uppercase tracking-[.18em] text-primary">Experiencia personal</p><h1 className="text-4xl font-semibold tracking-tight">Ajustes</h1><p className="text-muted-foreground">Estas opciones se guardan en este navegador. No cambian permisos, plan de pago, seguridad de la cuenta ni configuración del servidor.</p></header>
    <section className="space-y-6 rounded-2xl border bg-card p-6">
      <div><label htmlFor="density" className="font-semibold">Densidad de interfaz</label><p className="mb-2 text-sm text-muted-foreground">Preferencia para futuras adaptaciones del espacio de trabajo.</p><select id="density" className="field max-w-sm" value={preferences.density} onChange={e=>{setPreferences(p=>({...p,density:e.target.value==="compact"?"compact":"comfortable"}));setSaved(false)}}><option value="comfortable">Cómoda</option><option value="compact">Compacta</option></select></div>
      <div><label htmlFor="motion" className="font-semibold">Movimiento</label><p className="mb-2 text-sm text-muted-foreground">Permite reducir animaciones cuando la interfaz aplique esta preferencia.</p><select id="motion" className="field max-w-sm" value={preferences.motion} onChange={e=>{setPreferences(p=>({...p,motion:e.target.value==="reduced"?"reduced":"system"}));setSaved(false)}}><option value="system">Seguir sistema</option><option value="reduced">Reducir movimiento</option></select></div>
      <label className="flex items-start gap-3"><input type="checkbox" checked={preferences.guidance} onChange={e=>{setPreferences(p=>({...p,guidance:e.target.checked}));setSaved(false)}}/><span><strong>Mostrar ayudas para principiantes</strong><span className="mt-1 block text-sm text-muted-foreground">Mantiene visibles las explicaciones y pistas de los flujos guiados.</span></span></label>
      <div className="flex flex-wrap gap-3"><Button onClick={save}><Save size={16}/> Guardar preferencias</Button><Button variant="outline" onClick={reset}><RotateCcw size={16}/> Restaurar valores</Button>{saved&&<span role="status" className="self-center text-sm text-muted-foreground">Preferencias guardadas en este navegador.</span>}</div>
    </section>
    <p className="text-sm text-muted-foreground">La gestión de perfil, sesiones, roles y derechos de cuenta debe realizarse mediante los flujos autenticados del sistema; no se simula aquí una edición de identidad.</p>
  </div>;
}
