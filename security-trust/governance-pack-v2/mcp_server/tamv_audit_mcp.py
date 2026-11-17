#!/usr/bin/env python3
"""Read-only MCP stdio demo. Synthetic fixtures only; not production-ready."""
from datetime import datetime, timezone
from mcp.server.fastmcp import FastMCP
from fixtures import get_evidence, list_evidence_ids

mcp = FastMCP("tamv-audit-readonly")

@mcp.tool()
def get_evidence_tool(evidence_id: str) -> dict:
    """Return a fixed synthetic evidence fixture by exact ID."""
    return get_evidence(evidence_id)

@mcp.tool()
def list_control_evidence() -> dict:
    """List synthetic fixture identifiers; no production inventory is exposed."""
    return {"status": "ok", "observed_at": datetime.now(timezone.utc).isoformat(),
            "evidence_ids": list_evidence_ids(), "environment": "synthetic-demo"}

if __name__ == "__main__":
    mcp.run(transport="stdio")
