import { createFileRoute } from "@tanstack/react-router";
import { GovernanceProjects } from "@/components/governance-projects";
export const Route = createFileRoute("/projects")({
  head: () => ({
    meta: [
      { title: "Proyectos de IA · TAMV Creator Intelligence" },
      {
        name: "description",
        content:
          "Integra proyectos de cualquier sector y evalúa sus controles y planes de gobernanza TAMV.",
      },
      { property: "og:title", content: "Proyectos de IA · TAMV" },
      {
        property: "og:description",
        content: "Evaluación personalizada, control humano y evidencia verificable.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: GovernanceProjects,
});
