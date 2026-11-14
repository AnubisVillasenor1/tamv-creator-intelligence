#!/usr/bin/env python3
"""Static fail-closed checks for the Hyper-Core audit-ledger migration."""
from __future__ import annotations

import json
import re
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
MIGRATION = ROOT / "drizzle/migrations/0000_hypercore_audit_ledger.sql"
SCHEMA = ROOT / "drizzle/schema.ts"
JOURNAL = ROOT / "drizzle/migrations/meta/_journal.json"

REQUIRED_SQL = {
    "append-only audit table": r"CREATE TABLE IF NOT EXISTS tamv_hypercore_audit_events",
    "SHA-256 digest": r"digest\s*\(",
    "transaction lock for chain serialization": r"pg_advisory_xact_lock\s*\(",
    "previous-hash chaining": r"previous_hash",
    "event hash": r"event_hash",
    "UPDATE/DELETE rejection": r"BEFORE UPDATE OR DELETE",
    "TRUNCATE rejection": r"BEFORE TRUNCATE",
    "row-level security": r"ENABLE ROW LEVEL SECURITY",
}
REQUIRED_SCHEMA = (
    "tamvHypercoreAuditEvents",
    'pgTable("tamv_hypercore_audit_events"',
    'index("tamv_hypercore_audit_trace_idx")',
    'index("tamv_hypercore_audit_time_idx")',
)

def fail(message: str) -> None:
    print(f"ERROR: {message}", file=sys.stderr)
    raise SystemExit(1)

def main() -> None:
    for path in (MIGRATION, SCHEMA, JOURNAL):
        if not path.is_file():
            fail(f"missing required file: {path.relative_to(ROOT)}")
    sql = MIGRATION.read_text(encoding="utf-8")
    schema = SCHEMA.read_text(encoding="utf-8")
    for label, pattern in REQUIRED_SQL.items():
        if not re.search(pattern, sql, re.IGNORECASE):
            fail(f"migration missing control: {label}")
    for token in REQUIRED_SCHEMA:
        if token not in schema:
            fail(f"Drizzle schema missing mapping: {token}")
    journal = json.loads(JOURNAL.read_text(encoding="utf-8"))
    entries = journal.get("entries", [])
    if not any(entry.get("tag") == "0000_hypercore_audit_ledger" for entry in entries):
        fail("migration is not registered in Drizzle journal")
    if "raw_prompt" in schema or "access_token" in schema:
        fail("sensitive payload fields must not be modeled in the audit ledger")
    print("Hyper-Core audit migration static checks passed.")
    print("Note: static checks do not apply the migration or prove PostgreSQL runtime behavior.")

if __name__ == "__main__":
    main()
