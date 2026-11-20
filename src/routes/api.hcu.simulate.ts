import { createFileRoute } from "@tanstack/react-router";
import { parseSimulateInput, runSimulation } from "../lib/hcu/hcu-service";
import { hcuJson, readJsonBody } from "../lib/hcu/http";

export const Route = createFileRoute("/api/hcu/simulate")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const body = await readJsonBody(request);
        if (!body.ok) return body.response;
        const parsed = parseSimulateInput(body.value);
        if (!parsed.ok) return hcuJson({ error: parsed.error }, parsed.status);
        return hcuJson(runSimulation(parsed.value));
      },
    },
  },
});
