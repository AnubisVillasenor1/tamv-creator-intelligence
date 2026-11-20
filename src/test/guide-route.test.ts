import { afterEach, describe, expect, it, vi } from "vitest";
import { GUIDE_CAPABILITY, handleGuideRequest } from "../lib/guide-route.server";

const body = JSON.stringify({ message: "¿Cómo empiezo?", history: [], context: "" });
const request = () =>
  new Request("http://localhost/api/guide", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body,
  });

const quota = {
  allowed: true,
  reason: "ok" as const,
  retryAfterSeconds: 0,
  remainingToday: 4,
  source: "redis" as const,
};

afterEach(() => {
  vi.unstubAllEnvs();
  vi.restoreAllMocks();
});

describe("guide route governance gate", () => {
  it("denies the AI proxy when the distribution is not certified and never calls the provider", async () => {
    const requireCertification = vi.fn(async () =>
      Response.json(
        { code: "TAMV_ATTRIBUTION_INTEGRITY_FAILED" },
        { status: 403 },
      ),
    );
    const fetchImpl = vi.fn(async () => new Response("{}", { status: 200 }));
    const response = await handleGuideRequest(request(), {
      authenticate: async () => ({ actorRef: "actor-test" }),
      requireCertification,
      fetchImpl: fetchImpl as unknown as typeof fetch,
    });

    expect(response.status).toBe(403);
    expect(requireCertification).toHaveBeenCalledWith(GUIDE_CAPABILITY);
    expect(fetchImpl).not.toHaveBeenCalled();
  });

  it("discloses that certification was required when a certified distribution answers", async () => {
    vi.stubEnv("TAMV_GUIDE_AI_BASE_URL", "https://api.openai.com/v1");
    vi.stubEnv("TAMV_GUIDE_AI_API_KEY", "test-key");
    vi.stubEnv("TAMV_GUIDE_AI_MODEL", "test-model");
    const fetchImpl = vi.fn(async () =>
      Response.json({ choices: [{ message: { content: "Paso 1: abre el estudio." } }] }),
    );
    const response = await handleGuideRequest(request(), {
      authenticate: async () => ({ actorRef: "actor-test" }),
      requireCertification: async () => null,
      checkQuota: async () => quota,
      acquireSlot: () => true,
      releaseSlot: () => undefined,
      fetchImpl: fetchImpl as unknown as typeof fetch,
    });

    expect(response.status).toBe(200);
    const payload = (await response.json()) as {
      disclosure: { certificationRequired: boolean; toolsExecuted: boolean };
    };
    expect(payload.disclosure.certificationRequired).toBe(true);
    expect(payload.disclosure.toolsExecuted).toBe(false);
    expect(fetchImpl).toHaveBeenCalledOnce();
  });
});
