import { createGovernance, createTamvClient } from "../index.mjs";

// Call this only on your trusted backend. Authentication belongs to the host.
export function integrateProject({
  tamvOrigin,
  accessToken,
  saveAudit,
  trustedEvidence,
  aiAdapter,
}) {
  const api = createTamvClient({ baseUrl: tamvOrigin, getAccessToken: accessToken });
  const governance = createGovernance({ audit: saveAudit });
  return {
    api,
    async invoke(projectId, input) {
      const context = await trustedEvidence(projectId, input);
      return governance.run({ projectId, context, execute: () => aiAdapter(input) });
    },
  };
}
