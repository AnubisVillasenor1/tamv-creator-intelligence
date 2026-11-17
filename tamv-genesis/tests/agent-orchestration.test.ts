import assert from "node:assert/strict";
import { test } from "node:test";
import { webcrypto } from "node:crypto";
import {
  AGENT_MAX_STEPS,
  AGENT_PLAN_SCHEMA,
  AGENT_RESULT_SCHEMA,
  TamvAgentError,
  createLocalAgentTools,
  runAgentPlan,
  validateAgentPlan,
  type AgentAuditEvent,
  type AgentToolHandler,
} from "../src/agent/index.ts";

Object.defineProperty(globalThis, "crypto", { value: webcrypto, configurable: true });

function digestPlan(steps: number, overrides: Record<string, unknown> = {}): Record<string, unknown> {
  return {
    schema: AGENT_PLAN_SCHEMA,
    consent: { granted: true, subject: "creator-test", scope: "agent.orchestration" },
    steps: Array.from({ length: steps }, (_, index) => ({
      id: `step-${index + 1}`,
      tool: "digest.sha256",
      input: { text: `payload-${index + 1}` },
    })),
    ...overrides,
  };
}

function audioStep(id: string, overrides: Record<string, unknown> = {}): Record<string, unknown> {
  return {
    id,
    tool: "audio.render",
    input: {
      schema: "tamv.audio.request.v1",
      mode: "instrumental",
      prompt: "Cama instrumental para el plan de agente",
      durationSeconds: 5,
      sampleRate: 44100,
      format: "wav",
      rights: { license: "original", attestationId: "rights-agent-0001" },
      consent: { granted: true, subject: "creator-test", scope: "audio.production" },
      metadata: { title: "Agent bed", language: "es-MX" },
      ...overrides,
    },
  };
}

test("a digest plan succeeds and matches the published SHA-256 vector", async () => {
  const plan = digestPlan(1);
  (plan["steps"] as Record<string, unknown>[])[0]!["input"] = { text: "abc" };
  const result = await runAgentPlan(plan, { tools: createLocalAgentTools() });
  assert.equal(result.schema, AGENT_RESULT_SCHEMA);
  assert.equal(result.status, "succeeded");
  assert.equal(result.steps.length, 1);
  assert.deepEqual(result.steps[0]!.output, {
    sha256: "sha256:ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad",
  });
  assert.equal(result.disclosure.llm, false);
  assert.equal(result.disclosure.externalEffects, false);
});

test("the same plan produces identical results twice", async () => {
  const tools = createLocalAgentTools();
  const first = await runAgentPlan(digestPlan(3), { tools });
  const second = await runAgentPlan(digestPlan(3), { tools });
  assert.deepEqual(first, second);
});

test("unknown fields, duplicate ids, empty steps and oversize plans are rejected", () => {
  assert.throws(() => validateAgentPlan(digestPlan(1, { execute: "deploy" })), TamvAgentError);
  const duplicate = digestPlan(2);
  (duplicate["steps"] as Record<string, unknown>[])[1]!["id"] = "step-1";
  assert.throws(() => validateAgentPlan(duplicate), /duplicate step id/);
  assert.throws(() => validateAgentPlan(digestPlan(0)), TamvAgentError);
  assert.throws(() => validateAgentPlan(digestPlan(AGENT_MAX_STEPS + 1)), /at most/);
});

test("unknown tools and missing consent are rejected before execution", () => {
  const unknownTool = digestPlan(1);
  (unknownTool["steps"] as Record<string, unknown>[])[0]!["tool"] = "http.post";
  assert.throws(() => validateAgentPlan(unknownTool), /tool must be one of/);
  const noConsent = digestPlan(1);
  noConsent["consent"] = { granted: false, subject: "creator-test", scope: "agent.orchestration" };
  assert.throws(() => validateAgentPlan(noConsent), (error: unknown) => {
    return error instanceof TamvAgentError && error.code === "TAMV_AGENT_CONSENT_REQUIRED";
  });
});

test("digest input is bounded and strict", () => {
  const bad = digestPlan(1);
  (bad["steps"] as Record<string, unknown>[])[0]!["input"] = { text: "x".repeat(8001) };
  assert.throws(() => validateAgentPlan(bad), TamvAgentError);
  const extra = digestPlan(1);
  (extra["steps"] as Record<string, unknown>[])[0]!["input"] = { text: "ok", encoding: "hex" };
  assert.throws(() => validateAgentPlan(extra), /unknown field/);
});

test("audio.render produces a measured artifact reference without raw bytes", async () => {
  const plan = digestPlan(0);
  plan["steps"] = [audioStep("render-1")];
  const result = await runAgentPlan(plan, { tools: createLocalAgentTools() });
  assert.equal(result.status, "succeeded");
  const output = result.steps[0]!.output as Record<string, unknown>;
  const artifact = output["artifact"] as Record<string, unknown>;
  const analysis = output["analysis"] as Record<string, unknown>;
  assert.match(String(artifact["sha256"]), /^sha256:[0-9a-f]{64}$/);
  assert.equal(artifact["bytes"], 44 + 5 * 44100 * 2);
  assert.equal(analysis["status"], "computed");
  assert.equal(typeof analysis["truePeakDb"], "number");
  assert.ok(!("data" in output), "agent output must not embed raw audio bytes");
});

test("a failing step stops the plan and later steps never run", async () => {
  const plan = digestPlan(1);
  plan["steps"] = [audioStep("render-flac", { format: "flac" }), ...(plan["steps"] as unknown[])];
  const events: AgentAuditEvent[] = [];
  const result = await runAgentPlan(plan, {
    tools: createLocalAgentTools(),
    ports: { audit: { async record(event) { events.push(event); } } },
  });
  assert.equal(result.status, "failed");
  assert.equal(result.steps.length, 1);
  assert.equal(result.steps[0]!.failure?.code, "TAMV_AGENT_TOOL_FAILED");
  assert.equal(events.filter((event) => event.type === "agent.step.completed").length, 0);
  assert.equal(events.filter((event) => event.type === "agent.step.failed").length, 1);
});

test("a pre-aborted signal cancels the plan without executing steps", async () => {
  const controller = new AbortController();
  controller.abort();
  const result = await runAgentPlan(digestPlan(2), {
    tools: createLocalAgentTools(),
    signal: controller.signal,
  });
  assert.equal(result.status, "cancelled");
  assert.equal(result.steps.length, 0);
});

test("external effects are denied by default and only run with explicit authorization", async () => {
  const tools = new Map<string, AgentToolHandler>(createLocalAgentTools());
  tools.set("digest.sha256", {
    effects: ["http.post"],
    async execute() {
      return { sha256: "sha256:should-not-run-by-default" };
    },
  });
  const denied = await runAgentPlan(digestPlan(1), { tools });
  assert.equal(denied.status, "failed");
  assert.equal(denied.steps[0]!.failure?.code, "TAMV_AGENT_EFFECT_DENIED");

  const authorized = await runAgentPlan(digestPlan(1), {
    tools,
    ports: { effects: { async authorize() { return true; } } },
  });
  assert.equal(authorized.status, "succeeded");
});

test("every completed step is audited", async () => {
  const events: AgentAuditEvent[] = [];
  const result = await runAgentPlan(digestPlan(2), {
    tools: createLocalAgentTools(),
    ports: { audit: { async record(event) { events.push(event); } } },
  });
  assert.equal(result.status, "succeeded");
  assert.deepEqual(
    events.map((event) => [event.type, event.stepId]),
    [
      ["agent.step.completed", "step-1"],
      ["agent.step.completed", "step-2"],
    ],
  );
});