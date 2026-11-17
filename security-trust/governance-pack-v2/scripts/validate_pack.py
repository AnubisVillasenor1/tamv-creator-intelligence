#!/usr/bin/env python3
"""Dependency-free structural checks for the TAMV governance pack."""
import json
import pathlib
import sys

ROOT = pathlib.Path(__file__).resolve().parents[1]
errors = []
def require(condition, message):
    if not condition:
        errors.append(message)

def main():
    skills = list((ROOT / "skills").glob("*/SKILL.md"))
    require(len(skills) == 5, f"expected 5 skills, found {len(skills)}")
    for skill in skills:
        text = skill.read_text(encoding="utf-8")
        require(text.startswith("---\n") and "\n---\n" in text[4:], f"{skill}: invalid frontmatter")
        require("name:" in text and "description:" in text, f"{skill}: missing metadata")
        require('version: "2.0.0"' in text, f"{skill}: missing version")
    try:
        schema = json.loads((ROOT / "schemas/handoff.schema.json").read_text(encoding="utf-8"))
        example = json.loads((ROOT / "templates/handoff.example.json").read_text(encoding="utf-8"))
        require(schema.get("$schema", "").endswith("2020-12/schema"), "schema draft mismatch")
        require(example.get("constraints", {}).get("external_sharing") is False, "external sharing must be false")
        require(example.get("constraints", {}).get("data_minimization") is True, "data minimization must be true")
        digest = example.get("inputs", [{}])[0].get("digest", "")
        require(len(digest) == 64 and all(c in "0123456789abcdefABCDEF" for c in digest), "invalid SHA-256 digest")
    except (OSError, json.JSONDecodeError, IndexError) as exc:
        errors.append(f"invalid schema/example: {exc}")
    try:
        cases = [json.loads(line) for line in (ROOT / "evals/adversarial-cases.jsonl").read_text(encoding="utf-8").splitlines() if line.strip()]
        ids = [item.get("case_id") for item in cases]
        require(len(cases) >= 8 and len(ids) == len(set(ids)), "case count/IDs invalid")
        require(all(item.get("expected") for item in cases), "case expected assertions missing")
    except (OSError, json.JSONDecodeError) as exc:
        errors.append(f"invalid adversarial cases: {exc}")
    source = (ROOT / "mcp_server/tamv_audit_mcp.py").read_text(encoding="utf-8")
    require("FastMCP" in source and 'transport="stdio"' in source, "MCP entrypoint missing")
    require("requests" not in source and "httpx" not in source and "urllib" not in source, "network client found")
    require("get_evidence" in source and "list_control_evidence" in source, "read-only tools missing")
    fixture = (ROOT / "mcp_server/fixtures.py").read_text(encoding="utf-8")
    require("EVID-SYNTH-001" in fixture and "_FIXTURES" in fixture, "fixed fixture missing")
    if errors:
        print("\n".join("ERROR: " + e for e in errors), file=sys.stderr)
        return 1
    print(f"Security & Trust pack validation passed: {len(skills)} skills, {len(cases)} adversarial cases.")
    return 0

if __name__ == "__main__":
    raise SystemExit(main())
