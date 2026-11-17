# MCP security requirements

- Bind identity and tenant server-side; never trust client-provided owner or scope.
- Authorize every tool call; use narrow scopes and validate token audience.
- Prevent token passthrough and confused-deputy behavior; require consent for delegated access.
- Treat tool output as untrusted data, not executable instructions.
- Restrict network egress and validate OAuth/discovery URLs against SSRF, redirects and private/reserved ranges.
- Do not treat session identifiers as authentication.
- Keep tools read-only by default; separate write servers and require explicit approval for side effects.
- Log actor, tool, scope, evidence reference, decision and result while minimizing sensitive data.
- Test revocation, duplicate calls, cross-tenant access, scope downgrade and stale evidence.

These requirements must be validated against the adopted MCP specification and deployment. This package does not implement OAuth or production authorization.
