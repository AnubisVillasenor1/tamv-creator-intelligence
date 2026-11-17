import { createFileRoute } from "@tanstack/react-router";
import { handleStudioMetrics } from "@/lib/studio-metrics.server";

export const Route = createFileRoute("/api/studio/metrics")({
  server: { handlers: { GET: ({ request }) => handleStudioMetrics(request) } },
});
