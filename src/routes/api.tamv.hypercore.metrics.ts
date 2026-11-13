import { createFileRoute } from "@tanstack/react-router";
import { renderPrometheusMetrics } from "../lib/hypercore-turbo/metrics";
import { authorizeMetricsRequest } from "../lib/hypercore-turbo/metrics-auth";

export const Route = createFileRoute("/api/tamv/hypercore/metrics")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const denied = authorizeMetricsRequest(request);
        if (denied) return denied;

        return new Response(renderPrometheusMetrics(), {
          status: 200,
          headers: {
            "Content-Type": "text/plain; version=0.0.4; charset=utf-8",
            "Cache-Control": "no-store, max-age=0",
            "X-Content-Type-Options": "nosniff",
          },
        });
      },
    },
  },
});
