import { createFileRoute } from "@tanstack/react-router";
import { StudioWorkbench } from "@/components/studio-workbench";
export const Route = createFileRoute("/studio")({
  head: () => ({
    meta: [
      { title: "Estudio de audio · TAMV" },
      {
        name: "description",
        content:
          "Render de audio procedural local y planes de agente deterministas con consentimiento, derechos y cuotas por actor.",
      },
      { property: "og:title", content: "Estudio de audio · TAMV" },
      {
        property: "og:description",
        content:
          "Síntesis WAV local con análisis DSP real y orquestación de agentes sin modelos externos.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Studio,
});
function Studio() {
  return (
    <>
      <div className="page-heading">
        <span className="eyebrow">LOCAL STUDIO</span>
        <h1>Estudio de creación</h1>
        <p>
          Audio procedural y agentes locales · sin modelos neuronales, sin efectos externos, con
          disclosure completo.
        </p>
      </div>
      <StudioWorkbench />
    </>
  );
}
