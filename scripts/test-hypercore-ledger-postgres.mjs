#!/usr/bin/env node
/**
 * Destructive-to-the-test-dataset integration probe for the Hyper-Core ledger.
 *
 * SAFETY CONTRACT:
 * - Requires an explicit opt-in flag.
 * - Refuses database names without "test", "disposable", or "ci".
 * - Inserts permanent append-only test events; run only against a freshly
 *   provisioned disposable database, never a shared/staging/production DB.
 * - Does not apply or modify migrations.
 *
 * Usage:
 *   TAMV_HYPERCORE_LEDGER_TEST=1 \
 *   TAMV_HYPERCORE_TEST_DATABASE_URL='postgres://.../tamv_ledger_test' \
 *   node scripts/test-hypercore-ledger-postgres.mjs
 */
import postgres from "postgres";
import { randomUUID, createHash } from "node:crypto";

const optIn = process.env.TAMV_HYPERCORE_LEDGER_TEST;
const databaseUrl = process.env.TAMV_HYPERCORE_TEST_DATABASE_URL;

function fail(message) {
  console.error(`FAIL: ${message}`);
  process.exitCode = 1;
}

async function asServiceRole(operation) {
  return sql.begin(async (tx) => {
    await tx`set local role service_role`;
    return operation(tx);
  });
}

async function expectServiceRoleWriteDenied(label, operation) {
  try {
    await asServiceRole(operation);
    fail(`${label} unexpectedly succeeded as service_role.`);
  } catch (error) {
    const code = String(error?.code ?? "");
    if (code === "42501" || code === "P0001") {
      console.log(`PASS: ${label} denied for service_role (SQLSTATE ${code}).`);
    } else {
      fail(`${label} failed for an unexpected reason (SQLSTATE ${code || "unknown"}).`);
    }
  }
}

if (optIn !== "1") {
  console.error("Refusing to run: set TAMV_HYPERCORE_LEDGER_TEST=1 explicitly.");
  process.exit(64);
}
if (!databaseUrl) {
  console.error("Refusing to run: TAMV_HYPERCORE_TEST_DATABASE_URL is required.");
  process.exit(64);
}

let parsedUrl;
try {
  parsedUrl = new URL(databaseUrl);
} catch {
  console.error("Refusing to run: test database URL is invalid.");
  process.exit(64);
}

if (parsedUrl.protocol !== "postgres:" && parsedUrl.protocol !== "postgresql:") {
  console.error("Refusing to run: database URL must use postgres:// or postgresql://.");
  process.exit(64);
}

const hostname = parsedUrl.hostname.toLowerCase();
const isLoopback = hostname === "localhost" || hostname === "127.0.0.1" || hostname === "::1";
if (!isLoopback && process.env.TAMV_HYPERCORE_TEST_ALLOW_REMOTE !== "1") {
  console.error("Refusing to run against a remote host without TAMV_HYPERCORE_TEST_ALLOW_REMOTE=1.");
  process.exit(64);
}

let databaseName;
try {
  databaseName = decodeURIComponent(parsedUrl.pathname.replace(/^\//, ""));
} catch {
  console.error("Refusing to run: database name has malformed percent-encoding.");
  process.exit(64);
}
if (!/(^|[_-])(test|tests|testing|disposable|ci)([_-]|$)/i.test(databaseName)) {
  console.error("Refusing to run: database name must contain test, disposable, or ci.");
  process.exit(64);
}
if (/(prod|production|staging|stage|live)/i.test(databaseName)) {
  console.error("Refusing to run: database name looks like a shared or production environment.");
  process.exit(64);
}

const sql = postgres(databaseUrl, {
  max: 20,
  connect_timeout: 5,
  idle_timeout: 5,
  max_lifetime: 30,
  onnotice: () => {},
});

const CONCURRENCY = 32;
const tracePrefix = `ledger-concurrency-test-${randomUUID()}`;
const insertedTraceIds = Array.from({ length: CONCURRENCY }, (_, index) => `${tracePrefix}-${index}`);
const digest = (value) => createHash("sha256").update(value).digest("hex");

try {
  const identity = await sql`
    select current_database() as database_name,
           current_user as database_user,
           to_regclass('public.tamv_hypercore_audit_events') as ledger_table
  `;
  const database = identity[0];
  if (!database?.ledger_table) {
    fail("public.tamv_hypercore_audit_events does not exist; apply the approved schema workflow first.");
    process.exitCode = 1;
  } else {
    console.log(`Database: ${database.database_name}; role: ${database.database_user}`);
    const existingRows = await sql`
      select count(*)::bigint as row_count
      from public.tamv_hypercore_audit_events
    `;
    if (BigInt(existingRows[0]?.row_count ?? 0) !== 0n) {
      throw new Error(
        "Refusing to run: the audit ledger must be empty. Use a freshly provisioned disposable database; the probe never deletes append-only events.",
      );
    }
    console.log(`Submitting ${CONCURRENCY} concurrent append attempts; test trace prefix: ${tracePrefix}`);

    const results = await Promise.allSettled(insertedTraceIds.map(async (traceId, index) => {
      // Vary scheduling so lock acquisition order is not identical to array order.
      const delayMs = (CONCURRENCY - index) % 7;
      await new Promise((resolve) => setTimeout(resolve, delayMs));
      const input = digest(`${traceId}:${index}:${randomUUID()}`);
      return asServiceRole((tx) => tx`
        select public.tamv_hypercore_audit_append(
          ${traceId}, now(), 'verification', 'ledger.concurrent.integration_test',
          'completed', 'cold', ${input}::char(64), ${sql.json({ test: true, ordinal: index })}::jsonb
        )
      `);
    }));

    const rejected = results.filter((result) => result.status === "rejected");
    if (rejected.length > 0) {
      fail(`${rejected.length}/${CONCURRENCY} inserts failed; first error: ${String(rejected[0].reason?.message ?? rejected[0].reason).slice(0, 300)}`);
    }

    const rows = await sql`
      select sequence_id, trace_id, event_id, occurred_at, core, event_name, phase,
             lane, input_hash, details, previous_hash, event_hash,
             encode(extensions.digest(convert_to(jsonb_build_object(
               'event_id', event_id,
               'trace_id', trace_id,
               'occurred_at', occurred_at,
               'core', core,
               'event_name', event_name,
               'phase', phase,
               'lane', lane,
               'input_hash', input_hash,
               'details', details,
               'previous_hash', previous_hash
             )::text, 'UTF8'), 'sha256'), 'hex') as recomputed_event_hash
      from public.tamv_hypercore_audit_events
      order by sequence_id asc
    `;
    const testRows = rows.filter((row) => insertedTraceIds.includes(String(row.trace_id)));
    if (testRows.length !== CONCURRENCY) {
      fail(`Expected exactly ${CONCURRENCY} test rows; found ${testRows.length}.`);
    }

    let brokenLinks = 0;
    if (
      rows.length > 0
      && String(rows[0].previous_hash).trim().toLowerCase() !== "0".repeat(64)
    ) {
      brokenLinks += 1;
      console.error("Broken genesis anchor: the first row must reference the 64-zero genesis hash.");
    }
    let malformedHashes = 0;
    let digestMismatches = 0;
    for (let index = 0; index < rows.length; index += 1) {
      const row = rows[index];
      const previousHash = String(row.previous_hash).trim().toLowerCase();
      const eventHash = String(row.event_hash).trim().toLowerCase();
      const recomputedHash = String(row.recomputed_event_hash).trim().toLowerCase();
      if (!/^[a-f0-9]{64}$/i.test(previousHash) || !/^[a-f0-9]{64}$/i.test(eventHash)) {
        malformedHashes += 1;
      }
      if (!/^[a-f0-9]{64}$/i.test(recomputedHash) || recomputedHash !== eventHash) {
        digestMismatches += 1;
        if (digestMismatches <= 5) {
          console.error(`Digest mismatch at sequence_id=${row.sequence_id}; stored event_hash differs from PostgreSQL recomputation.`);
        }
      }
      if (index > 0 && previousHash !== String(rows[index - 1].event_hash).trim().toLowerCase()) {
        brokenLinks += 1;
        if (brokenLinks <= 5) {
          console.error(`Broken chain link at sequence_id=${row.sequence_id}; previous_hash does not match prior event_hash ordered by sequence_id.`);
        }
      }
    }

    const sequenceDuplicates = await sql`
      select sequence_id, count(*)::int as count
      from public.tamv_hypercore_audit_events
      group by sequence_id having count(*) > 1
    `;
    if (brokenLinks > 0) fail(`Chain order/linkage check found ${brokenLinks} broken links across ${rows.length} rows ordered by sequence_id.`);
    if (malformedHashes > 0) fail(`Found ${malformedHashes} rows with malformed previous/event hash values.`);
    if (digestMismatches > 0) fail(`Independent PostgreSQL digest recomputation found ${digestMismatches} mismatches across ${rows.length} rows.`);
    if (sequenceDuplicates.length > 0) fail("Duplicate sequence_id values detected.");
    await expectServiceRoleWriteDenied("direct INSERT", (tx) => {
      const traceId = `direct-write-probe-${randomUUID()}`;
      const input = digest(`direct-write-probe:${traceId}`);
      return tx`
        insert into public.tamv_hypercore_audit_events
          (trace_id, occurred_at, core, event_name, phase, lane, input_hash, details, previous_hash, event_hash)
        values
          (${traceId}, now(), 'verification', 'ledger.direct_write_probe',
           'completed', 'cold', ${input}, ${sql.json({ test: true })}, ${"0".repeat(64)}, ${"0".repeat(64)})
      `;
    });
    await expectServiceRoleWriteDenied("UPDATE", (tx) => tx`
      update public.tamv_hypercore_audit_events
      set details = ${sql.json({ tampered: true })}
      where trace_id = ${insertedTraceIds[0]}
    `);
    await expectServiceRoleWriteDenied("DELETE", (tx) => tx`
      delete from public.tamv_hypercore_audit_events
      where trace_id = ${insertedTraceIds[0]}
    `);
    await expectServiceRoleWriteDenied("TRUNCATE", (tx) => tx`
      truncate table public.tamv_hypercore_audit_events
    `);

    if (rejected.length === 0 && testRows.length === CONCURRENCY && brokenLinks === 0 && malformedHashes === 0 && digestMismatches === 0 && sequenceDuplicates.length === 0 && process.exitCode !== 1) {
      console.log(`PASS: ${CONCURRENCY} concurrent service_role appends accepted; ${rows.length} total rows; chain order and PostgreSQL JSONB digest recomputation are valid.`);
      console.log("PASS: direct INSERT, UPDATE, DELETE, and TRUNCATE were rejected for the effective service_role.");
      console.log("LIMITATION: digest recomputation uses PostgreSQL's own JSONB text serialization; it is independent of the stored event_hash but not an external cross-language canonicalizer.");
      console.log("LIMITATION: this probe does not verify backup/restore or application AuditPort wiring, and it does not substitute for tenant-specific RLS tests.");
      console.log("The test events are append-only and remain in this disposable database. Recreate the database before another clean run.");
    }
  }
} catch (error) {
  fail(String(error?.message ?? error).slice(0, 500));
} finally {
  await sql.end({ timeout: 5 }).catch(() => {});
}

if (process.exitCode === 1) process.exit(1);
