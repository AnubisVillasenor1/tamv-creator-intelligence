import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const sqlPath = resolve("docs/sql/tamv-governance-receipts.sql");
let sql;

try {
  sql = readFileSync(sqlPath, "utf8");
} catch (error) {
  console.error(`FAIL: cannot read ${sqlPath}: ${error instanceof Error ? error.message : String(error)}`);
  process.exit(1);
}

const normalized = sql.replace(/--[^\n]*/g, " ").replace(/\s+/g, " ").toLowerCase();
const checks = [
  ["current-state receipt table", /create table if not exists public\.tamv_governance_receipts\s*\(/],
  ["append-only event table", /create table if not exists public\.tamv_governance_receipt_events\s*\(/],
  ["unique idempotency key", /idempotency_key text not null unique/],
  ["receipt status constrained", /status text not null check \(status in \('pending','running','succeeded','failed','blocked','recovery_required'\)\)/],
  ["success requires evidence", /status <> 'succeeded' or jsonb_array_length\(receipt -> 'evidence'\) > 0/],
  ["RLS on current-state table", /alter table public\.tamv_governance_receipts enable row level security/],
  ["RLS on event table", /alter table public\.tamv_governance_receipt_events enable row level security/],
  ["no direct access for anon/authenticated", /revoke all on public\.tamv_governance_receipts from anon, authenticated/],
  ["no deletion or truncation of current-state receipts", /revoke delete, truncate on public\.tamv_governance_receipts from service_role/],
  ["event table is read-only for service role", /revoke insert, update, delete, truncate on public\.tamv_governance_receipt_events from anon, authenticated, service_role/],
  ["immutable binding guard", /create or replace function public\.tamv_guard_governance_receipt_update\(\)/],
  ["timestamp monotonicity guard", /governance receipt timestamp cannot move backwards/],
  ["evidence retention guard", /governance receipt evidence cannot be removed/],
  ["state transition guard", /invalid governance operation status transition/],
  ["transactional append-only event trigger", /create trigger tamv_governance_receipt_event after insert or update on public\.tamv_governance_receipts/],
  ["event insert is trigger-owned", /insert into public\.tamv_governance_receipt_events/],
  ["security-definer trigger function has constrained search_path", /security definer set search_path = public, pg_temp/],
];

let failures = 0;
for (const [label, pattern] of checks) {
  if (pattern.test(normalized)) {
    console.log(`PASS: ${label}`);
  } else {
    console.error(`FAIL: ${label}`);
    failures += 1;
  }
}

if (/^\s*drop\s+table\b/im.test(sql)) {
  console.error("FAIL: destructive DROP TABLE statement is forbidden in this schema specification");
  failures += 1;
} else {
  console.log("PASS: no DROP TABLE statement");
}

if (failures > 0) {
  console.error(`Governance SQL static validation failed: ${failures} invariant(s) missing or unsafe.`);
  process.exit(1);
}

console.log(`Governance SQL static validation passed (${checks.length + 1} checks). This is a static contract check, not a live PostgreSQL migration test.`);
