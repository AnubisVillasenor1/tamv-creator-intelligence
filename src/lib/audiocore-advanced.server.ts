/* global Buffer, process */
import {
  createAudioPipeline,
  createLocalDspAnalysis,
  createLocalSynthesisProvider,
  LOCAL_SYNTH_PROVIDER,
  TamvAudioError,
  validateAudioRequest,
  type AudioRequest,
} from "../../tamv-genesis/src/audio/index.ts";
import {
  isBearerTokenWithinLimit,
  isDeclaredContentLengthWithinLimit,
  isJsonContentType,
  isValidSupabaseIdentityPayload,
  readBoundedRequestBody,
  readBoundedResponseText,
} from "./hypercore-turbo/governance-request-guards";
import { requireTamvCertification } from "./tamv-certification";
import {
  acquireCapabilitySlot,
  capabilityQuotaResponse,
  checkCapabilityQuota,
  releaseCapabilitySlot,
  type CapabilityQuotaConfig,
} from "./capability-quota.server";

export const AUDIOCORE_RESPONSE_SCHEMA = "tamv.audiocore.advanced.response.v1";
export const AUDIOCORE_MAX_BODY_BYTES = 16 * 1024;
export const AUDIOCORE_MAX_DURATION_SECONDS = 30;
export const AUDIOCORE_FEATURE = "audiocore.advanced";

export type AudioCoreDeps = {
  certify: (feature: string) => Promise<Response | null>;
  authenticate: (request: Request) => Promise<{ actorRef: string } | Response>;
  quotaConfig?: Partial<CapabilityQuotaConfig>;
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

export async function supabaseAuthenticate(request: Request): Promise<{ actorRef: string } | Response> {
  const authorization = request.headers.get("authorization");
  const token = authorization?.match(/^Bearer\s+(.+)$/i)?.[1];
  const url = process.env["SUPABASE_URL"];
  const publishableKey = process.env["SUPABASE_PUBLISHABLE_KEY"];
  const actorSalt = process.env["TAMV_GOVERNANCE_ACTOR_SALT"];

  if (!url || !publishableKey || !actorSalt || actorSalt.length < 32) {
    return jsonError("Creator authentication is not configured", 503);
  }
  if (!token) return jsonError("Authentication required", 401);
  if (!isBearerTokenWithinLimit(token)) {
    return jsonError("Authentication token exceeds the accepted size", 401);
  }

  let authResponse: Response;
  try {
    authResponse = await fetch(`${url.replace(/\/+$/, "")}/auth/v1/user`, {
      method: "GET",
      headers: { apikey: publishableKey, Authorization: `Bearer ${token}` },
      cache: "no-store",
      signal: AbortSignal.timeout(5_000),
    });
  } catch {
    return jsonError("Identity provider unavailable", 503);
  }
  if (!authResponse.ok) return jsonError("Authentication failed", 401);

  let user: { id?: unknown };
  try {
    user = JSON.parse(await readBoundedResponseText(authResponse, 16 * 1024)) as { id?: unknown };
  } catch {
    return jsonError("Identity provider returned an invalid response", 503);
  }
  if (!isValidSupabaseIdentityPayload(user)) {
    return jsonError("Authenticated identity is invalid", 401);
  }

  const digest = await crypto.subtle.digest(
    "SHA-256",
    new TextEncoder().encode(`${actorSalt}:${user.id}`),
  );
  const actorHash = Array.from(new Uint8Array(digest), (byte) =>
    byte.toString(16).padStart(2, "0"),
  ).join("");
  return { actorRef: `actor-${actorHash.slice(0, 32)}` };
}

const defaultDeps: AudioCoreDeps = {
  certify: requireTamvCertification,
  authenticate: supabaseAuthenticate,
};

function mapAudioError(error: unknown): Response {
  if (error instanceof TamvAudioError) {
    switch (error.code) {
      case "TAMV_AUDIO_INVALID":
        return jsonError(error.message, 400, error.code);
      case "TAMV_AUDIO_CONSENT_REQUIRED":
      case "TAMV_AUDIO_RIGHTS_REQUIRED":
      case "TAMV_AUDIO_CERTIFICATION_DENIED":
        return jsonError(error.message, 403, error.code);
      case "TAMV_AUDIO_PROVIDER_UNAVAILABLE":
        return jsonError(error.message, 501, error.code);
      case "TAMV_AUDIO_ANALYSIS_INVALID":
        return jsonError(error.message, 502, error.code);
    }
  }
  return jsonError("Audio processing failed", 500);
}

export async function handleAudioCoreAdvanced(
  request: Request,
  deps: Partial<AudioCoreDeps> = {},
): Promise<Response> {
  const { certify, authenticate } = { ...defaultDeps, ...deps };
  const denied = await certify(AUDIOCORE_FEATURE);
  if (denied) return denied;

  const contentType = request.headers.get("content-type");
  if (!isJsonContentType(contentType)) {
    return jsonError("Content-Type must be application/json", 415);
  }
  const declaredLength = request.headers.get("content-length");
  if (!isDeclaredContentLengthWithinLimit(declaredLength, AUDIOCORE_MAX_BODY_BYTES)) {
    const declaredAsDecimal = declaredLength !== null && /^(0|[1-9]\d*)$/.test(declaredLength);
    const declaredBytes = declaredAsDecimal ? Number(declaredLength) : Number.NaN;
    const status =
      Number.isSafeInteger(declaredBytes) && declaredBytes > AUDIOCORE_MAX_BODY_BYTES ? 413 : 400;
    return jsonError("Invalid or oversized Content-Length", status);
  }

  const boundedBody = await readBoundedRequestBody(request, AUDIOCORE_MAX_BODY_BYTES);
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

  const quota = await checkCapabilityQuota(AUDIOCORE_FEATURE, identity.actorRef, deps.quotaConfig ?? {});
  if (!quota.allowed) return capabilityQuotaResponse(quota);

  let audioRequest: AudioRequest;
  try {
    audioRequest = validateAudioRequest(raw);
  } catch (error) {
    return mapAudioError(error);
  }

  if (audioRequest.durationSeconds > AUDIOCORE_MAX_DURATION_SECONDS) {
    return jsonError(
      `This endpoint renders up to ${AUDIOCORE_MAX_DURATION_SECONDS} seconds per request.`,
      400,
      "TAMV_AUDIOCORE_DURATION_LIMIT",
    );
  }
  if (audioRequest.format !== "wav") {
    return jsonError(
      "The connected local provider renders WAV only; FLAC is not available.",
      501,
      "TAMV_AUDIO_PROVIDER_UNAVAILABLE",
    );
  }

  if (!acquireCapabilitySlot(AUDIOCORE_FEATURE)) {
    return jsonError("Too many concurrent renders in this instance", 503, "TAMV_AUDIOCORE_BUSY");
  }
  try {
    const pipeline = createAudioPipeline({
      certification: {
        async requireCapability({ consentGranted }) {
          if (!consentGranted) {
            throw new TamvAudioError("TAMV_AUDIO_CONSENT_REQUIRED", "consent is mandatory.");
          }
          const gate = await certify(AUDIOCORE_FEATURE);
          if (gate) {
            throw new TamvAudioError(
              "TAMV_AUDIO_CERTIFICATION_DENIED",
              "the distribution is not certified for this capability.",
            );
          }
        },
      },
      provider: createLocalSynthesisProvider(),
      analysis: createLocalDspAnalysis(),
    });

    const submission = await pipeline.gateway.submit(raw);
    const runs = await pipeline.worker.runUntilIdle(10);
    const run = runs.find((entry) => entry.status !== "idle" && entry.record.jobId === submission.jobId);

    if (!run || run.status === "idle") {
      return jsonError("The audio job did not run in this process", 503);
    }
    if (run.status === "retry-scheduled") {
      return jsonError("The audio job was scheduled for retry; no result is claimed", 503);
    }
    if (run.status === "failed") {
      return jsonError(
        `Audio job failed: ${run.record.failure?.detail ?? "unknown failure"}`,
        502,
        run.record.failure?.code,
      );
    }

    const record = run.record;
    const artifact = record.artifact;
    if (!artifact) return jsonError("Audio job succeeded without an artifact", 502);
    const bytes = await pipeline.storage.get(artifact.key);
    if (!bytes) return jsonError("Stored artifact is unavailable", 502);

    return Response.json(
      {
        schema: AUDIOCORE_RESPONSE_SCHEMA,
        submission,
        job: {
          jobId: record.jobId,
          requestId: record.requestId,
          status: record.status,
          attempts: record.attempts,
          artifact,
          analysis: record.analysis,
        },
        audio: {
          contentType: artifact.contentType,
          encoding: "base64",
          data: Buffer.from(bytes).toString("base64"),
        },
        disclosure: {
          provider: LOCAL_SYNTH_PROVIDER,
          kind: "sintesis procedural determinista local",
          neuralModel: false,
          voice: false,
          dsp: "ITU-R BS.1770-4 (ponderacion K), pico de muestra PCM16, chroma FFT 8192",
          actorRef: identity.actorRef,
          quota: { source: quota.source, remainingToday: quota.remainingToday },
        },
        limits: {
          maxDurationSeconds: AUDIOCORE_MAX_DURATION_SECONDS,
          formats: ["wav"],
          maxBodyBytes: AUDIOCORE_MAX_BODY_BYTES,
        },
      },
      { status: 200, headers: noStoreHeaders() },
    );
  } catch (error) {
    return mapAudioError(error);
  } finally {
    releaseCapabilitySlot(AUDIOCORE_FEATURE);
  }
}