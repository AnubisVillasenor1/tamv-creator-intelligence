# Facturación, membresías y donaciones: criterios de activación

## Implementado en código; entorno externo aún por verificar

- `POST /api/billing/checkout`: requiere sesión válida de Supabase, acepta una lista cerrada de planes y usa exclusivamente IDs de precio del servidor. Crea Checkout Session en Stripe y valida el host de retorno. La clave de idempotencia se deriva de usuario y request ID; los reintentos con el mismo ID son idempotentes en Stripe.
- `POST /api/billing/webhook`: verifica firma Stripe sobre el cuerpo original, limita el tamaño de solicitud y valida la URL HTTPS de Supabase.
- `0006_billing_webhook_event_intake.sql`: ledger de recepción de eventos.
- `0007_billing_memberships_processor.sql`: membresías con RLS restrictiva, procesamiento transaccional/idempotente de eventos de suscripción y función de resumen agregado.
- `GET /api/admin/memberships`: exige token válido de Supabase y rol administrativo en `app_metadata.tamv_role=admin` o `app_metadata.roles` que contenga `tamv_admin`. Los roles en `user_metadata` no se aceptan.
- El monitor devuelve totales por estado y plan, no listados de usuarios ni datos personales.
- La interfaz de facturación solicita checkout al servidor y falla de forma cerrada si faltan claves o precios.

**No se ha verificado un proyecto Stripe/Supabase externo, no se han aplicado estas migraciones remotamente y no se ha certificado producción.** La existencia de código no equivale a un flujo financiero activado.

## Variables requeridas de servidor

- `STRIPE_SECRET_KEY`: clave secreta de Stripe (modo test antes de producción).
- `STRIPE_WEBHOOK_SECRET`: secreto de firma del endpoint webhook.
- `STRIPE_PRICE_CREATOR`, `STRIPE_PRICE_PRO`, `STRIPE_PRICE_ENTERPRISE`: IDs `price_...` para los planes autorizados.
- `TAMV_APP_URL`: origen HTTPS raíz exacto de la aplicación.
- `SUPABASE_URL`: origen HTTPS raíz del proyecto.
- `SUPABASE_PUBLISHABLE_KEY`: clave pública usada para validar sesiones en el servidor.
- `SUPABASE_SERVICE_ROLE_KEY`: clave privilegiada solo servidor; nunca usar prefijo `VITE_`, exponer al navegador o registrar su valor.

## Contrato de procesamiento Stripe

El checkout coloca `tamv_user_id` y `tamv_plan_key` en metadatos de la suscripción. Para eventos `customer.subscription.*`, el procesador SQL verifica el contrato mínimo, registra el hash del payload, procesa dentro de una transacción y actualiza la membresía. Los eventos duplicados no repiten la operación; un ID repetido con payload diferente provoca error. Los eventos fuera de orden no reemplazan un estado más reciente según el orden de evento/ID. Eventos no relacionados con suscripciones se registran como ignorados, sin otorgar privilegios.

La respuesta de checkout solo entrega una URL de Stripe. El retorno del navegador no activa membresías; la autoridad de estado es el webhook verificado y procesado.

## Activación en entorno no productivo

1. Configurar Stripe en modo test y crear precios para los tres planes.
2. Aplicar primero `0006_billing_webhook_event_intake.sql` y después `0007_billing_memberships_processor.sql` en Supabase de pruebas.
3. Configurar el webhook Stripe para los tipos `customer.subscription.created`, `customer.subscription.updated` y `customer.subscription.deleted`.
4. Asignar rol de prueba mediante `app_metadata` desde un flujo confiable del servidor.
5. Probar checkout, cancelación, renovación, pago fallido, eventos duplicados, payload alterado, firma expirada, eventos fuera de orden, fallo de DB, reintentos y rechazo de roles no autorizados.
6. Verificar RLS/privilegios mediante roles reales y revisar los registros sin exponer tokens o datos personales.
7. Documentar reconciliación contra Stripe, reembolsos y disputas antes de usar el estado para conceder acceso en producción.
8. Registrar el SHA probado, logs de CI, evidencia de despliegue y plan de rollback antes de activar cobros reales.

## Limitaciones pendientes

- No hay evidencia de migraciones aplicadas en un proyecto externo ni de pruebas end-to-end contra Stripe.
- No existe aún reconciliación periódica documentada/operada para recuperar eventos perdidos o inconsistencias.
- El checkout debe someterse a prueba de abuso y concurrencia para limitar múltiples sesiones por usuario.
- El tratamiento de reembolsos, disputas y chargebacks requiere una política explícita antes de alterar permisos.
- El monitor administrativo requiere asignación de rol en `app_metadata` por personal autorizado.
- La firma de release y el despliegue exacto siguen siendo gates independientes.

## Donaciones

No se habilita un enlace externo hasta que exista una URL oficial confirmada. El CTA global puede conducir a esta explicación, pero no debe simular una donación ni solicitar datos bancarios dentro de la aplicación.
