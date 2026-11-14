#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd -- "$(dirname -- "$0")/.." && pwd)"
TMP_DIR="$(mktemp -d)"
trap 'rm -rf "$TMP_DIR"' EXIT
FAKE_BIN="$TMP_DIR/bin"
mkdir -p "$FAKE_BIN"
ARTIFACT="$TMP_DIR/release.tar.gz"
PROVENANCE="$TMP_DIR/provenance.intoto.jsonl"
: > "$ARTIFACT"
: > "$PROVENANCE"

cat > "$FAKE_BIN/gh" <<'FAKE_GH'
#!/usr/bin/env bash
set -euo pipefail
printf '%s\n' "$@" > "$VERIFY_ARGS_FILE"
FAKE_GH
cat > "$FAKE_BIN/slsa-verifier" <<'FAKE_VERIFIER'
#!/usr/bin/env bash
set -euo pipefail
printf '%s\n' "$@" > "$VERIFY_ARGS_FILE"
FAKE_VERIFIER
chmod 0755 "$FAKE_BIN/gh" "$FAKE_BIN/slsa-verifier"

export PATH="$FAKE_BIN:$PATH"
export VERIFY_ARGS_FILE="$TMP_DIR/verify-args.txt"
export TAMV_SOURCE_DIGEST="0123456789abcdef0123456789abcdef01234567"

status=0
bash "$ROOT/scripts/verify-slsa.sh" >/dev/null 2>&1 || status=$?
[[ "$status" -eq 64 ]] || { echo "Verifier must reject unsupported argument counts." >&2; exit 1; }

status=0
env -u GH_TOKEN bash "$ROOT/scripts/verify-slsa.sh" "$ARTIFACT" "owner/repo" "v1.2.3" >/dev/null 2>&1 || status=$?
[[ "$status" -eq 78 ]] || { echo "GitHub mode must fail closed without GH_TOKEN." >&2; exit 1; }

export GH_TOKEN="unit-test-placeholder"
bash "$ROOT/scripts/verify-slsa.sh" "$ARTIFACT" "owner/repo" "v1.2.3" >/dev/null
grep -Fxq -- "--repo" "$VERIFY_ARGS_FILE"
grep -Fxq -- "owner/repo" "$VERIFY_ARGS_FILE"
grep -Fxq -- "--predicate-type" "$VERIFY_ARGS_FILE"
grep -Fxq -- "https://slsa.dev/provenance/v1" "$VERIFY_ARGS_FILE"
grep -Fxq -- "--signer-workflow" "$VERIFY_ARGS_FILE"
grep -Fxq -- "owner/repo/.github/workflows/release-sign.yml" "$VERIFY_ARGS_FILE"
grep -Fxq -- "--source-ref" "$VERIFY_ARGS_FILE"
grep -Fxq -- "refs/tags/v1.2.3" "$VERIFY_ARGS_FILE"
grep -Fxq -- "--source-digest" "$VERIFY_ARGS_FILE"
grep -Fxq -- "$TAMV_SOURCE_DIGEST" "$VERIFY_ARGS_FILE"

bash "$ROOT/scripts/verify-slsa.sh" "$ARTIFACT" "$PROVENANCE" "github.com/owner/repo" "v1.2.3" >/dev/null
grep -Fxq -- "verify-artifact" "$VERIFY_ARGS_FILE"
grep -Fxq -- "--provenance-path" "$VERIFY_ARGS_FILE"
grep -Fxq -- "$PROVENANCE" "$VERIFY_ARGS_FILE"
grep -Fxq -- "--source-tag" "$VERIFY_ARGS_FILE"
grep -Fxq -- "v1.2.3" "$VERIFY_ARGS_FILE"

echo "SLSA verifier regression checks passed."
