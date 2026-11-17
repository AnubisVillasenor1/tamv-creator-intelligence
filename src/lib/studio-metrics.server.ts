import { createHash, timingSafeEqual } from "node:crypto";
import { AudioMetricsRegistry } from "../../tamv-genesis/src/audio/metrics.ts";
import { requireTamvCertification } from "./tamv-certification";

export const studioMetrics = new AudioMetricsRegistry();

export async function handleStudioMetrics(
  request: Request,
  deps: {
    token?: string;
    registry?: AudioMetricsRegistry;
    certify?: typeof requireTamvCertification;
  } = {},
): Promise<Response> {
  const headers = {
    "Cache-Control": "no-store, max-age=0",
    "X-Content-Type-Options": "nosniff",
    "X-TAMV-Metrics-Scope": "process-local",
  };
  const configured = deps.token ?? process.env["TAMV_METRICS_BEARER_TOKEN"] ?? "";
  if (configured.length < 32)
    return Response.json({ error: "Metrics access is not configured" }, { status: 503, headers });
  const supplied = request.headers.get("authorization")?.match(/^Bearer (\S+)$/i)?.[1];
  if (
    !supplied ||
    supplied.length > 8192 ||
    !timingSafeEqual(
      createHash("sha256").update(supplied).digest(),
      createHash("sha256").update(configured).digest(),
    )
  ) {
    return Response.json(
      { error: "Metrics operator authentication required" },
      { status: 401, headers: { ...headers, "WWW-Authenticate": "Bearer" } },
    );
  }
  const denied = await (deps.certify ?? requireTamvCertification)("audiocore.advanced");
  if (denied) return denied;
  return new Response((deps.registry ?? studioMetrics).render(), {
    headers: { ...headers, "Content-Type": "text/plain; version=0.0.4; charset=utf-8" },
  });
}
