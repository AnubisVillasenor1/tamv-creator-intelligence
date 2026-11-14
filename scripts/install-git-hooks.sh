#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd -- "$(dirname -- "$0")" && pwd)"
ROOT="$(git -C "$SCRIPT_DIR/.." rev-parse --show-toplevel)"
HOOK_DIR="$ROOT/.githooks"
CURRENT_HOOKS_PATH="$(git -C "$ROOT" config --local --get core.hooksPath || true)"

if [[ ! -d "$HOOK_DIR" ]]; then
  echo "ERROR: the repository hook directory is missing: $HOOK_DIR" >&2
  exit 1
fi

if [[ -n "$CURRENT_HOOKS_PATH" && "$CURRENT_HOOKS_PATH" != "$HOOK_DIR" ]]; then
  echo "ERROR: core.hooksPath already points to a different hook directory." >&2
  echo "Current: $CURRENT_HOOKS_PATH" >&2
  echo "TAMV:    $HOOK_DIR" >&2
  echo "No local Git configuration was changed." >&2
  exit 1
fi

for name in pre-commit pre-push; do
  if [[ ! -f "$HOOK_DIR/$name" ]]; then
    echo "ERROR: required hook is missing: $HOOK_DIR/$name" >&2
    exit 1
  fi
  chmod 0755 "$HOOK_DIR/$name"
done

git -C "$ROOT" config --local core.hooksPath "$HOOK_DIR"
printf 'TAMV Git hooks installed.\n'
printf 'Hook path: %s\n' "$HOOK_DIR"
printf 'Pre-commit: staged/worktree secret scan, source hashes, pack integrity, shell syntax.\n'
printf 'Pre-push: lint, tests, and production build.\n'
