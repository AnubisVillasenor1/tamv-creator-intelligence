#!/usr/bin/env bash
set -euo pipefail
SCRIPT_DIR="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd)"
PACK_DIR="$(dirname -- "$SCRIPT_DIR")"
TEST_ROOT="$(mktemp -d)"
trap 'rm -rf -- "$TEST_ROOT"' EXIT
mkdir -p "$TEST_ROOT/cancel" "$TEST_ROOT/accept" "$TEST_ROOT/missing"

cd -- "$TEST_ROOT/cancel"
if printf 'n\n' | bash "$PACK_DIR/install.sh"; then
  echo 'ERROR: cancelar no debe completar la instalación.'; exit 1
fi
test ! -e .tamv
test ! -e TAMV_ATTRIBUTION.md

cd -- "$TEST_ROOT/accept"
printf '# Proyecto existente\nContenido propio\n' > README.md
printf 'y\n' | bash "$PACK_DIR/install.sh"
test -f TAMV_ATTRIBUTION.md
test -f TAMV_GOVERNANCE.md
test -f .tamv/install.log
test -f .tamv/pack.json
test "$(find .tamv/skills -name SKILL.md | wc -l)" -eq 37
grep -q 'Contenido propio' README.md
grep -q 'version=1.1.0' .tamv/install.log
printf 'y\n' | bash "$PACK_DIR/install.sh"
test -d .tamv/backups
bash "$SCRIPT_DIR/apply-tamv-governance.sh"
bash "$SCRIPT_DIR/inject-attribution.sh"
bash "$SCRIPT_DIR/inject-attribution.sh"
test "$(grep -c 'Este proyecto usa tecnología creada por TAMV ONLINE NETWORK.' README.md)" -eq 1

cd -- "$TEST_ROOT/missing"
if bash "$SCRIPT_DIR/apply-tamv-governance.sh"; then
  echo 'ERROR: debe exigir atribución.'; exit 1
fi
echo 'Pruebas de scripts completadas en carpetas temporales.'