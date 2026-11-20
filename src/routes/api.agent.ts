import { createFileRoute } from "@tanstack/react-router";
import { handleAgentOrchestration } from "../lib/agent-orchestration.server";
import {
  requireTamvCertification,
  unavailableTamvCapabilityResponse,
} from "../lib/tamv-certification";
import { requireApprovedRuntimeCapability } from "../lib/tamv-runtime-gate";

export const Route = createFileRoute("/api/agent")({
  server: {
    handlers: {
      POST: async ({ request }) =>
        handleAgentOrchestration(request, {
          certify: async (feature) => {
            const integrityBlock = await requireTamvCertification(feature);
            if (integrityBlock) return integrityBlock;
            const runtimeBlock = await requireApprovedRuntimeCapability(feature, true);
            if (runtimeBlock) return runtimeBlock;
            return unavailableTamvCapabilityResponse("agent.orchestration");
          },
        }),
    },
  },
});
