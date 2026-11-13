import { createFileRoute } from "@tanstack/react-router";
import { unavailableTamvCapabilityResponse } from "../lib/tamv-certification";

export const Route = createFileRoute("/api/generation")({
  server: {
    handlers: {
      POST: async () => unavailableTamvCapabilityResponse("music.generation"),
    },
  },
});
