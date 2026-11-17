import { createFileRoute } from "@tanstack/react-router";
import { IntegrationsHub } from "@/components/integrations-hub";
export const Route = createFileRoute("/integrations")({
  head: () => ({
    meta: [
      { title: "Integraciones sociales · TAMV" },
      {
        name: "description",
        content: "Conecta eventos de redes sociales con webhooks autenticados y control humano.",
      },
    ],
  }),
  component: IntegrationsHub,
});
