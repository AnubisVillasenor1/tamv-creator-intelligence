/* global process */
import { createFileRoute } from "@tanstack/react-router";
import { createHash } from "node:crypto";
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

        const declaredLength = request.headers.get("content-length");
        if (declaredLength !== null && (!/^(0|[1-9][0-9]*)$/.test(declaredLength) || Number(declaredLength) > STRIPE_WEBHOOK_MAX_BODY_BYTES)) {
          return errorResponse("El cuerpo del webhook supera el límite permitido.", 413, "BILLING_WEBHOOK_BODY_LIMIT");
        }
        const body = await readBoundedRequestBody(request, STRIPE_WEBHOOK_MAX_BODY_BYTES);
        if (!body.ok) return errorResponse("No se pudo leer el cuerpo del webhook.", body.reason === "too-large" ? 413 : 400, "BILLING_WEBHOOK_BODY_INVALID");

        const signature = verifyStripeWebhookSignature(body.text, request.headers.get("stripe-signature"), secret);
        if (!signature.ok) {
          const status = signature.reason === "missing" ? 400 : 400;
          return errorResponse("Firma de webhook inválida o expirada.", status, "BILLING_WEBHOOK_SIGNATURE_INVALID");
        }

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
        const endpoint = new URL("/rest/v1/tamv_billing_webhook_events", supabaseUrl);
        endpoint.searchParams.set("on_conflict", "provider,event_id");
        let persistResponse: Response;
        try {
          persistResponse = await fetch(endpoint, {
            method: "POST",
            headers: {
              apikey: serviceRoleKey,
              Authorization: `Bearer ${serviceRoleKey}`,
              "Content-Type": "application/json",
              Prefer: "resolution=ignore-duplicates,return=minimal",
            },
            body: JSON.stringify([{
              provider: "stripe",
              event_id: record["id"],
              event_type: record["type"],
              payload_sha256: payloadHash,
              processing_status: "received",
            }]),
            cache: "no-store",
            signal: AbortSignal.timeout(5000),
          });
        } catch {
          return errorResponse("No fue posible persistir el evento de facturación.", 503, "BILLING_WEBHOOK_STORAGE_UNAVAILABLE");
        }
        if (!persistResponse.ok) {
          await persistResponse.body?.cancel().catch(() => undefined);
          return errorResponse("No fue posible persistir el evento de facturación.", 503, "BILLING_WEBHOOK_STORAGE_ERROR");
        }

        // Deliberately acknowledge receipt only. Subscription state is not changed by this intake endpoint.
        return Response.json({
          accepted: true,
          eventId: record["id"],
          eventType: record["type"],
          processingStatus: "received_not_processed",
        }, { status: 202, headers: noStore });
      },
    },
  },
});
