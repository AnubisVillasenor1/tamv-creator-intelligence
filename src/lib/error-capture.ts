// Captures the original Error out-of-band so server.ts can recover the stack
// when h3 has already swallowed the throw into a generic 500 Response.
//
// Correlation: the previous implementation kept a single global slot with a 5 s
// TTL, so two concurrent requests could consume each other's error. Each fetch
// now runs inside its own AsyncLocalStorage context; the global slot survives
// only as a fallback for errors raised outside a request.

import { AsyncLocalStorage } from "node:async_hooks";

interface ErrorSlot {
  error: unknown;
  at: number;
}

const requestScope = new AsyncLocalStorage<ErrorSlot>();
let fallback: ErrorSlot | undefined;
const TTL_MS = 5_000;

function record(error: unknown) {
  const slot = requestScope.getStore();
  if (slot) {
    slot.error = error;
    slot.at = Date.now();
    return;
  }
  fallback = { error, at: Date.now() };
}

/** Run a request handler with an isolated error slot. */
export function runWithErrorCapture<T>(handler: () => T): T {
  return requestScope.run({ error: undefined, at: 0 }, handler);
}

// h3's HTTPError serializes to {"status":500,"unhandled":true,"message":"HTTPError"} —
// no stack, no cause — so a plain console.error(error) reaches the log pipeline with
// the failure detail stripped. Expand Error-like args into a string that keeps the
// message, stack, and the full cause chain.
const CAUSE_DEPTH_LIMIT = 5;
const DESCRIPTION_LENGTH_LIMIT = 8_000;

export function describeError(error: unknown): string {
  const parts: string[] = [];
  let current: unknown = error;
  for (let depth = 0; depth < CAUSE_DEPTH_LIMIT && current != null; depth++) {
    if (!(current instanceof Error)) {
      parts.push(typeof current === "string" ? current : safeStringify(current));
      break;
    }
    const label = depth === 0 ? "" : "caused by: ";
    const status = describeStatus(current);
    parts.push(`${label}${current.stack ?? `${current.name}: ${current.message}`}${status}`);
    current = current.cause;
  }
  return parts.join("\n").slice(0, DESCRIPTION_LENGTH_LIMIT);
}

function describeStatus(error: Error): string {
  const { status, statusCode } = error as { status?: unknown; statusCode?: unknown };
  const value = status ?? statusCode;
  return typeof value === "number" ? ` (status ${value})` : "";
}

function safeStringify(value: unknown): string {
  try {
    return JSON.stringify(value) ?? String(value);
  } catch {
    return String(value);
  }
}

function isErrorLike(value: unknown): value is Error {
  return value instanceof Error;
}

// Wrap console.error so errors logged by any layer — including h3's internal
// unhandled-error logging, which this file cannot hook directly — are both
// recorded for consumeLastCapturedError and expanded before serialization.
const originalConsoleError = console.error.bind(console);
console.error = (...args: unknown[]) => {
  const expanded = args.map((arg) => {
    if (!isErrorLike(arg)) return arg;
    record(arg);
    return describeError(arg);
  });
  originalConsoleError(...expanded);
};

if (typeof globalThis.addEventListener === "function") {
  globalThis.addEventListener("error", (event) => record((event as ErrorEvent).error ?? event));
  globalThis.addEventListener("unhandledrejection", (event) =>
    record((event as PromiseRejectionEvent).reason),
  );
}

export function consumeLastCapturedError(): unknown {
  const slot = requestScope.getStore();
  if (slot) {
    if (!slot.error) return undefined;
    const { error, at } = slot;
    slot.error = undefined;
    return Date.now() - at > TTL_MS ? undefined : error;
  }
  if (!fallback) return undefined;
  if (Date.now() - fallback.at > TTL_MS) {
    fallback = undefined;
    return undefined;
  }
  const { error } = fallback;
  fallback = undefined;
  return error;
}
