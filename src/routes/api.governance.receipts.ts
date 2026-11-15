import { createFileRoute } from "@tanstack/react-router";
import { GOVERN_CORE_POLICY } from "../lib/hypercore-turbo/policy";
import {
  createGovernanceReceiptStoreFromEnv,
  GovernanceReceiptStoreError,
} from "../lib/hypercore-turbo/governance-receipt-store.server";
import {
  validateGovernanceReceipt,
  type GovernanceOperation,
  type GovernanceOperationReceipt,
} from "../lib/hypercore-turbo/governance-receipt";

const MAX_BODY_BYTES = 16 * 1024;
const ID_PATTERN = /^[A-Za-z0-9][A-Za-z0-9._:-]{7,127}$/;
const SHA256_PATTERN = /^[a-f0-9]{64}$/i;
const COMMIT_PATTERN = /^[a-f0-9]{40}$/i;
const OPERATIONS = new Set<GovernanceOperation>([
  "install", "resume", "update", "redeploy", "rollback",
]);

function noStoreHeaders(): HeadersInit {
  return { "Cache-Control": "no-store, max-age=0", "X-Content-Type-Options": "nosniff" };
}

function jsonError(message: string, status: number): Response {
  return Response.json({ error: message }, { status, headers: noStoreHeaders() });
}

async function authenticate(request: Request): Promise<{ actorRef: string } | Response> {
  const authorization = request.headers.get("authorization");
  const token = authorization?.match(/^Bearer\s+(.+)$/i)?.[1];
  const url = process.env.SUPABASE_URL;
  const publishableKey = process.env.SUPABASE_PUBLISHABLE_KEY;
  const actorSalt = process.env.TAMV_GOVERNANCE_ACTOR_SALT;

  if (!url || !publishableKey || !actorSalt || actorSalt.length < 32) {
    return jsonError("Governance authentication is not configured", 503);
  }
  if (!token) return jsonError("Authentication required", 401);

  let authResponse: Response;
  try {
    authResponse = await fetch(`${url.replace(/\/+$/, "")}/auth/v1/user`, {
      method: "GET",
      headers: { apikey: publishableKey, Authorization: `Bearer ${token}` },
      cache: "no-store",
    });
  } catch {
    return jsonError("Identity provider unavailable", 503);
  }
  if (!authResponse.ok) return jsonError("Authentication failed", 401);

  let user: { id?: unknown };
  try {
    user = await authResponse.json() as { id?: unknown };
  } catch {
    return jsonError("Identity provider returned an invalid response", 503);
  }
  if (typeof user.id !== "string" || !/^[0-9a-f-]{20,64}$/i.test(user.id)) {
    return jsonError("Authenticated identity is invalid", 401);
  }

  const digest = await crypto.subtle.digest(
    "SHA-256",
    new TextEncoder().encode(`${actorSalt}:${user.id}`),
  );
  const actorHash = Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, "0")).join("");
  return { actorRef: `actor-${actorHash.slice(0, 32)}` };
}

async function stableId(prefix: string, value: string): Promise<string> {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(value));
  const hex = Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, "0")).join("");
  return `${prefix}-${hex.slice(0, 32)}`;
}

function mapStoreError(error: unknown): Response {
  if (error instanceof GovernanceReceiptStoreError) {
    if (error.code === "CONFIG_INVALID" || error.code === "BACKEND_ERROR") {
      return jsonError("Governance receipt service unavailable", 503);
    }
    if (error.code === "IDEMPOTENCY_CONFLICT" || error.code === "STATE_CONFLICT") {
      return jsonError("Governance operation conflicts with an existing record", 409);
    }
    if (error.code === "NOT_FOUND") return jsonError("Receipt not found", 404);
    return jsonError("Governance receipt rejected", 400);
  }
  return jsonError("Governance receipt service unavailable", 503);
}

export const Route = createFileRoute("/api/governance/receipts")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const identity = await authenticate(request);
        if (identity instanceof Response) return identity;

        const contentType = request.headers.get("content-type") ?? "";
        if (!contentType.toLowerCase().includes("application/json")) {
          return jsonError("Content-Type must be application/json", 415);
        }
        const declaredLength = Number(request.headers.get("content-length") ?? "0");
        if (declaredLength > MAX_BODY_BYTES) return jsonError("Request body too large", 413);

        let raw: unknown;
        try {
          const body = await request.text();
          if (new TextEncoder().encode(body).byteLength > MAX_BODY_BYTES) {
            return jsonError("Request body too large", 413);
          }
          raw = JSON.parse(body);
        } catch {
          return jsonError("Invalid JSON body", 400);
        }
        if (!raw || typeof raw !== "object" || Array.isArray(raw)) {
          return jsonError("Request body must be an object", 400);
        }

        const input = raw as Record<string, unknown>;
        const idempotencyKey = request.headers.get("idempotency-key") ?? "";
        if (!ID_PATTERN.test(idempotencyKey)) {
          return jsonError("A valid Idempotency-Key header is required", 400);
        }
        if (typeof input.operation !== "string" || !OPERATIONS.has(input.operation as GovernanceOperation)) {
          return jsonError("Unsupported governance operation", 400);
        }
        if (typeof input.targetRef !== "string"
          || typeof input.sourceCommitSha !== "string"
          || typeof input.artifactSha256 !== "string"
          || !ID_PATTERN.test(input.targetRef)
          || !COMMIT_PATTERN.test(input.sourceCommitSha)
          || !SHA256_PATTERN.test(input.artifactSha256)) {
          return jsonError("Target, source commit or artifact digest is invalid", 400);
        }

        const now = new Date().toISOString();
        const operation = input.operation as GovernanceOperation;
        const binding = `${identity.actorRef}:${idempotencyKey}`;
        const receipt: GovernanceOperationReceipt = {
          schema: "tamv.governance.receipt.v1",
          receiptId: await stableId("receipt", binding),
          operationId: await stableId("operation", binding),
          operation,
          phase: "intent",
          status: "pending",
          actorRef: identity.actorRef,
          targetRef: input.targetRef,
          sourceCommitSha: input.sourceCommitSha,
          artifactSha256: input.artifactSha256,
          policyVersion: GOVERN_CORE_POLICY.version,
          idempotencyKey,
          startedAt: now,
          recordedAt: now,
          evidence: [],
        };
        const validation = validateGovernanceReceipt(receipt);
        if (!validation.valid) return jsonError("Governance intent failed validation", 400);

        try {
          // This endpoint only records an authenticated intent. It never executes,
          // deploys, publishes, or transitions an operation to a successful state.
          const store = createGovernanceReceiptStoreFromEnv(async () => false);
          const stored = await store.create(receipt);
          return Response.json(
            { receipt: stored, executionStarted: false, humanApprovalRequired: true },
            { status: 202, headers: noStoreHeaders() },
          );
        } catch (error) {
          return mapStoreError(error);
        }
      },

      GET: async ({ request }) => {
        const identity = await authenticate(request);
        if (identity instanceof Response) return identity;

        const receiptId = new URL(request.url).searchParams.get("receiptId") ?? "";
        if (!ID_PATTERN.test(receiptId)) return jsonError("A valid receiptId is required", 400);

        try {
          const store = createGovernanceReceiptStoreFromEnv(async () => false);
          const receipt = await store.get(receiptId);
          if (!receipt || receipt.actorRef !== identity.actorRef) {
            return jsonError("Receipt not found", 404);
          }
          return Response.json({ receipt }, { status: 200, headers: noStoreHeaders() });
        } catch (error) {
          return mapStoreError(error);
        }
      },
    },
  },
});
