#!/usr/bin/env python3
"""Read-only MCP stdio demo. Synthetic fixtures only; not production-ready."""
import re
from datetime import datetime, timezone

from mcp.server.fastmcp import FastMCP

from fixtures import get_evidence, list_evidence_ids

mcp = FastMCP("tamv-audit-readonly")
_EVIDENCE_ID = re.compile(r"^EVID-SYNTH-[0-9]{3}$")


@mcp.tool()
def get_evidence_tool(evidence_id: str) -> dict:
    """Return a fixed synthetic evidence fixture by exact, validated ID."""
    if not isinstance(evidence_id, str) or not _EVIDENCE_ID.fullmatch(evidence_id):
        # Do not echo attacker-controlled values into tool responses or logs.
        return {"status": "invalid_request", "error": "evidence_id has an invalid format"}
    return get_evidence(evidence_id)


@mcp.tool()
def list_control_evidence() -> dict:
    """List synthetic fixture identifiers; no production inventory is exposed."""
    return {
        "status": "ok",
        "observed_at": datetime.now(timezone.utc).isoformat(),
        "evidence_ids": list_evidence_ids(),
        "environment": "synthetic-demo",
    }


if __name__ == "__main__":
    mcp.run(transport="stdio")
