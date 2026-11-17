"""Fixed synthetic evidence fixtures and deterministic digest helpers."""
import hashlib
import json
import re
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
    """Canonicalize fixture data deterministically for a SHA-256 integrity digest."""
    return json.dumps(
        value, sort_keys=True, separators=(",", ":"), ensure_ascii=False
    ).encode("utf-8")


def is_valid_evidence_id(evidence_id):
    """Accept only bounded synthetic evidence identifiers; never normalize input."""
    return isinstance(evidence_id, str) and re.fullmatch(r"EVID-SYNTH-[0-9]{3}", evidence_id) is not None


def list_evidence_ids():
    return sorted(_FIXTURES)


def get_evidence(evidence_id):
    """Return an isolated fixture copy; never reflect arbitrary input to callers."""
    if not is_valid_evidence_id(evidence_id) or evidence_id not in _FIXTURES:
        return {"status": "not_found"}
    item = deepcopy(_FIXTURES[evidence_id])
    item["digest_sha256"] = hashlib.sha256(canonical_json(item)).hexdigest()
    return item
