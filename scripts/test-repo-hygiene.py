#!/usr/bin/env python3
"""Regression tests for index-aware secret scanning and environment-file rejection."""
from __future__ import annotations

import contextlib
import importlib.util
import io
import subprocess
import tempfile
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
SPEC = importlib.util.spec_from_file_location(
    "validate_repo_hygiene", ROOT / "scripts" / "validate-repo-hygiene.py"
)
if SPEC is None or SPEC.loader is None:
    raise RuntimeError("Unable to load repository hygiene validator.")
VALIDATOR = importlib.util.module_from_spec(SPEC)
SPEC.loader.exec_module(VALIDATOR)


def git(root: Path, *args: str) -> None:
    subprocess.run(["git", *args], cwd=root, check=True, stdout=subprocess.PIPE, stderr=subprocess.PIPE)


def main() -> int:
    with tempfile.TemporaryDirectory(prefix="tamv-hygiene-test-") as temporary:
        repo = Path(temporary)
        git(repo, "init", "-q")
        git(repo, "config", "user.name", "TAMV Security Test")
        git(repo, "config", "user.email", "security-test@example.invalid")

        sample = repo / "sample.txt"
        sample.write_text("safe baseline\n", encoding="utf-8")
        git(repo, "add", "sample.txt")
        git(repo, "commit", "-m", "fixture")
        sample.write_text("ghp_ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789abcd\n", encoding="utf-8")
        git(repo, "add", "sample.txt")
        sample.write_text("safe working tree\n", encoding="utf-8")

        output = io.StringIO()
        with contextlib.redirect_stdout(output):
            result = VALIDATOR.main(repo)
        rendered = output.getvalue()
        if result != 1 or "index" not in rendered or "GitHub credential" not in rendered:
            raise AssertionError("The validator failed to detect a secret present only in the Git index.")
        if "ghp_ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789abcd" in rendered:
            raise AssertionError("The validator exposed the suspected credential in its diagnostic.")

        env_file = repo / ".env.production"
        env_file.write_text("API_KEY=placeholder-only\n", encoding="utf-8")
        git(repo, "add", ".env.production")
        output = io.StringIO()
        with contextlib.redirect_stdout(output):
            result = VALIDATOR.main(repo)
        if result != 1 or ".env.production" not in output.getvalue():
            raise AssertionError("The validator failed to reject a staged environment file.")

    print("Repository hygiene regression tests passed.")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
