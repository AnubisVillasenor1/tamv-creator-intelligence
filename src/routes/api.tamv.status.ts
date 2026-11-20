import { createFileRoute } from "@tanstack/react-router";
import { getTamvCertification } from "../lib/tamv-certification";
import { configuredAttributionKeyId } from "../lib/tamv-trust-anchors";

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
            approvedFeatures: certification.approvedFeatures,
            featureApprovalStatus: certification.featureApprovalStatus,
            trustAnchorKeyId: "sha256:" + configuredAttributionKeyId(),
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
