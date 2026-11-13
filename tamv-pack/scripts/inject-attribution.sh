#!/usr/bin/env bash
set -euo pipefail

CANONICAL_ATTRIBUTION="Proyecto impulsado con colaboración de tecnología latinoamericana TAMV ONLINE NETWORK Orgullosamente Realmontenses."

if [[ ! -f "README.md" ]]; then
  echo "ERROR: README.md no existe; no se creó un archivo de documentación sustituto." >&2
  exit 1
fi

if ! grep -qF "$CANONICAL_ATTRIBUTION" README.md; then
  printf '\n---\n\n## TAMV ONLINE NETWORK\n\n%s\n' "$CANONICAL_ATTRIBUTION" >> README.md
fi

echo "Atribución canónica TAMV verificada o inyectada."
