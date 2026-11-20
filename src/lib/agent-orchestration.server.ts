/* global process */
import {
  AGENT_MAX_STEPS,
  TamvAgentError,
  createLocalAgentTools,
  runAgentPlan,
  validateAgentPlan,
  type AgentPlan,
} from "../../tamv-genesis/src/agent/index.ts";
import { TamvAudioError } from "../../tamv-genesis/src/audio/index.ts";
import {
  isDeclaredContentLengthWithinLimit,
  isJsonContentType,
  readBoundedRequestBody,
} from "./hypercore-turbo/governance-request-guards";
import { requireTamvCertification } from "./tamv-certification";
import { studioMetrics } from "./studio-metrics.server";
import { supabaseAuthenticate } from "./audiocore-advanced.server";
import {
  acquireCapabilitySlot,
  capabilityQuotaResponse,
  checkCapabilityQuota,
  releaseCapabilitySlot,
  type CapabilityQuotaConfig,
} from "./capability-quota.server";

export const AGENT_RESPONSE_SCHEMA = "tamv.agent.orchestration.response.v1";
export const AGENT_MAX_BODY_BYTES = 32 * 1024;
export const AGENT_MAX_AUDIO_DURATION_SECONDS = 30;
export const AGENT_EXECUTION_TIMEOUT_MS = 60_000;
export const AGENT_FEATURE = "agent.orchestration";

export type AgentRouteDeps = {
  certify: (feature: string) => Promise<Response | null>;
  authenticate: (request: Request) => Promise<{ actorRef: string } | Response>;
  quotaConfig?: Partial<CapabilityQuotaConfig>;
};

const defaultDeps: AgentRouteDeps = {
  certify: requireTamvCertification,
  authenticate: supabaseAuthenticate,
};

function noStoreHeaders(): HeadersInit {
  return {
    "Cache-Control": "no-store, max-age=0",
    "X-Content-Type-Options": "nosniff",
  };
}

function jsonError(message: string, status: number, code?: string): Response {
  return Response.json(
    { error: message, ...(code === undefined ? {} : { code }) },
    { status, headers: noStoreHeaders() },
  );
}

function mapAgentError(error: unknown): Response {
  if (error instanceof TamvAgentError) {
    switch (error.code) {
      case "TAMV_AGENT_INVALID":
      case "TAMV_AGENT_LIMIT":
        return jsonError(error.message, 400, error.code);
      case "TAMV_AGENT_CONSENT_REQUIRED":
        return jsonError(error.message, 403, error.code);
      case "TAMV_AGENT_TOOL_UNKNOWN":
      case "TAMV_AGENT_EFFECT_DENIED":
        return jsonError(error.message, 501, error.code);
      case "TAMV_AGENT_CANCELLED":
        return jsonError(error.message, 503, error.code);
      default:
        return jsonError(error.message, 502, error.code);
    }
  }
  if (error instanceof TamvAudioError) {
    return jsonError(error.message, 400, error.code);
  }
  return jsonError("Agent plan execution failed", 500);
}

export async function handleAgentOrchestration(
  request: Request,
  deps: Partial<AgentRouteDeps> = {},
): Promise<Response> {
  const { certify, authenticate } = { ...defaultDeps, ...deps };
  const denied = await certify(AGENT_FEATURE);
  if (denied) return denied;

  const contentType = request.headers.get("content-type");
  if (!isJsonContentType(contentType)) {
    return jsonError("Content-Type must be application/json", 415);
  }
  const declaredLength = request.headers.get("content-length");
  if (!isDeclaredContentLengthWithinLimit(declaredLength, AGENT_MAX_BODY_BYTES)) {
    const declaredAsDecimal = declaredLength !== null && /^(0|[1-9]\d*)$/.test(declaredLength);
    const declaredBytes = declaredAsDecimal ? Number(declaredLength) : Number.NaN;
    const status =
      Number.isSafeInteger(declaredBytes) && declaredBytes > AGENT_MAX_BODY_BYTES ? 413 : 400;
    return jsonError("Invalid or oversized Content-Length", status);
  }

  const boundedBody = await readBoundedRequestBody(request, AGENT_MAX_BODY_BYTES);
  if (!boundedBody.ok) {
    return boundedBody.reason === "too-large"
      ? jsonError("Request body too large", 413)
      : jsonError("Unable to read request body", 400);
  }

  let raw: unknown;
  try {
    raw = JSON.parse(boundedBody.text);
  } catch {
    return jsonError("Invalid JSON body", 400);
  }

  const identity = await authenticate(request);
  if (identity instanceof Response) return identity;

  const quota = await checkCapabilityQuota(
    AGENT_FEATURE,
    identity.actorRef,
    deps.quotaConfig ?? {},
  );
  if (!quota.allowed) return capabilityQuotaResponse(quota);

  let plan: AgentPlan;
  try {
    plan = validateAgentPlan(raw);
  } catch (error) {
    return mapAgentError(error);
  }

  // Never let the client attribute consent to another actor or invent a scope.
  const allowedConsentScopes = new Set(["agent.orchestration", "audio.production"]);
  if (!allowedConsentScopes.has(plan.consent.scope)) {
    return jsonError("El alcance del consentimiento no corresponde a esta capacidad.", 403, "TAMV_AGENT_CONSENT_SCOPE_INVALID");
  }
  plan.consent.subject = identity.actorRef;

  for (const step of plan.steps) {
    if (step.tool !== "audio.render") continue;
    const input = step.input as { durationSeconds?: unknown; format?: unknown };
    if (
      typeof input.durationSeconds === "number" &&
      input.durationSeconds > AGENT_MAX_AUDIO_DURATION_SECONDS
    ) {
      return jsonError(
        `audio.render steps accept up to ${AGENT_MAX_AUDIO_DURATION_SECONDS} seconds in this endpoint.`,
        400,
        "TAMV_AGENT_AUDIO_DURATION_LIMIT",
      );
    }
    if (input.format !== "wav") {
      return jsonError(
        "The connected local provider renders WAV only; FLAC is not available.",
        501,
        "TAMV_AUDIO_PROVIDER_UNAVAILABLE",
      );
    }
  }

  if (!acquireCapabilitySlot(AGENT_FEATURE)) {
    return jsonError("Too many concurrent plans in this instance", 503, "TAMV_AGENT_BUSY");
  }
  try {
    const tools = createLocalAgentTools({
      metrics: studioMetrics,
      certification: {
        async requireCapability({ consentGranted }) {
          if (!consentGranted) {
            throw new TamvAgentError("TAMV_AGENT_CONSENT_REQUIRED", "consent is mandatory.");
          }
          const gate = await certify(AGENT_FEATURE);
          if (gate) {
            throw new TamvAgentError(
              "TAMV_AGENT_EFFECT_DENIED",
              "the distribution is not certified for this capability.",
            );
          }
        },
      },
    });
    const started = performance.now();
    const result = await runAgentPlan(plan, {
      tools,
      signal: AbortSignal.any([request.signal, AbortSignal.timeout(AGENT_EXECUTION_TIMEOUT_MS)]),
    });
    studioMetrics.inc("tamv_agent_plans_total", { status: result.status });
    studioMetrics.observe("tamv_agent_execution_seconds", (performance.now() - started) / 1000);

    if (result.status === "cancelled") {
      return jsonError(
        "The plan was cancelled or timed out; no result is claimed",
        503,
        "TAMV_AGENT_CANCELLED",
      );
    }
    if (result.status === "failed") {
      const failure = result.steps.find((step) => step.status === "failed")?.failure;
      return jsonError(
        `Agent plan failed: ${failure?.detail ?? "unknown failure"}`,
        502,
        failure?.code ?? "TAMV_AGENT_TOOL_FAILED",
      );
    }

    return Response.json(
      {
        schema: AGENT_RESPONSE_SCHEMA,
        result,
        disclosure: {
          ...result.disclosure,
          actorRef: identity.actorRef,
          consentSubject: plan.consent.subject,
          consentScope: plan.consent.scope,
          quota: { source: quota.source, remainingToday: quota.remainingToday },
        },
        limits: {
          maxSteps: AGENT_MAX_STEPS,
          maxBodyBytes: AGENT_MAX_BODY_BYTES,
          maxAudioDurationSeconds: AGENT_MAX_AUDIO_DURATION_SECONDS,
          formats: ["wav"],
          executionTimeoutMs: AGENT_EXECUTION_TIMEOUT_MS,
        },
      },
      { status: 200, headers: noStoreHeaders() },
    );
  } catch (error) {
    return mapAgentError(error);
  } finally {
    releaseCapabilitySlot(AGENT_FEATURE);
  }
}
