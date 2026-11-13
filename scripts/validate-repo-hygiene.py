#!/usr/bin/env python3
"""Fail CI on tracked environment files and high-confidence private credentials."""
from __future__ import annotations

import re
import subprocess
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
ALLOWED_ENV_NAMES = {".env.example"}
SKIP_SUFFIXES = {
    ".ico", ".png", ".jpg", ".jpeg", ".webp", ".gif", ".woff", ".woff2",
    ".ttf", ".otf", ".pdf", ".zip", ".lock",
}
SECRET_PATTERNS = [
    ("private key PEM", re.compile(r"-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----")),
    ("GitHub credential", re.compile(r"\bgh[pousr]_[A-Za-z0-9]{30,}\b")),
    ("AWS access key", re.compile(r"\bAKIA[0-9A-Z]{16}\b")),
    ("Supabase secret key", re.compile(r"\bsb_secret_[A-Za-z0-9_-]{20,}\b")),
    ("Stripe secret key", re.compile(r"\bsk_(?:live|test)_[A-Za-z0-9]{20,}\b")),
    ("database URL with embedded password", re.compile(r"\bpostgres(?:ql)?://[^/\s:@]+:[^@\s/]+@")),
]


def tracked_paths() -> list[str]:
    result = subprocess.run(
        ["git", "ls-files", "-z"],
        cwd=ROOT,
        check=True,
        stdout=subprocess.PIPE,
    )
    return [item.decode("utf-8", errors="strict") for item in result.stdout.split(b"\0") if item]


def forbidden_env_path(relative_path: str) -> bool:
    name = Path(relative_path).name
    if name in ALLOWED_ENV_NAMES or name.endswith(".example"):
        return False
    return name == ".env" or name.startswith(".env.")


def scan_file(relative_path: str) -> list[str]:
    path = ROOT / relative_path
    if path.name.endswith(".example") or path.suffix.lower() in SKIP_SUFFIXES:
        return []
    try:
        content = path.read_text(encoding="utf-8")
    except (UnicodeDecodeError, OSError):
        return []
    findings = []
    for line_number, line in enumerate(content.splitlines(), 1):
        for label, pattern in SECRET_PATTERNS:
            if pattern.search(line):
                findings.append(f"{relative_path}:{line_number}: posible {label}; el valor no se mostrará.")
    return findings


def main() -> int:
    failures = []
    paths = tracked_paths()
    for path in paths:
        if forbidden_env_path(path):
            failures.append(f"{path}: archivo de entorno versionado; conserva únicamente plantillas *.example.")
        failures.extend(scan_file(path))
    if failures:
        print("Falló la higiene del repositorio:")
        print("\n".join(f"- {failure}" for failure in failures))
        return 1
    print(f"Higiene del repositorio válida: {len(paths)} archivos examinados.")
    return 0


if __name__ == "__main__":
    sys.exit(main())
