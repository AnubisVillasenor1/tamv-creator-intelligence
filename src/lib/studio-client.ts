import { z } from "zod";
import { supabase } from "@/integrations/supabase/client";
import { readBoundedResponseText } from "./hypercore-turbo/governance-request-guards";

export const AUDIO_REQUEST_SCHEMA = "tamv.audio.request.v1";
export const AGENT_PLAN_SCHEMA = "tamv.agent.plan.v1";
export const STUDIO_MAX_DURATION_SECONDS = 30;
export const STUDIO_MIN_DURATION_SECONDS = 5;

export type StudioAudioForm = {
  mode: "instrumental" | "lyrics" | "background";
  prompt: string;
  durationSeconds: number;
  sampleRate: 44100 | 48000;
  license: "original" | "licensed" | "public-domain";
  attestationId: string;
  title: string;
};

export type AudioRequestPayload = {
  schema: typeof AUDIO_REQUEST_SCHEMA;
  requestId: string;
  mode: StudioAudioForm["mode"];
  prompt: string;
  durationSeconds: number;
  sampleRate: StudioAudioForm["sampleRate"];
  format: "wav";
  rights: { license: StudioAudioForm["license"]; attestationId: string };
  consent: { granted: true; subject: string; scope: string };
  metadata: { title: string };
};

export type AgentPlanPayload = {
  schema: typeof AGENT_PLAN_SCHEMA;
  requestId: string;
  consent: { granted: true; subject: string; scope: string };
  steps: { id: string; tool: "digest.sha256" | "audio.render"; input: Record<string, unknown> }[];
};

export type AudioRenderResult = {
  schema: string;
  job: {
    jobId: string;
    status: string;
    artifact: {
      key: string;
      sha256: string;
      bytes: number;
      contentType: string;
      sampleRate: number;
      durationSeconds: number;
      provider: string;
      createdAt: string;
    } | null;
    analysis: {
      status: string;
      truePeakDb: number | null;
      integratedLufs: number | null;
      chroma: number[] | null;
      notes: string[];
    } | null;
  };
  audio: { contentType: string; encoding: "base64"; data: string };
  disclosure: {
    provider: string;
    kind: string;
    neuralModel: boolean;
    voice: boolean;
    dsp: string;
    actorRef: string;
    quota: { source: string; remainingToday: number };
  };
};

export type AgentOrchestrationResult = {
  schema: string;
  result: {
    schema: string;
    status: "succeeded" | "failed" | "cancelled";
    requestId?: string;
    steps: {
      stepId: string;
      tool: string;
      status: "succeeded" | "failed";
      output?: unknown;
      failure?: { code: string; detail: string };
    }[];
    disclosure: { kind: string; llm: boolean; externalEffects: boolean; tools: string[] };
  };
  disclosure: {
    kind: string;
    llm: boolean;
    externalEffects: boolean;
    tools: string[];
    actorRef: string;
    quota: { source: string; remainingToday: number };
  };
};

export class StudioApiError extends Error {
  readonly status: number;
  readonly code: string | null;
  readonly retryAfterSeconds: number | null;

  constructor(
    status: number,
    code: string | null,
    message: string,
    retryAfterSeconds: number | null,
  ) {
    super(message);
    this.name = "StudioApiError";
    this.status = status;
    this.code = code;
    this.retryAfterSeconds = retryAfterSeconds;
  }
}

export async function getStudioAccessToken(): Promise<string | null> {
  try {
    const { data, error } = await supabase.auth.getSession();
    if (error) return null;
    return data.session?.access_token ?? null;
  } catch {
    return null;
  }
}

function parseRetryAfter(value: string | null): number | null {
  if (value === null) return null;
  const seconds = Number(value);
  return Number.isFinite(seconds) && seconds >= 0 ? Math.ceil(seconds) : null;
}

const quotaSchema = z.object({
  source: z.enum(["redis", "local-development"]),
  remainingToday: z.number().int().nonnegative(),
});
const hashSchema = z.string().regex(/^(?:sha256:)?[a-f0-9]{64}$/);
const audioResultSchema = z.object({
  schema: z.literal("tamv.audiocore.advanced.response.v1"),
  job: z.object({
    jobId: z.string(),
    status: z.literal("succeeded"),
    artifact: z.object({
      key: z.string(),
      sha256: hashSchema,
      bytes: z.number().int().min(44).max(2_880_044),
      contentType: z.literal("audio/wav"),
      sampleRate: z.union([z.literal(44100), z.literal(48000)]),
      durationSeconds: z.number().int().min(5).max(30),
      provider: z.string(),
      createdAt: z.string(),
    }),
    analysis: z
      .object({
        status: z.enum(["computed", "not-computed"]),
        truePeakDb: z.number().finite().nullable(),
        integratedLufs: z.number().finite().nullable(),
        chroma: z.array(z.number().finite()).length(12).nullable(),
        notes: z.array(z.string()),
      })
      .nullable(),
  }),
  audio: z.object({
    contentType: z.literal("audio/wav"),
    encoding: z.literal("base64"),
    data: z
      .string()
      .max(3_840_060)
      .regex(/^[A-Za-z0-9+/]+={0,2}$/),
  }),
  disclosure: z.object({
    provider: z.string(),
    kind: z.string(),
    neuralModel: z.literal(false),
    voice: z.literal(false),
    dsp: z.string(),
    actorRef: z.string(),
    quota: quotaSchema,
  }),
});
const agentDisclosureSchema = z.object({
  kind: z.string(),
  llm: z.literal(false),
  externalEffects: z.literal(false),
  tools: z.array(z.enum(["audio.render", "digest.sha256"])),
});
const agentResultSchema = z.object({
  schema: z.literal("tamv.agent.orchestration.response.v1"),
  result: z.object({
    schema: z.literal("tamv.agent.result.v1"),
    status: z.literal("succeeded"),
    requestId: z.string().optional(),
    steps: z
      .array(
        z.object({
          stepId: z.string(),
          tool: z.enum(["audio.render", "digest.sha256"]),
          status: z.literal("succeeded"),
          output: z.unknown(),
        }),
      )
      .min(1)
      .max(8),
    disclosure: agentDisclosureSchema,
  }),
  disclosure: agentDisclosureSchema.extend({ actorRef: z.string(), quota: quotaSchema }),
});

export async function callStudioEndpoint<T>(
  path: "/api/audiocore/advanced" | "/api/agent",
  body: unknown,
  token: string,
  signal?: AbortSignal,
): Promise<T> {
  let response: Response;
  try {
    response = await fetch(path, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body: JSON.stringify(body),
      cache: "no-store",
      redirect: "error",
      signal: signal
        ? AbortSignal.any([signal, AbortSignal.timeout(90_000)])
        : AbortSignal.timeout(90_000),
    });
  } catch {
    throw new StudioApiError(0, null, "No se pudo contactar al servicio.", null);
  }

  if (!response.ok) {
    let message = `El servicio respondió con estado ${response.status}.`;
    let code: string | null = null;
    try {
      const text = await readBoundedResponseText(response, 8192);
      const parsed: unknown = JSON.parse(text);
      if (parsed && typeof parsed === "object") {
        const record = parsed as Record<string, unknown>;
        if (typeof record["error"] === "string") message = record["error"];
        if (typeof record["code"] === "string") code = record["code"];
      }
    } catch {
      // Non-JSON error body: keep the status-based message.
    }
    throw new StudioApiError(
      response.status,
      code,
      message,
      parseRetryAfter(response.headers.get("Retry-After")),
    );
  }

  try {
    const payload: unknown = JSON.parse(await readBoundedResponseText(response, 4_000_000));
    const parsed =
      path === "/api/audiocore/advanced"
        ? audioResultSchema.parse(payload)
        : agentResultSchema.parse(payload);
    if ("audio" in parsed) {
      const bytes = wavBytesFromBase64(parsed.audio.data);
      if (
        bytes.length !== parsed.job.artifact.bytes ||
        new TextDecoder().decode(bytes.subarray(0, 4)) !== "RIFF" ||
        new TextDecoder().decode(bytes.subarray(8, 12)) !== "WAVE"
      )
        throw new Error("Invalid WAV");
      const digest = await crypto.subtle.digest("SHA-256", bytes);
      const hash = Array.from(new Uint8Array(digest), (byte) =>
        byte.toString(16).padStart(2, "0"),
      ).join("");
      if (hash !== parsed.job.artifact.sha256.replace(/^sha256:/, ""))
        throw new Error("Artifact hash mismatch");
    }
    return parsed as T;
  } catch {
    throw new StudioApiError(
      502,
      "TAMV_STUDIO_INVALID_RESPONSE",
      "La respuesta no cumple el contrato o la integridad del artefacto.",
      null,
    );
  }
}

export function describeStudioFailure(failure: StudioApiError): string {
  const { status, code } = failure;
  if (status === 0)
    return "No se pudo contactar al servicio. Revisa tu conexión; no se reintentará automáticamente.";
  if (status === 401) return "Necesitas una sesión válida para usar el estudio.";
  if (code === "TAMV_AGENT_EFFECT_DENIED")
    return "La certificación fue revocada durante la ejecución; el plan se detuvo sin efectos externos.";
  if (status === 403) {
    if (code === "TAMV_ATTRIBUTION_INTEGRITY_FAILED") {
      return "La distribución TAMV no está certificada para esta capacidad; el servicio permanece bloqueado (fail closed).";
    }
    if (code === "TAMV_AUDIO_CONSENT_REQUIRED" || code === "TAMV_AGENT_CONSENT_REQUIRED") {
      return "El consentimiento explícito es obligatorio para ejecutar esta capacidad.";
    }
    if (code === "TAMV_AUDIO_RIGHTS_REQUIRED") {
      return "Falta una atestación de derechos válida para el audio solicitado.";
    }
    return "Acceso denegado por la política de gobernanza.";
  }
  if (status === 429) {
    return failure.retryAfterSeconds !== null
      ? `Límite de uso alcanzado. Espera ${failure.retryAfterSeconds} segundos; no se reintentará automáticamente.`
      : "Límite de uso alcanzado; no se reintentará automáticamente.";
  }
  if (status === 501)
    return "El proveedor local conectado no ofrece esta capacidad (solo síntesis procedural WAV).";
  if (status === 503) {
    if (code === "TAMV_AUDIOCORE_BUSY" || code === "TAMV_AGENT_BUSY") {
      return "Hay demasiadas ejecuciones concurrentes en esta instancia. Intenta de nuevo en unos segundos.";
    }
    return "El servicio no está configurado o no está disponible en este momento (fail closed).";
  }
  if (status === 502) return `El trabajo falló: ${failure.message}`;
  if (status === 400 || status === 413 || status === 415)
    return `Solicitud rechazada: ${failure.message}`;
  return failure.message;
}

function trimmed(value: string): string {
  return value.trim();
}

export function buildAudioRequest(
  form: StudioAudioForm,
  subject: string,
): { ok: true; request: AudioRequestPayload } | { ok: false; error: string } {
  const prompt = trimmed(form.prompt);
  if (prompt.length < 1 || prompt.length > 4000) {
    return { ok: false, error: "El prompt debe tener entre 1 y 4000 caracteres." };
  }
  const title = trimmed(form.title);
  if (title.length < 1 || title.length > 200) {
    return { ok: false, error: "El título debe tener entre 1 y 200 caracteres." };
  }
  const attestationId = trimmed(form.attestationId);
  if (attestationId.length < 3 || attestationId.length > 200) {
    return {
      ok: false,
      error: "El ID de atestación de derechos debe tener entre 3 y 200 caracteres.",
    };
  }
  if (
    !Number.isInteger(form.durationSeconds) ||
    form.durationSeconds < STUDIO_MIN_DURATION_SECONDS ||
    form.durationSeconds > STUDIO_MAX_DURATION_SECONDS
  ) {
    return {
      ok: false,
      error: `La duración debe ser un entero entre ${STUDIO_MIN_DURATION_SECONDS} y ${STUDIO_MAX_DURATION_SECONDS} segundos.`,
    };
  }
  return {
    ok: true,
    request: {
      schema: AUDIO_REQUEST_SCHEMA,
      requestId: `studio-${crypto.randomUUID()}`,
      mode: form.mode,
      prompt,
      durationSeconds: form.durationSeconds,
      sampleRate: form.sampleRate,
      format: "wav",
      rights: { license: form.license, attestationId },
      consent: { granted: true, subject, scope: "audio.production" },
      metadata: { title },
    },
  };
}

export function buildAgentPlan(options: {
  digestText: string;
  includeAudio: boolean;
  audioForm: StudioAudioForm;
  subject: string;
}): { ok: true; plan: AgentPlanPayload } | { ok: false; error: string } {
  const text = trimmed(options.digestText);
  if (text.length < 1 || text.length > 8000) {
    return { ok: false, error: "El texto del digest debe tener entre 1 y 8000 caracteres." };
  }
  const steps: AgentPlanPayload["steps"] = [
    { id: "digest-1", tool: "digest.sha256", input: { text } },
  ];
  if (options.includeAudio) {
    const audio = buildAudioRequest(options.audioForm, options.subject);
    if (!audio.ok) return audio;
    steps.push({
      id: "audio-1",
      tool: "audio.render",
      input: audio.request as unknown as Record<string, unknown>,
    });
  }
  return {
    ok: true,
    plan: {
      schema: AGENT_PLAN_SCHEMA,
      requestId: `studio-${crypto.randomUUID()}`,
      consent: { granted: true, subject: options.subject, scope: "agent.orchestration" },
      steps,
    },
  };
}

export function wavBytesFromBase64(data: string): Uint8Array<ArrayBuffer> {
  const binary = atob(data);
  const bytes = new Uint8Array(binary.length);
  for (let index = 0; index < binary.length; index += 1) {
    bytes[index] = binary.charCodeAt(index);
  }
  return bytes;
}
