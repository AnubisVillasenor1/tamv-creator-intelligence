# Triple-hardening review — TAMV Creator Intelligence

**Review date:** 2026-11-13  
**Scope:** repository state on branch `feat/triple-hardening-readme`, including release-sign workflow, attribution manifest, certification runtime, protected capability routes, pack manifest and existing audit artifacts.  
**Status:** remediation in progress; not a production certification or independent external audit.

## Executive result

The repository has a useful fail-closed foundation and documents several limitations explicitly. It is not ready to be represented as a certified production release. The release signature is still `UNSIGNED_RELEASE_PENDING`; the runtime provenance verifier deliberately returns `verified: false`; the generation/voice/AudioCore/agent endpoints are intentionally unavailable; and durable audit persistence and verified multi-tenant RLS remain open.

The README was rewritten to make the architecture, actual capability status, security boundaries, release sequence, technical debt and production gates explicit. Because `README.md` is one of the 22 protected source files, its SHA-256 entry in `tamv-attribution.json` was recalculated and independently compared with the file content. The signature marker remains pending and was not replaced with a fabricated signature. The first CI run also exposed a stale internal pack inventory: 20 existing entries diverged and one file was unregistered. The 21 entries were reconciled against current Git blob IDs and the inventory now contains 61 tracked pack files. A subsequent CI run passed the source certification check, pack manifest validation, 61-file integrity inventory and Bash syntax checks, then exposed a test harness that still expected the legacy `.tamv/skills` install path. The installer defaults to `.agents/skills`; the assertions were corrected and the test script's inventory digest refreshed. A new run then exposed one brittle tamper test: it replaced only the first occurrence of canonical attribution even though the rewritten README intentionally repeats the institutional attribution at the end. The test now uses `replaceAll` so the tamper case removes every occurrence and asserts the expected fail-closed state. The latest complete CI run passed source certification/hash checks, pack validation, installation and tamper-rejection tests, ShellCheck, application lint, unit/routing tests and production build.

## Layer 1 — Integrity and software supply chain

| ID | Finding | Severity | Evidence/status | Required closure |
|---|---|---:|---|---|
| H1-01 | Release signature remains unsigned. | P0 | `tamv-attribution.sig` contains `UNSIGNED_RELEASE_PENDING`. | Configure protected signing secrets; sign the final canonical manifest; run required-signature verification; archive proof. |
| H1-02 | Source hashes are not a substitute for an authenticated signature. | P0 | `scripts/tamv-certification.mjs` separately checks hashes and Ed25519. | Preserve this separation; test missing, malformed and mismatched signatures. |
| H1-03 | SLSA runtime verification is not integrated. | P1 | `verifyRuntimeProvenance()` deliberately returns `verified: false`. | Integrate a trusted verifier and validate attestation identity, source repository, commit and builder policy. Do not enable capabilities before then. |
| H1-04 | SBOM and supply-chain attestation are not yet evidenced as release artifacts. | P1 | Existing audit marks SBOM/attestation incomplete. | Generate a machine-readable SBOM per release; verify provenance and retain artifacts with release metadata. |
| H1-05 | A tag-triggered release workflow is not evidence that a release has passed. | P1 | `.github/workflows/release-sign.yml` requires secrets and a successful run. | Verify a real tagged release, its CI result, artifact contents and signature from a clean environment. |

## Layer 2 — Runtime security and operational resilience

| ID | Finding | Severity | Evidence/status | Required closure |
|---|---|---:|---|---|
| H2-01 | Four high-impact capability routes are intentionally unavailable. | P1 | `/api/generation`, `/api/voice/generate`, `/api/audiocore/advanced`, `/api/agent` delegate to the unavailable-capability response. | Implement one capability at a time behind explicit authorization, quotas, consent, audit and negative tests. Keep `501` until implementation is real. |
| H2-02 | Runtime provenance is fail-closed and currently blocks all governed capabilities. | P0 for activation | `src/lib/hypercore-turbo/runtime.ts`. | Do not weaken the guard to force activation. Integrate and test trusted provenance first. |
| H2-03 | Durable append-only audit ledger is missing. | P1 | Existing audit records `drizzle/schema.ts` as intentionally empty. | Implement durable event storage, access policy, integrity chaining, retention, backup and restore tests. |
| H2-04 | Multi-tenant RLS is not proven by current repository declarations. | P1 | Existing audit marks migrations/policies as missing. | Add migrations and tenant isolation tests, including negative cross-tenant reads/writes. |
| H2-05 | Quota/concurrency limits may be process-local. | P1 | Existing audit identifies the need for distributed quota validation. | Test multi-instance behavior and move quota state to a shared store if production topology requires it. |
| H2-06 | Load, failover and recovery evidence is incomplete. | P1 | Existing audit marks load/failover tests open. | Establish p95/error objectives, run concurrency/load tests, test provider failure and rollback. |

## Layer 3 — Quality, governance and evidence

| ID | Finding | Severity | Evidence/status | Required closure |
|---|---|---:|---|---|
| H3-01 | Skill count can be mistaken for executor count. | P1 | 37 contracts are catalogued; the audit identifies one real IA executor and incomplete contract bodies. | Report contract, implementation, test and operation status separately; complete each skill with acceptance cases. |
| H3-02 | Policy documents can overstate implemented controls. | P1 | Existing audit records open ledger, RLS, observability and NIST mapping evidence. | Link every policy claim to a test, configuration, operational record or explicitly open gap. |
| H3-03 | Legal/academic claims need provenance and jurisdiction-specific review. | P1 | Existing audit separates claims from independent evidence. | Keep claims at the demonstrated evidence tier; obtain competent review for licensing, privacy and market-specific obligations. |
| H3-04 | README was part of the protected manifest. | Addressed in this branch | README replaced; `integrity.files["README.md"]` recomputed and compared against the resulting content. Signature intentionally remains pending. | Run the repository validators and CI against this branch before merge. |
| H3-05 | Internal pack inventory was stale: 20 existing hashes differed and one script was not registered. | Validator passed in CI | Refreshed 20 differing Git blob IDs and added `scripts/normalize-skill-frontmatter.mjs`; CI reported 61 valid Git blobs. | Keep inventory synchronized on every reviewed pack change. |
| H3-06 | Installer test expected legacy `.tamv/skills` while installer default is `.agents/skills`. | Corrected; subsequent CI passed pack validation and installation/tamper script tests | Updated install-count and backup assertions to match the documented default; refreshed the script hash. | Keep test expectations aligned with installer behavior. |
| H3-07 | Attribution tamper test replaced only the first canonical-text occurrence, leaving the duplicate footer attribution and producing a different failure status. | Corrected and verified in CI | Changed the test fixture to replace every canonical attribution occurrence. The certification and routing test step passed. | Preserve tamper tests when attribution text changes. |

## Verification protocol

Run in a clean checkout with the project's pinned runtime:

```bash
bun install --frozen-lockfile
python3 tamv-pack/scripts/validate-manifest.py
python3 tamv-pack/scripts/validate-integrity.py
bash tamv-pack/scripts/validate-pack.sh
bash tamv-pack/scripts/test-scripts.sh
bun run test
bun run lint
bun run tamv:check
bun run build
```

For an actual certified release, additionally configure the private and public signing secrets in the authorized CI environment and execute `bun run tamv:verify` with `TAMV_CERTIFICATION_REQUIRED=true`. The private key must never be committed or printed. A passing unsigned development build must not be described as a signed release.

## Release gate

A release is blocked if any required integrity hash differs, the manifest is malformed, the signature is missing/invalid, required provenance cannot be verified, critical tests fail, or a claimed capability is not implemented. The gate must not be bypassed by editing the README, the status endpoint or a badge.

## Scope limitations

This review combines source inspection with the repository's existing audit artifacts. It does not claim a fresh successful CI run, a live production test, an external penetration test, a legal opinion, an independent certification or validation of infrastructure secrets. Those require actual execution and external evidence.

## Additional hardening pass — 2026-11-13

### Implemented in the follow-up commit

| Control | Change | Verification gate |
|---|---|---|
| Staged-secret detection | Repository hygiene now examines both the Git index (the exact content committed) and the working tree. Diagnostics identify the source but never echo credential values. Additional high-confidence patterns cover GitHub fine-grained tokens, Slack, OpenAI-style keys, Google API keys, PEM private keys, Supabase/Stripe credentials, AWS access-key IDs, and database URLs containing passwords. | scripts/test-repo-hygiene.py stages a synthetic GitHub credential, removes it only from the working file, and verifies that the index scanner still blocks it. It also tests rejection of a staged .env.production. |
| Cron authentication | Requires a configured current secret of at least 32 non-whitespace characters; validates a configured rotation secret; rejects bearer values over 4,096 characters; treats the Bearer scheme case-insensitively; keeps digest-based constant-time comparisons; and adds no-store and nosniff response headers. | src/test/cron-auth.test.ts covers missing/weak configuration, malformed and oversized credentials, active and previous secrets, mismatches, rotation, and response headers. |
| Local commit hooks | Added opt-in pre-commit and pre-push hooks. Pre-commit checks staged whitespace, secrets in index/worktree, source hash contract, pack integrity and shell syntax. Pre-push runs lint, unit/routing tests and production build. | scripts/test-git-hooks.sh checks syntax, expected gates, installation, executable permissions and refusal to overwrite an existing custom core.hooksPath. |
| Hook installation safety | Added bun run hooks:install. The installer configures a repository-local absolute hook path, changes only hook file permissions, and refuses to replace a different existing core.hooksPath. Hooks are opt-in and remain bypassable by an explicit Git override or --no-verify; CI remains the authoritative gate. | Regression checks run through bun run hooks:test in the validation workflow. |
| CI enforcement | The existing validation workflow runs hook and staged-secret regression tests in addition to the previous hash, pack, lint, unit/routing and build gates. | Required GitHub Actions validation run on this pull request. |

### Operational notes

- Install local hooks with bun run hooks:install; confirm them with bun run hooks:test. The commands require Git and Bash; validation also requires Python 3, Node.js, and Bun.
- The secret scanner is a high-confidence pattern detector, not a replacement for a managed secret-scanning service. A scanner pass is not evidence that no credential has ever been exposed.
- Cron authentication now rejects short or whitespace-bearing values. Configure a random secret of at least 32 characters in LOVABLE_CRON_SECRET; if rotation is used, configure LOVABLE_CRON_SECRET_PREVIOUS with a similarly strong value, then remove the previous value after the rotation window.

### Still open — not certified closed

- tamv-attribution.sig remains UNSIGNED_RELEASE_PENDING; no release signature was fabricated or emitted.
- SLSA trusted provenance is still not verified by runtime.
- Music, voice, AudioCore and agent gateways remain intentionally unavailable until real implementations and provider contracts are connected.
- Durable, append-only audit persistence, production database migrations, verified multi-tenant RLS/negative isolation tests, SBOM/attestation, and load/failover tests still require implementation.
- Local hooks are developer guardrails, not server-side policy. Required CI, branch protection and release authorization still need to be enforced in repository settings.

## Further runtime hardening — 2026-11-13

### Capability authorization allowlist

A code review found that the policy used the JavaScript in operator to check whether a capability was allowlisted. That operator also recognizes inherited object properties such as constructor and toString. The guard now uses Object.prototype.hasOwnProperty.call, so only explicit capability keys may reach the consent check. Regression tests cover constructor, __proto__, toString and hasOwnProperty. The protected SHA-256 entry for src/lib/hypercore-turbo/policy.ts was recalculated in the attribution manifest; the release signature remains intentionally unsigned.

### HyperCore metrics cardinality and label safety

- The per-metric registry is capped at 256 time series. Once the normal-series budget is reached, further distinct label sets fold into one overflow series instead of growing the in-process map without bound.
- Series keys now use JSON-encoded ordered label tuples rather than delimiter concatenation, avoiding collisions when a label contains commas or equals signs.
- Prometheus label rendering escapes CR, LF, tabs, quotes and backslashes and replaces unsupported control characters rather than allowing multi-line/control-character injection.
- A dedicated metrics test suite verifies the cardinality cap, collision resistance and escaping.

### Verification scope

These controls become verified only when the GitHub Actions workflow succeeds on the corresponding commit. Metrics remain process-local; the cap bounds memory/cardinality but does not make metrics durable or distributed. No SLSA verification, release signing, database/RLS migration, or provider-backed music/voice/AudioCore/agent gateway is claimed by these changes.

## Timeout and concurrency accounting — 2026-11-13

The creator-review gateway uses a timeout to bound how long the caller waits. A timeout alone does not cancel a provider promise. Previously, the request's finally block released its process-local concurrency slot immediately, even if the upstream promise had not finished; repeated timeouts could therefore make the in-flight counter understate active provider work.

The timeout error now carries a settlement signal that always resolves when the original provider promise either fulfills or rejects. On timeout, the request transfers slot release to that signal instead of freeing it immediately. This keeps local backpressure aligned with outstanding provider work. Regression tests verify that the slot remains occupied after timeout, is released once the provider settles, concurrent slots remain bounded, and the daily cap still applies when burst tokens refill.

Scope limitation: this is a process-local capacity guard. It does not cancel the upstream provider request, distribute quota across serverless instances, or provide durable accounting. A provider promise that never settles will retain its slot; true cancellation needs explicit provider/gateway support and should be implemented when the gateway contract exposes an abort signal.

## Metrics endpoint access control — 2026-11-13

The HyperCore metrics route previously returned process metrics to any caller. It now requires a server-only bearer credential configured through TAMV_METRICS_TOKEN. The token must be between 32 and 4,096 characters and contain no whitespace; a missing or weak configuration disables the route with 503, while a missing, malformed, oversized or mismatched request credential receives 401. Comparison uses fixed-size SHA-256 digests with timingSafeEqual, and responses are marked no-store/nosniff. No token is shipped in the example environment file or exposed through a VITE_ variable.

The new regression tests cover missing/weak configuration, missing/basic/oversized credentials, mixed-case Bearer syntax, successful authorization, mismatches and non-disclosure of the expected token. The README and environment template document the configuration contract. The README SHA-256 entry was recalculated in the attribution manifest; the release signature remains pending.

## Release supply-chain hardening — 2026-11-13

The certified release workflow now pins third-party actions to audited full commit SHAs for checkout, Bun setup, SBOM generation, attestation and artifact upload. Syft is pinned to v1.33.0. When a version tag points to main history and the required Ed25519 secrets are present, the workflow recalculates and signs the attribution manifest, verifies the signature before and after build, creates a CycloneDX SBOM, packages an archive with normalized archive metadata and a SHA-256 checksum, creates GitHub artifact attestations for SLSA build provenance and the SBOM, verifies both attestations against the repository and expected signer workflow, then uploads the evidence bundle. This is workflow configuration—not proof that a tagged release has passed. The private key, public key, release tag, GitHub plan/permissions and completed tag-run are external prerequisites. Runtime enforcement of SLSA provenance is still open.
