import { createFileRoute } from "@tanstack/react-router";
import { handleAudioCoreAdvanced } from "../lib/audiocore-advanced.server";
import {
  TAMV_ATTRIBUTION_MANIFEST,
  getTamvCertification,
  unavailableTamvCapabilityResponse,
} from "../lib/tamv-certification";

export const Route = createFileRoute("/api/audiocore/advanced")({
  server: {
    handlers: {
      POST: async ({ request }) =>
        handleAudioCoreAdvanced(request, {
          certify: async (feature) => {
            const certification = await getTamvCertification();
            const licensed = TAMV_ATTRIBUTION_MANIFEST.license.features.includes(feature);
            if (!certification.certified || !licensed) {
              return unavailableTamvCapabilityResponse("audiocore.advanced");
            }
            return null;
          },
        }),
    },
  },
});