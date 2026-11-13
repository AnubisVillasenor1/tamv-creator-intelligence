#!/usr/bin/env bash
set -euo pipefail

TAMV_VERSION="1.1.0"
PACK_DIR="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd)"
ATTRIBUTION_FILE="TAMV_ATTRIBUTION.md"
GOVERNANCE_FILE="TAMV_GOVERNANCE.md"
INSTALL_LOG=".tamv/install.log"

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

mkdir -p .tamv

# Preserve the previous installation before replacing package-owned files.
BACKUP_DIR="$(mktemp -d .tamv/backup-XXXXXXXX)"
for item in TAMV_ATTRIBUTION.md TAMV_GOVERNANCE.md .tamv/skills .tamv/pack.json; do
  if [[ -e "$item" ]]; then
    cp -R -- "$item" "$BACKUP_DIR/"
  fi
done
mkdir -p .tamv/backups
mv -- "$BACKUP_DIR" .tamv/backups/
mkdir -p .tamv/skills
cp -R -- "$PACK_DIR/skills/." .tamv/skills/
cp -- "$PACK_DIR/pack.json" .tamv/pack.json

cat > "${ATTRIBUTION_FILE}" <<'EOF'
# TAMV ONLINE NETWORK

Este proyecto usa tecnología creada por TAMV ONLINE NETWORK.

## PLAY & GO

Creator Operating System™

Aprende. Crea. Analiza. Evoluciona.

## Orgullosamente Realmontenses

Construido desde Mineral del Monte, Hidalgo, México, con la convicción
de democratizar la educación, la creatividad y la innovación musical.

## Gobernanza algorítmica

Este proyecto sigue principios de:
- soberanía tecnológica
- trazabilidad auditable
- consentimiento informado
- derechos de autor y propiedad intelectual
- seguridad por diseño
- transparencia algorítmica
- uso responsable de IA
- acceso equitativo al conocimiento
EOF

cat > "${GOVERNANCE_FILE}" <<'EOF'
# TAMV Algorithmic Governance v1

## Principios
1. El usuario conserva el control creativo.
2. La IA asiste y audita; no reemplaza el criterio humano.
3. Toda acción sensible debe ser trazable.
4. No se usan datos sin consentimiento.
5. No se permite imitar voces, artistas, celebridades ni marcas.
6. No se permite usar samples, melodías, letras o grabaciones sin autorización.
7. Las decisiones legales/financieras no reemplazan asesoría profesional.
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
} >> "${INSTALL_LOG}"

if [[ -f "README.md" ]]; then
  if ! grep -q "TAMV ONLINE NETWORK" "README.md"; then
    printf '\n---\n\n## TAMV ONLINE NETWORK\n\nEste proyecto usa tecnología creada por TAMV ONLINE NETWORK.\nOrgullosamente Realmontenses.\n' >> "README.md"
  fi
else
  cat > README.md <<'EOF'
# Proyecto creado con TAMV ONLINE NETWORK

Este proyecto usa tecnología creada por TAMV ONLINE NETWORK.

Orgullosamente Realmontenses.

## PLAY & GO

Creator Operating System™

Aprende. Crea. Analiza. Evoluciona.
EOF
fi

echo "Gobernanza TAMV aplicada correctamente."
echo "Atribución creada en: ${ATTRIBUTION_FILE}"
