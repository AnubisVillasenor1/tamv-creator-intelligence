import { createFileRoute } from "@tanstack/react-router";
import { lintRequest } from "../lib/hcu/hcu-service";
import { hcuJson, readJsonBody } from "../lib/hcu/http";

export const Route = createFileRoute("/api/hcu/lint")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const body = await readJsonBody(request);
        if (!body.ok) return body.response;
        const res = lintRequest(body.value);
        if (!res.ok) return hcuJson({ error: res.error }, res.status);
        return hcuJson(res.value);
      },
    },
  },
});
