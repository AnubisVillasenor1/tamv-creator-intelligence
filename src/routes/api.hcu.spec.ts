import { createFileRoute } from "@tanstack/react-router";
import { CONTRADICTIONS, contradictionSummary } from "../lib/hcu/contradictions";
import { ARGUS_VERDICTS, PIPELINE_LAYERS, REQUEST_STATES, TRANSITIONS, checkPipelineInvariants } from "../lib/hcu/pipeline-spec";
import { hcuJson } from "../lib/hcu/http";

export const Route = createFileRoute("/api/hcu/spec")({
  server: {
    handlers: {
      GET: async () =>
        hcuJson({
          status: "proposal-to-ratify",
          note: "Especificación canónica propuesta; no describe un runtime desplegado ni acredita cumplimiento.",
          pipeline: { layers: PIPELINE_LAYERS, violations: checkPipelineInvariants() },
          argusVerdicts: ARGUS_VERDICTS,
          stateMachine: { states: REQUEST_STATES, transitions: TRANSITIONS },
          contradictions: { summary: contradictionSummary(), items: CONTRADICTIONS },
        }),
    },
  },
});
