#!/usr/bin/env bash
set -euo pipefail
: "${TAMV_ORIGIN:?Set the deployed HTTPS app origin}"
: "${TAMV_ACCESS_TOKEN:?Set a short-lived authenticated user token}"
# Do not enable shell tracing; tokens are private. API access is server-to-server.
curl --fail-with-body --silent --show-error "$TAMV_ORIGIN/api/public/tamv/projects" \
  -H "Authorization: Bearer $TAMV_ACCESS_TOKEN" -H 'Content-Type: application/json' \
  --data '{"action":"create","name":"Asistente de soporte","useCase":"Responder consultas de clientes con revisión humana y sin procesar datos sensibles innecesarios."}'
