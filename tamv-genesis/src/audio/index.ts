/**
 * TAMV audio contract surface: strict request validation, the unified gateway
 * and honest DSP normalisation. No storage, queue or model dependency lives
 * here; callers inject ports.
 */
export * from "./contracts.ts";
export * from "./gateway.ts";
