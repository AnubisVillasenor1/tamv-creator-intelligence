/**
 * TAMV audio contract surface: strict request validation, the unified gateway,
 * honest DSP normalisation, the job lifecycle, metrics and an in-process worker.
 * No storage, queue or model dependency lives here; callers inject ports.
 */
export * from "./contracts.ts";
export * from "./gateway.ts";
export * from "./lifecycle.ts";
export * from "./local-dsp.ts";
export * from "./local-synth.ts";
export * from "./memory.ts";
export * from "./metrics.ts";
export * from "./pipeline.ts";
export * from "./ports.ts";
export * from "./wav.ts";
export * from "./worker.ts";
