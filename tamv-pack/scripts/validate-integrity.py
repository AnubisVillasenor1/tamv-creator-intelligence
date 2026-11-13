#!/usr/bin/env python3
"""Verify a reviewed Git-blob inventory for TAMV pack files."""
from __future__ import annotations

import argparse
import hashlib
import json
import sys
from pathlib import Path, PurePosixPath

PACK_ROOT = Path(__file__).resolve().parents[1]
LOCK_PATH = PACK_ROOT / "integrity.json"
EXCLUDED_PARTS = {".tamv"}
EXPECTED_SCOPE = "All regular files below tamv-pack except integrity.json and .tamv/**."


def relative_name(path: Path) -> str:
    return path.relative_to(PACK_ROOT).as_posix()


def discover_files() -> dict[str, Path]:
    found: dict[str, Path] = {}
    for path in PACK_ROOT.rglob("*"):
        if path.is_symlink():
            raise ValueError(f"No se permiten enlaces simbólicos en el alcance: {relative_name(path)}")
        if not path.is_file():
            continue
        relative = relative_name(path)
        if relative == "integrity.json" or EXCLUDED_PARTS.intersection(PurePosixPath(relative).parts):
            continue
        found[relative] = path
    return dict(sorted(found.items()))


def git_blob_sha1(path: Path) -> str:
    content = path.read_bytes()
    header = b"blob " + str(len(content)).encode("ascii") + bytes([0])
    return hashlib.sha1(header + content).hexdigest()


def current_hashes() -> dict[str, str]:
    return {name: git_blob_sha1(path) for name, path in discover_files().items()}


def write_lock(hashes: dict[str, str]) -> None:
    payload = {
        "schemaVersion": 1,
        "algorithm": "GIT-BLOB-SHA1",
        "scope": EXPECTED_SCOPE,
        "updateCommand": "python3 tamv-pack/scripts/validate-integrity.py --write",
        "files": hashes,
    }
    LOCK_PATH.write_text(json.dumps(payload, ensure_ascii=False, indent=2) + "\\n", encoding="utf-8")


def validate_lock(hashes: dict[str, str]) -> list[str]:
    try:
        manifest = json.loads(LOCK_PATH.read_text(encoding="utf-8"))
    except (OSError, json.JSONDecodeError) as error:
        return [f"No se pudo leer integrity.json: {error}"]
    if manifest.get("schemaVersion") != 1 or manifest.get("algorithm") != "GIT-BLOB-SHA1":
        return ["Esquema o algoritmo de inventario no reconocido."]
    if manifest.get("scope") != EXPECTED_SCOPE:
        return ["El alcance de integrity.json no coincide con la política."]
    expected = manifest.get("files")
    if not isinstance(expected, dict):
        return ["integrity.json debe contener un objeto files."]
    findings = []
    missing = sorted(set(hashes) - set(expected))
    stale = sorted(set(expected) - set(hashes))
    if missing:
        findings.append("Archivos sin huella: " + ", ".join(missing))
    if stale:
        findings.append("Entradas obsoletas: " + ", ".join(stale))
    for name in sorted(set(hashes).intersection(expected)):
        value = expected[name]
        if not isinstance(value, str) or len(value) != 40 or any(c not in "0123456789abcdef" for c in value):
            findings.append(f"Identificador de objeto Git inválido: {name}")
        elif hashes[name] != value:
            findings.append(f"Discrepancia de integridad: {name}")
    return findings


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--write", action="store_true", help="regenera el inventario; revisa el diff antes de confirmar")
    args = parser.parse_args()
    try:
        hashes = current_hashes()
    except (OSError, ValueError) as error:
        print(f"Error al calcular integridad: {error}", file=sys.stderr)
        return 1
    if args.write:
        write_lock(hashes)
        print(f"Inventario Git blob actualizado: {len(hashes)} archivos. Revisa integrity.json antes de confirmar.")
        return 0
    findings = validate_lock(hashes)
    if findings:
        print("Falló la verificación de integridad TAMV:")
        for finding in findings:
            print(f"- {finding}")
        return 1
    print(f"Inventario de integridad válido: {len(hashes)} Git blobs.")
    return 0


if __name__ == "__main__":
    sys.exit(main())
