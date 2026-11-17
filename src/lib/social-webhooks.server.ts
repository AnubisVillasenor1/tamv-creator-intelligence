import { createHash, createHmac, timingSafeEqual } from "node:crypto";
import process from "node:process";
import { isIP } from "node:net";
import { z } from "zod";
import {
  findSocialIntegration,
  type SocialIntegration,
  type SocialProvider,
} from "./social-integrations";
import {
  isDeclaredContentLengthWithinLimit,
  isJsonContentType,
  readBoundedRequestBody,
  readBoundedResponseText,
} from "./hypercore-turbo/governance-request-guards";

const headers = { "Cache-Control": "no-store", "X-Content-Type-Options": "nosniff" };
const MAX_BODY = 256 * 1024;
const MAX_INFLIGHT = 8;
let inFlight = 0;
type Environment = Record<string, string | undefined>;
export type WebhookEnvelope = {
  schema: "tamv.social.event.v1";
  provider: SocialProvider;
  eventId: string;
  receivedAt: string;
  payload: Record<string, unknown>;
};
export type WebhookDeps = { env?: Environment; now?: () => number; fetcher?: typeof fetch };
const reply = (status: number, code: string) => Response.json({ code }, { status, headers });
const hmac = (secret: string, value: string, encoding: "hex" | "base64" = "hex") =>
  createHmac("sha256", secret).update(value).digest(encoding);
function equal(actual: string | null, expected: string): boolean {
  if (!actual || actual.length > 1024) return false;
  const a = Buffer.from(actual),
    b = Buffer.from(expected);
  return a.length === b.length && timingSafeEqual(a, b);
}
function configuredSecret(value: string | undefined): value is string {
  return (
    typeof value === "string" && value.length >= 16 && value.length <= 4096 && !/\s/.test(value)
  );
}
function verifies(
  provider: SocialIntegration,
  request: Request,
  body: string,
  secret: string,
  now: number,
): boolean {
  if (provider.protocol === "telegram")
    return equal(request.headers.get("X-Telegram-Bot-Api-Secret-Token"), secret);
  if (provider.protocol === "meta" || provider.protocol === "github")
    return equal(request.headers.get("X-Hub-Signature-256"), `sha256=${hmac(secret, body)}`);
  if (provider.protocol === "linkedin")
    return equal(request.headers.get("X-LI-Signature"), hmac(secret, `hmacsha256=${body}`));
  if (provider.protocol === "twitter")
    return equal(
      request.headers.get("X-Twitter-Webhooks-Signature-OAuth2"),
      `sha256=${hmac(secret, body, "base64")}`,
    );
  if (provider.protocol === "tiktok") {
    const signature = request.headers.get("TikTok-Signature") ?? "";
    if (signature.length > 1024) return false;
    const match = /^t=(\d{1,12}),\s*s=([a-f0-9]{64})$/.exec(signature);
    return (
      !!match &&
      Math.abs(now / 1000 - Number(match[1])) <= 300 &&
      equal(match[2]!, hmac(secret, `${match[1]}.${body}`))
    );
  }
  return false;
}
function challenge(
  provider: SocialIntegration,
  request: Request,
  env: Environment,
  secret: string,
): Response {
  const params = new URL(request.url).searchParams;
  if (provider.protocol === "meta") {
    const token = "verifyEnv" in provider ? env[provider.verifyEnv] : undefined;
    if (!configuredSecret(token)) return reply(503, "TAMV_WEBHOOK_CONFIG_REQUIRED");
    const value = params.get("hub.challenge");
    if (params.get("hub.mode") !== "subscribe" || !equal(params.get("hub.verify_token"), token))
      return reply(401, "TAMV_WEBHOOK_UNAUTHORIZED");
    if (!value || value.length > 512) return reply(400, "TAMV_WEBHOOK_CHALLENGE_INVALID");
    return new Response(value, {
      headers: { ...headers, "Content-Type": "text/plain; charset=utf-8" },
    });
  }
  if (provider.protocol === "linkedin") {
    const value = params.get("challengeCode");
    if (!value || !/^[a-f0-9-]{36}$/i.test(value) || params.has("applicationId"))
      return reply(400, "TAMV_WEBHOOK_CHALLENGE_INVALID");
    return Response.json(
      { challengeCode: value, challengeResponse: hmac(secret, value) },
      { headers },
    );
  }
  if (provider.protocol === "twitter") {
    const value = params.get("crc_token");
    if (!value || value.length > 512) return reply(400, "TAMV_WEBHOOK_CHALLENGE_INVALID");
    return Response.json(
      { response_token: `sha256=${hmac(secret, value, "base64")}` },
      { headers },
    );
  }
  return reply(405, "TAMV_WEBHOOK_METHOD_NOT_ALLOWED");
}
function relayConfig(env: Environment): { url: URL; secret: string } | null {
  if (
    env["TAMV_WEBHOOK_FORWARDING_ENABLED"] !== "true" ||
    !configuredSecret(env["TAMV_WEBHOOK_RELAY_SECRET"])
  )
    return null;
  try {
    const url = new URL(env["TAMV_WEBHOOK_RELAY_URL"] ?? "");
    if (
      url.protocol !== "https:" ||
      url.username ||
      url.password ||
      url.hash ||
      url.search ||
      url.port ||
      url.origin !== env["TAMV_WEBHOOK_RELAY_ALLOWED_ORIGIN"]
    )
      return null;
    const host = url.hostname.toLowerCase();
    if (
      isIP(host) ||
      host.includes(":") ||
      !host.includes(".") ||
      /(^|\.)(localhost|local|internal|invalid|test)$/.test(host)
    )
      return null;
    return { url, secret: env["TAMV_WEBHOOK_RELAY_SECRET"]! };
  } catch {
    return null;
  }
}
export async function handleSocialWebhook(
  request: Request,
  providerId: string,
  deps: WebhookDeps = {},
): Promise<Response> {
  const provider = findSocialIntegration(providerId);
  if (!provider) return reply(404, "TAMV_WEBHOOK_PROVIDER_UNKNOWN");
  if (provider.protocol === "unverified" || !provider.secretEnv)
    return reply(501, "TAMV_WEBHOOK_PROVIDER_UNVERIFIED");
  const env = deps.env ?? process.env;
  const secret = env[provider.secretEnv];
  if (!configuredSecret(secret)) return reply(503, "TAMV_WEBHOOK_CONFIG_REQUIRED");
  if (request.method === "GET") return challenge(provider, request, env, secret);
  if (request.method !== "POST") return reply(405, "TAMV_WEBHOOK_METHOD_NOT_ALLOWED");
  if (!isJsonContentType(request.headers.get("Content-Type")))
    return reply(415, "TAMV_WEBHOOK_JSON_REQUIRED");
  if (!isDeclaredContentLengthWithinLimit(request.headers.get("Content-Length"), MAX_BODY))
    return reply(413, "TAMV_WEBHOOK_TOO_LARGE");
  if (inFlight >= MAX_INFLIGHT)
    return Response.json(
      { code: "TAMV_WEBHOOK_BUSY" },
      { status: 503, headers: { ...headers, "Retry-After": "5" } },
    );
  inFlight++;
  try {
    const body = await readBoundedRequestBody(request, MAX_BODY);
    if (!body.ok)
      return reply(body.reason === "too-large" ? 413 : 400, "TAMV_WEBHOOK_BODY_INVALID");
    const now = (deps.now ?? Date.now)();
    if (!verifies(provider, request, body.text, secret, now))
      return reply(401, "TAMV_WEBHOOK_UNAUTHORIZED");
    let payload: Record<string, unknown>;
    try {
      payload = z.record(z.unknown()).parse(JSON.parse(body.text));
    } catch {
      return reply(400, "TAMV_WEBHOOK_PAYLOAD_INVALID");
    }
    const relay = relayConfig(env);
    if (!relay) return reply(503, "TAMV_WEBHOOK_RELAY_REQUIRED");
    // Hash the signed body, not unsigned delivery headers, to keep retry identity stable.
    const eventId = createHash("sha256").update(`${provider.id}\n${body.text}`).digest("hex");
    const envelope: WebhookEnvelope = {
      schema: "tamv.social.event.v1",
      provider: provider.id,
      eventId,
      receivedAt: new Date(now).toISOString(),
      payload,
    };
    const serialized = JSON.stringify(envelope);
    const timestamp = String(Math.floor(now / 1000));
    try {
      const response = await (deps.fetcher ?? fetch)(relay.url, {
        method: "POST",
        redirect: "error",
        cache: "no-store",
        signal: AbortSignal.any([request.signal, AbortSignal.timeout(5000)]),
        headers: {
          "Content-Type": "application/json",
          "X-TAMV-Timestamp": timestamp,
          "X-TAMV-Signature": `sha256=${hmac(relay.secret, `${timestamp}.${serialized}`)}`,
          "Idempotency-Key": eventId,
        },
        body: serialized,
      });
      if (!response.ok) {
        await response.body?.cancel();
        return reply(502, "TAMV_WEBHOOK_RELAY_REJECTED");
      }
      const ack = z
        .object({ accepted: z.literal(true), eventId: z.literal(eventId) })
        .safeParse(JSON.parse(await readBoundedResponseText(response, 8192)));
      if (!ack.success) return reply(502, "TAMV_WEBHOOK_RELAY_ACK_INVALID");
      return Response.json(
        { accepted: true, eventId, publicationStarted: false, delivery: "relay-acknowledged" },
        { headers },
      );
    } catch {
      return reply(502, "TAMV_WEBHOOK_RELAY_UNAVAILABLE");
    }
  } finally {
    inFlight--;
  }
}
