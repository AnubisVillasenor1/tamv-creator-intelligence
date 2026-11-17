import { createFileRoute } from "@tanstack/react-router";
import { ResearchWorkbench } from "@/components/research-workbench";
export const Route = createFileRoute("/research")({
  head: () => ({ meta: [{ title: "Investigación y evidencia · TAMV" }] }),
  component: ResearchWorkbench,
});
