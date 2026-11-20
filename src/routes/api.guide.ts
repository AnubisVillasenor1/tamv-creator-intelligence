import { createFileRoute } from "@tanstack/react-router";
import { handleGuideRequest } from "../lib/guide-route.server";

export const Route = createFileRoute("/api/guide")({
  server: {
    handlers: {
      POST: async ({ request }) => handleGuideRequest(request),
    },
  },
});
