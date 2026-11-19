/* global process */
import { createFileRoute } from "@tanstack/react-router";
import { readBoundedResponseText } from "../lib/bounded-response.server";

const noStore = { "Cache-Control": "no-store, max-age=0", "X-Content-Type-Options": "nosniff" };
const errorResponse = (message: string, status: number, code: string) =>
  Response.json({ error: message, code }, { status, headers: noStore });

export const Route = createFileRoute("/api/admin/memberships")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const supabaseUrl = process.env["SUPABASE_URL"];
        const publishableKey = process.env["SUPABASE_PUBLISHABLE_KEY"];
        const serviceRoleKey = process.env["SUPABASE_SERVICE_ROLE_KEY"];
        if (!supabaseUrl || !publishableKey || !serviceRoleKey) {
          return errorResponse("El monitor administrativo no está configurado.", 503, "ADMIN_MONITOR_NOT_CONFIGURED");
        }

        const token = request.headers.get("authorization")?.match(/^Bearer\s+(.+)$/i)?.[1];
        if (!token || token.length > 16_384) return errorResponse("Se requiere una sesión autenticada.", 401, "ADMIN_AUTH_REQUIRED");

        let identityResponse: Response;
        try {
          identityResponse = await fetch(new URL("/auth/v1/user", supabaseUrl), {
            headers: { apikey: publishableKey, Authorization: `Bearer ${token}` },
            cache: "no-store",
            signal: AbortSignal.timeout(5_000),
          });
        } catch {
          return errorResponse("El proveedor de identidad no está disponible.", 503, "ADMIN_IDENTITY_UNAVAILABLE");
        }
        if (!identityResponse.ok) {
          await identityResponse.body?.cancel().catch(() => undefined);
          return errorResponse("La sesión no es válida.", 401, "ADMIN_SESSION_INVALID");
        }

        let user: { id?: unknown; app_metadata?: unknown };
        try {
          const identityText = await readBoundedResponseText(identityResponse, 16 * 1024);
          if (identityText === null) throw new Error("Identity response exceeds limit");
          user = JSON.parse(identityText) as { id?: unknown; app_metadata?: unknown };
        } catch {
          return errorResponse("Respuesta de identidad inválida.", 503, "ADMIN_IDENTITY_INVALID");
        }
        if (typeof user.id !== "string" || !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(user.id)) {
          return errorResponse("La identidad no es válida.", 401, "ADMIN_IDENTITY_INVALID");
        }

        const metadata = user.app_metadata && typeof user.app_metadata === "object" && !Array.isArray(user.app_metadata)
          ? user.app_metadata as Record<string, unknown>
          : {};
        const roles = Array.isArray(metadata["roles"]) ? metadata["roles"] : [];
        const isAdmin = metadata["tamv_role"] === "admin" || roles.includes("tamv_admin");
        if (!isAdmin) return errorResponse("Se requiere el rol administrativo asignado por el servidor.", 403, "ADMIN_ROLE_REQUIRED");

        let summaryResponse: Response;
        try {
          summaryResponse = await fetch(new URL("/rest/v1/rpc/get_tamv_membership_summary", supabaseUrl), {
            method: "POST",
            headers: {
              apikey: serviceRoleKey,
              Authorization: `Bearer ${serviceRoleKey}`,
              "Content-Type": "application/json",
            },
            body: "{}",
            cache: "no-store",
            signal: AbortSignal.timeout(5_000),
          });
        } catch {
          return errorResponse("No fue posible consultar el resumen de membresías.", 503, "ADMIN_SUMMARY_UNAVAILABLE");
        }
        if (!summaryResponse.ok) {
          await summaryResponse.body?.cancel().catch(() => undefined);
          return errorResponse("No fue posible consultar el resumen de membresías.", 503, "ADMIN_SUMMARY_FAILED");
        }
        try {
          const summaryText = await readBoundedResponseText(summaryResponse, 8 * 1024);
          if (summaryText === null) throw new Error("Summary response exceeds limit");
          const summary = JSON.parse(summaryText) as unknown;
          if (!summary || typeof summary !== "object" || Array.isArray(summary)) throw new Error("Invalid summary");
          return Response.json({ summary }, { headers: noStore });
        } catch {
          return errorResponse("El resumen de membresías tiene un formato inválido.", 503, "ADMIN_SUMMARY_INVALID");
        }
      },
    },
  },
});
