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

const databaseName = decodeURIComponent(parsedUrl.pathname.replace(/^\//, ""));
if (!/(test|disposable|ci)/i.test(databaseName)) {
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
    console.log(`Submitting ${CONCURRENCY} concurrent append attempts; test trace prefix: ${tracePrefix}`);

    const results = await Promise.allSettled(insertedTraceIds.map(async (traceId, index) => {
      // Vary scheduling so lock acquisition order is not identical to array order.
      const delayMs = (CONCURRENCY - index) % 7;
      await new Promise((resolve) => setTimeout(resolve, delayMs));
      const input = digest(`${traceId}:${index}:${randomUUID()}`);
      return sql`
        insert into public.tamv_hypercore_audit_events
          (trace_id, occurred_at, core, event_name, phase, lane, input_hash, details)
        values
          (${traceId}, now(), 'verification', 'ledger.concurrent.integration_test',
           'completed', 'cold', ${input}, ${sql.json({ test: true, ordinal: index })})
        returning sequence_id, trace_id, previous_hash, event_hash
      `;
    }));

    const rejected = results.filter((result) => result.status === "rejected");
    if (rejected.length > 0) {
      fail(`${rejected.length}/${CONCURRENCY} inserts failed; first error: ${String(rejected[0].reason?.message ?? rejected[0].reason).slice(0, 300)}`);
    }

    const rows = await sql`
      select sequence_id, trace_id, previous_hash, event_hash
      from public.tamv_hypercore_audit_events
      order by sequence_id asc
    `;
    if (rows.length < CONCURRENCY) {
      fail(`Expected at least ${CONCURRENCY} ledger rows after inserts; found ${rows.length}.`);
    }

    let brokenLinks = 0;
    let malformedHashes = 0;
    for (let index = 0; index < rows.length; index += 1) {
      const row = rows[index];
      if (!/^[a-f0-9]{64}$/i.test(String(row.previous_hash)) ||
          !/^[a-f0-9]{64}$/i.test(String(row.event_hash))) {
        malformedHashes += 1;
      }
      if (index > 0 && String(row.previous_hash).toLowerCase() !== String(rows[index - 1].event_hash).toLowerCase()) {
        brokenLinks += 1;
        if (brokenLinks <= 5) {
          console.error(`Broken chain link at sequence_id=${row.sequence_id}; previous_hash does not match prior event_hash.`);
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
    if (sequenceDuplicates.length > 0) fail("Duplicate sequence_id values detected.");
    if (rejected.length === 0 && brokenLinks === 0 && malformedHashes === 0 && sequenceDuplicates.length === 0) {
      console.log(`PASS: ${CONCURRENCY} concurrent appends accepted; ${rows.length} total rows; sequence-order chain links are continuous.`);
      console.log("LIMITATION: this probe verifies chain linkage, not independent recomputation of the SQL JSONB digest.");
      console.log("LIMITATION: this does not verify RLS/grants, UPDATE/DELETE/TRUNCATE protections, backup/restore, or application AuditPort wiring.");
      console.log("The test events are append-only and remain in this disposable database. Recreate the database before another clean run.");
    }
  }
} catch (error) {
  fail(String(error?.message ?? error).slice(0, 500));
} finally {
  await sql.end({ timeout: 5 }).catch(() => {});
}

if (process.exitCode === 1) process.exit(1);
