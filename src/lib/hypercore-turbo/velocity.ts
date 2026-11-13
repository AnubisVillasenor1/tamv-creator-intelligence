/** Compatibility entrypoint; the single canonical runner lives in parallel-runner.ts. */
export { runTurboParallel } from "./parallel-runner";
export type {
  TurboTask,
  TurboResult as TurboTaskResult,
  TurboOptions as TurboRunOptions,
} from "./parallel-runner";
