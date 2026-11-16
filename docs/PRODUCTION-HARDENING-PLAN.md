# TAMV Creator Intelligence — Production hardening plan

**Revision date:** 2026-11-15  
**Repository:** `AnubisVillasenor1/tamv-creator-intelligence`  
**Disposition:** Mainline development state; production certification not established. Code-level hardening is advanced, but external infrastructure evidence remains incomplete.

This plan separates repository changes from external infrastructure actions. A source change is not a deployed feature, and a workflow file is not evidence of a successful CI run.

## Implemented in this change set

- [x] Added unit tests for the creator-review guard: token-bucket burst, refill, daily cap, process concurrency, timeout settlement and memory bound.
- [x] Added a hard cap of 5,000 process-local quota buckets; new IDs are temporarily denied if the map is full and stale entries cannot be pruned.
- [x] Documented that process-local quotas are not globally consistent across serverless instances.
- [x] Require explicit `TAMV_DEPLOYMENT_ENV=local|development|test` for process-local quota fallback and reject it when Vercel deployment markers are present, even if `NODE_ENV` is misclassified.
- [x] Require an explicit non-empty `TAMV_DEPLOYMENT_ENV`; `NODE_ENV` alone can no longer authorize local quota fallback. Regression coverage includes `NODE_ENV=test` with deployment classification missing.
- [x] Harden the distributed quota adapter so unexpected exceptions outside the Redis transport boundary return a fail-closed `server-busy` decision; this preserves the caller's existing slot-release path. Regression coverage injects a clock exception before any Redis request.
- [x] Detect the PostgreSQL identity-allocation/trigger-lock ordering hazard in static review and make signed-release CI refuse to sign while the known P0 schema defect remains.
- [x] Documented the Hyper-Core ledger chain-order defect and blocked production acceptance until corrected through the approved schema-management workflow.

## Critical blockers — must be resolved before production claims

| Priority | Gate | Evidence required | Current status |
|---|---|---|---|
| P0 | Ledger ordering correctness | Corrected schema reviewed by schema owner; concurrent PostgreSQL integration test and digest recomputation | Blocked: current identity allocation can disagree with lock order |
| P0 | Schema ownership | Lovable/schema owner approves the source of truth and migration process | Blocked: repository instructions prohibit hand-editing `drizzle/` |
| P0 | Durable audit integration | Server-only `AuditPort` adapter connected to protected execution path; fail-closed integration test | Not integrated |
| P0 | Release signature | Release manifest signed with protected Ed25519 private key; public-key verification passes | Unsigned release marker remains |
| P1 | Shared quotas | Atomic, durable per-user limits and concurrency controls across instances | Process-local only |
| P1 | SBOM and provenance | Generated SBOM attached to release; trusted build attestation and verifier evidence | Runtime provenance reports `not-integrated`; successful release evidence not verified |
| P1 | Database authorization | Deployment-specific RLS, grants and negative tests with production-equivalent roles | Not verified |
| P1 | Recovery | Backup/restore drill and persistence-across-restart tests | Not verified |
| P1 | Observability | External trace/metric aggregation, alert ownership and incident runbook | Local/process scope; no production aggregation verified |
| P2 | Capability execution | For each public capability, an actual executor, provider configuration, rights/consent gates and tests | Several routes intentionally return 501; contracts are not executors |
| P2 | Release scorecard | Regenerate scorecard from current source and evidence, recording generator commit and run URL | Existing scorecard is historical and stale |

## Validation sequence

1. Run the focused Vitest suites for `src/lib/review-guard.test.ts`, `src/lib/hypercore-turbo/policy.test.ts` and `src/lib/hypercore-turbo/parallel-runner.test.ts`.
2. Run full `bun run test`, `bun run lint`, `bun run tamv:check`, and `bun run build` in a clean checkout with the committed lockfile.
3. Verify the GitHub Actions run for the exact commit and inspect each job result. Do not infer success from the workflow definition.
4. Resolve the ledger schema through the approved Lovable workflow, then run PostgreSQL concurrency and mutation tests against a disposable database.
5. Integrate the audit adapter and shared quota store with integration tests; use deployment secrets only through the approved secret manager.
6. Generate SBOM and build provenance; verify signatures with a trusted verifier and publish only the evidence tied to the exact artifact digest.
7. Recalculate the scorecard from current evidence. Never copy the previous score as if it were a fresh independent assessment.

## Operational boundaries

- Do not commit credentials, private signing keys, database URLs, tokens or production data.
- Do not apply an unverified migration to production.
- Do not label the system certified, globally rate-limited, durable, tamper-proof or production-ready until the corresponding gate has passing evidence.
- Keep unavailable capabilities explicitly blocked instead of returning fabricated success payloads.
- Any score or percentage must name its rubric, source commit, test run and limitations.
