import { createFileRoute } from "@tanstack/react-router";
import { handleAgentOrchestration } from "../lib/agent-orchestration.server";
import {
  TAMV_ATTRIBUTION_MANIFEST,
  getTamvCertification,
  unavailableTamvCapabilityResponse,
} from "../lib/tamv-certification";

export const Route = createFileRoute("/api/agent")({
  server: {
    handlers: {
      POST: async ({ request }) =>
        handleAgentOrchestration(request, {
          certify: async (feature) => {
            const certification = await getTamvCertification();
            const licensed = TAMV_ATTRIBUTION_MANIFEST.license.features.includes(feature);
            if (!certification.certified || !licensed) {
              return unavailableTamvCapabilityResponse("agent.orchestration");
            }
            return null;
          },
        }),
    },
  },
});