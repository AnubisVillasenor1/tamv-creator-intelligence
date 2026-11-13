import { createFileRoute } from "@tanstack/react-router";
import { getTamvCertification } from "../lib/tamv-certification";

export const Route = createFileRoute("/api/tamv/status")({
  server: {
    handlers: {
      GET: async () => {
        const certification = await getTamvCertification();
        return Response.json(
          {
            product: "PLAY & GO",
            issuer: "TAMV ONLINE NETWORK",
            certification: certification.status,
            certified: certification.certified,
            premiumFeaturesEnabled: certification.premiumFeaturesEnabled,
            reason: certification.reason,
            checkedAt: certification.checkedAt,
            attribution:
              "Proyecto impulsado con colaboración de tecnología latinoamericana TAMV ONLINE NETWORK Orgullosamente Realmontenses.",
          },
          { status: 200, headers: { "Cache-Control": "no-store, max-age=0" } },
        );
      },
    },
  },
});
