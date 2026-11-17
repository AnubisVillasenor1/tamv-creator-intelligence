import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { Braces, Check, Copy, GitBranch, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
export const Route = createFileRoute("/sdk")({
  head: () => ({
    meta: [
      { title: "SDK, API y hooks · TAMV Governance" },
      {
        name: "description",
        content:
          "SDK agnóstico para integrar controles TAMV en proyectos existentes, con adaptadores, hooks y API autenticada.",
      },
      { property: "og:title", content: "SDK & API · TAMV Governance" },
      { property: "og:description", content: "Integra gobernanza sin cambiar tu proveedor de IA." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Sdk,
});
const code = `import { createGovernance } from '@tamv/governance-sdk';

const tamv = createGovernance({
  audit: event => durableAudit.append(event),
  beforeEvaluate: async ({ projectId }) => verifyOwner(projectId),
  afterEvaluate: async ({ decision }) => notifyReviewer(decision),
});

// Solo en el servidor: evidencia verificada, no datos del navegador.
const evidence = await trustedControls.verify(projectId);
const result = await tamv.run({
  projectId,
  context: evidence,
  execute: () => yourAI.generate(input),
});`;
function Sdk() {
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState("");
  async function copy() {
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
    } catch {
      setError("No se pudo copiar. Selecciona el ejemplo para copiarlo.");
    }
  }
  return (
    <>
      <div className="page-heading">
        <span className="eyebrow">DEVELOPER GATEWAY</span>
        <h1>SDK & API agnósticos</h1>
        <p>Tu proyecto. Tu proveedor. Una capa de gobernanza TAMV.</p>
      </div>
      <div className="sdk-contract">
        <Braces size={32} />
        <div>
          <h2>
            @tamv/governance-sdk <span className="micro-tag">v0.1.0</span>
          </h2>
          <p>JavaScript / TypeScript · cero dependencias de ejecución</p>
        </div>
      </div>
      <div className="project-columns mt-8">
        <div>
          <h2 className="section-subtitle">
            <GitBranch />
            Integración en proyectos existentes
          </h2>
          <pre className="code-block">{`# Dentro de tu proyecto existente\nnpm install /ruta/al/checkout-TAMV/sdk\n\n# Actualizar después de revisar la nueva versión\nnpm install /ruta/al/checkout-TAMV/sdk`}</pre>
          <div className="notice-band mt-5">
            <ShieldCheck size={17} />
            <span>Distribución local del repositorio. Aún no publicada en npm.</span>
          </div>
          <h2 className="section-subtitle mt-8">API autenticada</h2>
          <div className="api-row">
            <span>GET</span>
            <code>/api/public/tamv/projects</code>
          </div>
          <div className="api-row">
            <span>POST</span>
            <code>/api/public/tamv/projects</code>
          </div>
          <div className="api-row">
            <span>GET</span>
            <code>?projectId=UUID</code>
          </div>
          <p className="text-xs leading-6 text-muted-foreground mt-4">
            Token de usuario de corta duración, permisos por propietario y versión esperada. La
            evaluación de políticas no inicia operaciones externas.
          </p>
          <h2 className="section-subtitle mt-8">Hooks & adaptadores</h2>
          {[
            "beforeEvaluate · verificar identidad y contexto",
            "audit · guardar evidencia duradera antes de ejecutar",
            "afterEvaluate · notificar la decisión",
            "execute · tu proveedor o modelo actual",
          ].map((text) => (
            <div key={text} className="control-row">
              <Check size={13} />
              {text}
            </div>
          ))}
        </div>
        <div>
          <div className="flex justify-between items-center mb-3">
            <span className="text-sm">Adaptador neutral</span>
            <Button
              variant="ghost"
              size="icon"
              title="Copiar ejemplo"
              aria-label="Copiar ejemplo"
              onClick={() => void copy()}
            >
              {copied ? <Check /> : <Copy />}
            </Button>
          </div>
          <pre className="code-block">{code}</pre>
          {error && (
            <p role="alert" className="text-xs text-destructive">
              {error}
            </p>
          )}
          <p className="text-xs text-muted-foreground mt-5 leading-6">
            Los adaptadores de identidad, evidencias, auditoría y generación pertenecen al proyecto
            anfitrión. Las declaraciones del cliente no son autorización.
          </p>
        </div>
      </div>
    </>
  );
}
