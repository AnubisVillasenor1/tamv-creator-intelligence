#!/usr/bin/env python3
"""Static fail-closed checks for the Hyper-Core audit-ledger migration.

The ordinary CI mode reports a known ledger-order hazard while the schema owner
works through the approved Lovable-managed schema workflow. Release signing uses
--strict-order and refuses to sign if no recognized safe serialization boundary
is demonstrated by the migration.

This is a static heuristic, not a replacement for disposable PostgreSQL tests.
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
REQUIRED_DIRECT_INSERT_REVOKALS = {"anon", "authenticated", "service_role"}
SAFE_APPEND_SEARCH_PATHS = {
    ("pg_catalog", "public"),
    ("pg_catalog", "public", "extensions"),
}
CHAIN_LOCK_PATTERN = re.compile(
    r"pg_advisory_xact_lock\s*\(\s*hashtext\s*\(\s*'([^']+)'\s*\)\s*\)",
    re.IGNORECASE,
)


def fail(message: str) -> None:
    print(f"ERROR: {message}", file=sys.stderr)
    raise SystemExit(1)


def _function_definitions(sql: str) -> list[tuple[str, str, str]]:
    """Return (normalized function name, function header, body).

    Header includes function attributes between the argument list and AS,
    allowing the detector to verify SECURITY DEFINER and a fixed search_path.
    """
    pattern = (
        r"CREATE(?:\s+OR\s+REPLACE)?\s+FUNCTION\s+"
        r"([A-Za-z0-9_.\"]+)\s*\(.*?\)\s*(.*?)\bAS\s+\$\$(.*?)\$\$\s*;"
    )
    definitions = []
    for match in re.finditer(pattern, sql, re.IGNORECASE | re.DOTALL):
        name = match.group(1).replace('"', "").lower()
        header = match.group(2)
        body = match.group(3)
        definitions.append((name, header, body))
    return definitions


def _lock_key_and_position(body: str) -> tuple[str | None, int]:
    """Return a recognized literal hashtext lock key and its source offset."""
    match = CHAIN_LOCK_PATTERN.search(body)
    return (match.group(1), match.start()) if match else (None, -1)


def _safe_search_path(header: str) -> bool:
    match = re.search(r"\bSET\s+search_path\s*=\s*([^;]+)", header, re.IGNORECASE)
    if not match:
        return False
    value = match.group(1).strip().lower()
    # Normalize whitespace and identifier quotes; accept only reviewed fixed paths.
    value = re.sub(r'["\s]', "", value)
    path = tuple(part for part in value.split(",") if part)
    return path in SAFE_APPEND_SEARCH_PATHS


def _revoked_insert_roles(sql: str) -> set[str]:
    """Union role names explicitly denied direct INSERT on the ledger table."""
    roles: set[str] = set()
    pattern = (
        r"REVOKE\s+INSERT\s+ON\s+(?:TABLE\s+)?"
        r"(?:public\.)?tamv_hypercore_audit_events\s+FROM\s+([^;]+);"
    )
    for match in re.finditer(pattern, sql, re.IGNORECASE):
        roles.update(re.findall(r"[A-Za-z_][A-Za-z0-9_$]*", match.group(1).lower()))
    return roles


def _service_role_has_append_execute(sql: str) -> bool:
    pattern = (
        r"GRANT\s+EXECUTE\s+ON\s+FUNCTION\s+"
        r"(?:public\.)?tamv_hypercore_audit_append\s*\([^;]*?\)\s+TO\s+([^;]+);"
    )
    return any(
        "service_role" in re.findall(r"[A-Za-z_][A-Za-z0-9_$]*", match.group(1).lower())
        for match in re.finditer(pattern, sql, re.IGNORECASE)
    )

def _has_direct_insert_grant(sql: str) -> bool:
    """Reject any explicit INSERT/ALL grant that bypasses the append function."""
    pattern = (
        r"GRANT\s+(.+?)\s+ON\s+(?:TABLE\s+)?"
        r"(?:public\.)?tamv_hypercore_audit_events\s+TO\s+[^;]+;"
    )
    for match in re.finditer(pattern, sql, re.IGNORECASE | re.DOTALL):
        privileges = match.group(1).upper()
        if re.search(r"\bINSERT\b", privileges) or re.search(r"\bALL(?:\s+PRIVILEGES)?\b", privileges):
            return True
    return False


def security_definer_findings(sql: str) -> list[str]:
    """Flag an unqualified pgcrypto digest call inside a SECURITY DEFINER ledger trigger.

    The current migration installs pgcrypto in schema extensions, while the trigger
    search_path places public before extensions and calls digest() unqualified. If
    a same-named function can be created in public, name resolution may be shadowed.
    We require the extension function to be explicitly schema-qualified instead of
    assuming that current schema CREATE grants happen to make the path safe.
    """
    findings: list[str] = []
    if not re.search(
        r"CREATE\\s+EXTENSION(?:\\s+IF\\s+NOT\\s+EXISTS)?\\s+pgcrypto\\s+WITH\\s+SCHEMA\\s+extensions",
        sql,
        re.IGNORECASE,
    ):
        return findings

    for name, header, body in _function_definitions(sql):
        if not name.endswith("tamv_hypercore_audit_chain_insert"):
            continue
        if not re.search(r"\\bSECURITY\\s+DEFINER\\b", header, re.IGNORECASE):
            continue
        if re.search(r"(?<![A-Za-z0-9_.])digest\\s*\\(", body, re.IGNORECASE):
            findings.append(
                "P1 SECURITY DEFINER resolution risk: the ledger trigger calls digest() "
                "without schema qualification even though pgcrypto is installed in "
                "extensions. The configured search_path includes public before extensions; "
                "use extensions.digest(...) and validate CREATE privileges on every searched schema."
            )
    return findings


def chain_order_findings(sql: str) -> list[str]:
    """Detect identity/trigger order races and weak append-function boundaries.

    A BEFORE INSERT trigger runs after PostgreSQL has already generated an
    identity value. A lock in that trigger does not serialize that earlier
    allocation. The known pattern is accepted only if the trigger reassigns
    NEW.sequence_id after the recognized chain lock and before reading the
    chain head, or if every app-facing direct INSERT is revoked and a SECURITY
    DEFINER append function with a reviewed fixed search_path takes the exact
    same lock before INSERT and has explicit execution permission.
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

    definitions = _function_definitions(sql)
    trigger = next(
        ((header, body) for name, header, body in definitions
         if name.endswith("tamv_hypercore_audit_chain_insert")),
        ("", ""),
    )
    trigger_header, trigger_body = trigger
    trigger_key, trigger_lock_position = _lock_key_and_position(trigger_body)
    sequence_assignment = re.search(
        r"NEW\s*\.\s*sequence_id\s*:=\s*nextval\s*\(\s*pg_get_serial_sequence\s*\(\s*'public\.tamv_hypercore_audit_events'\s*,\s*'sequence_id'\s*\)\s*\)\s*(?:::bigint)?",
        trigger_body,
        re.IGNORECASE,
    )
    chain_head_read = re.search(
        r"SELECT\s+event_hash\s+INTO\s+last_hash.*?FROM\s+public\.tamv_hypercore_audit_events",
        trigger_body,
        re.IGNORECASE | re.DOTALL,
    )

    trigger_reassignment_safe = bool(
        trigger_key
        and trigger_lock_position >= 0
        and sequence_assignment
        and sequence_assignment.start() > trigger_lock_position
        and chain_head_read
        and trigger_lock_position < chain_head_read.start()
        and sequence_assignment.start() < chain_head_read.start()
    )
    if trigger_reassignment_safe:
        return findings

    append_function_safe = False
    if trigger_key:
        for name, header, body in definitions:
            if not name.endswith("tamv_hypercore_audit_append"):
                continue
            function_key, lock_position = _lock_key_and_position(body)
            insert_match = re.search(
                r"INSERT\s+INTO\s+public\.tamv_hypercore_audit_events",
                body,
                re.IGNORECASE,
            )
            is_security_definer = bool(re.search(r"\bSECURITY\s+DEFINER\b", header, re.IGNORECASE))
            fixed_search_path = _safe_search_path(header)
            same_lock = function_key == trigger_key and lock_position >= 0
            lock_before_insert = bool(insert_match and lock_position < insert_match.start())
            if (
                is_security_definer
                and fixed_search_path
                and same_lock
                and lock_before_insert
            ):
                append_function_safe = True
                break

    revoked_roles = _revoked_insert_roles(sql)
    direct_insert_revoked = REQUIRED_DIRECT_INSERT_REVOKALS.issubset(revoked_roles)
    append_execute_granted = _service_role_has_append_execute(sql)
    direct_insert_granted = _has_direct_insert_grant(sql)

    if not (
        trigger_key
        and append_function_safe
        and direct_insert_revoked
        and append_execute_granted
        and not direct_insert_granted
    ):
        findings.append(
            "P0 chain-order risk: sequence_id is GENERATED ALWAYS AS IDENTITY, but its value is "
            "allocated before the BEFORE INSERT trigger acquires the chain advisory lock. "
            "No safe override using the exact ledger sequence or fully controlled pre-insert append "
            "boundary was proven. The append path must use the same literal advisory-lock key, a "
            "SECURITY DEFINER function with a reviewed fixed search_path, explicit service_role "
            "EXECUTE, revocation of direct INSERT from anon/authenticated/service_role, and no "
            "explicit INSERT/ALL grant that bypasses the append boundary."
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

    findings = chain_order_findings(sql) + security_definer_findings(sql)
    if findings:
        for finding in findings:
            print(f"BLOCKER: {finding}", file=sys.stderr)
        if STRICT_ORDER:
            fail("strict production mode refuses a ledger with unresolved ordering or SECURITY DEFINER resolution risks")
    else:
        print("PASS: no known identity-allocation, trigger-lock or SECURITY DEFINER resolution hazard detected.")

    print("Hyper-Core audit migration structural checks passed.")
    print("NOTE: static checks do not apply the migration or prove PostgreSQL runtime behavior.")
    if not STRICT_ORDER and findings:
        print("NOTE: this is an advisory CI finding; production release signing is blocked until the schema owner resolves it.")


if __name__ == "__main__":
    main()
