import { webcrypto } from "node:crypto";
import { beforeAll, describe, expect, it } from "vitest";
import {
  AUDIOCORE_MAX_DURATION_SECONDS,
  AUDIOCORE_RESPONSE_SCHEMA,
  handleAudioCoreAdvanced,
  type AudioCoreDeps,
} from "@/lib/audiocore-advanced.server";
import { LOCAL_SYNTH_PROVIDER } from "../../tamv-genesis/src/audio/index.ts";

beforeAll(() => {
  Object.defineProperty(globalThis, "crypto", { value: webcrypto, configurable: true });
});

const allowDeps: AudioCoreDeps = {
  certify: async () => null,
  authenticate: async () => ({ actorRef: "actor-test" }),
};

function validBody(overrides: Record<string, unknown> = {}): Record<string, unknown> {
  return {
    schema: "tamv.audio.request.v1",
    mode: "instrumental",
    prompt: "Cama instrumental calida para la prueba de ruta",
    durationSeconds: 5,
    sampleRate: 44100,
    format: "wav",
    rights: { license: "original", attestationId: "rights-route-0001" },
    consent: { granted: true, subject: "creator-test", scope: "audio.production" },
    metadata: { title: "Route bed", language: "es-MX" },
    ...overrides,
  };
}

function post(body: unknown, deps: AudioCoreDeps = allowDeps, headers: Record<string, string> = {}): Promise<Response> {
  const request = new Request("http://localhost/api/audiocore/advanced", {
    method: "POST",
    headers: { "content-type": "application/json", ...headers },
    body: JSON.stringify(body),
  });
  return handleAudioCoreAdvanced(request, deps);
}

describe("audiocore advanced route contract", () => {
  it("passes the certification denial through unchanged", async () => {
    const denial = Response.json({ code: "TAMV_ATTRIBUTION_INTEGRITY_FAILED" }, { status: 403 });
    const response = await post(validBody(), { ...allowDeps, certify: async () => denial });
    expect(response.status).toBe(403);
  });

  it("requires an authenticated creator", async () => {
    const response = await post(validBody(), {
      ...allowDeps,
      authenticate: async () => Response.json({ error: "Authentication required" }, { status: 401 }),
    });
    expect(response.status).toBe(401);
  });

  it("rejects a non-JSON content type", async () => {
    const request = new Request("http://localhost/api/audiocore/advanced", {
      method: "POST",
      headers: { "content-type": "text/plain" },
      body: "hola",
    });
    const response = await handleAudioCoreAdvanced(request, allowDeps);
    expect(response.status).toBe(415);
  });

  it("rejects an oversized declared content length", async () => {
    const request = new Request("http://localhost/api/audiocore/advanced", {
      method: "POST",
      headers: { "content-type": "application/json", "content-length": "999999" },
      body: JSON.stringify(validBody()),
    });
    const response = await handleAudioCoreAdvanced(request, allowDeps);
    expect(response.status).toBe(413);
  });

  it("rejects unknown fields instead of forwarding them", async () => {
    const response = await post(validBody({ execute: "deploy" }));
    expect(response.status).toBe(400);
    expect((await response.json()).code).toBe("TAMV_AUDIO_INVALID");
  });

  it("denies without explicit consent", async () => {
    const response = await post(
      validBody({ consent: { granted: false, subject: "creator-test", scope: "audio.production" } }),
    );
    expect(response.status).toBe(403);
    expect((await response.json()).code).toBe("TAMV_AUDIO_CONSENT_REQUIRED");
  });

  it("enforces the route duration limit", async () => {
    const response = await post(validBody({ durationSeconds: AUDIOCORE_MAX_DURATION_SECONDS + 1 }));
    expect(response.status).toBe(400);
    expect((await response.json()).code).toBe("TAMV_AUDIOCORE_DURATION_LIMIT");
  });

  it("reports FLAC as unavailable instead of faking it", async () => {
    const response = await post(validBody({ format: "flac" }));
    expect(response.status).toBe(501);
    expect((await response.json()).code).toBe("TAMV_AUDIO_PROVIDER_UNAVAILABLE");
  });

  it("renders real audio with computed DSP and honest disclosure", async () => {
    const response = await post(validBody());
    expect(response.status).toBe(200);
    const payload = await response.json();
    expect(payload.schema).toBe(AUDIOCORE_RESPONSE_SCHEMA);
    expect(payload.submission.status).toBe("queued");
    expect(payload.job.status).toBe("succeeded");
    expect(payload.job.artifact.provider).toBe(LOCAL_SYNTH_PROVIDER);
    expect(payload.job.analysis.status).toBe("computed");
    expect(payload.job.analysis.truePeakDb).toBeTypeOf("number");
    expect(payload.job.analysis.chroma).toHaveLength(12);
    expect(payload.disclosure.neuralModel).toBe(false);
    expect(payload.disclosure.voice).toBe(false);
    expect(payload.disclosure.actorRef).toBe("actor-test");

    const bytes = Buffer.from(payload.audio.data, "base64");
    expect(bytes.subarray(0, 4).toString("ascii")).toBe("RIFF");
    expect(bytes.subarray(8, 12).toString("ascii")).toBe("WAVE");
    expect(bytes.byteLength).toBe(44 + 5 * 44100 * 2);
    expect(payload.job.artifact.bytes).toBe(bytes.byteLength);
  });

  it("is deterministic: the same request renders identical bytes", async () => {
    const first = await (await post(validBody())).json();
    const second = await (await post(validBody())).json();
    expect(first.audio.data).toBe(second.audio.data);
    expect(first.job.artifact.sha256).toBe(second.job.artifact.sha256);
  });
});