/**
 * Canonical serialisation for every TAMV signature and seal.
 *
 * The same bytes must be produced in the browser, in Node and in CI, so the
 * encoder is deliberately small: sorted object keys, no whitespace, rejected
 * non-finite numbers and rejected undefined values. Anything that cannot be
 * represented deterministically fails instead of producing a different digest
 * on another platform.
 */

export class TamvCanonicalError extends Error {
  readonly code = "TAMV_CANONICAL_INVALID";

  constructor(message: string) {
    super(message);
    this.name = "TamvCanonicalError";
  }
}

export function canonicalJson(value: unknown): string {
  if (value === null) return "null";
  const kind = typeof value;
  if (kind === "string" || kind === "boolean") return JSON.stringify(value);
  if (kind === "number") {
    if (!Number.isFinite(value as number)) {
      throw new TamvCanonicalError("A canonical payload cannot contain a non-finite number.");
    }
    return JSON.stringify(value);
  }
  if (Array.isArray(value)) {
    return "[" + value.map((item) => canonicalJson(item)).join(",") + "]";
  }
  if (kind === "object") {
    const prototype = Object.getPrototypeOf(value);
    if (prototype !== Object.prototype && prototype !== null) {
      throw new TamvCanonicalError(
        "A canonical payload cannot contain a non-plain object (Date, Map, Set, RegExp or class instance); convert it to a plain structure first.",
      );
    }
    const record = value as Record<string, unknown>;
    const keys = Object.keys(record).sort();
    for (const key of keys) {
      if (record[key] === undefined) {
        throw new TamvCanonicalError(`A canonical payload cannot contain undefined (${key}).`);
      }
    }
    return "{" + keys.map((key) => JSON.stringify(key) + ":" + canonicalJson(record[key])).join(",") + "}";
  }
  throw new TamvCanonicalError(`A canonical payload cannot contain ${kind}.`);
}

/** Reject absolute paths, backslashes, traversal and empty segments. */
export function assertSafeRelativePath(path: string): void {
  if (typeof path !== "string" || path.length === 0 || path.length > 512) {
    throw new TamvCanonicalError("An invalid relative path was supplied.");
  }
  if (path.startsWith("/") || path.includes("\\") || path.includes("\0")) {
    throw new TamvCanonicalError("Only forward-slash relative paths are allowed.");
  }
  const segments = path.split("/");
  if (segments.some((segment) => segment.length === 0 || segment === "." || segment === "..")) {
    throw new TamvCanonicalError("Path traversal is not allowed.");
  }
}
