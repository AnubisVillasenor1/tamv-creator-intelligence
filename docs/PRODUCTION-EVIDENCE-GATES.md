# Production evidence gates — TAMV Creator Intelligence

**Status: blocked until evidence is attached.** This checklist distinguishes implementation source from controls demonstrated against a real environment. A green build or Vercel deployment is not proof of database integrity, authorization, backup recovery, or signed provenance.

## 1. Hyper-Core PostgreSQL ledger

### Safe concurrency probe

A guarded integration probe is available at `scripts/test-hypercore-ledger-postgres.mjs`. It requires an explicit opt-in and a database name containing a standalone `test`, `tests`, `testing`, `disposable`, or `ci` token; it refuses names that resemble production or staging. It performs permanent append-only inserts, so run it only against a freshly provisioned disposable database.

```sh
TAMV_HYPERCORE_LEDGER_TEST=1 \
TAMV_HYPERCORE_TEST_DATABASE_URL='postgres://localhost:5432/tamv_ledger_test' \
node scripts/test-hypercore-ledger-postgres.mjs
```

Use a URL configured for your disposable PostgreSQL instance; provide credentials through your local secret manager or PostgreSQL credential file, not in committed documentation. The probe launches 32 concurrent insert attempts and checks that all test rows were persisted, hash format, duplicate sequence IDs, linkage in `sequence_id` order, and each stored `event_hash` against a fresh PostgreSQL-side SHA-256 recomputation of the same JSONB payload. It does not apply migrations or delete test rows. The digest check independently recomputes the value from persisted columns, but deliberately uses PostgreSQL's own JSONB serialization rather than claiming a cross-language canonical encoding. A clean disposable database must be recreated before a clean repeat.

### Required before production

- [ ] Schema owner/Lovable approves a design that assigns canonical chain order while holding the transaction lock. Do not edit `drizzle/` or `supabase/migrations/` manually; see `AGENTS.md`.
- [ ] Apply the approved schema to disposable PostgreSQL and capture the migration version and database version.
- [ ] Run the concurrency probe repeatedly with different scheduling and retain raw logs plus tested commit SHA.
- [x] Implement PostgreSQL-side digest recomputation in the guarded probe; the check is now part of the executable test but remains unverified against a live disposable database until run and logs are attached.
- [ ] Test UPDATE, DELETE, and TRUNCATE denial using a non-owner application role; test expected owner/superuser limitations separately.
- [ ] Verify RLS, grants, and direct client denial with deployment-equivalent roles.
- [ ] Demonstrate persistence after process restart and backup restoration from a known checkpoint.
- [ ] Do not call the ledger production-ready until the issue's acceptance criteria pass: [Issue #14](https://github.com/AnubisVillasenor1/tamv-creator-intelligence/issues/14).

## 2. Runtime audit integration

The existence of the ledger table or the health route is not proof that protected operations append to it.

- [ ] Define a server-only `AuditPort` contract and an adapter using parameterized SQL or the approved database client.
- [ ] Connect the adapter to the actual protected execution path; never accept audit actor/authority claims from client payloads.
- [ ] Add an integration test proving a required audit append failure prevents the protected action from running.
- [ ] Keep audit payloads metadata-only: no prompts, generated content, credentials, tokens, email addresses, or unnecessary personal data.
- [ ] Define retention, export, role rotation, incident response, and external checkpoint ownership.

## 3. Distributed rate limiting

The creator-review path now calls `checkDistributedReviewQuota` before the model gateway. The implementation uses an atomic Redis Lua token-bucket + UTC daily-cap decision and hashes the actor identifier before constructing the Redis key. Process-local fallback is explicitly labeled `local-development` and is permitted only outside production when Redis configuration is absent. Production fails closed when configuration is absent or the Redis service errors.

Required server-side environment variables (configure in the deployment secret manager; never commit values):

- `UPSTASH_REDIS_REST_URL` — HTTPS Upstash-compatible Redis REST endpoint.
- `UPSTASH_REDIS_REST_TOKEN` — secret REST token.
- `TAMV_REVIEW_QUOTA_KEY_SALT` — random secret of at least 32 characters, stable across instances; rotate deliberately because rotation creates a new quota namespace.

Implemented controls:
- Atomic Redis script for token bucket and daily cap in one operation.
- Two-second request timeout, bounded 4 KiB response streaming, response schema validation, hashed actor key, TTL.
- Fail-closed behavior in production for missing configuration, timeout, malformed response, HTTP error, or transport failure.
- Unit tests for allow, local-development-only fallback, production missing config, HTTP failure, malformed/oversized response, and transport failure.

Still required before calling this production-verified:
- [ ] Run unit tests and CI against the exact PR head SHA.
- [ ] Verify quota consistency using concurrent calls from independent server processes against a real disposable Redis/Upstash instance.
- [ ] Test expiry and UTC-day boundaries, Redis outage, and credential rotation.
- [ ] Verify deployment environment variables exist without exposing their values.
- [ ] Keep the per-process in-flight ceiling as a separate local capacity guard; it is not a global concurrency limit.

Do not label a local in-memory limiter as distributed, globally consistent, or production-safe.

## 4. Release signature and provenance

- [ ] Generate Ed25519 keys in an approved secret-management environment. Never commit the private key or place it in browser-visible variables.
- [ ] Produce a signature for the exact release manifest and verify it using the public key pinned through a trusted channel.
- [ ] Produce an SBOM and a trusted build provenance/attestation bound to the source repository, immutable commit SHA, workflow identity, and artifact digest.
- [ ] Verify provenance using a trusted verifier; a manifest signature alone is not SLSA provenance.
- [ ] Test that missing, invalid, wrong-key, wrong-commit, and wrong-artifact attestations fail closed.
- [ ] Attach release artifacts, verifier output, CI run URLs, key identifier (not secret material), and SHA-256 digests to the release record.

Never replace `UNSIGNED_RELEASE_PENDING` with a fabricated signature or mark provenance verified merely because a workflow file exists.

## 5. Evidence record template

Every closure claim must include:

| Field | Required value |
|---|---|
| Finding | Exact issue/requirement ID |
| Source SHA | Full immutable commit SHA |
| Environment | Disposable PostgreSQL version, CI run, or release environment |
| Command | Exact reproducible command |
| Result | Exit code and concise output |
| Artifact | Link to logs, attestation, report, or test output |
| Reviewer | Responsible maintainer/schema owner |
| Residual limits | Explicitly stated |

## Current release decision

Until the database-order defect is resolved through the approved schema workflow, concurrent PostgreSQL evidence passes, runtime audit writes are proven on the protected path, and signature/provenance checks are verified, the correct status is **development / production blocked**. Do not claim zero technical debt or full production certification from static checks alone.
