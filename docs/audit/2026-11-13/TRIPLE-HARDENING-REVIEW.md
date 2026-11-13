# Triple-hardening review — TAMV Creator Intelligence

**Review date:** 2026-11-13  
**Scope:** repository state on branch `feat/triple-hardening-readme`, including release-sign workflow, attribution manifest, certification runtime, protected capability routes, pack manifest and existing audit artifacts.  
**Status:** remediation in progress; not a production certification or independent external audit.

## Executive result

The repository has a useful fail-closed foundation and documents several limitations explicitly. It is not ready to be represented as a certified production release. The release signature is still `UNSIGNED_RELEASE_PENDING`; the runtime provenance verifier deliberately returns `verified: false`; the generation/voice/AudioCore/agent endpoints are intentionally unavailable; and durable audit persistence and verified multi-tenant RLS remain open.

The README was rewritten to make the architecture, actual capability status, security boundaries, release sequence, technical debt and production gates explicit. Because `README.md` is one of the 22 protected source files, its SHA-256 entry in `tamv-attribution.json` was recalculated and independently compared with the file content. The signature marker remains pending and was not replaced with a fabricated signature. The first CI run also exposed a stale internal pack inventory: 20 existing entries diverged and one file was unregistered. The 21 entries were reconciled against current Git blob IDs and the inventory now contains 61 tracked pack files. A subsequent CI run passed the source certification check, pack manifest validation, 61-file integrity inventory and Bash syntax checks, then exposed a test harness that still expected the legacy `.tamv/skills` install path. The installer defaults to `.agents/skills`; the assertions were corrected and the test script's inventory digest refreshed. A new run is still required to confirm the complete suite.

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
| H3-06 | Installer test expected legacy `.tamv/skills` while installer default is `.agents/skills`. | Corrected in this branch; rerun pending | Updated install-count and backup assertions to match the documented default; refreshed the script hash. | Fresh CI must pass installation, backup and tamper-rejection tests. |

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
