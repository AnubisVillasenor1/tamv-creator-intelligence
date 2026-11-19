/* global process */
import { createFileRoute } from "@tanstack/react-router";
import { readBoundedResponseText } from "../lib/bounded-response.server";
import { isJsonContentType, readBoundedRequestBody } from "../lib/hypercore-turbo/governance-request-guards";

const noStore = { "Cache-Control": "no-store, max-age=0", "X-Content-Type-Options": "nosniff" };
const fail = (message: string, status: number, code: string) =>
  Response.json({ error: message, code }, { status, headers: noStore });

const plans = {
  creator: "STRIPE_PRICE_CREATOR",
  pro: "STRIPE_PRICE_PRO",
  enterprise: "STRIPE_PRICE_ENTERPRISE",
} as const;

export const Route = createFileRoute("/api/billing/checkout")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const stripeKey = process.env["STRIPE_SECRET_KEY"];
        const supabaseUrl = process.env["SUPABASE_URL"];
        const publishableKey = process.env["SUPABASE_PUBLISHABLE_KEY"];
        const appUrlValue = process.env["TAMV_APP_URL"];
        if (!stripeKey || !supabaseUrl || !publishableKey || !appUrlValue) {
          return fail("Checkout no está configurado en el servidor.", 503, "BILLING_CHECKOUT_NOT_CONFIGURED");
        }
        if (!stripeKey.startsWith("sk_test_") && !stripeKey.startsWith("sk_live_")) {
          return fail("La clave Stripe no tiene un formato admitido.", 503, "BILLING_CHECKOUT_CONFIG_INVALID");
        }
        let appUrl: URL;
        try {
          appUrl = new URL(appUrlValue);
          if (appUrl.protocol !== "https:" || appUrl.username || appUrl.password || appUrl.search || appUrl.hash || appUrl.pathname !== "/") throw new Error("Invalid app URL");
        } catch {
          return fail("TAMV_APP_URL debe ser una URL HTTPS raíz válida.", 503, "BILLING_CHECKOUT_APP_URL_INVALID");
        }

        const token = request.headers.get("authorization")?.match(/^Bearer\s+(.+)$/i)?.[1];
        if (!token || token.length > 16_384) return fail("Inicia sesión para crear una sesión de pago.", 401, "BILLING_CHECKOUT_AUTH_REQUIRED");
        let identityResponse: Response;
        try {
          identityResponse = await fetch(new URL("/auth/v1/user", supabaseUrl), {
            headers: { apikey: publishableKey, Authorization: `Bearer ${token}` },
            cache: "no-store",
            signal: AbortSignal.timeout(5_000),
          });
        } catch {
          return fail("El proveedor de identidad no está disponible.", 503, "BILLING_CHECKOUT_IDENTITY_UNAVAILABLE");
        }
        if (!identityResponse.ok) {
          await identityResponse.body?.cancel().catch(() => undefined);
          return fail("La sesión no es válida.", 401, "BILLING_CHECKOUT_SESSION_INVALID");
        }
        let user: { id?: unknown };
        try {
          user = JSON.parse(await readBoundedResponseText(identityResponse, 16 * 1024)) as { id?: unknown };
        } catch {
          return fail("Respuesta de identidad inválida.", 503, "BILLING_CHECKOUT_IDENTITY_INVALID");
        }
        if (typeof user.id !== "string" || !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(user.id)) {
          return fail("La identidad autenticada no es válida.", 401, "BILLING_CHECKOUT_IDENTITY_INVALID");
        }

        if (!isJsonContentType(request.headers.get("content-type"))) return fail("Content-Type debe ser application/json.", 415, "BILLING_CHECKOUT_CONTENT_TYPE");
        const body = await readBoundedRequestBody(request, 2 * 1024);
        if (!body.ok) return fail("La solicitud es inválida o demasiado grande.", body.reason === "too-large" ? 413 : 400, "BILLING_CHECKOUT_BODY_INVALID");
        let input: unknown;
        try { input = JSON.parse(body.text); } catch { return fail("JSON inválido.", 400, "BILLING_CHECKOUT_JSON_INVALID"); }
        if (!input || typeof input !== "object" || Array.isArray(input) || Object.keys(input).some((key) => key !== "planKey")) {
          return fail("La solicitud debe incluir únicamente planKey.", 400, "BILLING_CHECKOUT_INPUT_INVALID");
        }
        const planKey = (input as Record<string, unknown>)["planKey"];
        if (typeof planKey !== "string" || !Object.hasOwn(plans, planKey)) return fail("El plan solicitado no está permitido.", 400, "BILLING_CHECKOUT_PLAN_INVALID");
        const priceId = process.env[plans[planKey as keyof typeof plans]];
        if (!priceId || !/^price_[A-Za-z0-9]+$/.test(priceId)) return fail("El precio de este plan no está configurado.", 503, "BILLING_CHECKOUT_PRICE_NOT_CONFIGURED");

        const form = new URLSearchParams();
        form.set("mode", "subscription");
        form.set("line_items[0][price]", priceId);
        form.set("line_items[0][quantity]", "1");
        form.set("client_reference_id", user.id);
        form.set("success_url", new URL("/billing?checkout=success&session_id={CHECKOUT_SESSION_ID}", appUrl).toString());
        form.set("cancel_url", new URL("/billing?checkout=cancelled", appUrl).toString());
        form.set("metadata[tamv_user_id]", user.id);
        form.set("metadata[tamv_plan_key]", planKey);
        form.set("subscription_data[metadata][tamv_user_id]", user.id);
        form.set("subscription_data[metadata][tamv_plan_key]", planKey);

        let stripeResponse: Response;
        try {
          stripeResponse = await fetch("https://api.stripe.com/v1/checkout/sessions", {
            method: "POST",
            headers: { Authorization: `Bearer ${stripeKey}`, "Content-Type": "application/x-www-form-urlencoded" },
            body: form.toString(),
            cache: "no-store",
            signal: AbortSignal.timeout(10_000),
          });
        } catch {
          return fail("Stripe no está disponible; no se ha creado una sesión de pago.", 503, "BILLING_CHECKOUT_PROVIDER_UNAVAILABLE");
        }
        if (!stripeResponse.ok) {
          await stripeResponse.body?.cancel().catch(() => undefined);
          return fail("Stripe rechazó la creación de la sesión. No se ha confirmado ningún cobro.", 502, "BILLING_CHECKOUT_PROVIDER_REJECTED");
        }
        try {
          const result = JSON.parse(await readBoundedResponseText(stripeResponse, 32 * 1024)) as { url?: unknown };
          if (typeof result.url !== "string") throw new Error("Missing checkout URL");
          const checkoutUrl = new URL(result.url);
          if (checkoutUrl.protocol !== "https:" || checkoutUrl.hostname !== "checkout.stripe.com") throw new Error("Unexpected checkout host");
          return Response.json({ checkoutUrl: checkoutUrl.toString() }, { headers: noStore });
        } catch {
          return fail("Stripe devolvió una respuesta de checkout inválida.", 502, "BILLING_CHECKOUT_RESPONSE_INVALID");
        }
      },
    },
  },
});
