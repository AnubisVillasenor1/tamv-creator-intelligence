#!/usr/bin/env python3
"""Static fail-closed checks for the Hyper-Core audit-ledger migration.

The default mode validates structural safeguards and reports known chain-order
risks without turning the whole development CI red while the schema owner is
working through the approved Lovable-managed schema workflow.

Use --strict-order on a production release path. It fails unless sequence_id
allocation is serialized before the chain-head is observed, or a controlled
SECURITY DEFINER append function acquires the same transaction lock before
INSERT and direct table INSERT is revoked from application roles.
"""
from __future__ import annotations

import json
import re
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
MIGRATION = ROOT / "drizzle/migrations/0000_hypercore_audit_ledger.sql"
SCHEMA = ROOT / "drizzle/schema.ts"
JOURNAL = ROOT / "drizzle/migrations/meta/_journal.json"
STRICT_ORDER = "--strict-order" in sys.argv

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
    "pgTable(",
    '"tamv_hypercore_audit_events"',
    'index("tamv_hypercore_audit_trace_idx")',
    'index("tamv_hypercore_audit_time_idx")',
)


def fail(message: str) -> None:
    print(f"ERROR: {message}", file=sys.stderr)
    raise SystemExit(1)


def _function_bodies(sql: str) -> list[tuple[str, str]]:
    """Return named PL/pgSQL/SQL function bodies using $$ delimiters."""
    matches = re.finditer(
        r"CREATE(?:\s+OR\s+REPLACE)?\s+FUNCTION\s+"
        r"([A-Za-z0-9_.\"]+)\s*\(.*?\).*?AS\s+\$\$(.*?)\$\$\s*;",
        sql,
        re.IGNORECASE | re.DOTALL,
    )
    return [(match.group(1).replace('"', "").lower(), match.group(2)) for match in matches]


def chain_order_findings(sql: str) -> list[str]:
    """Detect the known identity-allocation-before-trigger-lock race.

    A BEFORE INSERT trigger gets a generated identity value before its body is
    run. Taking an advisory lock inside the trigger therefore does not ensure
    that sequence_id order matches lock/commit order. A safe design must either
    override the final sequence allocation under that lock, or force all
    inserts through an append function that takes the same lock before INSERT
    and revoke direct INSERT from application roles.
    """
    findings: list[str] = []
    normalized = sql.lower()
    identity_sequence = bool(re.search(
        r"sequence_id\s+bigint\s+generated\s+always\s+as\s+identity",
        normalized,
    ))
    before_insert = bool(re.search(
        r"create\s+trigger\s+\w+\s+before\s+insert\s+on\s+(?:public\.)?tamv_hypercore_audit_events",
        normalized,
    ))
    if not identity_sequence or not before_insert:
        return findings

    bodies = _function_bodies(sql)
    trigger_body = next(
        (body for name, body in bodies if name.endswith("tamv_hypercore_audit_chain_insert")),
        "",
    )
    lock_position = trigger_body.lower().find("pg_advisory_xact_lock")
    sequence_assignment = re.search(
        r"new\s*\.\s*sequence_id\s*:=\s*nextval\s*\(",
        trigger_body,
        re.IGNORECASE,
    )
    if sequence_assignment and lock_position >= 0 and sequence_assignment.start() > lock_position:
        return findings

    append_function_safe = False
    for name, body in bodies:
        if not name.endswith("tamv_hypercore_audit_append"):
            continue
        body_lower = body.lower()
        lock_position = body_lower.find("pg_advisory_xact_lock")
        insert_position = body_lower.find("insert into public.tamv_hypercore_audit_events")
        if lock_position >= 0 and insert_position > lock_position:
            append_function_safe = True
            break

    direct_insert_revoked = bool(re.search(
        r"revoke\s+insert\s+on\s+(?:table\s+)?public\.tamv_hypercore_audit_events\s+from\s+[^;]*\b(?:anon|authenticated|service_role)\b[^;]*;",
        normalized,
        re.IGNORECASE,
    ))
    append_execute_granted = bool(re.search(
        r"grant\s+execute\s+on\s+function\s+public\.tamv_hypercore_audit_append\s*\([^;]*?\)\s+to\s+[^;]*\bservice_role\b",
        normalized,
        re.IGNORECASE,
    ))

    if not (append_function_safe and direct_insert_revoked and append_execute_granted):
        findings.append(
            "P0 chain-order risk: sequence_id is GENERATED ALWAYS AS IDENTITY, but its value is "
            "allocated before the BEFORE INSERT trigger acquires the chain advisory lock. "
            "The migration does not serialize direct INSERT allocation via a pre-insert append "
            "function or reassign NEW.sequence_id under the lock. Hash linkage can therefore "
            "disagree with sequence_id order under concurrent inserts."
        )
    return findings


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
    try:
        journal = json.loads(JOURNAL.read_text(encoding="utf-8"))
    except (json.JSONDecodeError, OSError) as error:
        fail(f"Drizzle journal is not valid JSON: {error}")
    entries = journal.get("entries", [])
    if not any(entry.get("tag") == "0000_hypercore_audit_ledger" for entry in entries):
        fail("migration is not registered in Drizzle journal")
    if "raw_prompt" in schema or "access_token" in schema:
        fail("sensitive payload fields must not be modeled in the audit ledger")

    findings = chain_order_findings(sql)
    if findings:
        for finding in findings:
            print(f"BLOCKER: {finding}", file=sys.stderr)
        if STRICT_ORDER:
            fail("strict production mode refuses a ledger whose chain order is not proven safe")
    else:
        print("PASS: no known identity-allocation/trigger-lock ordering hazard detected.")

    print("Hyper-Core audit migration structural checks passed.")
    print("NOTE: static checks do not apply the migration or prove PostgreSQL runtime behavior.")
    if not STRICT_ORDER and findings:
        print("NOTE: this is an advisory CI finding; production release signing is blocked until the schema owner resolves it.")


if __name__ == "__main__":
    main()
