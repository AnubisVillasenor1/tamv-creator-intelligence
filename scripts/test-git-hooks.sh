#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd -- "$(dirname -- "$0")/.." && pwd)"

for file in "$ROOT/.githooks/pre-commit" "$ROOT/.githooks/pre-push" "$ROOT/scripts/install-git-hooks.sh"; do
  [[ -f "$file" ]] || { echo "Missing hook file: $file" >&2; exit 1; }
  bash -n "$file"
done

grep -Fq 'validate-repo-hygiene.py' "$ROOT/.githooks/pre-commit"
grep -Fq 'tamv-pack/scripts/validate-pack.sh' "$ROOT/.githooks/pre-commit"
grep -Fq 'bun run lint' "$ROOT/.githooks/pre-push"
grep -Fq 'bun run test' "$ROOT/.githooks/pre-push"
grep -Fq 'bun run build' "$ROOT/.githooks/pre-push"

TMP_DIR="$(mktemp -d)"
trap 'rm -rf "$TMP_DIR"' EXIT
REPO="$TMP_DIR/repo"
mkdir -p "$REPO/scripts" "$REPO/.githooks"
cp "$ROOT/scripts/install-git-hooks.sh" "$REPO/scripts/install-git-hooks.sh"
cp "$ROOT/.githooks/pre-commit" "$ROOT/.githooks/pre-push" "$REPO/.githooks/"
git init -q "$REPO"
bash "$REPO/scripts/install-git-hooks.sh" >/dev/null
configured="$(git -C "$REPO" config --local --get core.hooksPath)"
[[ "$configured" == "$REPO/.githooks" ]] || {
  echo "Installer configured an unexpected hook path." >&2
  exit 1
}
[[ -x "$REPO/.githooks/pre-commit" && -x "$REPO/.githooks/pre-push" ]] || {
  echo "Installer did not make hook files executable." >&2
  exit 1
}

CUSTOM_REPO="$TMP_DIR/custom-hooks"
mkdir -p "$CUSTOM_REPO/scripts" "$CUSTOM_REPO/.githooks"
cp "$ROOT/scripts/install-git-hooks.sh" "$CUSTOM_REPO/scripts/install-git-hooks.sh"
cp "$ROOT/.githooks/pre-commit" "$ROOT/.githooks/pre-push" "$CUSTOM_REPO/.githooks/"
git init -q "$CUSTOM_REPO"
git -C "$CUSTOM_REPO" config --local core.hooksPath "$CUSTOM_REPO/custom-hooks"
if bash "$CUSTOM_REPO/scripts/install-git-hooks.sh" >/dev/null 2>&1; then
  echo "Installer must preserve an existing custom core.hooksPath." >&2
  exit 1
fi
[[ "$(git -C "$CUSTOM_REPO" config --local --get core.hooksPath)" == "$CUSTOM_REPO/custom-hooks" ]] || {
  echo "Installer modified a custom core.hooksPath after refusal." >&2
  exit 1
}

echo "Git hook regression checks passed."
