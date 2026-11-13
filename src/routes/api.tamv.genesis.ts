import { createFileRoute } from "@tanstack/react-router";
import { GENESIS } from "../lib/genesis-bundle";

export const Route = createFileRoute("/api/tamv/genesis")({
  server: {
    handlers: {
      GET: async () =>
        Response.json(
          {
            product: GENESIS.identity.canonical.product,
            issuer: GENESIS.identity.canonical.issuer,
            genesisVersion: GENESIS.version,
            generatedAt: GENESIS.generatedAt,
            scorecard: GENESIS.scorecard,
            claims: GENESIS.claims,
            claimSummary: GENESIS.claimSummary,
            capabilities: GENESIS.capabilities,
            workLedger: GENESIS.workLedger,
            knowledge: GENESIS.knowledge,
            certification: GENESIS.certification,
            checks: GENESIS.checks,
            attribution: GENESIS.identity.canonical.attribution,
          },
          { status: 200, headers: { "Cache-Control": "no-store, max-age=0" } },
        ),
    },
  },
});
