import { DatabaseSync } from "node:sqlite";
import { createHash, randomUUID } from "node:crypto";
import { z } from "zod";

const id = z
  .string()
  .min(1)
  .max(120)
  .regex(/^[\w.-]+$/);
const amount = z.number().int().min(0).max(1_000_000_000);
const requestSchema = z
  .object({
    actor: id,
    tenant: id,
    audience: id,
    resource: id,
    action: z.enum(["resource.read", "payment.simulate"]),
    amount,
    idempotencyKey: id,
  })
  .strict()
  .refine((v) => v.action !== "resource.read" || v.amount === 0);
const hash = (value) => createHash("sha256").update(value).digest("hex");
const encode = (value) => JSON.stringify(value);
const genesis = "0".repeat(64);
const terminal = new Set(["SUCCEEDED", "FAILED", "DENIED", "RECONCILED"]);

export class ResearchGateway {
  constructor(filename, { now = Date.now } = {}) {
    if (filename === ":memory:") throw new Error("Durable file required");
    this.db = new DatabaseSync(filename);
    this.now = now;
    this.db.exec(`PRAGMA journal_mode=WAL; PRAGMA synchronous=FULL; PRAGMA busy_timeout=5000;
      CREATE TABLE IF NOT EXISTS authorities (
        actor TEXT, tenant TEXT, audience TEXT, resource TEXT, action TEXT,
        budget INTEGER NOT NULL, reserved INTEGER NOT NULL DEFAULT 0,
        spent INTEGER NOT NULL DEFAULT 0, revoked INTEGER NOT NULL DEFAULT 0,
        PRIMARY KEY(actor, tenant, audience, resource, action),
        CHECK(budget >= reserved + spent AND reserved >= 0 AND spent >= 0));
      CREATE TABLE IF NOT EXISTS operations (
        id TEXT PRIMARY KEY, nonce TEXT UNIQUE NOT NULL, request TEXT NOT NULL,
        digest TEXT NOT NULL, actor TEXT NOT NULL, tenant TEXT NOT NULL,
        idem TEXT NOT NULL, expires INTEGER NOT NULL, status TEXT NOT NULL,
        result TEXT, UNIQUE(actor, tenant, idem));
      CREATE TABLE IF NOT EXISTS evidence (
        sequence INTEGER PRIMARY KEY, body TEXT NOT NULL, previous TEXT NOT NULL, digest TEXT NOT NULL);`);
  }
  close() {
    this.db.close();
  }
  transaction(fn) {
    this.db.exec("BEGIN IMMEDIATE");
    try {
      const value = fn();
      this.db.exec("COMMIT");
      return value;
    } catch (error) {
      this.db.exec("ROLLBACK");
      throw error;
    }
  }
  provision(input) {
    const policy = z
      .object({
        actor: id,
        tenant: id,
        audience: id,
        resource: id,
        action: z.enum(["resource.read", "payment.simulate"]),
        budget: amount,
      })
      .strict()
      .parse(input);
    this.db
      .prepare(
        "INSERT INTO authorities(actor,tenant,audience,resource,action,budget) VALUES(?,?,?,?,?,?)",
      )
      .run(
        policy.actor,
        policy.tenant,
        policy.audience,
        policy.resource,
        policy.action,
        policy.budget,
      );
  }
  authority(request) {
    return this.db
      .prepare(
        "SELECT * FROM authorities WHERE actor=? AND tenant=? AND audience=? AND resource=? AND action=?",
      )
      .get(request.actor, request.tenant, request.audience, request.resource, request.action);
  }
  adjust(request, reserved, spent) {
    this.db
      .prepare(
        "UPDATE authorities SET reserved=reserved+?, spent=spent+? WHERE actor=? AND tenant=? AND audience=? AND resource=? AND action=?",
      )
      .run(
        reserved,
        spent,
        request.actor,
        request.tenant,
        request.audience,
        request.resource,
        request.action,
      );
  }
  record(operationId, status, requestDigest) {
    const last = this.db
      .prepare("SELECT sequence,digest FROM evidence ORDER BY sequence DESC LIMIT 1")
      .get();
    const sequence = (last?.sequence ?? 0) + 1;
    const previous = last?.digest ?? genesis;
    const body = encode({
      schema: "tamv.research.receipt.v1",
      sequence,
      operationId,
      status,
      requestDigest,
      recordedAt: this.now(),
      environment: "synthetic-local",
    });
    this.db
      .prepare("INSERT INTO evidence VALUES(?,?,?,?)")
      .run(sequence, body, previous, hash(encode(["tamv.research.evidence.v1", previous, body])));
  }
  authorize(input, ttlMs = 60_000) {
    const request = requestSchema.parse(input);
    z.number().int().min(1).max(300_000).parse(ttlMs);
    const serialized = encode(request),
      digest = hash(serialized);
    return this.transaction(() => {
      const existing = this.db
        .prepare("SELECT * FROM operations WHERE actor=? AND tenant=? AND idem=?")
        .get(request.actor, request.tenant, request.idempotencyKey);
      if (existing) {
        if (existing.digest !== digest) throw new Error("IDEMPOTENCY_CONFLICT");
        return { operationId: existing.id, nonce: existing.nonce, status: existing.status };
      }
      const operationId = randomUUID(),
        nonce = randomUUID(),
        policy = this.authority(request);
      const allowed =
        policy &&
        !policy.revoked &&
        policy.budget - policy.reserved - policy.spent >= request.amount;
      const status = allowed ? "AUTHORIZED" : "DENIED";
      if (allowed) this.adjust(request, request.amount, 0);
      this.db
        .prepare(
          "INSERT INTO operations(id,nonce,request,digest,actor,tenant,idem,expires,status) VALUES(?,?,?,?,?,?,?,?,?)",
        )
        .run(
          operationId,
          nonce,
          serialized,
          digest,
          request.actor,
          request.tenant,
          request.idempotencyKey,
          this.now() + ttlMs,
          status,
        );
      this.record(operationId, status, digest);
      return { operationId, nonce, status };
    });
  }
  revoke(actor, tenant) {
    this.transaction(() => {
      this.db
        .prepare("UPDATE authorities SET revoked=1 WHERE actor=? AND tenant=?")
        .run(id.parse(actor), id.parse(tenant));
      this.record(randomUUID(), "REVOKED", hash(encode([actor, tenant])));
    });
  }
  operation(operationId, actor, tenant) {
    const row = this.db
      .prepare("SELECT * FROM operations WHERE id=? AND actor=? AND tenant=?")
      .get(id.parse(operationId), id.parse(actor), id.parse(tenant));
    if (!row) throw new Error("NOT_AUTHORIZED");
    return row;
  }
  finish(row, status, result) {
    const request = JSON.parse(row.request);
    const settled = status === "SUCCEEDED" || status === "RECONCILED";
    this.adjust(request, -request.amount, settled ? request.amount : 0);
    this.db
      .prepare("UPDATE operations SET status=?, result=? WHERE id=?")
      .run(status, encode(result), row.id);
    this.record(row.id, status, row.digest);
    return { operationId: row.id, status, result };
  }
  async execute(input, permit, provider) {
    const request = requestSchema.parse(input);
    const claim = this.transaction(() => {
      const row = this.operation(permit.operationId, request.actor, request.tenant);
      if (row.nonce !== permit.nonce || row.digest !== hash(encode(request)))
        throw new Error("PERMIT_MISMATCH");
      if (row.status !== "AUTHORIZED") return { status: row.status, operationId: row.id };
      const policy = this.authority(request);
      if (!policy || policy.revoked || this.now() >= row.expires)
        return this.finish(row, "DENIED", null);
      this.db.prepare("UPDATE operations SET status='CLAIMED' WHERE id=?").run(row.id);
      this.record(row.id, "CLAIMED", row.digest);
      return { row };
    });
    if (!claim.row) return claim;
    let result;
    try {
      result = await provider.apply(claim.row.id, request);
    } catch {
      return this.transaction(() => {
        const current = this.operation(claim.row.id, request.actor, request.tenant);
        if (terminal.has(current.status))
          return { operationId: current.id, status: current.status };
        this.db.prepare("UPDATE operations SET status='UNKNOWN' WHERE id=?").run(claim.row.id);
        this.record(claim.row.id, "UNKNOWN", claim.row.digest);
        return { operationId: claim.row.id, status: "UNKNOWN" };
      });
    }
    return this.transaction(() => {
      const current = this.operation(claim.row.id, request.actor, request.tenant);
      return terminal.has(current.status)
        ? { operationId: current.id, status: current.status }
        : this.finish(current, "SUCCEEDED", result);
    });
  }
  async reconcile(operationId, actor, tenant, provider) {
    const row = this.operation(operationId, actor, tenant);
    if (terminal.has(row.status)) return { operationId, status: row.status };
    if (!["UNKNOWN", "CLAIMED"].includes(row.status)) throw new Error("NOT_RECONCILABLE");
    // Only an authoritative, idempotent sandbox lookup can settle an uncertain effect.
    const result = await provider.lookup(operationId);
    if (!result) return { operationId, status: row.status };
    return this.transaction(() => {
      const current = this.operation(operationId, actor, tenant);
      if (terminal.has(current.status)) return { operationId, status: current.status };
      return this.finish(current, "RECONCILED", result);
    });
  }
  expire() {
    return this.transaction(() => {
      const rows = this.db
        .prepare("SELECT * FROM operations WHERE status='AUTHORIZED' AND expires<=?")
        .all(this.now());
      for (const row of rows) this.finish(row, "DENIED", null);
      return rows.length;
    });
  }
  evidence() {
    return this.db.prepare("SELECT * FROM evidence ORDER BY sequence").all();
  }
  anchor() {
    const rows = this.evidence();
    return { count: rows.length, digest: rows.at(-1)?.digest ?? genesis };
  }
  exportEvidence() {
    const events = this.evidence();
    return {
      schema: "tamv.research.evidence-export.v1",
      environment: "synthetic-local",
      events,
      anchor: { count: events.length, digest: events.at(-1)?.digest ?? genesis },
    };
  }
}

export function verifyResearchEvidence(events, trustedAnchor) {
  let previous = genesis;
  for (let i = 0; i < events.length; i++) {
    const row = events[i];
    if (
      row.sequence !== i + 1 ||
      row.previous !== previous ||
      row.digest !== hash(encode(["tamv.research.evidence.v1", previous, row.body]))
    )
      return false;
    try {
      if (JSON.parse(row.body).sequence !== row.sequence) return false;
    } catch {
      return false;
    }
    previous = row.digest;
  }
  return trustedAnchor.count === events.length && trustedAnchor.digest === previous;
}

export class SyntheticProvider {
  constructor(filename) {
    this.db = new DatabaseSync(filename);
    this.db.exec(`PRAGMA journal_mode=WAL; PRAGMA synchronous=FULL; PRAGMA busy_timeout=5000;
      CREATE TABLE IF NOT EXISTS effects(id TEXT PRIMARY KEY, digest TEXT NOT NULL, result TEXT NOT NULL);
      CREATE TABLE IF NOT EXISTS resources(tenant TEXT, resource TEXT, content TEXT, PRIMARY KEY(tenant,resource));`);
  }
  close() {
    this.db.close();
  }
  resource(tenant, resource, content) {
    this.db
      .prepare("INSERT INTO resources VALUES(?,?,?)")
      .run(id.parse(tenant), id.parse(resource), z.string().max(8192).parse(content));
  }
  apply(operationId, input) {
    const request = requestSchema.parse(input),
      digest = hash(encode(request));
    this.db.exec("BEGIN IMMEDIATE");
    try {
      const old = this.db.prepare("SELECT * FROM effects WHERE id=?").get(id.parse(operationId));
      if (old && old.digest !== digest) throw new Error("IDEMPOTENCY_CONFLICT");
      let result = old ? JSON.parse(old.result) : null;
      if (!result) {
        result =
          request.action === "resource.read"
            ? this.db
                .prepare("SELECT content FROM resources WHERE tenant=? AND resource=?")
                .get(request.tenant, request.resource)
            : {
                simulated: true,
                unit: "TEST_CREDIT",
                amount: request.amount,
                recipient: request.resource,
              };
        if (!result) throw new Error("RESOURCE_NOT_FOUND");
        this.db
          .prepare("INSERT INTO effects VALUES(?,?,?)")
          .run(operationId, digest, encode(result));
      }
      this.db.exec("COMMIT");
      return result;
    } catch (error) {
      this.db.exec("ROLLBACK");
      throw error;
    }
  }
  lookup(operationId) {
    const row = this.db.prepare("SELECT result FROM effects WHERE id=?").get(id.parse(operationId));
    return row ? JSON.parse(row.result) : null;
  }
}
