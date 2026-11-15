/* global process */
import {
  canTransitionOperation,
  validateGovernanceReceipt,
  type GovernanceOperationReceipt,
  type GovernanceOperationStatus,
} from "./governance-receipt";

export interface GovernanceReceiptStoreConfig {
  readonly supabaseUrl: string;
  readonly serviceRoleKey: string;
  readonly tableName?: string;
}

export type EvidenceVerifier = (receipt: GovernanceOperationReceipt) => Promise<boolean>;

export class GovernanceReceiptStoreError extends Error {
  constructor(
    message: string,
    readonly code:
      | "CONFIG_INVALID"
      | "RECEIPT_INVALID"
      | "INITIAL_STATUS_INVALID"
      | "IDEMPOTENCY_CONFLICT"
      | "NOT_FOUND"
      | "STATE_CONFLICT"
      | "EVIDENCE_UNVERIFIED"
      | "BACKEND_ERROR",
    options?: ErrorOptions,
  ) {
    super(message, options);
    this.name = "GovernanceReceiptStoreError";
  }
}

interface StoredReceipt {
  receipt_id: string;
  operation_id: string;
  idempotency_key: string;
  status: GovernanceOperationStatus;
  receipt: GovernanceOperationReceipt;
  created_at: string;
  updated_at: string;
}

export interface GovernanceReceiptStore {
  create(receipt: GovernanceOperationReceipt): Promise<GovernanceOperationReceipt>;
  get(receiptId: string): Promise<GovernanceOperationReceipt | null>;
  transition(
    receiptId: string,
    expectedStatus: GovernanceOperationStatus,
    next: GovernanceOperationReceipt,
  ): Promise<GovernanceOperationReceipt>;
}

const TABLE_PATTERN = /^[a-z][a-z0-9_]{0,62}$/;
const MAX_SUCCESS_RESPONSE_BYTES = 1024 * 1024;
const MAX_ERROR_RESPONSE_BYTES = 4096;

async function readBoundedResponseText(response: Response, maxBytes: number): Promise<string> {
  if (!Number.isSafeInteger(maxBytes) || maxBytes < 1) {
    throw new Error("Invalid response size limit");
  }
  if (!response.body) return "";

  const reader = response.body.getReader();
  const chunks: Uint8Array[] = [];
  let totalBytes = 0;
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      if (!value) continue;
      totalBytes += value.byteLength;
      if (totalBytes > maxBytes) {
        await reader.cancel("Backend response exceeds configured size limit").catch(() => undefined);
        throw new Error("Backend response exceeds configured size limit");
      }
      chunks.push(value);
    }

    const bytes = new Uint8Array(totalBytes);
    let offset = 0;
    for (const chunk of chunks) {
      bytes.set(chunk, offset);
      offset += chunk.byteLength;
    }
    return new TextDecoder("utf-8", { fatal: true }).decode(bytes);
  } finally {
    reader.releaseLock();
  }
}

function assertValidReceipt(receipt: GovernanceOperationReceipt): void {
  const validation = validateGovernanceReceipt(receipt);
  if (!validation.valid) {
    throw new GovernanceReceiptStoreError(
      `Receipt rejected: ${validation.errors.join(",")}`,
      "RECEIPT_INVALID",
    );
  }
}

function preservesEvidence(
  previous: GovernanceOperationReceipt,
  next: GovernanceOperationReceipt,
): boolean {
  return previous.evidence.every((item) =>
    next.evidence.some((candidate) =>
      candidate.kind === item.kind
      && candidate.sha256 === item.sha256
      && candidate.reference === item.reference,
    ),
  );
}

function sameIdempotentOperation(
  existing: GovernanceOperationReceipt,
  requested: GovernanceOperationReceipt,
): boolean {
  return existing.idempotencyKey === requested.idempotencyKey
    && existing.operationId === requested.operationId
    && existing.operation === requested.operation
    && existing.sourceCommitSha === requested.sourceCommitSha
    && existing.artifactSha256 === requested.artifactSha256
    && existing.targetRef === requested.targetRef
    && existing.actorRef === requested.actorRef
    && existing.policyVersion === requested.policyVersion;
}

/**
 * Supabase/PostgREST-backed store. It uses a unique idempotency key and
 * compare-and-set status updates. The service-role key must only exist in a
 * trusted server runtime. The database table and unique constraint must be
 * provisioned through the repository's approved Lovable schema workflow.
 */
export function createGovernanceReceiptStore(
  config: GovernanceReceiptStoreConfig,
  verifySuccessEvidence: EvidenceVerifier,
  fetcher: typeof fetch = fetch,
): GovernanceReceiptStore {
  const baseUrl = config.supabaseUrl.replace(/\/+$/, "");
  const key = config.serviceRoleKey;
  const table = config.tableName ?? "tamv_governance_receipts";

  if (!/^https:\/\//i.test(baseUrl) || !key || key.trim() !== key || !TABLE_PATTERN.test(table)) {
    throw new GovernanceReceiptStoreError("Invalid server-side Supabase configuration", "CONFIG_INVALID");
  }
  if (typeof verifySuccessEvidence !== "function") {
    throw new GovernanceReceiptStoreError("A trusted evidence verifier is required", "CONFIG_INVALID");
  }

  const endpoint = `${baseUrl}/rest/v1/${table}`;

  async function request<T>(path: string, init: RequestInit): Promise<T> {
    let response: Response;
    try {
      response = await fetcher(`${endpoint}${path}`, {
        ...init,
        headers: {
          apikey: key,
          Authorization: `Bearer ${key}`,
          "Content-Type": "application/json",
          ...(init.headers ?? {}),
        },
        cache: "no-store",
      });
    } catch (error) {
      throw new GovernanceReceiptStoreError("Receipt backend is unreachable", "BACKEND_ERROR", { cause: error });
    }

    if (!response.ok) {
      const detail = await readBoundedResponseText(response, MAX_ERROR_RESPONSE_BYTES)\n        .then((text) => text.slice(0, 500))\n        .catch(() => "[response body omitted]");
      if (response.status === 409 || response.status === 412) {
        throw new GovernanceReceiptStoreError("Concurrent receipt update rejected", "STATE_CONFLICT");
      }
      throw new GovernanceReceiptStoreError(
        `Receipt backend rejected request (HTTP ${response.status}): ${detail}`,
        "BACKEND_ERROR",
      );
    }
    if (response.status === 204) return undefined as T;
    const text = await response.text();
    return (text ? JSON.parse(text) : undefined) as T;
  }

  async function byIdempotencyKey(idempotencyKey: string): Promise<StoredReceipt | null> {
    const query = `?idempotency_key=eq.${encodeURIComponent(idempotencyKey)}&select=receipt_id,operation_id,idempotency_key,status,receipt,created_at,updated_at&limit=1`;
    const rows = await request<StoredReceipt[]>(query, { method: "GET" });
    return rows[0] ?? null;
  }

  return {
    async create(receipt) {
      assertValidReceipt(receipt);
      if (receipt.status !== "pending") {
        throw new GovernanceReceiptStoreError(
          "New operations must begin in pending state",
          "INITIAL_STATUS_INVALID",
        );
      }

      const rows = await request<StoredReceipt[]>(
        "?on_conflict=idempotency_key&select=receipt_id,operation_id,idempotency_key,status,receipt,created_at,updated_at",
        {
          method: "POST",
          headers: { Prefer: "resolution=ignore-duplicates,return=representation" },
          body: JSON.stringify({
            receipt_id: receipt.receiptId,
            operation_id: receipt.operationId,
            idempotency_key: receipt.idempotencyKey,
            status: receipt.status,
            receipt,
          }),
        },
      );

      if (rows[0]) return rows[0].receipt;

      const existing = await byIdempotencyKey(receipt.idempotencyKey);
      if (!existing) {
        throw new GovernanceReceiptStoreError("Insert returned no row and no idempotent record exists", "BACKEND_ERROR");
      }
      if (!sameIdempotentOperation(existing.receipt, receipt)) {
        throw new GovernanceReceiptStoreError(
          "Idempotency key is already bound to a different operation",
          "IDEMPOTENCY_CONFLICT",
        );
      }
      return existing.receipt;
    },

    async get(receiptId) {
      const rows = await request<StoredReceipt[]>(
        `?receipt_id=eq.${encodeURIComponent(receiptId)}&select=receipt_id,operation_id,idempotency_key,status,receipt,created_at,updated_at&limit=1`,
        { method: "GET" },
      );
      return rows[0]?.receipt ?? null;
    },

    async transition(receiptId, expectedStatus, next) {
      assertValidReceipt(next);
      if (next.receiptId !== receiptId) {
        throw new GovernanceReceiptStoreError("Receipt identity cannot change", "RECEIPT_INVALID");
      }
      if (next.status === expectedStatus || !canTransitionOperation(expectedStatus, next.status)) {
        throw new GovernanceReceiptStoreError("Illegal operation state transition", "STATE_CONFLICT");
      }

      const previous = await this.get(receiptId);
      if (!previous) throw new GovernanceReceiptStoreError("Receipt does not exist", "NOT_FOUND");
      if (previous.status !== expectedStatus) {
        throw new GovernanceReceiptStoreError("Receipt status changed concurrently", "STATE_CONFLICT");
      }
      if (previous.operationId !== next.operationId
        || previous.operation !== next.operation
        || previous.actorRef !== next.actorRef
        || previous.targetRef !== next.targetRef
        || previous.sourceCommitSha !== next.sourceCommitSha
        || previous.artifactSha256 !== next.artifactSha256
        || previous.policyVersion !== next.policyVersion
        || previous.idempotencyKey !== next.idempotencyKey
        || previous.startedAt !== next.startedAt) {
        throw new GovernanceReceiptStoreError("Immutable operation bindings changed", "RECEIPT_INVALID");
      }
      if (Date.parse(next.recordedAt) < Date.parse(previous.recordedAt)) {
        throw new GovernanceReceiptStoreError("Receipt timestamp cannot move backwards", "RECEIPT_INVALID");
      }
      if (!preservesEvidence(previous, next)) {
        throw new GovernanceReceiptStoreError("Existing evidence references cannot be removed", "RECEIPT_INVALID");
      }
      if (next.status === "succeeded") {
        let verified = false;
        try {
          verified = await verifySuccessEvidence(next);
        } catch {
          verified = false;
        }
        if (!verified) {
          throw new GovernanceReceiptStoreError(
            "Success requires independently verified evidence",
            "EVIDENCE_UNVERIFIED",
          );
        }
      }

      const rows = await request<StoredReceipt[]>(
        `?receipt_id=eq.${encodeURIComponent(receiptId)}&status=eq.${encodeURIComponent(expectedStatus)}&select=receipt_id,operation_id,idempotency_key,status,receipt,created_at,updated_at`,
        {
          method: "PATCH",
          headers: { Prefer: "return=representation" },
          body: JSON.stringify({
            status: next.status,
            receipt: next,
            updated_at: new Date().toISOString(),
          }),
        },
      );
      if (!rows[0]) {
        throw new GovernanceReceiptStoreError("Concurrent state transition lost compare-and-set", "STATE_CONFLICT");
      }
      return rows[0].receipt;
    },
  };
}

/** Fail-closed factory: absent configuration means the store is unavailable. */
export function createGovernanceReceiptStoreFromEnv(
  verifySuccessEvidence: EvidenceVerifier,
  fetcher: typeof fetch = fetch,
): GovernanceReceiptStore {
  const env = typeof process === "undefined" ? undefined : process.env;
  const supabaseUrl = env?.['SUPABASE_URL'] ?? env?.['VITE_SUPABASE_URL'];
  const serviceRoleKey = env?.['SUPABASE_SERVICE_ROLE_KEY'];

  if (!supabaseUrl || !serviceRoleKey) {
    throw new GovernanceReceiptStoreError(
      "SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be configured server-side",
      "CONFIG_INVALID",
    );
  }
  return createGovernanceReceiptStore({ supabaseUrl, serviceRoleKey }, verifySuccessEvidence, fetcher);
}
