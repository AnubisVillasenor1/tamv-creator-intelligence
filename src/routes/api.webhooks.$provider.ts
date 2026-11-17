import { createFileRoute } from "@tanstack/react-router";
import { handleSocialWebhook } from "@/lib/social-webhooks.server";
export const Route = createFileRoute("/api/webhooks/$provider")({
  server: {
    handlers: {
      GET: ({ request, params }) => handleSocialWebhook(request, params.provider),
      POST: ({ request, params }) => handleSocialWebhook(request, params.provider),
    },
  },
});
