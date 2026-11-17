# Hyper-Core audit ledger — hardening proposal and validation record

Date: 2026-11-17

## Changes in this branch

1. Adds migration `0002_hypercore_audit_ledger_append_boundary.sql`.
2. Replaces the SECURITY DEFINER trigger implementation with an explicitly schema-qualified `extensions.digest(...)` call.
3. Adds `public.tamv_hypercore_audit_append(...)`, which acquires the same transaction-scoped advisory lock **before** the INSERT allocates the identity value. The BEFORE INSERT trigger takes the same transaction lock before reading and extending the chain.
4. Revokes direct INSERT from `PUBLIC`, `anon`, `authenticated` and `service_role`; revokes UPDATE/DELETE/TRUNCATE from those principals; grants only EXECUTE on the append function to `service_role`.
5. Updates the PostgreSQL concurrency probe to exercise the append function rather than bypassing it with direct INSERT.
6. Changes the static validator to inspect every SQL migration and verify that the migration files and Drizzle journal entries match.
7. Adds a regression test against the actual repository migrations, in addition to synthetic unsafe/safe fixtures.

## Security rationale

A BEFORE INSERT trigger acquires its lock after PostgreSQL has allocated an identity sequence value. Locking only inside that trigger does not guarantee that sequence order and hash-chain order agree under concurrency. The new supported write path locks before INSERT, so concurrent calls serialize before identity allocation; the trigger then computes `previous_hash` and `event_hash` under the same transaction lock.

The trigger uses a schema-qualified pgcrypto digest to reduce SECURITY DEFINER search-path ambiguity. Application roles are prevented from bypassing the append function through direct writes.

## Acceptance conditions and limits

- CI must pass the migration inventory, static invariants, and regression tests.
- The migration must be applied through the approved database/schema workflow before runtime behavior changes.
- The PostgreSQL integration probe must run against a freshly provisioned, disposable database, with explicit opt-in and remote-host permission if applicable.
- The probe executes all 32 appends under `SET LOCAL ROLE service_role`, checks valid recomputed event hashes and a continuous hash chain, and verifies that direct INSERT, UPDATE, DELETE, and TRUNCATE are denied for that effective role.
- The probe requires a connection principal permitted to `SET ROLE service_role`. Production database connectivity, tenant-specific RLS behavior, backup/restore, recovery, and application AuditPort wiring remain unverified until separate controlled tests are run.

This change does not apply migrations to Supabase or any external database. Static checks and CI are not proof of runtime database behavior, compliance certification, or production readiness.
