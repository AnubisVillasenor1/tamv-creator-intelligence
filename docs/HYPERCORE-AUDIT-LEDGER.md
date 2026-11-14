# Hyper-Core Ω: durable audit ledger

## Status

This change adds a PostgreSQL migration and Drizzle schema for a metadata-only, append-only audit ledger. It is an infrastructure primitive, **not evidence that the application currently writes audit events to this table**. The Hyper-Core orchestrator still depends on injected `AuditPort` and `StandbyPort` implementations; production wiring, credentials, migration execution, and integration tests remain separate release gates.

## Controls included

- Sequential event IDs and unique event IDs.
- Input hash format validation (SHA-256 hex).
- Controlled values for core, phase, and pipeline lane.
- Transaction-level advisory lock while appending, preventing concurrent writes from forking the chain head.
- SHA-256 event hash calculated by PostgreSQL over a JSONB payload that includes the prior event hash.
- Database triggers reject UPDATE, DELETE, and TRUNCATE.
- Row-level security is enabled; access remains denied unless explicit grants and policies are configured for the deployment roles.
- Indexes support trace lookup and time-window queries.

## Apply

Review the SQL migration against the target PostgreSQL/Supabase project first. Then apply it using the repository's approved migration process. This repository currently has no checked-in `drizzle.config.ts` and no existing migration entries, so do not assume `drizzle-kit migrate` is configured or that CI has applied the migration.

Before production use:

1. Add the database connection configuration through the approved secret manager; never commit credentials.
2. Apply the migration to a disposable database and verify insert, concurrent insert, update/delete/truncate rejection, and chain recomputation.
3. Define least-privilege service-role grants and deployment-specific RLS policy. Do not expose direct client writes.
4. Implement a server-only adapter for `AuditPort.append` that writes only metadata and maps all failures to fail-closed behavior.
5. Inject the adapter into the Hyper-Core orchestrator on the real request path.
6. Add integration tests that prove audit unavailability blocks execution and that events survive process restarts.
7. Define retention, export, backup, restore, and key/role rotation procedures.

## Privacy and integrity limits

Never place prompts, generated content, access tokens, email addresses, or other personal data in `details`. `input_hash` is a digest, not encryption; hashes of low-entropy values can be guessed. The chain detects accidental or unauthorized in-database mutation only when the chain is independently recomputed and compared with a trusted checkpoint. A database owner can alter functions or rewrite the entire chain; this is not a substitute for externally anchored attestations or backups.

The hash is computed from PostgreSQL's JSONB text representation. Verifiers must reproduce that exact serialization or validate the chain in the database; hashing a separately serialized JavaScript object will not necessarily produce the same digest.
