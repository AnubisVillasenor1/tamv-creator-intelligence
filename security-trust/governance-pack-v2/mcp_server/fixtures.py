"""Fixed synthetic evidence fixtures and deterministic digest helpers."""
import hashlib
import json
from copy import deepcopy

_FIXTURES = {
    "EVID-SYNTH-001": {
        "evidence_id": "EVID-SYNTH-001",
        "classification": "synthetic",
        "control": "Example access review",
        "status": "not_assessed",
        "owner": "Unassigned",
        "observed_at": "2026-11-17T00:00:00Z",
        "content": "Synthetic fixture only; not evidence about TAMV operations."
    }
}

def canonical_json(value):
    return json.dumps(value, sort_keys=True, separators=(",", ":"), ensure_ascii=False).encode("utf-8")

def list_evidence_ids():
    return sorted(_FIXTURES)

def get_evidence(evidence_id):
    if not isinstance(evidence_id, str) or evidence_id not in _FIXTURES:
        return {"status": "not_found", "evidence_id": str(evidence_id)[:100]}
    item = deepcopy(_FIXTURES[evidence_id])
    item["digest_sha256"] = hashlib.sha256(canonical_json(item)).hexdigest()
    return item
