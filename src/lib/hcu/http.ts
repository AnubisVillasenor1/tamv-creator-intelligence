import { isDeclaredContentLengthWithinLimit, isJsonContentType, readBoundedRequestBody } from "../hypercore-turbo/governance-request-guards";
import { HCU_LIMITS } from "./hcu-service";

export const HCU_HEADERS = { "Cache-Control": "no-store, max-age=0", "X-Content-Type-Options": "nosniff" } as const;

export const hcuJson = (body: unknown, status = 200) => Response.json(body, { status, headers: HCU_HEADERS });

/** Lee un cuerpo JSON acotado (streaming) y devuelve el valor o una Response de error lista para devolver. */
export async function readJsonBody(request: Request): Promise<{ ok: true; value: unknown } | { ok: false; response: Response }> {
  if (!isJsonContentType(request.headers.get("content-type"))) return { ok: false, response: hcuJson({ error: "Content-Type debe ser application/json." }, 415) };
  if (!isDeclaredContentLengthWithinLimit(request.headers.get("content-length"), HCU_LIMITS.maxBodyBytes)) return { ok: false, response: hcuJson({ error: "Cuerpo demasiado grande." }, 413) };
  const body = await readBoundedRequestBody(request, HCU_LIMITS.maxBodyBytes);
  if (!body.ok) return { ok: false, response: hcuJson({ error: body.reason === "too-large" ? "Cuerpo demasiado grande." : "Cuerpo ilegible." }, body.reason === "too-large" ? 413 : 400) };
  try { return { ok: true, value: JSON.parse(body.text) as unknown }; } catch { return { ok: false, response: hcuJson({ error: "JSON inválido." }, 400) }; }
}
