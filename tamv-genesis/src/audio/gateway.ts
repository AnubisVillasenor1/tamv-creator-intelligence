/**
 * Unified audio gateway — orchestration only, dependency free.
 *
 * The gateway validates a request, enforces consent and rights, asks the
 * certification port for a capability grant, and enqueues work. It never
 * pretends that generation finished: the only submission status is `queued`.
 * Actual synthesis belongs to a worker behind `AudioQueuePort`, and actual DSP
 * belongs to `AudioAnalysisPort`. When a port is absent the gateway fails closed
 * instead of returning fabricated values.
 *
 * The ports are deliberately small so the same contract can run on Node, Bun,
 * a serverless function or a desktop app without importing Redis, Postgres,
 * MinIO or any model SDK.
 */

import {
  AUDIO_SAMPLE_RATES,
  AUDIO_REQUEST_SCHEMA,
  normalizeAudioAnalysis,
  TamvAudioError,
  validateAudioRequest,
  type AudioAnalysis,
  type AudioAnalysisInput,
  type AudioRequest,
  type AudioSampleRate,
} from "./contracts.ts";

export const AUDIO_SUBMISSION_SCHEMA = "tamv.audio.submission.v1";
export const AUDIO_PRODUCTION_CAPABILITY = "audio.production";
export const AUDIO_MASTERING_CAPABILITY = "audio.mastering";

export type AudioJob = {
  schema: typeof AUDIO_REQUEST_SCHEMA;
  jobId: string;
  requestId: string;
  queuedAt: string;
  capability: typeof AUDIO_PRODUCTION_CAPABILITY;
  request: AudioRequest;
};

export type AudioSubmission = {
  schema: typeof AUDIO_SUBMISSION_SCHEMA;
  requestId: string;
  jobId: string;
  status: "queued";
  queuedAt: string;
  capability: typeof AUDIO_PRODUCTION_CAPABILITY;
};

export type AudioAuditEvent = {
  type: "audio.request.queued" | "audio.analysis.computed" | "audio.analysis.not-computed";
  at: string;
  requestId: string;
  jobId?: string;
  detail: Record<string, string | number | boolean | null>;
};

export type AudioGatewayPorts = {
  /** Usually wired to `requireCapability()` from the sovereign seal module. */
  certification: {
    requireCapability(input: { capability: string; consentGranted: boolean }): Promise<void>;
  };
  queue: {
    enqueue(job: AudioJob): Promise<{ jobId: string }>;
  };
  audit: {
    record(event: AudioAuditEvent): Promise<void>;
  };
  clock: {
    now(): string;
  };
  ids: {
    next(prefix: string): string;
  };
  analysis?: {
    analyze(input: {
      requestId: string;
      pcm: Uint8Array;
      sampleRate: AudioSampleRate;
    }): Promise<AudioAnalysisInput | null>;
  };
  idempotency?: {
    get(key: string): Promise<AudioSubmission | null>;
    put(key: string, submission: AudioSubmission): Promise<void>;
  };
};

function nonEmpty(value: unknown, label: string): string {
  if (typeof value !== "string" || value.trim().length === 0 || value.length > 160) {
    throw new TamvAudioError("TAMV_AUDIO_INVALID", `${label} must be a non-empty string.`);
  }
  return value;
}

export class UnifiedAudioGateway {
  readonly #ports: AudioGatewayPorts;

  constructor(ports: AudioGatewayPorts) {
    this.#ports = ports;
  }

  /**
   * Validate, authorize and enqueue. The returned status is always `queued`;
   * a later provider failure cannot be hidden behind a fake success here.
   */
  async submit(
    input: unknown,
    options: { idempotencyKey?: string } = {},
  ): Promise<AudioSubmission> {
    const request = validateAudioRequest(input);
    const idempotencyKey =
      options.idempotencyKey === undefined
        ? undefined
        : nonEmpty(options.idempotencyKey, "idempotencyKey");

    if (idempotencyKey && this.#ports.idempotency) {
      const previous = await this.#ports.idempotency.get(idempotencyKey);
      if (previous) return previous;
    }

    if (request.consent.granted !== true) {
      throw new TamvAudioError(
        "TAMV_AUDIO_CONSENT_REQUIRED",
        "The audio capability requires explicit consent before queueing work.",
      );
    }
    if (!request.rights.attestationId) {
      throw new TamvAudioError("TAMV_AUDIO_RIGHTS_REQUIRED", "A rights attestation id is mandatory.");
    }

    await this.#ports.certification.requireCapability({
      capability: AUDIO_PRODUCTION_CAPABILITY,
      consentGranted: true,
    });

    const requestId = nonEmpty(request.requestId ?? this.#ports.ids.next("req"), "requestId");
    const queuedAt = nonEmpty(this.#ports.clock.now(), "clock.now()");
    const provisionalJobId = nonEmpty(this.#ports.ids.next("job"), "ids.next(job)");
    const job: AudioJob = {
      schema: AUDIO_REQUEST_SCHEMA,
      jobId: provisionalJobId,
      requestId,
      queuedAt,
      capability: AUDIO_PRODUCTION_CAPABILITY,
      request: { ...request, requestId },
    };
    const queued = await this.#ports.queue.enqueue(job);
    const jobId = nonEmpty(queued?.jobId, "queue.jobId");

    const submission: AudioSubmission = {
      schema: AUDIO_SUBMISSION_SCHEMA,
      requestId,
      jobId,
      status: "queued",
      queuedAt,
      capability: AUDIO_PRODUCTION_CAPABILITY,
    };

    await this.#ports.audit.record({
      type: "audio.request.queued",
      at: queuedAt,
      requestId,
      jobId,
      detail: {
        mode: request.mode,
        durationSeconds: request.durationSeconds,
        sampleRate: request.sampleRate,
        format: request.format,
        license: request.rights.license,
        attestationId: request.rights.attestationId,
        consentScope: request.consent.scope,
      },
    });

    if (idempotencyKey && this.#ports.idempotency) {
      await this.#ports.idempotency.put(idempotencyKey, submission);
    }
    return submission;
  }

  /**
   * Ask the DSP provider for an analysis. If no provider is connected this
   * throws; if the provider returns partial data the missing metrics stay null.
   */
  async analyze(
    input: { requestId: string; pcm: Uint8Array; sampleRate: AudioSampleRate },
    options: { consentGranted?: boolean } = {},
  ): Promise<AudioAnalysis> {
    const requestId = nonEmpty(input?.requestId, "requestId");
    if (!(input?.pcm instanceof Uint8Array) || input.pcm.byteLength === 0) {
      throw new TamvAudioError("TAMV_AUDIO_INVALID", "analyze requires a non-empty Uint8Array of PCM data.");
    }
    if (!AUDIO_SAMPLE_RATES.includes(input.sampleRate)) {
      throw new TamvAudioError("TAMV_AUDIO_INVALID", `sampleRate must be one of ${AUDIO_SAMPLE_RATES.join(", ")}.`);
    }
    if (!this.#ports.analysis) {
      throw new TamvAudioError(
        "TAMV_AUDIO_PROVIDER_UNAVAILABLE",
        "No DSP provider is connected; no analysis is fabricated.",
      );
    }

    await this.#ports.certification.requireCapability({
      capability: AUDIO_MASTERING_CAPABILITY,
      consentGranted: options.consentGranted === true,
    });

    const raw = await this.#ports.analysis.analyze({
      requestId,
      pcm: input.pcm,
      sampleRate: input.sampleRate,
    });
    const analysis = normalizeAudioAnalysis(raw);
    await this.#ports.audit.record({
      type: analysis.status === "computed" ? "audio.analysis.computed" : "audio.analysis.not-computed",
      at: nonEmpty(this.#ports.clock.now(), "clock.now()"),
      requestId,
      detail: {
        truePeakDb: analysis.truePeakDb,
        integratedLufs: analysis.integratedLufs,
        chromaBins: analysis.chroma ? analysis.chroma.length : 0,
      },
    });
    return analysis;
  }
}
