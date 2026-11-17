export const POLICY_VERSION = "tamv.governance.v1";
export const CORE_CONTROLS = Object.freeze([
  { id: "consent", title: "Consentimiento y finalidad", evidence: "Consentimiento vigente para la operación y su finalidad." },
  { id: "rights", title: "Derechos y procedencia", evidence: "Derechos documentados sobre datos, contenido y resultados." },
  { id: "privacy", title: "Minimización y privacidad", evidence: "Sin secretos ni datos personales innecesarios." },
  { id: "transparency", title: "Transparencia de IA", evidence: "Identificación de IA y limitaciones para las personas afectadas." },
  { id: "oversight", title: "Supervisión humana", evidence: "Aprobación humana vigente y mecanismo de impugnación." },
  { id: "integrity", title: "Integridad TAMV", evidence: "Certificación verificada por el servidor de confianza." },
  { id: "audit", title: "Evidencia y trazabilidad", evidence: "Registro duradero de políticas y decisiones antes de ejecutar." },
]);

export function evaluateGovernance(context) {
  const reasons = [];
  const checks = {
    consent: context?.consent === true,
    rights: context?.rightsCleared === true,
    privacy: context?.containsSensitiveData === false,
    transparency: context?.disclosure === true,
    oversight: context?.humanApproved === true,
    integrity: context?.certified === true,
  };
  for (const [control, passed] of Object.entries(checks)) if (!passed) reasons.push(control);
  return Object.freeze({ allowed: reasons.length === 0, policyVersion: POLICY_VERSION, reasons, checks });
}

export class GovernanceDeniedError extends Error {
  constructor(decision, mode = "certified") {
    super("TAMV governance denied execution");
    this.name = "GovernanceDeniedError";
    this.decision = decision;
    this.mode = mode;
  }
}

/** Draft/local bypass only release integrity; all other controls still deny by default. */
export function createGovernance({ audit, beforeEvaluate, afterEvaluate } = {}) {
  if (typeof audit !== "function") throw new TypeError("A durable audit adapter is required");
  return {
    async run({ projectId, context, execute, mode = "certified" }) {
      if (typeof projectId !== "string" || !projectId.trim() || typeof execute !== "function")
        throw new TypeError("Project and execution adapter required");
      if (!["certified", "draft", "local"].includes(mode))
        throw new TypeError("Execution mode must be certified, draft, or local");
      await beforeEvaluate?.({ projectId, context, mode });
      const decision = evaluateGovernance(context);
      const integrityOnlyBlock = decision.reasons.length === 1 && decision.reasons[0] === "integrity";
      const executionAllowed = decision.allowed || (mode !== "certified" && integrityOnlyBlock);
      const outcome = decision.allowed ? "allowed_certified" : executionAllowed ? "allowed_uncertified" : "denied";
      const event = (kind) => ({
        projectId, kind, timestamp: new Date().toISOString(), decision, mode, executionAllowed, outcome,
      });
      // Any pre-execution audit failure denies execution.
      await audit(event("policy.evaluated"));
      await afterEvaluate?.({ projectId, decision, mode, executionAllowed });
      if (!executionAllowed) throw new GovernanceDeniedError(decision, mode);
      await audit(event("execution.started"));
      try {
        const result = await execute();
        // The effect may already have happened if this final audit write fails.
        await audit(event("execution.succeeded"));
        return result;
      } catch (error) {
        try {
          await audit(event("execution.failed"));
        } catch (auditError) {
          throw new AggregateError([error, auditError], "Execution and failure audit both failed");
        }
        throw error;
      }
    },
  };
}

export function createTamvClient({ baseUrl, getAccessToken, fetcher = fetch }) {
  const url = new URL(baseUrl);
  if (url.protocol !== "https:" && !(["localhost", "127.0.0.1"].includes(url.hostname) && url.protocol === "http:"))
    throw new TypeError("HTTPS is required");
  if (typeof getAccessToken !== "function") throw new TypeError("Access-token resolver required");
  async function request(method, path, body) {
    const token = await getAccessToken();
    if (typeof token !== "string" || !token.trim()) throw new Error("Authenticated project session required");
    const response = await fetcher(url.origin + "/api/public/tamv/projects" + path, {
      method, redirect: "error",
      headers: { Authorization: "Bearer " + token, "Content-Type": "application/json" },
      ...(body === undefined ? {} : { body: JSON.stringify(body) }),
    });
    const result = await response.json();
    if (!response.ok) throw new Error(result.error || "TAMV request failed (" + response.status + ")");
    return result;
  }
  return {
    list: () => request("GET", ""),
    create: (name, useCase) => request("POST", "", { action: "create", name, useCase }),
    configure: (projectId, expectedVersion, config) => request("POST", "", { action: "configure", projectId, expectedVersion, config }),
    approve: (projectId, expectedVersion, reason) => request("POST", "", { action: "approve", projectId, expectedVersion, reason }),
    evaluate: (projectId, expectedVersion, evidence) => request("POST", "", { action: "evaluate", projectId, expectedVersion, evidence }),
    audit: (projectId) => request("GET", "?projectId=" + encodeURIComponent(projectId)),
  };
}
