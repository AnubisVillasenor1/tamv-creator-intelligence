import { createFileRoute } from "@tanstack/react-router";
import { ModelExplorer } from "@/components/model-explorer";
export const Route = createFileRoute("/models")({
  head: () => ({
    meta: [
      { title: "Explorador de modelos · TAMV" },
      {
        name: "description",
        content:
          "Explora capacidades de modelos y compara contratos para proyectos de IA gobernados.",
      },
      { property: "og:title", content: "Modelos de IA · TAMV" },
      {
        property: "og:description",
        content: "Capacidades y contratos independientes del proveedor.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Models,
});
function Models() {
  return (
    <>
      <div className="page-heading">
        <span className="eyebrow">MODEL INTELLIGENCE</span>
        <h1>Modelos de IA</h1>
        <p>Capacidades, presupuestos y contratos de proveedores.</p>
      </div>
      <ModelExplorer />
    </>
  );
}
