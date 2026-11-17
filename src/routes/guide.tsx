import { createFileRoute } from "@tanstack/react-router";
import { WorkspaceGuide } from "@/components/workspace-guide";
export const Route = createFileRoute("/guide")({
  head: () => ({
    meta: [
      { title: "Primeros pasos · TAMV" },
      {
        name: "description",
        content: "Aprende paso a paso a crear, conectar y gobernar tus proyectos con TAMV.",
      },
    ],
  }),
  component: WorkspaceGuide,
});
