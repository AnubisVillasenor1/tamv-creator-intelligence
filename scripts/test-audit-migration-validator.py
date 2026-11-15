#!/usr/bin/env python3
"""Regression tests for the audit ledger chain-order detector."""
from __future__ import annotations

import importlib.util
import unittest
from pathlib import Path

SCRIPT = Path(__file__).with_name("validate-audit-migration.py")
SPEC = importlib.util.spec_from_file_location("audit_migration_validator", SCRIPT)
assert SPEC is not None and SPEC.loader is not None
MODULE = importlib.util.module_from_spec(SPEC)
SPEC.loader.exec_module(MODULE)


UNSAFE_IDENTITY_TRIGGER = """
CREATE TABLE public.tamv_hypercore_audit_events (
  sequence_id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY
);
CREATE OR REPLACE FUNCTION public.tamv_hypercore_audit_chain_insert()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = pg_catalog, public, extensions AS $$
BEGIN
  PERFORM pg_advisory_xact_lock(hashtext('tamv_hypercore_audit_events_chain'));
  SELECT event_hash INTO last_hash
  FROM public.tamv_hypercore_audit_events ORDER BY sequence_id DESC LIMIT 1;
  RETURN NEW;
END;
$$;
CREATE TRIGGER tamv_hypercore_audit_chain_before_insert
BEFORE INSERT ON public.tamv_hypercore_audit_events
FOR EACH ROW EXECUTE FUNCTION public.tamv_hypercore_audit_chain_insert();
"""

SAFE_TRIGGER_REASSIGNMENT = UNSAFE_IDENTITY_TRIGGER.replace(
    "  SELECT event_hash INTO last_hash",
    "  NEW.sequence_id := nextval(pg_get_serial_sequence('public.tamv_hypercore_audit_events', 'sequence_id'))::bigint;\n  SELECT event_hash INTO last_hash",
)

SAFE_APPEND_FUNCTION = UNSAFE_IDENTITY_TRIGGER + """
CREATE OR REPLACE FUNCTION public.tamv_hypercore_audit_append()
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = pg_catalog, public AS $
BEGIN
  PERFORM pg_advisory_xact_lock(hashtext('tamv_hypercore_audit_events_chain'));
  INSERT INTO public.tamv_hypercore_audit_events DEFAULT VALUES;
END;
$;
REVOKE INSERT ON TABLE public.tamv_hypercore_audit_events FROM anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.tamv_hypercore_audit_append() TO service_role;
"""

UNQUALIFIED_DIGEST_DEFINER = """
CREATE EXTENSION IF NOT EXISTS pgcrypto WITH SCHEMA extensions;
CREATE OR REPLACE FUNCTION public.tamv_hypercore_audit_chain_insert()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = pg_catalog, public, extensions AS $$
BEGIN
  NEW.event_hash := encode(digest(convert_to(payload::text, 'UTF8'), 'sha256'), 'hex');
  RETURN NEW;
END;
$$;
"""

QUALIFIED_DIGEST_DEFINER = UNQUALIFIED_DIGEST_DEFINER.replace(
    "digest(",
    "extensions.digest(",
)


class ChainOrderDetectorTests(unittest.TestCase):
    def test_current_trigger_pattern_is_reported_as_p0(self) -> None:
        findings = MODULE.chain_order_findings(UNSAFE_IDENTITY_TRIGGER)
        self.assertEqual(len(findings), 1)
        self.assertIn("sequence_id", findings[0])
        self.assertIn("append boundary", findings[0])

    def test_sequence_reassignment_after_same_lock_before_chain_read_is_accepted(self) -> None:
        self.assertEqual(MODULE.chain_order_findings(SAFE_TRIGGER_REASSIGNMENT), [])

    def test_sequence_reassignment_to_unrelated_sequence_is_not_accepted(self) -> None:
        unsafe = SAFE_TRIGGER_REASSIGNMENT.replace(
            "pg_get_serial_sequence('public.tamv_hypercore_audit_events', 'sequence_id')",
            "pg_get_serial_sequence('public.unrelated_table', 'sequence_id')",
        )
        self.assertEqual(len(MODULE.chain_order_findings(unsafe)), 1)

    def test_serialized_append_function_requires_privilege_boundary(self) -> None:
        self.assertEqual(MODULE.chain_order_findings(SAFE_APPEND_FUNCTION), [])

    def test_append_function_with_different_advisory_key_is_not_accepted(self) -> None:
        unsafe = SAFE_APPEND_FUNCTION.replace(
            "pg_advisory_xact_lock(hashtext('tamv_hypercore_audit_events_chain'));\n  INSERT",
            "pg_advisory_xact_lock(hashtext('different-ledger-chain'));\n  INSERT",
        )
        self.assertEqual(len(MODULE.chain_order_findings(unsafe)), 1)

    def test_append_function_without_security_definer_is_not_accepted(self) -> None:
        unsafe = SAFE_APPEND_FUNCTION.replace(" LANGUAGE plpgsql SECURITY DEFINER SET search_path", " LANGUAGE plpgsql SET search_path")
        self.assertEqual(len(MODULE.chain_order_findings(unsafe)), 1)

    def test_append_function_without_fixed_search_path_is_not_accepted(self) -> None:
        unsafe = SAFE_APPEND_FUNCTION.replace(" SECURITY DEFINER SET search_path = pg_catalog, public", " SECURITY DEFINER")
        self.assertEqual(len(MODULE.chain_order_findings(unsafe)), 1)

    def test_append_function_without_direct_insert_revocation_is_not_accepted(self) -> None:
        unsafe = SAFE_APPEND_FUNCTION.replace(
            "REVOKE INSERT ON TABLE public.tamv_hypercore_audit_events FROM anon, authenticated, service_role;",
            "",
        )
        self.assertEqual(len(MODULE.chain_order_findings(unsafe)), 1)

    def test_append_function_with_public_insert_grant_is_not_accepted(self) -> None:
        unsafe = SAFE_APPEND_FUNCTION.replace(
            "REVOKE INSERT ON TABLE public.tamv_hypercore_audit_events FROM anon, authenticated, service_role;",
            "GRANT INSERT ON TABLE public.tamv_hypercore_audit_events TO PUBLIC;\\nREVOKE INSERT ON TABLE public.tamv_hypercore_audit_events FROM anon, authenticated, service_role;",
        )
        self.assertEqual(len(MODULE.chain_order_findings(unsafe)), 1)

    def test_append_function_with_select_insert_grant_is_not_accepted(self) -> None:
        unsafe = SAFE_APPEND_FUNCTION.replace(
            "REVOKE INSERT ON TABLE public.tamv_hypercore_audit_events FROM anon, authenticated, service_role;",
            "GRANT SELECT, INSERT ON TABLE public.tamv_hypercore_audit_events TO report_reader;\\nREVOKE INSERT ON TABLE public.tamv_hypercore_audit_events FROM anon, authenticated, service_role;",
        )
        self.assertEqual(len(MODULE.chain_order_findings(unsafe)), 1)

    def test_append_function_without_service_role_execute_is_not_accepted(self) -> None:
        unsafe = SAFE_APPEND_FUNCTION.replace(
            "GRANT EXECUTE ON FUNCTION public.tamv_hypercore_audit_append() TO service_role;",
            "",
        )
        self.assertEqual(len(MODULE.chain_order_findings(unsafe)), 1)

    def test_partial_direct_insert_revocation_is_not_accepted(self) -> None:
        unsafe = SAFE_APPEND_FUNCTION.replace(
            "REVOKE INSERT ON TABLE public.tamv_hypercore_audit_events FROM anon, authenticated, service_role;",
            "REVOKE INSERT ON TABLE public.tamv_hypercore_audit_events FROM anon, authenticated;",
        )
        self.assertEqual(len(MODULE.chain_order_findings(unsafe)), 1)

    def test_unqualified_pgcrypto_digest_in_definer_trigger_is_reported(self) -> None:
        findings = MODULE.security_definer_findings(UNQUALIFIED_DIGEST_DEFINER)
        self.assertEqual(len(findings), 1)
        self.assertIn("extensions.digest", findings[0])

    def test_schema_qualified_pgcrypto_digest_is_accepted(self) -> None:
        self.assertEqual(MODULE.security_definer_findings(QUALIFIED_DIGEST_DEFINER), [])

    def test_digest_warning_is_limited_to_security_definer_function(self) -> None:
        unsafe = UNQUALIFIED_DIGEST_DEFINER.replace(" SECURITY DEFINER", "")
        self.assertEqual(MODULE.security_definer_findings(unsafe), [])


if __name__ == "__main__":
    unittest.main(verbosity=2)
