# TAMV Security & Trust Governance Pack v2.0

Advisory package integrated into TAMV Creator Intelligence. It is not a SOC 2 report, NIST certification, legal opinion, production authorization or independent security assessment.

Includes five modular skills, a read-only MCP demonstration using fixed synthetic fixtures, a handoff schema, adversarial cases, tests and a SHA-256 manifest generator.

The MCP demo has no production connectors, network client, repository access, identity integration, financial data or write tools. The official Python MCP SDK is required only to run the stdio server. Do not connect it to production by merely adding credentials.

Validate from this directory:
    python3 -m unittest discover -s tests -v
    python3 scripts/validate_pack.py
    python3 scripts/generate_manifest.py

The manifest establishes byte-level consistency only. It is not a signature, provenance proof, certification or authorization. NIST CSF 2.0 and SOC 2 are distinct frameworks; FAIR-style simulation cannot validate its own assumptions. The application release remains subject to the existing release certification gate.
