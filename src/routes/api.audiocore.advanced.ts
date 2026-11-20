import { createFileRoute } from "@tanstack/react-router";
import { handleAudioCoreAdvanced } from "../lib/audiocore-advanced.server";
import {
  requireTamvCertification,
  unavailableTamvCapabilityResponse,
} from "../lib/tamv-certification";
import { requireApprovedRuntimeCapability } from "../lib/tamv-runtime-gate";

export const Route = createFileRoute("/api/audiocore/advanced")({
  server: {
    handlers: {
      POST: async ({ request }) =>
        handleAudioCoreAdvanced(request, {
          certify: async (feature) => {
            // Integrity, key anchor, digest and external premium receipt.
            const integrityBlock = await requireTamvCertification(feature);
            if (integrityBlock) return integrityBlock;
            // Runtime provenance is separate and remains fail-closed until a
            // trusted SLSA verifier is connected to this process.
            const runtimeBlock = await requireApprovedRuntimeCapability(feature, true);
            if (runtimeBlock) return runtimeBlock;
            return unavailableTamvCapabilityResponse("audiocore.advanced");
          },
        }),
    },
  },
});
