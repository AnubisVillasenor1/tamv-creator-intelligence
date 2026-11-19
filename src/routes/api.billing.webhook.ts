/* global process */
import { createFileRoute } from "@tanstack/react-router";
import { createHash } from "node:crypto";
import { readBoundedResponseText } from "../lib/bounded-response.server";
import { readBoundedRequestBody } from "../lib/hypercore-turbo/governance-request-guards";
import {
  STRIPE_WEBHOOK_MAX_BODY_BYTES,
  verifyStripeWebhookSignature,
} from "../lib/stripe-webhook-signature.server";

const noStore = { "Cache-Control": "no-store, max-age=0", "X-Content-Type-Options": "nosniff" };

function errorResponse(message: string, status: number, code: string): Response {
  return Response.json({ error: message, code }, { status, headers: noStore });
}

export const Route = createFileRoute("/api/billing/webhook")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const secret = process.env["STRIPE_WEBHOOK_SECRET"];
        const supabaseUrl = process.env["SUPABASE_URL"];
        const serviceRoleKey = process.env["SUPABASE_SERVICE_ROLE_KEY"];
        if (!secret || !supabaseUrl || !serviceRoleKey) {
          return errorResponse("Webhook billing no configurado en el servidor.", 503, "BILLING_WEBHOOK_NOT_CONFIGURED");
        }
        if (request.headers.get("content-type")?.split(";")[0]?.trim().toLowerCase() !== "application/json") {
          return errorResponse("Content-Type debe ser application/json.", 415, "BILLING_WEBHOOK_CONTENT_TYPE");
        }

        let baseUrl: URL;
        try {
          baseUrl = new URL(supabaseUrl);
          if (baseUrl.protocol !== "https:" || baseUrl.username || baseUrl.password || baseUrl.search || baseUrl.hash || baseUrl.pathname !== "/") {
            throw new Error("Invalid Supabase URL");
          }
        } catch {
          return errorResponse("La URL de almacenamiento no es válida.", 503, "BILLING_WEBHOOK_STORAGE_CONFIG_INVALID");
        }

        const declaredLength = request.headers.get("content-length");
        if (declaredLength !== null && (!/^(0|[1-9][0-9]*)$/.test(declaredLength) || Number(declaredLength) > STRIPE_WEBHOOK_MAX_BODY_BYTES)) {
          return errorResponse("El cuerpo del webhook supera el límite permitido.", 413, "BILLING_WEBHOOK_BODY_LIMIT");
        }
        const body = await readBoundedRequestBody(request, STRIPE_WEBHOOK_MAX_BODY_BYTES);
        if (!body.ok) return errorResponse("No se pudo leer el cuerpo del webhook.", body.reason === "too-large" ? 413 : 400, "BILLING_WEBHOOK_BODY_INVALID");

        const signature = verifyStripeWebhookSignature(body.text, request.headers.get("stripe-signature"), secret);
        if (!signature.ok) return errorResponse("Firma de webhook inválida o expirada.", 400, "BILLING_WEBHOOK_SIGNATURE_INVALID");

        let event: unknown;
        try { event = JSON.parse(body.text); } catch {
          return errorResponse("JSON de webhook inválido.", 400, "BILLING_WEBHOOK_JSON_INVALID");
        }
        if (!event || typeof event !== "object" || Array.isArray(event)) {
          return errorResponse("El evento de webhook debe ser un objeto.", 400, "BILLING_WEBHOOK_EVENT_INVALID");
        }
        const record = event as Record<string, unknown>;
        if (record["object"] !== "event" || typeof record["id"] !== "string" || !/^evt_[A-Za-z0-9]+$/.test(record["id"]) || typeof record["type"] !== "string" || record["type"].length > 160) {
          return errorResponse("El evento no cumple el contrato mínimo de Stripe.", 400, "BILLING_WEBHOOK_EVENT_INVALID");
        }

        const payloadHash = createHash("sha256").update(body.text, "utf8").digest("hex");
        let processResponse: Response;
        try {
          processResponse = await fetch(new URL("/rest/v1/rpc/process_tamv_stripe_billing_event", baseUrl), {
            method: "POST",
            headers: {
              apikey: serviceRoleKey,
              Authorization: `Bearer ${serviceRoleKey}`,
              "Content-Type": "application/json",
            },
            body: JSON.stringify({ p_event: record, p_payload_sha256: payloadHash }),
            cache: "no-store",
            signal: AbortSignal.timeout(5000),
          });
        } catch {
          return errorResponse("El procesador de facturación no está disponible; Stripe puede reintentar.", 503, "BILLING_PROCESSOR_UNAVAILABLE");
        }
        if (!processResponse.ok) {
          await processResponse.body?.cancel().catch(() => undefined);
          return errorResponse("El evento no pudo procesarse de forma transaccional; Stripe puede reintentar.", 503, "BILLING_PROCESSOR_FAILED");
        }

        try {
          const processorText = await readBoundedResponseText(processResponse, 8 * 1024);
          if (processorText === null) throw new Error("Processor response exceeds limit");
          const result = JSON.parse(processorText) as unknown;
          if (!result || typeof result !== "object" || Array.isArray(result) || typeof (result as Record<string, unknown>)["status"] !== "string") {
            throw new Error("Invalid processor response");
          }
          const status = (result as Record<string, unknown>)["status"];
          if (!["processed", "ignored", "duplicate"].includes(String(status))) {
            return errorResponse("El procesador no confirmó el evento.", 503, "BILLING_PROCESSOR_UNCONFIRMED");
          }
          return Response.json({
            accepted: true,
            eventId: record["id"],
            eventType: record["type"],
            processingStatus: status,
          }, { status: 200, headers: noStore });
        } catch {
          return errorResponse("Respuesta inválida del procesador de facturación.", 503, "BILLING_PROCESSOR_RESPONSE_INVALID");
        }
      },
    },
  },
});
