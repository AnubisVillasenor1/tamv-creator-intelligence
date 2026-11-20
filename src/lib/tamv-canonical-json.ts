/** Deterministic JSON used by every TAMV signature and digest. */
export function canonicalizeTamvJson(value: unknown): string {
  if (value === null || typeof value === "string" || typeof value === "boolean") {
    return JSON.stringify(value) ?? "null";
  }
  if (typeof value === "number") {
    if (!Number.isFinite(value)) throw new Error("Número no válido en el documento TAMV.");
    return JSON.stringify(value) ?? "null";
  }
  if (Array.isArray(value)) return "[" + value.map(canonicalizeTamvJson).join(",") + "]";
  if (typeof value === "object") {
    const record = value as Record<string, unknown>;
    return (
      "{" +
      Object.keys(record)
        .sort()
        .map((key) => JSON.stringify(key) + ":" + canonicalizeTamvJson(record[key]))
        .join(",") +
      "}"
    );
  }
  throw new Error("El documento TAMV contiene un tipo no admitido.");
}
