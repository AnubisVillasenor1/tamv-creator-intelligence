# Facturación, membresías y donaciones: criterios de activación

## Estado

La interfaz de pagos es informativa. No existe evidencia de que el checkout y el ciclo de vida de suscripciones estén habilitados en producción. No presentar usuarios, ingresos, suscripciones o donaciones ficticios como datos reales.

## Arquitectura requerida antes de activar cobros

1. Elegir y configurar un proveedor de pago (por ejemplo, Stripe) con credenciales exclusivamente de servidor.
2. Crear el checkout en un handler autenticado y validar precio, moneda, plan y usuario en el servidor; nunca aceptar el precio desde el navegador como autoridad.
3. Verificar criptográficamente cada webhook, deduplicar por identificador de evento y persistir los eventos de forma idempotente.
4. Mantener el estado de membresía en la base de datos con migraciones, restricciones y RLS; reconciliar los estados con el proveedor.
5. Cubrir pagos aprobados/rechazados, renovación, cancelación, reembolso, chargeback, eventos repetidos y fuera de orden.
6. Añadir observabilidad sin exponer datos de pago y ejecutar pruebas en modo sandbox antes de habilitar producción.

## Monitor de usuarios de pago

El panel administrativo requiere una comprobación de rol en servidor, no solo una ruta oculta ni metadata de cliente. El backend debe consultar únicamente las columnas necesarias, filtrar por tenant cuando aplique, registrar acceso administrativo y aplicar paginación. No exponer datos de tarjeta ni secretos. Las métricas agregadas deben separarse de los registros identificables.

## Donaciones

No habilitar un CTA externo hasta que el responsable proporcione y verifique el canal oficial. La aplicación debe abrirlo en un contexto seguro, indicar claramente el destino y no solicitar datos bancarios directamente. Si no hay canal configurado, el CTA conduce a la explicación de estado pendiente.

## Aceptación

No considerar el módulo listo hasta que pruebas automatizadas, sandbox del proveedor, pruebas de webhook, persistencia/RLS y revisión de seguridad pasen en el commit exacto que se desplegará.
