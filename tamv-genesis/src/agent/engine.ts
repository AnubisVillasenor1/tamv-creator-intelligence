/**
 * Deterministic local agent engine.
 *
 * Executes a validated plan step by step against an explicit tool registry.
 * There is no LLM: given the same plan and the same deterministic tools, the
 * computed outputs are identical (underlying ports may still record real
 * timestamps). Execution stops at the first failure; cancellation is observed
 * between steps. Tools that declare external effects require an explicit
 * authorisation port, and the default is to deny.
 */

import { sha256Hex } from "../sovereign/digest.ts";
import {
  createAudioPipeline,
  createLocalDspAnalysis,
  createLocalSynthesisProvider,
  TamvAudioError,
  type AudioGatewayPorts,
} from "../audio/index.ts";
import {
  AGENT_RESULT_SCHEMA,
  TamvAgentError,
  validateAgentPlan,
  validateAudioRenderInput,
  validateDigestInput,
  type AgentPlan,
  type AgentTool,
} from "./contracts.ts";

export type AgentToolContext = {
  signal?: AbortSignal;
};

export type AgentToolHandler = {
  /** Declared external effects; empty means purely local computation. */
  effects: readonly string[];
  execute(input: Record<string, unknown>, context: AgentToolContext): Promise<unknown>;
};

export type AgentToolRegistry = ReadonlyMap<string, AgentToolHandler>;

export type AgentAuditEvent = {
  type: "agent.step.completed" | "agent.step.failed" | "agent.plan.cancelled";
  stepId?: string;
  tool?: string;
  detail?: string;
};

export type AgentEnginePorts = {
  audit?: { record(event: AgentAuditEvent): Promise<void> };
  effects?: { authorize(input: { tool: string; effect: string }): Promise<boolean> };
};

export type AgentStepResult = {
  stepId: string;
  tool: AgentTool;
  status: "succeeded" | "failed";
  output?: unknown;
  failure?: { code: string; detail: string };
};

export type AgentRunResult = {
  schema: typeof AGENT_RESULT_SCHEMA;
  status: "succeeded" | "failed" | "cancelled";
  requestId?: string;
  steps: AgentStepResult[];
  disclosure: {
    kind: "orquestacion local determinista";
    llm: false;
    externalEffects: false;
    tools: readonly AgentTool[];
  };
};

export type CreateLocalAgentToolsOptions = {
  certification?: AudioGatewayPorts["certification"];
  metrics?: import("../audio/ports.ts").AudioMetrics;
};

export function createLocalAgentTools(
  options: CreateLocalAgentToolsOptions = {},
): AgentToolRegistry {
  const certification: AudioGatewayPorts["certification"] = options.certification ?? {
    async requireCapability({ consentGranted }) {
      if (!consentGranted) {
        throw new TamvAudioError("TAMV_AUDIO_CONSENT_REQUIRED", "consent is mandatory.");
      }
    },
  };

  const registry = new Map<string, AgentToolHandler>();

  registry.set("digest.sha256", {
    effects: [],
    async execute(input) {
      const { text } = validateDigestInput(input);
      return { sha256: await sha256Hex(text) };
    },
  });

  registry.set("audio.render", {
    effects: [],
    async execute(input, context) {
      const request = validateAudioRenderInput(input);
      const pipeline = createAudioPipeline({
        certification,
        ...(options.metrics === undefined ? {} : { metrics: options.metrics }),
        provider: createLocalSynthesisProvider(),
        analysis: createLocalDspAnalysis(),
      });
      const submission = await pipeline.gateway.submit(request);
      if (context.signal?.aborted) {
        throw new TamvAgentError("TAMV_AGENT_CANCELLED", "plan cancelled before the worker ran.");
      }
      const runs = await pipeline.worker.runUntilIdle(10);
      const run = runs.find(
        (entry) => entry.status !== "idle" && entry.record.jobId === submission.jobId,
      );
      if (!run || run.status === "idle" || run.status === "retry-scheduled") {
        throw new TamvAgentError(
          "TAMV_AGENT_TOOL_FAILED",
          "audio.render did not complete in this process.",
        );
      }
      if (run.status === "failed") {
        throw new TamvAgentError(
          "TAMV_AGENT_TOOL_FAILED",
          `audio.render failed: ${run.record.failure?.code ?? "unknown"}.`,
        );
      }
      const artifact = run.record.artifact;
      if (!artifact) {
        throw new TamvAgentError(
          "TAMV_AGENT_TOOL_FAILED",
          "audio.render succeeded without an artifact.",
        );
      }
      return {
        jobId: run.record.jobId,
        requestId: run.record.requestId,
        artifact,
        analysis: run.record.analysis,
      };
    },
  });

  return registry;
}

export type RunAgentPlanOptions = {
  tools: AgentToolRegistry;
  ports?: AgentEnginePorts;
  signal?: AbortSignal;
};

export async function runAgentPlan(
  rawPlan: unknown,
  options: RunAgentPlanOptions,
): Promise<AgentRunResult> {
  const plan: AgentPlan = validateAgentPlan(rawPlan);
  const ports = options.ports ?? {};
  const steps: AgentStepResult[] = [];
  let status: AgentRunResult["status"] = "succeeded";

  for (const step of plan.steps) {
    if (options.signal?.aborted) {
      status = "cancelled";
      await ports.audit?.record({ type: "agent.plan.cancelled", detail: "aborted between steps" });
      break;
    }
    const handler = options.tools.get(step.tool);
    if (!handler) {
      steps.push({
        stepId: step.id,
        tool: step.tool,
        status: "failed",
        failure: { code: "TAMV_AGENT_TOOL_UNKNOWN", detail: `tool not registered: ${step.tool}` },
      });
      status = "failed";
      break;
    }

    let deniedEffect: string | null = null;
    for (const effect of handler.effects) {
      const authorized = ports.effects
        ? await ports.effects.authorize({ tool: step.tool, effect })
        : false;
      if (!authorized) {
        deniedEffect = effect;
        break;
      }
    }
    if (deniedEffect !== null) {
      steps.push({
        stepId: step.id,
        tool: step.tool,
        status: "failed",
        failure: {
          code: "TAMV_AGENT_EFFECT_DENIED",
          detail: `external effect not authorized: ${deniedEffect}`,
        },
      });
      status = "failed";
      await ports.audit?.record({
        type: "agent.step.failed",
        stepId: step.id,
        tool: step.tool,
        detail: deniedEffect,
      });
      break;
    }

    try {
      const output = await handler.execute(step.input, {
        ...(options.signal === undefined ? {} : { signal: options.signal }),
      });
      steps.push({ stepId: step.id, tool: step.tool, status: "succeeded", output });
      await ports.audit?.record({ type: "agent.step.completed", stepId: step.id, tool: step.tool });
    } catch (error) {
      const code = error instanceof TamvAgentError ? error.code : "TAMV_AGENT_TOOL_FAILED";
      const detail =
        error instanceof Error ? error.message.slice(0, 500) : String(error).slice(0, 500);
      steps.push({ stepId: step.id, tool: step.tool, status: "failed", failure: { code, detail } });
      status = "failed";
      await ports.audit?.record({
        type: "agent.step.failed",
        stepId: step.id,
        tool: step.tool,
        detail: code,
      });
      break;
    }
  }

  return {
    schema: AGENT_RESULT_SCHEMA,
    status,
    ...(plan.requestId === undefined ? {} : { requestId: plan.requestId }),
    steps,
    disclosure: {
      kind: "orquestacion local determinista",
      llm: false,
      externalEffects: false,
      tools: ["audio.render", "digest.sha256"],
    },
  };
}
