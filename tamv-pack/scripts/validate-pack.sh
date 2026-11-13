#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd)"
PACK_DIR="$(dirname -- "$SCRIPT_DIR")"

required_files=(
  README.md
  LICENSE
  ATTRIBUTION.md
  GOVERNANCE.md
  SECURITY.md
  CHANGELOG.md
  pack.json
  integrity.json
  install.sh
  core/tamv-sovereign-core.ts
  scripts/validate-integrity.py
  scripts/validate-manifest.py
)

for file in "${required_files[@]}"; do
  if [[ ! -f "$PACK_DIR/$file" ]]; then
    echo "Falta: $PACK_DIR/$file" >&2
    exit 1
  fi
done

python3 "$SCRIPT_DIR/validate-manifest.py"
python3 "$SCRIPT_DIR/validate-integrity.py"

while IFS= read -r -d '' script; do
  bash -n "$script"
done < <(find "$PACK_DIR" -type f -name '*.sh' -print0)

echo "Validación completada: manifiesto, gobernanza, atribución, inventario de integridad y sintaxis Bash."
