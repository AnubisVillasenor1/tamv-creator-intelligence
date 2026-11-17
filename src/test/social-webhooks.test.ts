import { createHmac } from "node:crypto";
import { describe, expect, it, vi } from "vitest";
import { socialIntegrations } from "@/lib/social-integrations";
import { handleSocialWebhook, type WebhookDeps } from "@/lib/social-webhooks.server";

const secret = "test-provider-secret-not-a-real-credential";
const relaySecret = "test-relay-secret-not-a-real-credential";
const now = 1_800_000_000_000;
const body = '{ "event": "test", "message": "Señal de prueba" }';
const digest = (value: string, key = secret, encoding: "hex" | "base64" = "hex") =>
  createHmac("sha256", key).update(value).digest(encoding);
function setup() {
  const env: Record<string, string> = {
    TAMV_WEBHOOK_FORWARDING_ENABLED: "true",
    TAMV_WEBHOOK_RELAY_URL: "https://relay.example.com/events",
    TAMV_WEBHOOK_RELAY_ALLOWED_ORIGIN: "https://relay.example.com",
    TAMV_WEBHOOK_RELAY_SECRET: relaySecret,
  };
  for (const provider of socialIntegrations) {
    if (provider.secretEnv) env[provider.secretEnv] = secret;
    if ("verifyEnv" in provider) env[provider.verifyEnv] = secret;
  }
  const fetcher = vi.fn<typeof fetch>(async (_url, init) =>
    Response.json({ accepted: true, eventId: JSON.parse(String(init?.body)).eventId }),
  );
  return { env, fetcher, now: () => now };
}
function signedHeaders(
  provider: string,
  text = body,
  timestamp = now / 1000,
): Record<string, string> {
  if (provider === "telegram") return { "X-Telegram-Bot-Api-Secret-Token": secret };
  if (provider === "linkedin") return { "X-LI-Signature": digest(`hmacsha256=${text}`) };
  if (provider === "twitter")
    return { "X-Twitter-Webhooks-Signature-OAuth2": `sha256=${digest(text, secret, "base64")}` };
  if (provider === "tiktok")
    return { "TikTok-Signature": `t=${timestamp},s=${digest(`${timestamp}.${text}`)}` };
  return { "X-Hub-Signature-256": `sha256=${digest(text)}` };
}
function post(
  provider = "github",
  deps: WebhookDeps = setup(),
  text = body,
  extra = signedHeaders(provider, text),
) {
  return handleSocialWebhook(
    new Request(`https://app.example.com/api/webhooks/${provider}`, {
      method: "POST",
      headers: { "Content-Type": "application/json", ...extra },
      body: text,
    }),
    provider,
    deps,
  );
}

describe("native webhook verification", () => {
  it.each(socialIntegrations.filter((p) => p.protocol !== "unverified").map((p) => p.id))(
    "accepts verified %s only after relay acknowledgment",
    async (provider) => {
      const deps = setup();
      const response = await post(provider, deps);
      expect(response.status).toBe(200);
      expect(await response.json()).toMatchObject({
        accepted: true,
        publicationStarted: false,
        delivery: "relay-acknowledged",
      });
      expect(deps.fetcher).toHaveBeenCalledTimes(1);
      expect(response.headers.get("Cache-Control")).toBe("no-store");
    },
  );
  it.each(socialIntegrations.filter((p) => p.protocol !== "unverified").map((p) => p.id))(
    "rejects missing authentication for %s without forwarding",
    async (provider) => {
      const deps = setup();
      expect((await post(provider, deps, body, {})).status).toBe(401);
      expect(deps.fetcher).not.toHaveBeenCalled();
    },
  );
  it("rejects altered raw bodies and does not trust unsigned headers", async () => {
    const deps = setup();
    expect((await post("github", deps, body + " ", signedHeaders("github"))).status).toBe(401);
    const first = await (await post("github", deps)).json();
    const second = await (
      await post("github", deps, body, {
        ...signedHeaders("github"),
        "X-GitHub-Delivery": "different-unsigned-id",
      })
    ).json();
    expect(first.eventId).toBe(second.eventId);
    expect(deps.fetcher).toHaveBeenCalledTimes(2);
  });
  it.each([-301, 301])("rejects TikTok timestamps outside tolerance (%s)", async (offset) => {
    expect(
      (await post("tiktok", setup(), body, signedHeaders("tiktok", body, now / 1000 + offset)))
        .status,
    ).toBe(401);
  });
  it("does not accept legacy X or incorrectly prefixed LinkedIn signatures", async () => {
    expect(
      (
        await post("twitter", setup(), body, {
          "X-Twitter-Webhooks-Signature": `sha256=${digest(body, secret, "base64")}`,
        })
      ).status,
    ).toBe(401);
    expect(
      (await post("linkedin", setup(), body, { "X-LI-Signature": `hmacsha256=${digest(body)}` }))
        .status,
    ).toBe(401);
  });
  it("blocks unknown providers, unverified Longe and absent configuration", async () => {
    expect((await post("unknown")).status).toBe(404);
    expect((await post("longe")).status).toBe(501);
    expect((await post("github", { env: {} })).status).toBe(503);
  });
  it("bounds JSON media, declared and actual body length, and object shape", async () => {
    expect((await post("github", setup(), body, { "Content-Type": "text/plain" })).status).toBe(
      415,
    );
    expect((await post("github", setup(), body, { "Content-Length": "999999" })).status).toBe(413);
    expect((await post("github", setup(), "a".repeat(262145))).status).toBe(413);
    for (const text of ["[]", "null", "42", "{"])
      expect((await post("github", setup(), text)).status).toBe(400);
  });
});

describe("provider challenges", () => {
  it.each(["facebook", "instagram", "threads", "whatsapp"])(
    "validates %s subscription token and returns exact challenge",
    async (provider) => {
      const url = new URL(`https://app.example.com/api/webhooks/${provider}`);
      url.search = new URLSearchParams({
        "hub.mode": "subscribe",
        "hub.verify_token": secret,
        "hub.challenge": "123456789",
      }).toString();
      const response = await handleSocialWebhook(new Request(url), provider, setup());
      expect(response.status).toBe(200);
      expect(await response.text()).toBe("123456789");
      url.searchParams.set("hub.verify_token", "wrong");
      expect((await handleSocialWebhook(new Request(url), provider, setup())).status).toBe(401);
    },
  );
  it("answers LinkedIn and X challenges without requiring relay configuration", async () => {
    const deps = setup();
    delete deps.env["TAMV_WEBHOOK_FORWARDING_ENABLED"];
    const code = "11111111-2222-3333-4444-555555555555";
    const linked = await handleSocialWebhook(
      new Request(`https://app.example.com?challengeCode=${code}`),
      "linkedin",
      deps,
    );
    expect(await linked.json()).toEqual({ challengeCode: code, challengeResponse: digest(code) });
    const x = await handleSocialWebhook(
      new Request("https://app.example.com?crc_token=challenge"),
      "twitter",
      deps,
    );
    expect(await x.json()).toEqual({
      response_token: `sha256=${digest("challenge", secret, "base64")}`,
    });
    expect(
      (
        await handleSocialWebhook(
          new Request(`https://app.example.com?challengeCode=${code}&applicationId=123`),
          "linkedin",
          deps,
        )
      ).status,
    ).toBe(400);
    expect(
      (await handleSocialWebhook(new Request("https://app.example.com"), "github", deps)).status,
    ).toBe(405);
  });
});

describe("signed relay boundary", () => {
  it("signs the exact envelope, uses provider-separated identity and forbids redirects", async () => {
    const deps = setup();
    const first = await (await post("github", deps)).json();
    const [url, init] = deps.fetcher.mock.calls[0]!;
    const outgoing = new Headers(init?.headers);
    expect(String(url)).toBe("https://relay.example.com/events");
    expect(init).toMatchObject({ method: "POST", redirect: "error", cache: "no-store" });
    expect(outgoing.get("X-TAMV-Signature")).toBe(
      `sha256=${digest(`${now / 1000}.${String(init?.body)}`, relaySecret)}`,
    );
    expect(outgoing.get("Idempotency-Key")).toBe(first.eventId);
    expect(JSON.parse(String(init?.body))).toMatchObject({
      schema: "tamv.social.event.v1",
      provider: "github",
      payload: JSON.parse(body),
    });
    const second = await (await post("facebook", deps)).json();
    expect(first.eventId).not.toBe(second.eventId);
  });
  it.each([
    "http://relay.example.com/events",
    "https://127.0.0.1/events",
    "https://relay.internal/events",
    "https://relay.example.com:8443/events",
    "https://relay.example.com/events?token=abc",
    "https://another.example.com/events",
  ])("rejects unapproved relay %s", async (url) => {
    const deps = setup();
    deps.env["TAMV_WEBHOOK_RELAY_URL"] = url;
    expect((await post("github", deps)).status).toBe(503);
    expect(deps.fetcher).not.toHaveBeenCalled();
  });
  it("requires explicit forwarding opt-in", async () => {
    const deps = setup();
    delete deps.env["TAMV_WEBHOOK_FORWARDING_ENABLED"];
    expect((await post("github", deps)).status).toBe(503);
    expect(deps.fetcher).not.toHaveBeenCalled();
  });
  it.each([{ accepted: false }, { accepted: true, eventId: "different" }])(
    "rejects an invalid acknowledgment %j",
    async (ack) => {
      const deps = setup();
      deps.fetcher.mockResolvedValue(Response.json(ack));
      expect((await post("github", deps)).status).toBe(502);
      expect(deps.fetcher).toHaveBeenCalledTimes(1);
    },
  );
  it("does not acknowledge transport failures, relay errors or oversized acknowledgment", async () => {
    const deps = setup();
    deps.fetcher.mockRejectedValueOnce(new Error("offline"));
    expect((await post("github", deps)).status).toBe(502);
    deps.fetcher.mockResolvedValueOnce(new Response("unavailable", { status: 503 }));
    expect((await post("github", deps)).status).toBe(502);
    deps.fetcher.mockResolvedValueOnce(new Response("x".repeat(8193)));
    expect((await post("github", deps)).status).toBe(502);
    expect(deps.fetcher).toHaveBeenCalledTimes(3);
  });
  it("bounds concurrent relays and releases slots after completion", async () => {
    const deps = setup();
    let release!: () => void;
    const pending = new Promise<void>((resolve) => {
      release = resolve;
    });
    deps.fetcher.mockImplementation(async (_url, init) => {
      await pending;
      return Response.json({ accepted: true, eventId: JSON.parse(String(init?.body)).eventId });
    });
    const calls = Array.from({ length: 8 }, () => post("github", deps));
    await vi.waitFor(() => expect(deps.fetcher).toHaveBeenCalledTimes(8));
    const busy = await post("github", deps);
    expect(busy.status).toBe(503);
    expect(busy.headers.get("Retry-After")).toBe("5");
    release();
    expect((await Promise.all(calls)).every((r) => r.status === 200)).toBe(true);
    expect((await post("github", deps)).status).toBe(200);
  });
});
