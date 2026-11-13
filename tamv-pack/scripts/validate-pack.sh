#!/usr/bin/env bash
set -euo pipefail

required_files=(
  README.md
  LICENSE
  ATTRIBUTION.md
  GOVERNANCE.md
  SECURITY.md
  pack.json
  install.sh
)

for file in "${required_files[@]}"; do
  if [[ ! -f "$file" ]]; then
    echo "Falta: $file"
    exit 1
  fi
done

if ! grep -q "TAMV ONLINE NETWORK" README.md; then
  echo "README.md no contiene atribución TAMV."
  exit 1
fi

if ! grep -q "AGPL-3.0-only" pack.json; then
  echo "pack.json no define licencia core válida."
  exit 1
fi

echo "Validación completada."
