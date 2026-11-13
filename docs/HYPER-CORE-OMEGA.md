# TAMV Hyper-Core Ω — architecture, controls and operational boundaries

## Objective

Introduce a provider-neutral orchestration boundary for high-throughput work while preserving explicit authorization, verifiable output, append-only audit evidence and recoverable checkpoints. The design follows hexagonal architecture: domain policy is isolated from provider, persistence, queue and standby adapters.

## Three cores

1. **Governance Core** — validates authorization and policy before any work begins. Denial is terminal; fallback cannot bypass it.
2. **Execution Core** — uses the hot lane and may use the cold lane only when the hot adapter reports a retryable failure, a cold adapter is configured, and the request is explicitly idempotent.
3. **Verification Core** — validates the produced result before it is returned.

These are logical responsibility boundaries, not three independent machines. Horizontal deployment, process isolation and independent failure domains require infrastructure configuration outside this module.

## Dual pipeline: hot / cold

- **Hot lane:** primary low-latency execution adapter.
- **Cold lane:** independently configured fallback adapter. It must have compatible policy, schema, privacy, cost controls and idempotency semantics.
- Failover is not automatic for arbitrary errors and is never permitted for a request marked non-idempotent.
- The orchestrator does not speculate by issuing duplicate provider calls in parallel. That avoids duplicated charges and side effects. Hedged requests need a separate cost-aware design and provider cancellation guarantees.

## Standby and backup

Every accepted request writes a checkpoint before execution, then updates it at execution start and terminal state. Checkpoints contain trace metadata and content hashes, not raw user payloads. The StandbyPort must be implemented with durable storage and recovery tests before this can be described as production disaster recovery.

The code requires audit and standby ports. If either refuses a required write, the operation fails closed. This protects against unobservable execution but can reduce availability during a ledger or standby outage; production policy must explicitly define the acceptable availability/security trade-off.

## Hexagonal ports

- GovernancePort: policy and authorization adapter.
- ExecutionPort: hot and optional cold provider adapter.
- VerificationPort: schema, safety, integrity and task-specific result checks.
- AuditPort: durable event ledger with access control and retention policy.
- StandbyPort: durable, encrypted, access-controlled checkpoint storage.

Adapters should be independently testable. Never put provider credentials, raw prompts, secrets or private content in audit events. Use HMAC or keyed hashes if content hashes themselves could leak information through dictionary attacks.

## Required production controls

- Durable audit store with append-only semantics, restricted writers, retention and export.
- Durable standby store in a separate failure domain, encryption at rest and tested restore procedure.
- Per-user and per-tenant authorization, rate limits, quotas, timeouts and bounded concurrency.
- Circuit breakers and retry budgets; exponential backoff with jitter for retryable failures.
- Idempotency keys enforced by the provider adapter or durable execution ledger.
- Output schema validation, content safety checks, data minimization and redaction.
- OpenTelemetry-compatible metrics: p50/p95/p99 latency, queue delay, error rate, fallback rate, audit-write failures, checkpoint age, saturation and cost per successful task.
- CI gates for type checking, lint, unit/integration tests, dependency audit, secret scanning and production build.
- Recovery exercises: hot failure, cold failure, audit outage, standby outage, process termination and duplicate delivery.

## Performance and truthful claims

No implementation can operate faster than light or guarantee zero latency. Network round trips, model inference, storage durability, scheduling and geographic distance impose measurable limits. The goal is bounded latency and predictable degradation, proven by load testing on target infrastructure. Do not publish throughput or availability SLOs until tests and production telemetry support them.

## Current implementation status

The repository contains the orchestration domain module and unit tests for authorization, hot execution, controlled cold failover, output verification, audit failure, standby failure and malformed requests. These are software primitives, not proof that production adapters, a distributed standby cluster, multi-region failover or real-world performance SLOs are deployed. Those remain explicit integration and operations tasks.
