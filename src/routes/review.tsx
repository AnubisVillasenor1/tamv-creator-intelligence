import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { CreatorReview } from "@/components/creator-review";

export const Route = createFileRoute("/review")({
  head: () => ({
    meta: [
      { title: "Revisión creativa · TAMV" },
      {
        name: "description",
        content:
          "Revisa un borrador con AI Gateway y conserva la trazabilidad de la propuesta sin publicarla.",
      },
      { property: "og:title", content: "Revisión creativa · TAMV" },
      {
        property: "og:description",
        content: "Propuestas con consentimiento y metadatos de auditoría.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: ReviewPage,
});

function ReviewPage() {
  const [completed, setCompleted] = useState(false);
  return (
    <>
      <div className="page-heading">
        <span className="eyebrow">CREATOR INTELLIGENCE / REVISIÓN</span>
        <h1>Revisión creativa</h1>
        <p>
          Tu borrador no se publica y solo permanece en esta sesión. Puedes guardar el registro en
          la auditoría de tu proyecto si lo decides explícitamente; la propuesta incluye
          trazabilidad y la decisión sigue siendo tuya.
        </p>
      </div>
      {completed && (
        <p role="status" className="mb-5 text-sm text-primary">
          Revisión completada. Puedes copiar o exportar la propuesta; no se ha publicado ni
          guardado nada salvo que lo decidas explícitamente.
        </p>
      )}
      <CreatorReview onComplete={() => setCompleted(true)} />
    </>
  );
}
