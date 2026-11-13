export type TurboTaskStatus = "fulfilled" | "rejected" | "skipped";

export interface TurboTask<T> {
  readonly id: string;
  readonly critical?: boolean;
  readonly run: (context: { signal: AbortSignal }) => Promise<T>;
}

export interface TurboTaskResult<T> {
  readonly id: string;
  readonly status: TurboTaskStatus;
  readonly durationMs: number;
  readonly value?: T;
  readonly error?: string;
}

export interface TurboRunOptions {
  readonly maxConcurrency?: number;
  readonly timeoutMs?: number;
  readonly failFastOnCritical?: boolean;
}

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : "Unknown task error";
}

/**
 * Bounded async concurrency for I/O-bound tasks.
 * Tasks should honor AbortSignal. A timeout requests cancellation but cannot
 * forcibly stop an adapter that ignores the signal.
 */
export async function runTurboParallel<T>(
  tasks: readonly TurboTask<T>[],
  options: TurboRunOptions = {},
): Promise<TurboTaskResult<T>[]> {
  const maxConcurrency = options.maxConcurrency ?? 4;
  const timeoutMs = options.timeoutMs ?? 10_000;
  const failFastOnCritical = options.failFastOnCritical ?? true;

  if (!Number.isInteger(maxConcurrency) || maxConcurrency < 1 || maxConcurrency > 32) {
    throw new RangeError("maxConcurrency must be an integer from 1 to 32");
  }
  if (!Number.isFinite(timeoutMs) || timeoutMs < 1) {
    throw new RangeError("timeoutMs must be a positive finite number");
  }

  const ids = tasks.map((task) => task.id);
  if (ids.some((id) => !id.trim()) || new Set(ids).size !== ids.length) {
    throw new Error("Every task must have a unique, non-empty id");
  }

  const results: Array<TurboTaskResult<T> | undefined> = new Array(tasks.length);
  const controller = new AbortController();
  let nextIndex = 0;
  let stopScheduling = false;

  async function worker(): Promise<void> {
    while (!stopScheduling && nextIndex < tasks.length) {
      const index = nextIndex++;
      const task = tasks[index];
      if (!task) continue;

      const startedAt = performance.now();
      const taskController = new AbortController();
      const abortTask = () => taskController.abort(controller.signal.reason);
      controller.signal.addEventListener("abort", abortTask, { once: true });
      let timeout: ReturnType<typeof setTimeout> | undefined;

      try {
        const timeoutPromise = new Promise<never>((_, reject) => {
          timeout = setTimeout(() => {
            const timeoutError = new Error(`Task timed out after ${timeoutMs}ms`);
            taskController.abort(timeoutError);
            reject(timeoutError);
          }, timeoutMs);
        });
        const value = await Promise.race([
          Promise.resolve().then(() => task.run({ signal: taskController.signal })),
          timeoutPromise,
        ]);
        results[index] = {
          id: task.id,
          status: "fulfilled",
          durationMs: Math.round((performance.now() - startedAt) * 100) / 100,
          value,
        };
      } catch (error) {
        results[index] = {
          id: task.id,
          status: "rejected",
          durationMs: Math.round((performance.now() - startedAt) * 100) / 100,
          error: errorMessage(error),
        };
        if (task.critical && failFastOnCritical) {
          stopScheduling = true;
          controller.abort(new Error(`Critical task failed: ${task.id}`));
        }
      } finally {
        if (timeout) clearTimeout(timeout);
        controller.signal.removeEventListener("abort", abortTask);
      }
    }
  }

  await Promise.all(
    Array.from({ length: Math.min(maxConcurrency, tasks.length) }, () => worker()),
  );

  return tasks.map((task, index) => results[index] ?? {
    id: task.id,
    status: "skipped" as const,
    durationMs: 0,
    error: "Not scheduled after a critical task failed",
  });
}
