#!/usr/bin/env bash
set -euo pipefail

echo "Aplicando gobernanza TAMV..."
echo "Se conservará la atribución visible y la trazabilidad."

if [[ ! -f "TAMV_ATTRIBUTION.md" ]]; then
  echo "ERROR: falta TAMV_ATTRIBUTION.md"
  exit 1
fi

cat > TAMV_GOVERNANCE.md <<'EOF'
# TAMV Algorithmic Governance v1

## Principios
- Soberanía tecnológica
- Trazabilidad auditable
- Consentimiento informado
- Seguridad por diseño
- Derechos de autor y propiedad intelectual
- Transparencia algorítmica
- Responsable uso de IA
- Acceso equitativo al conocimiento

## Reglas
1. No ocultes la atribución.
2. No uses contenido protegido sin aprobación.
3. No expongas secretos ni llaves privadas.
4. No generes voz o música ajena sin consentimiento.
5. No prometas ingresos garantizados.
6. No simules resultados de IA sin evidencia.
EOF

echo "Gobernanza aplicada con éxito."
