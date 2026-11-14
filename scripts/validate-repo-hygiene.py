#!/usr/bin/env python3
"""Fail closed on tracked environment files and high-confidence private credentials.

Both the Git index (the exact snapshot that would be committed) and the working
tree are scanned. This closes the staged-secret gap where a secret is staged,
then removed from the working file before the commit hook runs.
"""
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
    ("private key PEM", re.compile(r"-----BEGIN (?:[A-Z0-9]+ )*PRIVATE KEY-----")),
    ("GitHub credential", re.compile(r"\bgh[pousr]_[A-Za-z0-9]{30,}\b")),
    ("GitHub fine-grained token", re.compile(r"\bgithub_pat_[A-Za-z0-9_]{35,}\b")),
    ("AWS access key", re.compile(r"\bAKIA[0-9A-Z]{16}\b")),
    ("Supabase secret key", re.compile(r"\bsb_secret_[A-Za-z0-9_-]{20,}\b")),
    ("Stripe secret key", re.compile(r"\bsk_(?:live|test)_[A-Za-z0-9]{20,}\b")),
    ("OpenAI-style API key", re.compile(r"\bsk-[A-Za-z0-9_-]{32,}\b")),
    ("Google API key", re.compile(r"\bAIza[0-9A-Za-z_-]{35}\b")),
    ("Slack token", re.compile(r"\bxox[baprs]-[A-Za-z0-9-]{20,}\b")),
    ("database URL with embedded password", re.compile(r"\bpostgres(?:ql)?://[^/\s:@]+:[^@\s/]+@")),
]


def tracked_paths(root: Path = ROOT) -> list[str]:
    result = subprocess.run(
        ["git", "ls-files", "-z"],
        cwd=root,
        check=True,
        stdout=subprocess.PIPE,
        stderr=subprocess.PIPE,
    )
    return [
        item.decode("utf-8", errors="strict")
        for item in result.stdout.split(b"\0")
        if item
    ]


def forbidden_env_path(relative_path: str) -> bool:
    name = Path(relative_path).name
    if name in ALLOWED_ENV_NAMES or name.endswith(".example"):
        return False
    return name == ".env" or name.startswith(".env.")


def index_content(root: Path, relative_path: str) -> str | None:
    result = subprocess.run(
        ["git", "show", ":" + relative_path],
        cwd=root,
        check=False,
        stdout=subprocess.PIPE,
        stderr=subprocess.DEVNULL,
    )
    if result.returncode != 0:
        return None
    try:
        return result.stdout.decode("utf-8", errors="strict")
    except UnicodeDecodeError:
        return None


def working_content(root: Path, relative_path: str) -> str | None:
    path = root / relative_path
    if not path.is_file():
        return None
    try:
        return path.read_text(encoding="utf-8")
    except (UnicodeDecodeError, OSError):
        return None


def scan_content(relative_path: str, content: str | None, source: str) -> list[str]:
    if content is None or Path(relative_path).name.endswith(".example"):
        return []
    if Path(relative_path).suffix.lower() in SKIP_SUFFIXES:
        return []

    findings = []
    for line_number, line in enumerate(content.splitlines(), 1):
        for label, pattern in SECRET_PATTERNS:
            if pattern.search(line):
                findings.append(
                    f"{relative_path}:{line_number}: posible {label} en {source}; el valor no se mostrará."
                )
    return findings


def main(root: Path | None = None) -> int:
    repository = (root or ROOT).resolve()
    failures: list[str] = []
    try:
        paths = tracked_paths(repository)
    except (OSError, subprocess.CalledProcessError) as error:
        print(f"No se pudo inspeccionar el índice Git: {type(error).__name__}.")
        return 2

    for path in paths:
        if forbidden_env_path(path):
            failures.append(
                f"{path}: archivo de entorno versionado; conserva únicamente plantillas *.example."
            )
        failures.extend(scan_content(path, index_content(repository, path), "index"))
        failures.extend(scan_content(path, working_content(repository, path), "worktree"))

    # Remove duplicate findings without changing their stable order.
    failures = list(dict.fromkeys(failures))
    if failures:
        print("Falló la higiene del repositorio:")
        print("\n".join(f"- {failure}" for failure in failures))
        return 1

    print(
        "Higiene del repositorio válida: "
        f"{len(paths)} archivos del índice y sus versiones de trabajo examinados."
    )
    return 0


if __name__ == "__main__":
    sys.exit(main())
