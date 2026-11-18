import { useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { CheckCheck, LoaderCircle, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { changeProject } from "@/lib/project.functions";
import { evaluateGovernance } from "../../sdk/index.mjs";
import type { GovernedProject } from "@/lib/project-schema";

export function ProjectPolicyCheck({ project, onChange }: { project: GovernedProject; onChange: () => Promise<void> }) {
  const update = useServerFn(changeProject);
  const [consent, setConsent] = useState(false);
  const [rightsCleared, setRights] = useState(false);
  const [privacy, setPrivacy] = useState(false);
  const [disclosure, setDisclosure] = useState(false);
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState("");
  const [error, setError] = useState("");
  const evidence = { consent, rightsCleared, containsSensitiveData: !privacy, disclosure };
  const preview = evaluateGovernance({ ...evidence, humanApproved: project.approved_version === project.version, certified: false });
  const labels: Record<string, string> = { consent: "Consentimiento", rights: "Derechos", privacy: "Privacidad", transparency: "Transparencia", oversight: "Aprobación de versión", integrity: "Certificación oficial" };
  async function check() {
    if (busy) return;
    setBusy(true); setStatus(""); setError("");
    try {
      await update({ data: { action: "evaluate", projectId: project.id, expectedVersion: project.version, evidence } });
      setStatus("Comprobación registrada con las evidencias declaradas. No se ejecutó ninguna operación.");
      await onChange();
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo registrar la comprobación.");
    } finally { setBusy(false); }
  }
  return (
    <section className="mt-8 border-t border-border pt-6">
      <h3 className="section-subtitle"><ShieldCheck size={17} /> Comprobación de políticas</h3>
      <div className="space-y-3">
        {[
          { label: "Consentimiento vigente para esta finalidad", value: consent, set: setConsent },
          { label: "Derechos y procedencia documentados", value: rightsCleared, set: setRights },
          { label: "Sin secretos ni datos personales innecesarios", value: privacy, set: setPrivacy },
          { label: "Uso de IA y limitaciones comunicados", value: disclosure, set: setDisclosure },
        ].map(control => (
          <label key={control.label} className="flex gap-3 text-sm leading-6">
            <input type="checkbox" checked={control.value} disabled={busy} onChange={event => control.set(event.target.checked)} className="accent-primary" />
            {control.label}
          </label>
        ))}
      </div>
      <div className="mt-5 space-y-2" aria-label="Estado de controles declarados">
        {Object.entries(preview.checks).filter(([key]) => key !== "integrity").map(([key, passed]) => (
          <div key={key} className="flex items-center justify-between gap-3 text-xs">
            <span>{labels[key] ?? key}</span>
            <span className={passed ? "text-primary" : "text-muted-foreground"}>{passed ? "Declarado" : "Pendiente"}</span>
          </div>
        ))}
      </div>
      <Button variant="outline" className="mt-5" disabled={busy} onClick={() => void check()}>
        {busy ? <LoaderCircle className="animate-spin" /> : <CheckCheck />} Registrar comprobación
      </Button>
      <p className="text-xs text-muted-foreground mt-3 leading-6">Declaraciones del responsable; no autorizan ejecución. El servidor comprueba la versión y la certificación oficial.</p>
      {status && <p role="status" className="text-sm text-primary mt-3">{status}</p>}
      {error && <p role="alert" className="text-sm text-destructive mt-3">{error}</p>}
    </section>
  );
}