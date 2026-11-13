#!/usr/bin/env bash
set -euo pipefail
SCRIPT_DIR="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd)"
PACK_DIR="$(dirname -- "$SCRIPT_DIR")"
TEST_ROOT="$(mktemp -d)"
trap 'rm -rf -- "$TEST_ROOT"' EXIT
CANONICAL_ATTRIBUTION="Proyecto impulsado con colaboración de tecnología latinoamericana TAMV ONLINE NETWORK Orgullosamente Realmontenses."
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
grep -q 'version=1.2.1' .tamv/install.log
grep -qF "$CANONICAL_ATTRIBUTION" TAMV_ATTRIBUTION.md
grep -qF "$CANONICAL_ATTRIBUTION" README.md

printf 'y\n' | bash "$PACK_DIR/install.sh"
test -d .tamv/backups
find .tamv/backups -path '*/.tamv/skills/tamv-core-governance/SKILL.md' -print -quit | grep -q .
bash "$SCRIPT_DIR/apply-tamv-governance.sh"
bash "$SCRIPT_DIR/inject-attribution.sh"
bash "$SCRIPT_DIR/inject-attribution.sh"
test "$(grep -cF "$CANONICAL_ATTRIBUTION" README.md)" -eq 1

# A modified distribution must be rejected before destination files are written.
cp -R "$PACK_DIR" "$TEST_ROOT/tampered-pack"
printf '\n# deliberate tamper-test\n' >> "$TEST_ROOT/tampered-pack/README.md"
cd -- "$TEST_ROOT/missing"
if printf 'y\n' | bash "$TEST_ROOT/tampered-pack/install.sh"; then
  echo 'ERROR: la instalación debe rechazar un paquete alterado.'; exit 1
fi
test ! -e .tamv
test ! -e TAMV_ATTRIBUTION.md

# The --write path must produce valid JSON and a lock that verifies immediately.
INTEGRITY_COPY="$TEST_ROOT/integrity-copy"
cp -R "$PACK_DIR" "$INTEGRITY_COPY"
python3 "$INTEGRITY_COPY/scripts/validate-integrity.py" --write
python3 "$INTEGRITY_COPY/scripts/validate-integrity.py"
python3 -c 'import json, sys; json.load(open(sys.argv[1], encoding="utf-8"))' "$INTEGRITY_COPY/integrity.json"

echo 'Pruebas de instalación, consentimiento, respaldo e integridad completadas.'
