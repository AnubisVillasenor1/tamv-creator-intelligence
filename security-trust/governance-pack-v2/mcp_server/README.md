# Read-only MCP demo

Requires Python 3.11+ and the official Python MCP SDK to run the server. Fixture logic and tests use only the Python standard library.

    python3 -m pip install "mcp>=1.0,<2"
    python3 tamv_audit_mcp.py

The server exposes fixed synthetic fixtures only. It has no network client, repository or identity connector, production data or write tools. This is a demonstration of tool shape, not production authorization.

Before a real integration, implement server-side principal/tenant binding, per-call authorization, least privilege, token audience/scope validation, delegated-access consent, SSRF-safe egress, rate limits, audit redaction and revocation tests.
