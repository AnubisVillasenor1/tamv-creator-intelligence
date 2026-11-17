/**
 * Agent plan contract.
 *
 * A plan is a bounded, explicit list of local tool invocations. There is no
 * model in the loop: execution is deterministic, unknown tools and unknown
 * fields are rejected, and consent is mandatory. External effects do not exist
 * in the local tool registry; any tool that declares one is denied by default.
 */

import { TamvAudioError, validateAudioRequest, type AudioRequest } from "../audio/contracts.ts";

export const AGENT_PLAN_SCHEMA = "tamv.agent.plan.v1";
export const AGENT_RESULT_SCHEMA = "tamv.agent.result.v1";
export const AGENT_MAX_STEPS = 8;
export const AGENT_TOOLS = ["audio.render", "digest.sha256"] as const;

export type AgentTool = (typeof AGENT_TOOLS)[number];

export type AgentErrorCode =
  | "TAMV_AGENT_INVALID"
  | "TAMV_AGENT_CONSENT_REQUIRED"
  | "TAMV_AGENT_TOOL_UNKNOWN"
  | "TAMV_AGENT_LIMIT"
  | "TAMV_AGENT_CANCELLED"
  | "TAMV_AGENT_EFFECT_DENIED"
  | "TAMV_AGENT_TOOL_FAILED";

export class TamvAgentError extends Error {
  readonly code: AgentErrorCode;

  constructor(code: AgentErrorCode, message: string) {
    super(message);
    this.name = "TamvAgentError";
    this.code = code;
  }
}

export type AgentStep = {
  id: string;
  tool: AgentTool;
  input: Record<string, unknown>;
};

export type AgentPlan = {
  schema: typeof AGENT_PLAN_SCHEMA;
  requestId?: string;
  consent: { granted: true; subject: string; scope: string };
  steps: AgentStep[];
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function assertKeys(value: Record<string, unknown>, allowed: readonly string[], label: string): void {
  for (const key of Object.keys(value)) {
    if (!allowed.includes(key)) {
      throw new TamvAgentError("TAMV_AGENT_INVALID", `${label} contains an unknown field: ${key}.`);
    }
  }
}

function assertString(value: unknown, label: string, min: number, max: number): string {
  if (typeof value !== "string") {
    throw new TamvAgentError("TAMV_AGENT_INVALID", `${label} must be a string.`);
  }
  const trimmed = value.trim();
  if (trimmed.length < min || trimmed.length > max || trimmed.includes("\0")) {
    throw new TamvAgentError("TAMV_AGENT_INVALID", `${label} must contain between ${min} and ${max} characters.`);
  }
  return trimmed;
}

export function validateDigestInput(input: unknown): { text: string } {
  if (!isRecord(input)) {
    throw new TamvAgentError("TAMV_AGENT_INVALID", "digest.sha256 input must be an object.");
  }
  assertKeys(input, ["text"], "digest.sha256 input");
  return { text: assertString(input["text"], "digest.sha256 text", 1, 8000) };
}

export function validateAudioRenderInput(input: unknown): AudioRequest {
  try {
    return validateAudioRequest(input);
  } catch (error) {
    if (error instanceof TamvAudioError) {
      const code = error.code === "TAMV_AUDIO_CONSENT_REQUIRED" ? "TAMV_AGENT_CONSENT_REQUIRED" : "TAMV_AGENT_INVALID";
      throw new TamvAgentError(code, `audio.render input: ${error.message}`);
    }
    throw error;
  }
}

export function validateAgentPlan(value: unknown): AgentPlan {
  if (!isRecord(value)) {
    throw new TamvAgentError("TAMV_AGENT_INVALID", "An agent plan must be an object.");
  }
  assertKeys(value, ["schema", "requestId", "consent", "steps"], "agent plan");
  if (value["schema"] !== AGENT_PLAN_SCHEMA) {
    throw new TamvAgentError("TAMV_AGENT_INVALID", `schema must be ${AGENT_PLAN_SCHEMA}.`);
  }

  if (!isRecord(value["consent"])) {
    throw new TamvAgentError("TAMV_AGENT_CONSENT_REQUIRED", "consent is mandatory.");
  }
  const consent = value["consent"];
  assertKeys(consent, ["granted", "subject", "scope"], "consent");
  if (consent["granted"] !== true) {
    throw new TamvAgentError("TAMV_AGENT_CONSENT_REQUIRED", "consent.granted must be true.");
  }
  const subject = assertString(consent["subject"], "consent.subject", 1, 200);
  const scope = assertString(consent["scope"], "consent.scope", 1, 200);

  if (!Array.isArray(value["steps"]) || value["steps"].length === 0) {
    throw new TamvAgentError("TAMV_AGENT_INVALID", "steps must be a non-empty array.");
  }
  if (value["steps"].length > AGENT_MAX_STEPS) {
    throw new TamvAgentError("TAMV_AGENT_LIMIT", `a plan accepts at most ${AGENT_MAX_STEPS} steps.`);
  }

  const seen = new Set<string>();
  const steps: AgentStep[] = value["steps"].map((raw, index) => {
    if (!isRecord(raw)) {
      throw new TamvAgentError("TAMV_AGENT_INVALID", `steps[${index}] must be an object.`);
    }
    assertKeys(raw, ["id", "tool", "input"], `steps[${index}]`);
    const id = assertString(raw["id"], `steps[${index}].id`, 1, 40);
    if (seen.has(id)) {
      throw new TamvAgentError("TAMV_AGENT_INVALID", `duplicate step id: ${id}.`);
    }
    seen.add(id);
    const tool = raw["tool"];
    if (typeof tool !== "string" || !(AGENT_TOOLS as readonly string[]).includes(tool)) {
      throw new TamvAgentError("TAMV_AGENT_TOOL_UNKNOWN", `steps[${index}].tool must be one of ${AGENT_TOOLS.join(", ")}.`);
    }
    if (!isRecord(raw["input"])) {
      throw new TamvAgentError("TAMV_AGENT_INVALID", `steps[${index}].input must be an object.`);
    }
    if (tool === "digest.sha256") validateDigestInput(raw["input"]);
    if (tool === "audio.render") validateAudioRenderInput(raw["input"]);
    return { id, tool: tool as AgentTool, input: raw["input"] };
  });

  return {
    schema: AGENT_PLAN_SCHEMA,
    ...(value["requestId"] === undefined
      ? {}
      : { requestId: assertString(value["requestId"], "requestId", 3, 120) }),
    consent: { granted: true, subject, scope },
    steps,
  };
}