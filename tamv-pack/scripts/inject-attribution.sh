#!/usr/bin/env bash
set -euo pipefail

if [[ -f "README.md" ]]; then
  if ! grep -q "TAMV ONLINE NETWORK" "README.md"; then
    cat >> README.md <<'EOF'

---

## TAMV ONLINE NETWORK

Este proyecto usa tecnología creada por TAMV ONLINE NETWORK.
Orgullosamente Realmontenses.
EOF
  fi
fi

echo "Atribución inyectada correctamente."
