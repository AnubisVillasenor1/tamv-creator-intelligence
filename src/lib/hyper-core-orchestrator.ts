/**
 * TAMV Hyper-Core Ω: governed, hexagonal orchestration primitives.
 * Provider and persistence adapters are injected by the server; no cloud SDK is embedded.
 */
export type HyperCoreId = "governance" | "execution" | "verification";
export type PipelineLane = "hot" | "cold";
export type RunPhase = "accepted" | "executing" | "completed" | "failed";

export interface HyperCoreRequest<TInput> {
  readonly traceId: string;
  readonly idempotencyKey: string;
  readonly inputHash: string;
  readonly input: TInput;
  readonly idempotent: boolean;
}
export interface HyperCoreContext {
  readonly traceId: string;
  readonly idempotencyKey: string;
  readonly inputHash: string;
  readonly lane: PipelineLane;
}
export interface GovernancePort<TInput> {
  authorize(request: HyperCoreRequest<TInput>): Promise<{ allowed: boolean; reason?: string }>;
}
export interface ExecutionPort<TInput, TOutput> {
  readonly name: string;
  execute(input: TInput, context: HyperCoreContext): Promise<TOutput>;
}
export interface VerificationPort<TOutput> {
  verify(output: TOutput, context: HyperCoreContext): Promise<{ valid: boolean; reason?: string }>;
}
export interface AuditEvent {
  readonly eventId: string;
  readonly traceId: string;
  readonly timestamp: string;
  readonly core: HyperCoreId;
  readonly event: string;
  readonly phase: RunPhase;
  readonly lane?: PipelineLane;
  readonly inputHash: string;
  readonly details?: Readonly<Record<string, string | number | boolean | null>>;
}
export interface AuditPort {
  /** Must durably append; production adapters must not silently drop events. */
  append(event: AuditEvent): Promise<void>;
}
export interface StandbyCheckpoint {
  readonly traceId: string;
  readonly idempotencyKey: string;
  readonly inputHash: string;
  readonly phase: RunPhase;
  readonly lane?: PipelineLane;
  readonly updatedAt: string;
  readonly outputHash?: string;
}
export interface StandbyPort {
  /** Persist recovery metadata without raw user content or secrets. */
  checkpoint(snapshot: StandbyCheckpoint): Promise<void>;
}
export interface HyperCorePorts<TInput, TOutput> {
  readonly governance: GovernancePort<TInput>;
  readonly hot: ExecutionPort<TInput, TOutput>;
  readonly cold?: ExecutionPort<TInput, TOutput>;
  readonly verification: VerificationPort<TOutput>;
  readonly audit: AuditPort;
  readonly standby: StandbyPort;
}
export interface HyperCoreResult<TOutput> {
  readonly traceId: string;
  readonly output: TOutput;
  readonly lane: PipelineLane;
  readonly verified: true;
  readonly elapsedMs: number;
}
export class HyperCoreError extends Error {
  constructor(
    message: string,
    readonly code: "POLICY_DENIED" | "AUDIT_UNAVAILABLE" | "STANDBY_UNAVAILABLE" | "EXECUTION_FAILED" | "VERIFICATION_FAILED" | "INVALID_REQUEST",
    options?: ErrorOptions,
  ) {
    super(message, options);
    this.name = "HyperCoreError";
  }
}
export interface HyperCoreOptions {
  readonly now?: () => number;
  readonly id?: () => string;
  readonly timestamp?: () => string;
}
const defaultId = (): string => globalThis.crypto.randomUUID();
const defaultTimestamp = (): string => new Date().toISOString();

function assertRequest<TInput>(request: HyperCoreRequest<TInput>): void {
  if (!request.traceId.trim() || !request.idempotencyKey.trim() ||
      !/^([a-f0-9]{64}|sha256:[a-f0-9]{64})$/i.test(request.inputHash)) {
    throw new HyperCoreError("La solicitud carece de identificadores o hash válidos.", "INVALID_REQUEST");
  }
}

/**
 * Three logical cores: governance authorizes, execution selects hot/cold, verification
 * validates output. Audit and standby are mandatory. Cold failover is idempotency-gated.
 */
export function createHyperCoreOrchestrator<TInput, TOutput>(
  ports: HyperCorePorts<TInput, TOutput>,
  options: HyperCoreOptions = {},
) {
  const now = options.now ?? (() => performance.now());
  const makeId = options.id ?? defaultId;
  const timestamp = options.timestamp ?? defaultTimestamp;

  async function record(
    request: HyperCoreRequest<TInput>, core: HyperCoreId, event: string, phase: RunPhase,
    lane?: PipelineLane, details?: AuditEvent["details"],
  ): Promise<void> {
    try {
      await ports.audit.append({
        eventId: makeId(), traceId: request.traceId, timestamp: timestamp(), core, event, phase,
        ...(lane ? { lane } : {}), inputHash: request.inputHash, ...(details ? { details } : {}),
      });
    } catch (error) {
      throw new HyperCoreError("El registro de auditoría no está disponible; operación detenida.", "AUDIT_UNAVAILABLE", { cause: error });
    }
  }

  async function checkpoint(
    request: HyperCoreRequest<TInput>, phase: RunPhase, lane?: PipelineLane,
  ): Promise<void> {
    try {
      await ports.standby.checkpoint({
        traceId: request.traceId, idempotencyKey: request.idempotencyKey,
        inputHash: request.inputHash, phase, ...(lane ? { lane } : {}), updatedAt: timestamp(),
      });
    } catch (error) {
      throw new HyperCoreError("El respaldo standby no confirmó el checkpoint; operación detenida.", "STANDBY_UNAVAILABLE", { cause: error });
    }
  }

  async function run(request: HyperCoreRequest<TInput>): Promise<HyperCoreResult<TOutput>> {
    assertRequest(request);
    const startedAt = now();
    const authorization = await ports.governance.authorize(request);
    if (!authorization.allowed) {
      await record(request, "governance", "operation.denied", "failed", undefined, {
        reason: authorization.reason ?? "policy-denied",
      });
      throw new HyperCoreError("La política de gobernanza denegó la operación.", "POLICY_DENIED");
    }
    await record(request, "governance", "operation.authorized", "accepted");
    await checkpoint(request, "accepted");

    let lane: PipelineLane = "hot";
    let output: TOutput;
    try {
      await record(request, "execution", "pipeline.started", "executing", lane, { adapter: ports.hot.name });
      await checkpoint(request, "executing", lane);
      try {
        output = await ports.hot.execute(request.input, {
          traceId: request.traceId, idempotencyKey: request.idempotencyKey,
          inputHash: request.inputHash, lane,
        });
      } catch (hotError) {
        const retryable = hotError instanceof Error && "retryable" in hotError && hotError.retryable === true;
        if (!request.idempotent || !ports.cold || !retryable) throw hotError;
        lane = "cold";
        await record(request, "execution", "pipeline.failover", "executing", lane, {
          from: ports.hot.name, to: ports.cold.name, reason: "retryable-hot-failure",
        });
        await checkpoint(request, "executing", lane);
        output = await ports.cold.execute(request.input, {
          traceId: request.traceId, idempotencyKey: request.idempotencyKey,
          inputHash: request.inputHash, lane,
        });
      }
    } catch (error) {
      await record(request, "execution", "pipeline.failed", "failed", lane, {
        error: error instanceof Error ? error.name : "UnknownError",
      });
      await checkpoint(request, "failed", lane);
      throw new HyperCoreError("La ejecución falló en los pipelines disponibles.", "EXECUTION_FAILED", { cause: error });
    }

    const verification = await ports.verification.verify(output, {
      traceId: request.traceId, idempotencyKey: request.idempotencyKey,
      inputHash: request.inputHash, lane,
    });
    if (!verification.valid) {
      await record(request, "verification", "output.rejected", "failed", lane, {
        reason: verification.reason ?? "verification-failed",
      });
      await checkpoint(request, "failed", lane);
      throw new HyperCoreError("El núcleo de verificación rechazó el resultado.", "VERIFICATION_FAILED");
    }
    await record(request, "verification", "output.verified", "completed", lane);
    await checkpoint(request, "completed", lane);
    return { traceId: request.traceId, output, lane, verified: true, elapsedMs: Math.max(0, now() - startedAt) };
  }
  return { run };
}
