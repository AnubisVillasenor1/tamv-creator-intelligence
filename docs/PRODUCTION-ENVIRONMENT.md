# Production environment preflight

Configure provider credentials in the target deployment secret manager, never in Git, browser-visible VITE variables, issue comments, or build logs.

## Required runtime settings

| Group | Variable | Validation |
| Runtime environment | NODE_ENV | Literal production for strict release preflight |
| Runtime environment | TAMV_DEPLOYMENT_ENV | Literal production; rejected if VERCEL_ENV identifies Preview/development |

|---|---|---|
| Supabase | SUPABASE_URL | HTTPS URL |
| Supabase | SUPABASE_PUBLISHABLE_KEY | Present |
| Supabase | SUPABASE_SERVICE_ROLE_KEY | Present; server only |
| Governance | TAMV_GOVERNANCE_ACTOR_SALT | At least 32 characters; stable across instances |
| AI inference | LOVABLE_API_KEY | Present; server only |
| Distributed review quota | UPSTASH_REDIS_REST_URL | HTTPS URL |
| Distributed review quota | UPSTASH_REDIS_REST_TOKEN | Present; server only |
| Distributed review quota | TAMV_REVIEW_QUOTA_KEY_SALT | At least 32 characters; stable across instances |
| Release verification | TAMV_ATTRIBUTION_PUBLIC_KEY | Ed25519 public key in PEM format |
| Release verification | TAMV_CERTIFICATION_REQUIRED | Literal string true for a production release |

The preflight checks presence and basic shape only. It does not contact providers, prove credentials work, or prove that database tables and RLS are deployed. Strict mode is production-only: both `NODE_ENV` and `TAMV_DEPLOYMENT_ENV` must be `production`. If `VERCEL` or `VERCEL_URL` marks this as a Vercel runtime, `VERCEL_ENV` must be present and equal `production`; an unknown or Preview target is rejected. Local work may set `TAMV_DEPLOYMENT_ENV=local`; this value must never be carried over as the production setting.

## Commands

```sh
bun run ops:preflight
bun run ops:preflight:strict
bun run ops:preflight:test
```

The advisory command is safe for local development and CI without production secrets. Strict mode is intended for a protected release job. Regression tests cover missing configuration, a complete shape-only production configuration, HTTPS validation, Preview/staging rejection, and secret-value non-disclosure.

## Separate production acceptance gates

- Provision and verify the governance receipt schema through the approved Lovable workflow.
- Resolve Hyper-Core ledger ordering with the schema owner; do not hand-edit Lovable-managed migrations.
- Run the guarded concurrent PostgreSQL probe on a disposable database and retain logs for the tested commit.
- Verify RLS and UPDATE/DELETE/TRUNCATE denial with deployment-equivalent non-owner roles.
- Run independent Redis concurrency, expiry, outage, and credential-rotation tests against a disposable instance.
- Connect and test the runtime audit append adapter on the actual protected execution path.
- Sign the exact release manifest with Ed25519, verify the pinned public key, and produce trusted SBOM/build provenance.

A green preflight is not a production certification. Do not enable protected capabilities merely because environment variables exist.
