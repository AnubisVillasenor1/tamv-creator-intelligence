# Hyper-Core Ω: durable audit ledger

## Release status: blocked for production

The repository contains a PostgreSQL migration and Drizzle schema for a metadata-only append-only ledger. This is an infrastructure proposal, **not evidence that the application writes events to the table**. The runtime still has no verified server-only adapter connected to the request path, no live migration evidence, and no PostgreSQL integration test run.

**Critical migration defect found during audit:** the current migration assigns `sequence_id` through an identity column before the `BEFORE INSERT` trigger obtains its advisory lock. Identity allocation order is not guaranteed to match lock-acquisition/commit order. If transaction A receives a lower sequence value but transaction B obtains the lock and inserts first, the trigger can chain A after B while A's lower sequence value makes it appear earlier in sequence order. Therefore, ordering by `sequence_id` can disagree with hash-chain order. Do not deploy this migration until the schema owner resolves ordering under the lock and a real concurrent PostgreSQL test demonstrates a single verifiable chain.

## Controls currently represented in the migration

- Metadata-only event shape, event UUID uniqueness, input-hash format validation and controlled core/phase/lane values.
- Transaction-level advisory lock around chain-head selection.
- SHA-256 event hash calculated by PostgreSQL over a JSONB payload that includes the prior event hash.
- Triggers intended to reject UPDATE, DELETE and TRUNCATE.
- Row-level security enabled; access remains unavailable until explicit least-privilege grants and policies are configured.
- Indexes for trace and time-window queries.

These are properties visible in source SQL. They are **not runtime-verified controls** until the migration is applied to a disposable PostgreSQL instance and exercised by tests.

## Database ownership constraint

`AGENTS.md` declares the database schema and migrations Lovable-managed and explicitly prohibits hand-editing `drizzle/` and `supabase/migrations/`. The existing migration files conflict with that repository governance rule. Resolve the workflow with the schema owner/Lovable before changing the migration or applying it. Do not bypass this constraint by editing managed SQL directly.

## Required implementation sequence

1. Ask the approved schema owner to redesign chain ordering so the chain position is assigned/serialized under the same transaction lock; do not assume an identity sequence establishes insertion order.
2. Add a disposable PostgreSQL integration test that launches concurrent writers with intentionally varied scheduling and verifies every row in canonical chain order, recomputes every digest, and detects forks/gaps.
3. Verify UPDATE, DELETE and TRUNCATE rejection using a role that is not the table owner; verify owner-level bypass limitations separately.
4. Define least-privilege service-role grants and deployment-specific RLS policy. Never expose direct client writes.
5. Implement a server-only adapter for `AuditPort.append` that writes only metadata, uses parameterized queries, and fails closed when audit persistence is required but unavailable.
6. Inject the adapter into the real Hyper-Core request path; prove a failed audit write blocks the protected action.
7. Test persistence across process restarts and define backup, restore, retention, export, role rotation and incident-response procedures.
8. Add external anchoring or signed checkpoints if tamper evidence must survive database-owner compromise. A database owner can alter triggers/functions or rewrite the whole chain.

## Privacy and digest limits

Never store prompts, generated content, access tokens, email addresses or other personal data in `details`. `input_hash` is a digest, not encryption; hashes of low-entropy inputs can be guessed. A chain detects mutation only when independently recomputed and compared with a trusted checkpoint.

The current SQL hashes PostgreSQL's JSONB text representation. A verifier must reproduce that serialization exactly or validate the chain in the database; independently serializing a JavaScript object may produce a different digest.

## Production acceptance criteria

- [ ] Schema owner approves the migration workflow and corrected chain-order design.
- [ ] Concurrent integration test passes against PostgreSQL, not regex/static checks.
- [ ] Chain recomputation reports no ordering, linkage or digest errors.
- [ ] Mutation rejection and RLS/grants are tested with deployment-equivalent roles.
- [ ] Server-side `AuditPort` adapter is connected to the actual protected execution path.
- [ ] Fail-closed behavior is tested when PostgreSQL is unavailable.
- [ ] Durability across restarts and backup restoration are demonstrated.
- [ ] A trusted external checkpoint/attestation strategy is documented.
- [ ] CI run evidence is inspected; workflow presence alone is not a passing result.
