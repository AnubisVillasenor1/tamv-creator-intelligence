/**
 * Strict contracts for the TAMV audio gateway.
 *
 * These types are intentionally narrower than the provider APIs they wrap. A
 * request is either valid and complete, or it is rejected before it reaches a
 * queue, a model or a database. Rights attestation and consent are mandatory
 * because the public audio skill is consent-gated.
 *
 * Nothing here invents DSP values. If a provider does not return true peak,
 * integrated loudness or chroma, the report says `null` and `not-computed`.
 */

export const AUDIO_REQUEST_SCHEMA = "tamv.audio.request.v1";
export const AUDIO_ANALYSIS_SCHEMA = "tamv.audio.analysis.v1";

export const AUDIO_MODES = ["instrumental", "lyrics", "background"] as const;
export const AUDIO_FORMATS = ["wav", "flac"] as const;
export const AUDIO_SAMPLE_RATES = [44100, 48000] as const;
export const AUDIO_LICENSES = ["original", "licensed", "public-domain"] as const;

export type AudioMode = (typeof AUDIO_MODES)[number];
export type AudioFormat = (typeof AUDIO_FORMATS)[number];
export type AudioSampleRate = (typeof AUDIO_SAMPLE_RATES)[number];
export type AudioLicense = (typeof AUDIO_LICENSES)[number];

export type AudioRequest = {
  schema: typeof AUDIO_REQUEST_SCHEMA;
  requestId?: string;
  mode: AudioMode;
  prompt: string;
  durationSeconds: number;
  sampleRate: AudioSampleRate;
  format: AudioFormat;
  rights: {
    license: AudioLicense;
    attestationId: string;
    source?: string;
  };
  consent: {
    granted: boolean;
    subject: string;
    scope: string;
  };
  metadata: {
    title: string;
    language?: string;
  };
};

export type AudioAnalysisInput = {
  truePeakDb?: number | null;
  integratedLufs?: number | null;
  chroma?: number[] | null;
  notes?: string[];
};

export type AudioAnalysis = {
  schema: typeof AUDIO_ANALYSIS_SCHEMA;
  status: "computed" | "not-computed";
  truePeakDb: number | null;
  integratedLufs: number | null;
  chroma: number[] | null;
  notes: string[];
};

export type AudioErrorCode =
  | "TAMV_AUDIO_INVALID"
  | "TAMV_AUDIO_CONSENT_REQUIRED"
  | "TAMV_AUDIO_RIGHTS_REQUIRED"
  | "TAMV_AUDIO_CERTIFICATION_DENIED"
  | "TAMV_AUDIO_PROVIDER_UNAVAILABLE"
  | "TAMV_AUDIO_ANALYSIS_INVALID";

export class TamvAudioError extends Error {
  readonly code: AudioErrorCode;

  constructor(code: AudioErrorCode, detail: string) {
    super(`${code}: ${detail}`);
    this.name = "TamvAudioError";
    this.code = code;
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function assertKeys(value: Record<string, unknown>, allowed: readonly string[], label: string): void {
  for (const key of Object.keys(value)) {
    if (!allowed.includes(key)) {
      throw new TamvAudioError("TAMV_AUDIO_INVALID", `${label} contains an unknown field: ${key}.`);
    }
  }
}

function assertString(value: unknown, label: string, min: number, max: number): string {
  if (typeof value !== "string") {
    throw new TamvAudioError("TAMV_AUDIO_INVALID", `${label} must be a string.`);
  }
  const trimmed = value.trim();
  if (trimmed.length < min || trimmed.length > max || trimmed.includes("\0")) {
    throw new TamvAudioError("TAMV_AUDIO_INVALID", `${label} must contain between ${min} and ${max} characters.`);
  }
  return trimmed;
}

function assertInteger(value: unknown, label: string, min: number, max: number): number {
  if (typeof value !== "number" || !Number.isInteger(value) || value < min || value > max) {
    throw new TamvAudioError("TAMV_AUDIO_INVALID", `${label} must be an integer between ${min} and ${max}.`);
  }
  return value;
}

/**
 * Parse and validate an untrusted request. Unknown fields are rejected instead
 * of being forwarded to a provider, so optional data cannot smuggle behaviour.
 */
export function validateAudioRequest(value: unknown): AudioRequest {
  if (!isRecord(value)) {
    throw new TamvAudioError("TAMV_AUDIO_INVALID", "An audio request must be an object.");
  }
  assertKeys(
    value,
    ["schema", "requestId", "mode", "prompt", "durationSeconds", "sampleRate", "format", "rights", "consent", "metadata"],
    "audio request",
  );
  if (value.schema !== AUDIO_REQUEST_SCHEMA) {
    throw new TamvAudioError("TAMV_AUDIO_INVALID", `schema must be ${AUDIO_REQUEST_SCHEMA}.`);
  }
  if (!AUDIO_MODES.includes(value.mode as AudioMode)) {
    throw new TamvAudioError("TAMV_AUDIO_INVALID", `mode must be one of ${AUDIO_MODES.join(", ")}.`);
  }
  if (!AUDIO_FORMATS.includes(value.format as AudioFormat)) {
    throw new TamvAudioError("TAMV_AUDIO_INVALID", `format must be one of ${AUDIO_FORMATS.join(", ")}.`);
  }
  if (!AUDIO_SAMPLE_RATES.includes(value.sampleRate as AudioSampleRate)) {
    throw new TamvAudioError("TAMV_AUDIO_INVALID", `sampleRate must be one of ${AUDIO_SAMPLE_RATES.join(", ")}.`);
  }

  if (!isRecord(value.rights)) {
    throw new TamvAudioError("TAMV_AUDIO_RIGHTS_REQUIRED", "rights is mandatory.");
  }
  assertKeys(value.rights, ["license", "attestationId", "source"], "rights");
  if (!AUDIO_LICENSES.includes(value.rights.license as AudioLicense)) {
    throw new TamvAudioError("TAMV_AUDIO_RIGHTS_REQUIRED", `rights.license must be one of ${AUDIO_LICENSES.join(", ")}.`);
  }
  const rights = {
    license: value.rights.license as AudioLicense,
    attestationId: assertString(value.rights.attestationId, "rights.attestationId", 3, 200),
    ...(value.rights.source === undefined
      ? {}
      : { source: assertString(value.rights.source, "rights.source", 1, 500) }),
  };

  if (!isRecord(value.consent)) {
    throw new TamvAudioError("TAMV_AUDIO_CONSENT_REQUIRED", "consent is mandatory.");
  }
  assertKeys(value.consent, ["granted", "subject", "scope"], "consent");
  if (typeof value.consent.granted !== "boolean") {
    throw new TamvAudioError("TAMV_AUDIO_INVALID", "consent.granted must be a boolean.");
  }
  const consent = {
    granted: value.consent.granted,
    subject: assertString(value.consent.subject, "consent.subject", 1, 200),
    scope: assertString(value.consent.scope, "consent.scope", 1, 200),
  };

  if (!isRecord(value.metadata)) {
    throw new TamvAudioError("TAMV_AUDIO_INVALID", "metadata is mandatory.");
  }
  assertKeys(value.metadata, ["title", "language"], "metadata");
  const metadata = {
    title: assertString(value.metadata.title, "metadata.title", 1, 200),
    ...(value.metadata.language === undefined
      ? {}
      : { language: assertString(value.metadata.language, "metadata.language", 2, 35) }),
  };
  if (metadata.language && !/^[a-z]{2,3}(?:-[A-Za-z0-9]{2,8})*$/.test(metadata.language)) {
    throw new TamvAudioError("TAMV_AUDIO_INVALID", "metadata.language must look like a BCP-47 tag.");
  }

  return {
    schema: AUDIO_REQUEST_SCHEMA,
    ...(value.requestId === undefined
      ? {}
      : { requestId: assertString(value.requestId, "requestId", 3, 120) }),
    mode: value.mode as AudioMode,
    prompt: assertString(value.prompt, "prompt", 1, 4000),
    durationSeconds: assertInteger(value.durationSeconds, "durationSeconds", 5, 600),
    sampleRate: value.sampleRate as AudioSampleRate,
    format: value.format as AudioFormat,
    rights,
    consent,
    metadata,
  };
}

function finiteOrNull(value: unknown, label: string): number | null {
  if (value === undefined || value === null) return null;
  if (typeof value !== "number" || !Number.isFinite(value)) {
    throw new TamvAudioError("TAMV_AUDIO_ANALYSIS_INVALID", `${label} must be a finite number or null.`);
  }
  return value;
}

/**
 * Normalise a provider report without manufacturing missing metrics. A missing
 * true peak or chroma stays null; it is never replaced by an estimate.
 */
export function normalizeAudioAnalysis(input: AudioAnalysisInput | null | undefined): AudioAnalysis {
  if (input === undefined || input === null) {
    return {
      schema: AUDIO_ANALYSIS_SCHEMA,
      status: "not-computed",
      truePeakDb: null,
      integratedLufs: null,
      chroma: null,
      notes: ["provider returned no analysis"],
    };
  }
  if (!isRecord(input)) {
    throw new TamvAudioError("TAMV_AUDIO_ANALYSIS_INVALID", "An analysis report must be an object.");
  }
  assertKeys(input, ["truePeakDb", "integratedLufs", "chroma", "notes"], "analysis");
  const truePeakDb = finiteOrNull(input.truePeakDb, "truePeakDb");
  const integratedLufs = finiteOrNull(input.integratedLufs, "integratedLufs");
  let chroma: number[] | null = null;
  if (input.chroma !== undefined && input.chroma !== null) {
    if (!Array.isArray(input.chroma) || input.chroma.length !== 12) {
      throw new TamvAudioError("TAMV_AUDIO_ANALYSIS_INVALID", "chroma must contain 12 finite values or be null.");
    }
    chroma = input.chroma.map((value, index) => {
      if (typeof value !== "number" || !Number.isFinite(value)) {
        throw new TamvAudioError("TAMV_AUDIO_ANALYSIS_INVALID", `chroma[${index}] must be a finite number.`);
      }
      return value;
    });
  }
  const notes = Array.isArray(input.notes)
    ? input.notes.map((note) => assertString(note, "analysis note", 1, 300))
    : [];
  const computed = truePeakDb !== null || integratedLufs !== null || chroma !== null;
  return {
    schema: AUDIO_ANALYSIS_SCHEMA,
    status: computed ? "computed" : "not-computed",
    truePeakDb,
    integratedLufs,
    chroma,
    notes: computed ? notes : [...notes, "provider returned no numeric analysis"],
  };
}
