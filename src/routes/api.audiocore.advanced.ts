import { createFileRoute } from "@tanstack/react-router";
import { unavailableTamvCapabilityResponse } from "../lib/tamv-certification";

export const Route = createFileRoute("/api/audiocore/advanced")({
  server: {
    handlers: {
      POST: async () => unavailableTamvCapabilityResponse("audiocore.advanced"),
    },
  },
});
