# Facturación, membresías y donaciones: criterios de activación

## Estado comprobable

La interfaz de pagos sigue siendo informativa. El endpoint `POST /api/billing/webhook` implementa una primera capa de recepción segura de eventos Stripe: valida la firma HMAC-SHA256 sobre el cuerpo sin modificar, rechaza firmas fuera de una ventana de 5 minutos y persiste el identificador y hash del evento en un ledger idempotente. Responde `202` únicamente para indicar que el evento fue recibido y persistido; no significa que una compra o suscripción haya sido procesada ni activada.

No hay evidencia de checkout activo, sincronización de suscripciones, reconciliación, donaciones operativas ni despliegue productivo.

## Variables requeridas (solo servidor)

- `STRIPE_WEBHOOK_SECRET`: secreto de firma del endpoint webhook Stripe.
- `SUPABASE_URL`: URL del proyecto de base de datos.
- `SUPABASE_SERVICE_ROLE_KEY`: clave privilegiada de servidor. Nunca usar prefijo `VITE_`, exponer al navegador o registrar su valor.

Aplicar la migración `drizzle/migrations/0006_billing_webhook_event_intake.sql` antes de configurar el webhook. Si falta cualquier variable, el endpoint falla de forma cerrada con `503`.

## Límite funcional explícito

Este intake **no** modifica estado de membresía, no procesa checkout y no concede privilegios. El siguiente paso requerido es un procesador transaccional idempotente para los tipos de evento admitidos, una tabla de membresías con RLS y restricciones, reconciliación con Stripe, y un monitor administrativo protegido por rol verificado en servidor. No se debe derivar el estado pagado del frontend ni de un evento recibido sin procesamiento.

## Criterios previos a producción

1. Configurar Stripe en modo test y crear el endpoint webhook con los tipos de evento mínimos necesarios.
2. Aplicar y verificar la migración en un entorno no productivo.
3. Probar firma correcta, cuerpo alterado, firma expirada, duplicados, fallos de almacenamiento y reintentos.
4. Implementar procesamiento de eventos con idempotencia y transacciones antes de actualizar membresías.
5. Probar checkout, pagos fallidos, renovación, cancelación, reembolso, chargeback y eventos fuera de orden.
6. Añadir reconciliación y observabilidad sin exponer datos personales ni secretos.
7. Verificar RLS, autorización administrativa, pruebas automatizadas y despliegue del commit exacto antes de activar cobros.

## Donaciones

No habilitar un CTA externo hasta que el responsable proporcione y verifique el canal oficial. Si no existe canal configurado, el CTA conduce a la explicación del estado pendiente.
