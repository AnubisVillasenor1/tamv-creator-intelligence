export interface TurboTask<T> {
  id: string;
  critical?: boolean;
  idempotent?: boolean;
  maxAttempts?: number;
  run: (context: { signal: AbortSignal; attempt: number }) => Promise<T>;
}

export interface TurboResult<T> {
  id: string;
  status: "fulfilled" | "rejected" | "skipped";
  attempts: number;
  durationMs: number;
  value?: T;
  error?: string;
}

export interface TurboOptions {
  maxConcurrency?: number;
  timeoutMs?: number;
  failFast?: boolean;
  retryBaseDelayMs?: number;
}

function abortError(): Error {
  return new Error("Operation aborted");
}

function wait(ms: number, signal: AbortSignal): Promise<void> {
  return new Promise((resolve, reject) => {
    if (signal.aborted) {
      reject(abortError());
      return;
    }
    const timer = setTimeout(() => {
      signal.removeEventListener("abort", onAbort);
      resolve();
    }, ms);
    function onAbort() {
      clearTimeout(timer);
      reject(abortError());
    }
    signal.addEventListener("abort", onAbort, { once: true });
  });
}

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

function retryable(error: unknown): boolean {
  return typeof error === "object" && error !== null &&
    "retryable" in error && (error as { retryable?: unknown }).retryable === true;
}

async function execute<T>(
  task: TurboTask<T>,
  options: Required<TurboOptions>,
  parentSignal: AbortSignal,
): Promise<TurboResult<T>> {
  const startedAt = performance.now();
  const attemptsAllowed = task.idempotent === true
    ? Math.max(1, Math.min(task.maxAttempts ?? 1, 3))
    : 1;
  let attempts = 0;
  let lastError = "Unknown error";

  while (attempts < attemptsAllowed && !parentSignal.aborted) {
    attempts += 1;
    const controller = new AbortController();
    const forwardAbort = () => controller.abort();
    parentSignal.addEventListener("abort", forwardAbort, { once: true });
    let timedOut = false;
    let timeoutId: ReturnType<typeof setTimeout> | undefined;

    try {
      const timeoutPromise = new Promise<never>((_, reject) => {
        timeoutId = setTimeout(() => {
          timedOut = true;
          controller.abort();
          reject(new Error("Task timeout"));
        }, options.timeoutMs);
      });

      const value = await Promise.race([
        task.run({ signal: controller.signal, attempt: attempts }),
        timeoutPromise,
      ]);

      return {
        id: task.id,
        status: "fulfilled",
        attempts,
        durationMs: performance.now() - startedAt,
        value,
      };
    } catch (error) {
      lastError = timedOut ? "Task timeout" : errorMessage(error);
      const mayRetry = task.idempotent === true &&
        attempts < attemptsAllowed &&
        retryable(error) &&
        !parentSignal.aborted;

      if (!mayRetry) break;
      try {
        await wait(Math.min(options.retryBaseDelayMs * (2 ** (attempts - 1)), 4000), parentSignal);
      } catch {
        lastError = "Cancelled during retry backoff";
        break;
      }
    } finally {
      if (timeoutId !== undefined) clearTimeout(timeoutId);
      parentSignal.removeEventListener("abort", forwardAbort);
    }
  }

  return {
    id: task.id,
    status: parentSignal.aborted ? "skipped" : "rejected",
    attempts,
    durationMs: performance.now() - startedAt,
    error: parentSignal.aborted ? "Cancelled by orchestrator" : lastError,
  };
}

/**
 * Bounded async concurrency, not CPU parallelism. Tasks must cooperate with AbortSignal.
 * Retries are permitted only for explicitly idempotent tasks and explicitly retryable errors.
 */
export async function runTurboParallel<T>(
  tasks: TurboTask<T>[],
  input: TurboOptions = {},
): Promise<TurboResult<T>[]> {
  const options: Required<TurboOptions> = {
    maxConcurrency: input.maxConcurrency ?? 8,
    timeoutMs: input.timeoutMs ?? 30000,
    failFast: input.failFast ?? true,
    retryBaseDelayMs: input.retryBaseDelayMs ?? 250,
  };

  if (!Number.isInteger(options.maxConcurrency) || options.maxConcurrency < 1 || options.maxConcurrency > 64) {
    throw new Error("maxConcurrency must be an integer between 1 and 64");
  }
  if (!Number.isFinite(options.timeoutMs) || options.timeoutMs < 1) {
    throw new Error("timeoutMs must be positive");
  }
  if (!Number.isFinite(options.retryBaseDelayMs) || options.retryBaseDelayMs < 0) {
    throw new Error("retryBaseDelayMs must be non-negative");
  }
  const ids = tasks.map((task) => task.id);
  if (ids.some((id) => !id.trim()) || new Set(ids).size !== ids.length) {
    throw new Error("Task IDs must be unique and non-empty");
  }

  const controller = new AbortController();
  const results: Array<TurboResult<T> | undefined> = new Array(tasks.length);
  let cursor = 0;
  let criticalFailure = false;

  async function worker(): Promise<void> {
    while (true) {
      if ((criticalFailure && options.failFast) || controller.signal.aborted) return;
      const index = cursor++;
      if (index >= tasks.length) return;
      const task = tasks[index];
      if (!task) return;
      const result = await execute(task, options, controller.signal);
      results[index] = result;
      if (task.critical && result.status !== "fulfilled" && options.failFast) {
        criticalFailure = true;
        controller.abort();
      }
    }
  }

  await Promise.all(
    Array.from({ length: Math.min(options.maxConcurrency, tasks.length) }, () => worker()),
  );

  return tasks.map((task, index) => results[index] ?? {
    id: task.id,
    status: "skipped" as const,
    attempts: 0,
    durationMs: 0,
    error: "Not scheduled after critical failure",
  });
}