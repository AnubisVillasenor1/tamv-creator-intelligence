# Facturación, membresías y donaciones: criterios de activación

## Implementado en código (requiere validación del entorno)

- `POST /api/billing/webhook` verifica la firma Stripe sobre el cuerpo original y limita el tamaño de la solicitud.
- La migración `0006_billing_webhook_event_intake.sql` crea el ledger de eventos idempotente.
- La migración `0007_billing_memberships_processor.sql` crea el estado de membresía con RLS restrictiva, un procesador transaccional de eventos de suscripción y una función de resumen agregado.
- `GET /api/admin/memberships` requiere un token válido de Supabase y un rol administrativo presente en `app_metadata.tamv_role=admin` o `app_metadata.roles` que contenga `tamv_admin`. Los roles en `user_metadata` no se aceptan.
- El monitor expone únicamente totales por estado y plan, no listados de usuarios ni información personal.

## Contrato de procesamiento Stripe

Para eventos `customer.subscription.*`, la suscripción debe contener metadatos `tamv_user_id` (UUID existente de Supabase Auth) y `tamv_plan_key` (slug estable). La función SQL procesa el evento y actualiza la membresía dentro de una transacción; los eventos duplicados no repiten la operación y los eventos con la misma marca temporal se ordenan determinísticamente por identificador. Los eventos Stripe ajenos a suscripciones se registran como ignorados, sin conceder privilegios.

**Importante:** checkout, precios y creación de suscripciones aún no están implementados. No se puede activar una membresía desde el frontend. El procesamiento del webhook solo sincroniza el estado que Stripe informa; no crea sesiones de pago.

## Variables de servidor

- `STRIPE_WEBHOOK_SECRET`: secreto de firma del endpoint webhook.
- `SUPABASE_URL`: URL HTTPS raíz del proyecto Supabase.
- `SUPABASE_PUBLISHABLE_KEY`: clave pública para validar la sesión del administrador.
- `SUPABASE_SERVICE_ROLE_KEY`: clave privilegiada, exclusiva del servidor; nunca usar prefijo `VITE_` ni registrar su valor.

Aplicar `0006_billing_webhook_event_intake.sql` y después `0007_billing_memberships_processor.sql` en un entorno de pruebas antes de configurar el endpoint Stripe. La configuración del rol administrativo debe hacerse mediante `app_metadata` controlada por servidor, nunca desde el cliente.

## Pendiente antes de producción

1. Implementar checkout autenticado con IDs de precio permitidos en servidor y validación de propiedad.
2. Crear en Stripe el endpoint con los eventos de suscripción necesarios y configurar metadatos requeridos.
3. Probar migraciones y funciones SQL en Supabase no productivo; verificar privilegios, RLS y manejo de conflictos.
4. Probar firmas, duplicados, eventos inválidos, eventos fuera de orden, expiración, renovación, cancelación y fallos de persistencia.
5. Implementar reconciliación contra Stripe y una política para reembolsos/chargebacks antes de usarlos para revocar o conceder acceso.
6. Configurar monitor en la interfaz autenticada, auditar permisos administrativos y limitar acceso operativo.
7. Ejecutar CI, revisión de seguridad y prueba de despliegue del SHA exacto antes de habilitar cobros.

## Donaciones

No se habilita un enlace externo hasta que exista una URL oficial confirmada. El CTA global puede dirigir a esta explicación, pero no debe simular una donación ni solicitar datos bancarios dentro de la aplicación.
