# Operación de recibos de gobernanza

## Estado

Implementación inicial en el PR #9. La API registra intenciones autenticadas; no ejecuta despliegues, publicaciones ni operaciones destructivas. La persistencia queda bloqueada hasta provisionar el esquema con el flujo aprobado de Lovable y validar el backend en un entorno no productivo.

## Variables de entorno del servidor

Configurar en el runtime backend (por ejemplo, Vercel Project Settings → Environment Variables):

- `SUPABASE_URL`: URL del proyecto Supabase.
- `SUPABASE_PUBLISHABLE_KEY`: clave publicable utilizada para validar el token mediante Supabase Auth.
- `SUPABASE_SERVICE_ROLE_KEY`: clave privilegiada sólo para el adaptador server-side.
- `TAMV_GOVERNANCE_ACTOR_SALT`: secreto aleatorio de al menos 32 caracteres para derivar referencias seudónimas de actor.

No usar prefijo `VITE_` en los dos secretos. No colocar claves privadas o de servicio en el frontend, repositorio, logs o ejemplos. La ausencia de cualquiera de los valores requeridos debe mantener el endpoint cerrado.

## Aprovisionamiento de base de datos

1. Abrir el proyecto conectado en Lovable y solicitar al propietario de esquema que aplique/revise `docs/sql/tamv-governance-receipts.sql`.
2. Confirmar tabla `public.tamv_governance_receipts`, índice único de `idempotency_key`, tabla `public.tamv_governance_receipt_events`, trigger de validación, trigger de eventos y permisos.
3. Confirmar RLS habilitado y ausencia de políticas de lectura/escritura para `anon` y `authenticated`.
4. Verificar que sólo el backend de confianza utiliza la service-role key y que los eventos no admiten UPDATE/DELETE desde roles de aplicación.
5. Ejecutar pruebas de inserción duplicada, transición concurrente, intento de alterar bindings, intento de borrar evidencia y restauración desde backup en un proyecto no productivo.

No copiar este SQL a `supabase/migrations/` manualmente: `AGENTS.md` declara el esquema como administrado por Lovable.

## Registrar una intención

El cliente debe tener una sesión Supabase Auth y enviar su access token. Debe generar y conservar una clave idempotente por intención lógica.

```bash
curl -X POST "$APP_URL/api/governance/receipts" \
  -H "Authorization: Bearer $SUPABASE_ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  -H "Idempotency-Key: update-release-2026-11-15-001" \
  --data '{
    "operation": "update",
    "targetRef": "target-project-prod",
    "sourceCommitSha": "bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb",
    "artifactSha256": "aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa"
  }'
```

La respuesta esperada al insertar o reintentar una intención válida es HTTP `202`, con `executionStarted: false` y `humanApprovalRequired: true`. Los valores hash del ejemplo son ilustrativos; deben reemplazarse por los digests reales. El endpoint no certifica que el commit o artefacto exista; sólo valida el formato y registra la intención.

## Consultar un recibo

```bash
curl "$APP_URL/api/governance/receipts?receiptId=$RECEIPT_ID" \
  -H "Authorization: Bearer $SUPABASE_ACCESS_TOKEN"
```

La ruta devuelve sólo recibos cuya referencia de actor coincide con la sesión autenticada. Los identificadores no sustituyen a la autenticación.

## Respuestas y fallos

- `202`: intención guardada o reintento idempotente resuelto; no significa ejecución.
- `400`: JSON, identificadores, hash o política inválidos.
- `401`: falta token o Supabase Auth lo rechaza.
- `404`: recibo inexistente o perteneciente a otro actor.
- `409`: clave idempotente reutilizada para otra operación o conflicto de estado.
- `413`: payload mayor al límite.
- `415`: Content-Type no permitido.
- `503`: faltan secretos, la política no valida o el backend/esquema no está disponible.

## Lo que todavía no hace esta API

- No aprueba intenciones ni proporciona una ruta de aprobación administrativa.
- No ejecuta install/update/redeploy/rollback.
- No marca operaciones como exitosas; el cambio a `succeeded` requiere un verificador de evidencia de confianza en un llamador server-side.
- No proporciona limitación de frecuencia distribuida.
- No emite firma Ed25519 ni atestación SLSA.

Estos controles deben implementarse y probarse antes de conectar el ledger a un ejecutor de operaciones reales.
