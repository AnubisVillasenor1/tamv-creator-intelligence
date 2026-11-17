#!/usr/bin/env python3
"""Generate a SHA-256 inventory. The inventory is not a digital signature."""
import hashlib, json, pathlib
from datetime import datetime, timezone
ROOT = pathlib.Path(__file__).resolve().parents[1]
OUTPUT = ROOT / "MANIFEST.sha256.json"
files = {}
for path in sorted(p for p in ROOT.rglob("*") if p.is_file() and p.resolve() != OUTPUT.resolve() and "__pycache__" not in p.parts):
    data = path.read_bytes()
    files[path.relative_to(ROOT).as_posix()] = {"bytes": len(data), "sha256": hashlib.sha256(data).hexdigest()}
manifest = {"schema_version": "1.0", "artifact": "TAMV Security & Trust Governance Pack", "artifact_version": "2.0.0", "generated_at": datetime.now(timezone.utc).isoformat(), "integrity_only_not_signature": True, "files": files}
OUTPUT.write_text(json.dumps(manifest, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")
print(f"Wrote {OUTPUT.name}: {len(files)} files. This is not a digital signature.")
