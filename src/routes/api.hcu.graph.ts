import { createFileRoute } from "@tanstack/react-router";
import { graphSnapshot } from "../lib/hcu/hcu-service";
import { hcuJson } from "../lib/hcu/http";

export const Route = createFileRoute("/api/hcu/graph")({
  server: { handlers: { GET: async () => hcuJson(graphSnapshot()) } },
});
