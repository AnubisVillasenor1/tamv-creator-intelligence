import { webcrypto } from "node:crypto";
import { afterEach, describe, expect, it, vi } from "vitest";
import { handleAudioCoreAdvanced } from "@/lib/audiocore-advanced.server";
import {
  buildAgentPlan,
  buildAudioRequest,
  callStudioEndpoint,
  describeStudioFailure,
  getStudioAccessToken,
  StudioApiError,
  wavBytesFromBase64,
  type StudioAudioForm,
} from "@/lib/studio-client";

vi.mock("@/integrations/supabase/client", () => ({
  supabase: {
    auth: {
      getSession: vi.fn(async () => ({
        data: { session: { access_token: "test-session" } },
        error: null,
      })),
    },
  },
}));

const form: StudioAudioForm = {
  mode: "instrumental",
  prompt: "Un pad ambiental en Do mayor",
  durationSeconds: 8,
  sampleRate: 44100,
  license: "original",
  attestationId: "rights-studio-0001",
  title: "Pad de prueba",
};

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe("studio request builders", () => {
  it("builds a contract-shaped audio request with explicit consent", () => {
    const built = buildAudioRequest(form, "creator@example.com");
    expect(built.ok).toBe(true);
    if (!built.ok) return;
    expect(built.request.schema).toBe("tamv.audio.request.v1");
    expect(built.request.format).toBe("wav");
    expect(built.request.consent).toEqual({
      granted: true,
      subject: "creator@example.com",
      scope: "audio.production",
    });
    expect(built.request.rights).toEqual({
      license: "original",
      attestationId: "rights-studio-0001",
    });
    expect(built.request.requestId.length).toBeGreaterThanOrEqual(3);
  });

  it("rejects durations outside the endpoint window before any network call", () => {
    expect(buildAudioRequest({ ...form, durationSeconds: 4 }, "s").ok).toBe(false);
    expect(buildAudioRequest({ ...form, durationSeconds: 31 }, "s").ok).toBe(false);
    expect(buildAudioRequest({ ...form, durationSeconds: 8.5 }, "s").ok).toBe(false);
    expect(buildAudioRequest({ ...form, prompt: "   " }, "s").ok).toBe(false);
    expect(buildAudioRequest({ ...form, attestationId: "ab" }, "s").ok).toBe(false);
  });

  it("builds an agent plan with digest and optional audio steps", () => {
    const withAudio = buildAgentPlan({
      digestText: "abc",
      includeAudio: true,
      audioForm: form,
      subject: "s",
    });
    expect(withAudio.ok).toBe(true);
    if (!withAudio.ok) return;
    expect(withAudio.plan.schema).toBe("tamv.agent.plan.v1");
    expect(withAudio.plan.steps.map((s) => s.tool)).toEqual(["digest.sha256", "audio.render"]);
    expect(withAudio.plan.consent.granted).toBe(true);

    const digestOnly = buildAgentPlan({
      digestText: "abc",
      includeAudio: false,
      audioForm: form,
      subject: "s",
    });
    expect(digestOnly.ok).toBe(true);
    if (!digestOnly.ok) return;
    expect(digestOnly.plan.steps).toHaveLength(1);

    expect(
      buildAgentPlan({ digestText: "", includeAudio: false, audioForm: form, subject: "s" }).ok,
    ).toBe(false);
  });
});

describe("callStudioEndpoint", () => {
  it("sends JSON with the bearer token and parses a successful body", async () => {
    const disclosure = {
      kind: "orquestacion local determinista",
      llm: false,
      externalEffects: false,
      tools: ["digest.sha256"],
    };
    const fetchMock = vi.fn(async () =>
      Response.json({
        schema: "tamv.agent.orchestration.response.v1",
        result: {
          schema: "tamv.agent.result.v1",
          status: "succeeded",
          steps: [
            {
              stepId: "digest-1",
              tool: "digest.sha256",
              status: "succeeded",
              output: { sha256: "a".repeat(64) },
            },
          ],
          disclosure,
        },
        disclosure: {
          ...disclosure,
          actorRef: "actor-test",
          quota: { source: "redis", remainingToday: 59 },
        },
      }),
    );
    vi.stubGlobal("fetch", fetchMock);
    const result = await callStudioEndpoint<{ schema: string }>("/api/agent", { a: 1 }, "token-1");
    expect(result.schema).toBe("tamv.agent.orchestration.response.v1");
    const [path, init] = fetchMock.mock.calls[0] as unknown as [string, RequestInit];
    expect(path).toBe("/api/agent");
    expect(new Headers(init.headers).get("Authorization")).toBe("Bearer token-1");
    expect(new Headers(init.headers).get("Content-Type")).toBe("application/json");
  });

  it("surfaces status, code and Retry-After from a 429 without retrying", async () => {
    const fetchMock = vi.fn(async () =>
      Response.json(
        { error: "quota exhausted", code: "TAMV_QUOTA_EXCEEDED" },
        { status: 429, headers: { "Retry-After": "30" } },
      ),
    );
    vi.stubGlobal("fetch", fetchMock);
    const failure = await callStudioEndpoint("/api/agent", {}, "t").catch((e: unknown) => e);
    expect(failure).toBeInstanceOf(StudioApiError);
    const error = failure as StudioApiError;
    expect(error.status).toBe(429);
    expect(error.code).toBe("TAMV_QUOTA_EXCEEDED");
    expect(error.retryAfterSeconds).toBe(30);
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(describeStudioFailure(error)).toContain("Espera 30 segundos");
    expect(describeStudioFailure(error)).toContain("no se reintentará automáticamente");
  });

  it("keeps an honest message when the error body is not JSON", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => new Response("gateway timeout", { status: 504 })),
    );
    const failure = (await callStudioEndpoint("/api/agent", {}, "t").catch(
      (e: unknown) => e,
    )) as StudioApiError;
    expect(failure.status).toBe(504);
    expect(failure.code).toBeNull();
    expect(failure.message).toContain("504");
  });

  it("reports network failure as status 0 instead of a fake success", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => {
        throw new Error("offline");
      }),
    );
    const failure = (await callStudioEndpoint("/api/agent", {}, "t").catch(
      (e: unknown) => e,
    )) as StudioApiError;
    expect(failure.status).toBe(0);
    expect(describeStudioFailure(failure)).toContain("No se pudo contactar");
  });
});

describe("audio response integrity", () => {
  async function renderedPayload() {
    vi.stubGlobal("crypto", webcrypto);
    const built = buildAudioRequest({ ...form, durationSeconds: 5 }, "creator-test");
    if (!built.ok) throw new Error(built.error);
    const response = await handleAudioCoreAdvanced(
      new Request("http://localhost/api/audiocore/advanced", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(built.request),
      }),
      {
        certify: async () => null,
        authenticate: async () => ({ actorRef: "actor-test" }),
        quotaConfig: {
          redisRestUrl: "https://quota.example.invalid",
          redisRestToken: "test-only-token",
          keySalt: "test-only-salt-at-least-32-characters",
          fetcher: async () => Response.json({ result: [1, "ok", 0, 29] }),
        },
      },
    );
    expect(response.status).toBe(200);
    return response.json();
  }
  it("accepts a real locally rendered WAV after verifying its hash", async () => {
    const payload = await renderedPayload();
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => Response.json(payload)),
    );
    const result = await callStudioEndpoint<{ audio: { data: string } }>(
      "/api/audiocore/advanced",
      {},
      "test-token",
    );
    expect(wavBytesFromBase64(result.audio.data)).toHaveLength(441044);
  });
  it.each(["hash", "bytes", "wave", "schema"])(
    "rejects corrupt %s instead of rendering untrusted output",
    async (part) => {
      const payload = await renderedPayload();
      if (part === "hash") payload.job.artifact.sha256 = "0".repeat(64);
      if (part === "bytes") payload.job.artifact.bytes++;
      if (part === "wave") payload.audio.data = btoa("not a WAV");
      if (part === "schema") payload.disclosure.neuralModel = true;
      vi.stubGlobal(
        "fetch",
        vi.fn(async () => Response.json(payload)),
      );
      await expect(
        callStudioEndpoint("/api/audiocore/advanced", {}, "test-token"),
      ).rejects.toMatchObject({ status: 502, code: "TAMV_STUDIO_INVALID_RESPONSE" });
    },
  );
});

describe("failure descriptions", () => {
  it("maps certification, consent, busy and provider failures to honest Spanish messages", () => {
    expect(
      describeStudioFailure(
        new StudioApiError(403, "TAMV_ATTRIBUTION_INTEGRITY_FAILED", "x", null),
      ),
    ).toContain("no está certificada");
    expect(
      describeStudioFailure(new StudioApiError(403, "TAMV_AGENT_CONSENT_REQUIRED", "x", null)),
    ).toContain("consentimiento");
    expect(
      describeStudioFailure(new StudioApiError(503, "TAMV_AUDIOCORE_BUSY", "x", null)),
    ).toContain("concurrentes");
    expect(describeStudioFailure(new StudioApiError(503, null, "x", null))).toContain(
      "fail closed",
    );
    expect(
      describeStudioFailure(new StudioApiError(501, "TAMV_AUDIO_PROVIDER_UNAVAILABLE", "x", null)),
    ).toContain("WAV");
    expect(describeStudioFailure(new StudioApiError(401, null, "x", null))).toContain(
      "sesión válida",
    );
  });
});

describe("session and decoding helpers", () => {
  it("reads the access token from the Supabase session", async () => {
    expect(await getStudioAccessToken()).toBe("test-session");
  });

  it("decodes base64 WAV payloads byte for byte", () => {
    const bytes = wavBytesFromBase64(btoa("RIFFfake"));
    expect(Array.from(bytes)).toEqual(Array.from(new TextEncoder().encode("RIFFfake")));
  });
});
