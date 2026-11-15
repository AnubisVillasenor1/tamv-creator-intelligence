# ADR-002: Evidence-backed and resumable governed operations

- **Status:** Proposed for review
- **Date:** 2026-11-15
- **Scope:** TAMV Creator Intelligence / Hyper-Core governance contracts
- **Reference:** `jgangini/aidp-ai-data-gobernance` (patterns reviewed; no source implementation imported)

## Context

TAMV already separates policy evaluation from execution and records production blockers explicitly. Operational governance also needs a durable way to identify a specific operation, bind it to the exact source/artifact/destination, retain metadata-only evidence, and resume safely after an interrupted run. A success label without evidence or a retry that silently changes its source is not acceptable.

The AIDP reference documents operation receipts, immutable release selection, identity distinctions, resumable lifecycle operations, and explicit recovery/failure semantics. TAMV should adopt those patterns without coupling its core to OCI, Deploy Studio, Spark, Delta tables, or any specific cloud.

## Decision

1. Define a typed, metadata-only receipt envelope with operation identity, phase, state, policy version, source commit, artifact digest, opaque actor and target references, idempotency key, timestamps, and evidence digests.
2. Require at least one evidence reference for a successful receipt.
3. Use an explicit operation state machine. Terminal states cannot be reopened; recovery remains a distinct state.
4. A resume request must preserve the original operation ID, source commit, artifact digest, target and idempotency key. A different candidate is a new, explicitly authorized update.
5. Keep validation pure and separate from authentication, authorization, durable storage, external execution and cryptographic signing.
6. Never put prompts, creator content, credentials, personal data, or signed/private URLs in receipts.
7. Keep Ed25519 signing separate from verification. The private key remains outside the repository and frontend; the trusted public key must be anchored independently.
8. Treat a validated receipt as a structurally valid claim, not proof of execution until a trusted adapter verifies the destination result and persists the evidence durably.

## Consequences

### Positive
- Retries cannot silently drift to another source or destination.
- Audit evidence can be linked to immutable source and artifact digests.
- Partial recovery and failed rollback can be represented without false success.
- The core contract remains cloud-agnostic and testable.

### Costs and remaining gates
- Durable, atomic receipt storage and distributed idempotency still need an implementation.
- Actor references must be bound to authenticated identity and server-side authorization.
- Integration tests must cover concurrency, process restart, destination failure, duplicate requests, and recovery.
- A release still requires verified Ed25519 signature, SBOM/provenance and exact-artifact validation.
- This ADR and the current pure validators do not certify compliance or production readiness.

## Alternatives rejected

- **Store full prompts/content in the audit log:** rejected due to privacy, retention and secret-exposure risk.
- **Treat client-provided identity as authority:** rejected; identity and authorization must be checked server-side.
- **Resume by creating a fresh deployment or changing the candidate:** rejected because it loses operation continuity and can apply unintended changes.
- **Claim success from a valid schema alone:** rejected because schema validity is not destination evidence.
- **Couple the core to OCI/Deploy Studio:** rejected to preserve TAMV's cloud-agnostic governance boundary.

## Acceptance criteria

- [ ] Review and ratify this ADR.
- [ ] Run unit tests and full CI for the exact commit.
- [ ] Add durable server-side receipt persistence with least-privilege writes.
- [ ] Add concurrency/idempotency/restart/recovery integration tests.
- [ ] Verify signatures and provenance against a pinned trust root.
- [ ] Document retention, access, key rotation, incident response and recovery.
