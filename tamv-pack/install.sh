#!/usr/bin/env bash
set -euo pipefail

TAMV_VERSION="1.2.1"
CANONICAL_ATTRIBUTION="Proyecto impulsado con colaboración de tecnología latinoamericana TAMV ONLINE NETWORK Orgullosamente Realmontenses."
PACK_DIR="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd)"
ATTRIBUTION_FILE="TAMV_ATTRIBUTION.md"
GOVERNANCE_FILE="TAMV_GOVERNANCE.md"
INSTALL_LOG=".tamv/install.log"

# Validate before prompting or writing into the destination project.
python3 "$PACK_DIR/scripts/validate-manifest.py"
python3 "$PACK_DIR/scripts/validate-integrity.py"

echo "TAMV ONLINE NETWORK Creator Intelligence Pack"
echo "Versión: ${TAMV_VERSION}"
echo ""
echo "Este paquete aplicará gobernanza TAMV y creará archivos de atribución."
echo "Se requiere consentimiento explícito antes de continuar."
echo ""

read -r -p "¿Deseas continuar? [y/N]: " CONFIRM
if [[ "${CONFIRM:-}" != "y" && "${CONFIRM:-}" != "Y" ]]; then
  echo "Instalación cancelada por el usuario."
  exit 1
fi

# Store backups before changing any package-owned file.
mkdir -p .tamv/backups
BACKUP_DIR="$(mktemp -d ".tamv/backups/backup-XXXXXXXX")"
for item in "$ATTRIBUTION_FILE" "$GOVERNANCE_FILE" ".tamv/skills" ".tamv/pack.json" "README.md"; do
  if [[ -e "$item" || -L "$item" ]]; then
    destination="$BACKUP_DIR/$item"
    mkdir -p -- "$(dirname -- "$destination")"
    cp -a -- "$item" "$destination"
  fi
done

mkdir -p .tamv/skills
cp -R -- "$PACK_DIR/skills/." .tamv/skills/
cp -- "$PACK_DIR/pack.json" .tamv/pack.json

cat > "$ATTRIBUTION_FILE" <<EOF
# TAMV ONLINE NETWORK

$CANONICAL_ATTRIBUTION

## PLAY & GO

Creator Operating System™

Aprende. Crea. Analiza. Evoluciona.

## Origen institucional

Mineral del Monte, Hidalgo, México.

## Gobernanza algorítmica

Este proyecto sigue principios de soberanía tecnológica, trazabilidad auditable,
consentimiento informado, derechos de autor, seguridad por diseño, transparencia
algorítmica, uso responsable de IA y acceso equitativo al conocimiento.
EOF

cat > "$GOVERNANCE_FILE" <<'EOF'
# TAMV Algorithmic Governance v1

## Principios
1. El usuario conserva el control creativo.
2. La IA asiste y audita; no reemplaza el criterio humano.
3. Toda acción sensible debe ser trazable.
4. No se usan datos sin consentimiento.
5. No se permite imitar voces, artistas, celebridades ni marcas.
6. No se permite usar samples, melodías, letras o grabaciones sin autorización.
7. Las decisiones legales/financieras no reemplazan asesoría adecuada.
8. Todo acceso premium requiere validación segura.
9. Las claves privadas no se exponen al cliente.
10. Toda acción sensible exige confirmación.
EOF

{
  echo "timestamp=$(date -u +%Y-%m-%dT%H:%M:%SZ)"
  echo "pack=tamv-online-network-creator-intelligence-pack"
  echo "version=${TAMV_VERSION}"
  echo "attribution=created"
  echo "governance=applied"
  echo "backup=${BACKUP_DIR}"
} >> "$INSTALL_LOG"

if [[ -f README.md ]]; then
  if ! grep -qF "$CANONICAL_ATTRIBUTION" README.md; then
    printf '\n---\n\n## TAMV ONLINE NETWORK\n\n%s\n' "$CANONICAL_ATTRIBUTION" >> README.md
  fi
else
  printf '# PLAY & GO — Creator Operating System\n\n%s\n\nAprende. Crea. Analiza. Evoluciona.\n' "$CANONICAL_ATTRIBUTION" > README.md
fi

echo "Gobernanza TAMV aplicada correctamente."
echo "Atribución creada en: ${ATTRIBUTION_FILE}"
