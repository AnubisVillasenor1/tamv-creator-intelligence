import { createFileRoute } from "@tanstack/react-router";
import { unavailableTamvCapabilityResponse } from "../lib/tamv-certification";

export const Route = createFileRoute("/api/agent")({
  server: {
    handlers: {
      POST: async () => unavailableTamvCapabilityResponse("agent.orchestration"),
    },
  },
});
