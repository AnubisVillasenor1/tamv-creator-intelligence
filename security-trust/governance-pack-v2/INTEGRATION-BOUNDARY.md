# Integration boundary and assurance status

This is a separate advisory package. It does not connect to financial systems, creator records, authentication providers, production repositories, deployment environments or live MCP clients.

Validated locally by this package's checks: skill structure, selected handoff invariants, adversarial case parsing, fixed synthetic fixtures and deterministic fixture digest. The tests do not prove LLM behavior, MCP interoperability, production authentication, tenant isolation, OAuth scopes, network isolation, audit retention, SOC 2/NIST conformity, legal compliance, fairness certification or external-provider security.

Before any real connector: approve a threat model and data-flow diagram; bind identity and tenant server-side; authorize each call; validate token audience/scope and revocation; restrict egress; test cross-tenant access, replay, stale evidence, confused deputy and prompt injection; redact audit logs; obtain independent approval for any write-capable integration.
