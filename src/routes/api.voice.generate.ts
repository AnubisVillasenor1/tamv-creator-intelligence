import { createFileRoute } from "@tanstack/react-router";
import { unavailableTamvCapabilityResponse } from "../lib/tamv-certification";

export const Route = createFileRoute("/api/voice/generate")({
  server: {
    handlers: {
      POST: async () => unavailableTamvCapabilityResponse("voice.generation"),
    },
  },
});
