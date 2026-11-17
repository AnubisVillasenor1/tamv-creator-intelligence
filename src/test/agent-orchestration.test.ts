import { webcrypto } from "node:crypto";
import { afterEach, beforeAll, describe, expect, it, vi } from "vitest";
import {
  AGENT_MAX_BODY_BYTES,
  AGENT_RESPONSE_SCHEMA,
  handleAgentOrchestration,
  type AgentRouteDeps,
} from "@/lib/agent-orchestration.server";
import type { CapabilityQuotaConfig } from "@/lib/capability-quota.server";

beforeAll(() => {
  Object.defineProperty(globalThis, "crypto", { value: webcrypto, configurable: true });
});

afterEach(() => {
  vi.unstubAllEnvs();
});

function quotaConfig(result: unknown[]): Partial<CapabilityQuotaConfig> {
  return {
    redisRestUrl: "https://quota.example.invalid",
    redisRestToken: "test-only-quota-token",
    keySalt: "test-only-salt-of-at-least-32-characters",
    fetcher: async () => Response.json({ result }),
  };
}

const allowDeps: AgentRouteDeps = {
  certify: async () => null,
  authenticate: async () => ({ actorRef: "actor-test" }),
  quotaConfig: quotaConfig([1, "ok", 0, 59]),
};

function audioInput(overrides: Record<string, unknown> = {}): Record<string, unknown> {
  return {
    schema: "tamv.audio.request.v1",
    mode: "instrumental",
    prompt: "Cama instrumental calida para el plan de prueba",
    durationSeconds: 5,
    sampleRate: 44100,
    format: "wav",
    rights: { license: "original", attestationId: "rights-agent-0001" },
    consent: { granted: true, subject: "creator-test", scope: "audio.production" },
    metadata: { title: "Agent bed", language: "es-MX" },
    ...overrides,
  };
}

function validPlan(overrides: Record<string, unknown> = {}): Record<string, unknown> {
  return {
    schema: "tamv.agent.plan.v1",
    requestId: "agent-route-0001",
    consent: { granted: true, subject: "creator-test", scope: "agent.orchestration" },
    steps: [
      { id: "hash", tool: "digest.sha256", input: { text: "abc" } },
      { id: "bed", tool: "audio.render", input: audioInput() },
    ],
    ...overrides,
  };
}

function post(
  body: unknown,
  deps: AgentRouteDeps = allowDeps,
  headers: Record<string, string> = {},
): Promise<Response> {
  const request = new Request("http://localhost/api/agent", {
    method: "POST",
    headers: { "content-type": "application/json", ...headers },
    body: JSON.stringify(body),
  });
  return handleAgentOrchestration(request, deps);
}

describe("agent orchestration route contract", () => {
  it("passes the certification denial through unchanged", async () => {
    const denial = Response.json({ code: "TAMV_ATTRIBUTION_INTEGRITY_FAILED" }, { status: 403 });
    const response = await post(validPlan(), { ...allowDeps, certify: async () => denial });
    expect(response.status).toBe(403);
  });

  it("requires an authenticated creator", async () => {
    const response = await post(validPlan(), {
      ...allowDeps,
      authenticate: async () => Response.json({ error: "Authentication required" }, { status: 401 }),
    });
    expect(response.status).toBe(401);
  });

  it("rejects a non-JSON content type", async () => {
    const request = new Request("http://localhost/api/agent", {
      method: "POST",
      headers: { "content-type": "text/plain" },
      body: "hola",
    });
    const response = await handleAgentOrchestration(request, allowDeps);
    expect(response.status).toBe(415);
  });

  it("rejects an oversized declared content length", async () => {
    const response = await post(validPlan(), allowDeps, {
      "content-length": String(AGENT_MAX_BODY_BYTES + 1),
    });
    expect(response.status).toBe(413);
  });

  it("rejects unknown fields instead of forwarding them", async () => {
    const response = await post(validPlan({ execute: "deploy" }));
    expect(response.status).toBe(400);
    expect((await response.json()).code).toBe("TAMV_AGENT_INVALID");
  });

  it("denies without explicit consent", async () => {
    const response = await post(
      validPlan({ consent: { granted: false, subject: "creator-test", scope: "agent.orchestration" } }),
    );
    expect(response.status).toBe(403);
    expect((await response.json()).code).toBe("TAMV_AGENT_CONSENT_REQUIRED");
  });

  it("enforces the step limit", async () => {
    const steps = Array.from({ length: 9 }, (_, index) => ({
      id: `s${index}`,
      tool: "digest.sha256",
      input: { text: "abc" },
    }));
    const response = await post(validPlan({ steps }));
    expect(response.status).toBe(400);
    expect((await response.json()).code).toBe("TAMV_AGENT_LIMIT");
  });

  it("rejects unknown tools", async () => {
    const response = await post(
      validPlan({ steps: [{ id: "x", tool: "shell.exec", input: {} }] }),
    );
    expect(response.status).toBe(501);
    expect((await response.json()).code).toBe("TAMV_AGENT_TOOL_UNKNOWN");
  });

  it("enforces the per-step audio duration limit", async () => {
    const response = await post(
      validPlan({ steps: [{ id: "bed", tool: "audio.render", input: audioInput({ durationSeconds: 31 }) }] }),
    );
    expect(response.status).toBe(400);
    expect((await response.json()).code).toBe("TAMV_AGENT_AUDIO_DURATION_LIMIT");
  });

  it("reports FLAC as unavailable instead of faking it", async () => {
    const response = await post(
      validPlan({ steps: [{ id: "bed", tool: "audio.render", input: audioInput({ format: "flac" }) }] }),
    );
    expect(response.status).toBe(501);
    expect((await response.json()).code).toBe("TAMV_AUDIO_PROVIDER_UNAVAILABLE");
  });

  it("executes a real plan with measured outputs and honest disclosure", async () => {
    const response = await post(validPlan());
    expect(response.status).toBe(200);
    const payload = await response.json();
    expect(payload.schema).toBe(AGENT_RESPONSE_SCHEMA);
    expect(payload.result.status).toBe("succeeded");
    expect(payload.result.requestId).toBe("agent-route-0001");
    expect(payload.result.steps).toHaveLength(2);

    const digestStep = payload.result.steps[0];
    expect(digestStep.status).toBe("succeeded");
    expect(digestStep.output.sha256).toBe(
      "sha256:ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad",
    );

    const audioStep = payload.result.steps[1];
    expect(audioStep.status).toBe("succeeded");
    expect(audioStep.output.artifact.bytes).toBe(44 + 5 * 44100 * 2);
    expect(audioStep.output.analysis.status).toBe("computed");
    expect(audioStep.output.analysis.truePeakDb).toBeTypeOf("number");
    expect(audioStep.output).not.toHaveProperty("data");

    expect(payload.disclosure.llm).toBe(false);
    expect(payload.disclosure.externalEffects).toBe(false);
    expect(payload.disclosure.actorRef).toBe("actor-test");
    expect(payload.disclosure.quota.source).toBe("redis");
  });

  it("is deterministic: identical plans render identical digests, bytes and DSP", async () => {
    const first = await (await post(validPlan())).json();
    const second = await (await post(validPlan())).json();
    expect(first.result.steps[0].output).toEqual(second.result.steps[0].output);
    const firstAudio = first.result.steps[1].output;
    const secondAudio = second.result.steps[1].output;
    expect(firstAudio.artifact.sha256).toBe(secondAudio.artifact.sha256);
    expect(firstAudio.artifact.bytes).toBe(secondAudio.artifact.bytes);
    expect(firstAudio.analysis).toEqual(secondAudio.analysis);
  });

  it("fails the plan with 502 when certification is revoked mid-execution", async () => {
    let calls = 0;
    const response = await post(validPlan(), {
      ...allowDeps,
      certify: async () => {
        calls += 1;
        return calls === 1 ? null : Response.json({ code: "TAMV_CERTIFICATION_REVOKED" }, { status: 403 });
      },
    });
    expect(response.status).toBe(502);
    const payload = await response.json();
    expect(payload.code).toBe("TAMV_AGENT_EFFECT_DENIED");
  });

  it("returns 429 with Retry-After when the distributed quota rate-limits", async () => {
    const response = await post(validPlan(), {
      ...allowDeps,
      quotaConfig: quotaConfig([0, "rate-limited", 600, 10]),
    });
    expect(response.status).toBe(429);
    expect(response.headers.get("Retry-After")).toBe("600");
    const payload = await response.json();
    expect(payload.code).toBe("TAMV_CAPABILITY_QUOTA_DENIED");
    expect(payload.reason).toBe("rate-limited");
  });

  it("fails closed with 503 when no quota backend is configured outside local dev", async () => {
    const response = await post(validPlan(), {
      certify: async () => null,
      authenticate: async () => ({ actorRef: "actor-test" }),
    });
    expect(response.status).toBe(503);
    expect((await response.json()).quotaSource).toBe("fail-closed");
  });

  it("labels the process-local quota as local-development, never distributed", async () => {
    vi.stubEnv("TAMV_DEPLOYMENT_ENV", "test");
    const response = await post(validPlan(), {
      certify: async () => null,
      authenticate: async () => ({ actorRef: "actor-local-agent" }),
    });
    expect(response.status).toBe(200);
    const payload = await response.json();
    expect(payload.disclosure.quota.source).toBe("local-development");
  });
});