import {
  authorizeGovernedCapability,
  type GovernedCapability,
} from "./policy";
import { runTurboParallel, type TurboResult } from "./parallel-runner";

export type GovernedTask<T> = {
  id: string;
  dependsOn?: readonly string[];
  priority?: number;
  critical?: boolean;
  idempotent?: boolean;
  maxAttempts?: number;
  run: (context: { signal: AbortSignal; attempt: number }) => Promise<T>;
};

export interface GovernedAuditEvent {
  type: "policy.denied" | "execution.intent" | "execution.settled";
  runId: string;
  actorId: string;
  capability: string;
  taskId?: string;
  status?: TurboResult<unknown>["status"];
  attempts?: number;
  durationMs?: number;
}

export interface GovernedSchedulerInput<T> {
  actorId: string;
  capability: GovernedCapability;
  consentGranted: boolean;
  certificationValid: boolean;
  tasks: readonly GovernedTask<T>[];
  audit: (event: GovernedAuditEvent) => Promise<void>;
  runId?: string;
  signal?: AbortSignal;
  initialConcurrency?: number;
  minConcurrency?: number;
  maxConcurrency?: number;
  targetLatencyMs?: number;
  historySize?: number;
  maxTasks?: number;
}

export interface GovernedSchedulerMetrics {
  waves: number;
  maxObservedConcurrency: number;
  finalConcurrency: number;
  historySamples: number;
  averageLatencyMs: number;
  failureRate: number;
}

export interface GovernedSchedulerResult<T> {
  status: "completed" | "partial" | "denied" | "audit-incomplete" | "cancelled";
  runId: string;
  decision: ReturnType<typeof authorizeGovernedCapability>;
  results: TurboResult<T>[];
  metrics: GovernedSchedulerMetrics;
  auditErrors: number;
}

interface Sample { durationMs: number; failed: boolean }

class LatencyRing {
  private readonly values: Array<Sample | undefined>;
  private cursor = 0;
  private count = 0;
  constructor(private readonly capacity: number) { this.values = new Array(capacity); }
  push(sample: Sample): void {
    this.values[this.cursor] = sample;
    this.cursor = (this.cursor + 1) % this.capacity;
    this.count = Math.min(this.count + 1, this.capacity);
  }
  summary(): { historySamples: number; averageLatencyMs: number; failureRate: number } {
    let latencyTotal = 0;
    let failures = 0;
    for (let index = 0; index < this.count; index += 1) {
      const sample = this.values[index];
      if (!sample) continue;
      latencyTotal += sample.durationMs;
      if (sample.failed) failures += 1;
    }
    return {
      historySamples: this.count,
      averageLatencyMs: this.count ? latencyTotal / this.count : 0,
      failureRate: this.count ? failures / this.count : 0,
    };
  }
}

function nonEmpty(value: string): boolean { return value.trim().length > 0; }

function validateTasks<T>(tasks: readonly GovernedTask<T>[], maxTasks: number): void {
  if (!Number.isInteger(maxTasks) || maxTasks < 1 || maxTasks > 5_000) throw new Error("maxTasks must be an integer between 1 and 5000");
  if (tasks.length > maxTasks) throw new Error("task limit exceeded");
  const ids = new Set<string>();
  for (const task of tasks) {
    if (!nonEmpty(task.id) || ids.has(task.id)) throw new Error("task IDs must be unique and non-empty");
    ids.add(task.id);
    if (task.priority !== undefined && (!Number.isInteger(task.priority) || task.priority < -100 || task.priority > 100)) throw new Error("task priority must be an integer between -100 and 100");
  }
  for (const task of tasks) {
    const dependencies = task.dependsOn ?? [];
    if (new Set(dependencies).size !== dependencies.length) throw new Error(`duplicate dependency for task ${task.id}`);
    for (const dependency of dependencies) {
      if (!ids.has(dependency)) throw new Error(`unknown dependency ${dependency} for task ${task.id}`);
      if (dependency === task.id) throw new Error(`task ${task.id} cannot depend on itself`);
    }
  }
  const completed = new Set<string>();
  while (completed.size < tasks.length) {
    const ready = tasks.filter((task) => !completed.has(task.id) && (task.dependsOn ?? []).every((dependency) => completed.has(dependency)));
    if (!ready.length) throw new Error("task dependency graph contains a cycle");
    for (const task of ready) completed.add(task.id);
  }
}

function createRunId(): string { return globalThis.crypto?.randomUUID?.() ?? `tamv-${Date.now()}-${Math.random().toString(16).slice(2)}`; }

export async function runGovernedTurbo<T>(input: GovernedSchedulerInput<T>): Promise<GovernedSchedulerResult<T>> {
  const runId = input.runId ?? createRunId();
  const minConcurrency = input.minConcurrency ?? 1;
  const maxConcurrency = input.maxConcurrency ?? 16;
  const initialConcurrency = input.initialConcurrency ?? Math.min(4, maxConcurrency);
  const targetLatencyMs = input.targetLatencyMs ?? 2_000;
  const historySize = input.historySize ?? 32;
  const maxTasks = input.maxTasks ?? 500;
  if (!Number.isInteger(minConcurrency) || minConcurrency < 1 || minConcurrency > 64) throw new Error("minConcurrency must be an integer between 1 and 64");
  if (!Number.isInteger(maxConcurrency) || maxConcurrency < minConcurrency || maxConcurrency > 64) throw new Error("maxConcurrency must be an integer between minConcurrency and 64");
  if (!Number.isInteger(initialConcurrency) || initialConcurrency < minConcurrency || initialConcurrency > maxConcurrency) throw new Error("initialConcurrency must be between minConcurrency and maxConcurrency");
  if (!Number.isFinite(targetLatencyMs) || targetLatencyMs <= 0) throw new Error("targetLatencyMs must be positive");
  if (!Number.isInteger(historySize) || historySize < 1 || historySize > 1_000) throw new Error("historySize must be an integer between 1 and 1000");
  if (!nonEmpty(input.actorId) || !nonEmpty(runId)) throw new Error("actorId and runId are required");
  validateTasks(input.tasks, maxTasks);

  const decision = authorizeGovernedCapability({ capability: input.capability, consentGranted: input.consentGranted, certificationValid: input.certificationValid });
  const metrics: GovernedSchedulerMetrics = { waves: 0, maxObservedConcurrency: 0, finalConcurrency: initialConcurrency, historySamples: 0, averageLatencyMs: 0, failureRate: 0 };
  const results: TurboResult<T>[] = [];
  let auditErrors = 0;

  if (!decision.allowed) {
    try { await input.audit({ type: "policy.denied", runId, actorId: input.actorId, capability: input.capability }); } catch { auditErrors += 1; }
    return { status: "denied", runId, decision, results, metrics, auditErrors };
  }

  const pending = new Map(input.tasks.map((task, index) => [task.id, { task, index }] as const));
  const settled = new Map<string, TurboResult<T>>();
  const history = new LatencyRing(historySize);
  let concurrency = initialConcurrency;
  let waves = 0;
  let maxObservedConcurrency = 0;

  while (pending.size > 0) {
    if (input.signal?.aborted) break;
    for (const [id, entry] of pending) {
      if ((entry.task.dependsOn ?? []).some((dependency) => settled.has(dependency) && settled.get(dependency)?.status !== "fulfilled")) {
        const skipped: TurboResult<T> = { id, status: "skipped", attempts: 0, durationMs: 0, error: "Dependency did not complete successfully" };
        settled.set(id, skipped); results.push(skipped); pending.delete(id);
      }
    }
    const ready = [...pending.values()].filter(({ task }) => (task.dependsOn ?? []).every((dependency) => settled.get(dependency)?.status === "fulfilled")).sort((left, right) => (right.task.priority ?? 0) - (left.task.priority ?? 0) || left.index - right.index).slice(0, concurrency);
    if (!ready.length) break;

    try {
      for (const { task } of ready) await input.audit({ type: "execution.intent", runId, actorId: input.actorId, capability: input.capability, taskId: task.id });
    } catch {
      auditErrors += 1;
      return { status: "audit-incomplete", runId, decision, results, metrics: { ...metrics, waves, maxObservedConcurrency, finalConcurrency: concurrency, ...history.summary() }, auditErrors };
    }

    waves += 1;
    maxObservedConcurrency = Math.max(maxObservedConcurrency, ready.length);
    const batchResults = await runTurboParallel(ready.map(({ task }) => ({
      id: task.id,
      ...(task.critical === undefined ? {} : { critical: task.critical }),
      ...(task.idempotent === undefined ? {} : { idempotent: task.idempotent }),
      ...(task.maxAttempts === undefined ? {} : { maxAttempts: task.maxAttempts }),
      run: task.run,
    })), { maxConcurrency: concurrency, failFast: true, ...(input.signal ? { signal: input.signal } : {}) });

    for (const result of batchResults) {
      const entry = pending.get(result.id);
      if (!entry) continue;
      settled.set(result.id, result); results.push(result); pending.delete(result.id);
      history.push({ durationMs: result.durationMs, failed: result.status !== "fulfilled" });
      try {
        await input.audit({ type: "execution.settled", runId, actorId: input.actorId, capability: input.capability, taskId: result.id, status: result.status, attempts: result.attempts, durationMs: Math.max(0, Math.round(result.durationMs)) });
      } catch { auditErrors += 1; }
    }

    const summary = history.summary();
    if (summary.failureRate > 0 || summary.averageLatencyMs > targetLatencyMs) concurrency = Math.max(minConcurrency, Math.floor(concurrency / 2));
    else concurrency = Math.min(maxConcurrency, concurrency + 1);

    if (batchResults.some((result) => ready.find((entry) => entry.task.id === result.id)?.task.critical === true && result.status !== "fulfilled")) {
      for (const [id] of pending) {
        const skipped: TurboResult<T> = { id, status: "skipped", attempts: 0, durationMs: 0, error: "Not scheduled after critical failure" };
        settled.set(id, skipped); results.push(skipped); pending.delete(id);
      }
      break;
    }
  }

  if (input.signal?.aborted) {
    for (const [id] of pending) {
      const skipped: TurboResult<T> = { id, status: "skipped", attempts: 0, durationMs: 0, error: "Cancelled by caller" };
      settled.set(id, skipped); results.push(skipped); pending.delete(id);
    }
  }

  const summary = history.summary();
  const finalMetrics: GovernedSchedulerMetrics = { waves, maxObservedConcurrency, finalConcurrency: concurrency, ...summary };
  const allSucceeded = results.length === input.tasks.length && results.every((result) => result.status === "fulfilled");
  const status = input.signal?.aborted ? "cancelled" : auditErrors > 0 ? "audit-incomplete" : allSucceeded ? "completed" : "partial";
  return { status, runId, decision, results, metrics: finalMetrics, auditErrors };
}
