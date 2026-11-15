# Arquitectura unificada y puerta de despliegue

## Decisión de integración

La propuesta de `TAMV Creator Intelligence` y el paquete `TAMV Central v4` se unifican por **contratos y responsabilidades**, no copiando dos gateways ni montando el SQLite del paquete dentro de la aplicación web.

La implementación de audio vigente es `tamv-genesis/src/audio/`: contratos con validación estricta, `UnifiedAudioGateway`, puertos para certificación, cola, auditoría e idempotencia, y análisis que conserva como `null` las métricas no calculadas. Una solicitud aceptada devuelve `queued`; la generación y el DSP reales corresponden a workers conectados por puertos. Este es el límite correcto para la aplicación y para su futura infraestructura abierta.

El paquete central es una referencia independiente de gobernanza local: intención, consentimiento, alcance por política, aprobación Ed25519, claim único y evidencia SQLite encadenada. No es un servidor web ni comparte persistencia, identidad, despliegue o modelo de amenazas con esta aplicación. Su incorporación literal duplicaría mecanismos ya presentes y usaría almacenamiento local no compartido entre instancias serverless. Sus controles se conservan como requisitos de diseño para futuros adaptadores autenticados, workers y almacenamiento duradero; **no se declara que el gateway de audio actual use todavía aprobaciones criptográficas por cada operación**.

## Flujo unificado

1. La aplicación valida la solicitud de audio antes de entregarla a un proveedor.
2. Se requieren consentimiento explícito y una declaración de derechos del contenido.
3. El puerto de certificación debe autorizar la capacidad; las rutas de capacidades desconectadas fallan cerradas.
4. La cola real acepta el trabajo y la API informa solo `queued` y su identificador.
5. El worker debe reportar su estado y los resultados efectivamente medidos; si no hay proveedor de cola, generación o DSP, no hay resultado fabricado.
6. El puerto de auditoría registra los eventos reales. El puerto de idempotencia puede impedir que una repetición cree otro trabajo.
7. La aprobación humana firmada del paquete Central queda como control pendiente de integración para operaciones de riesgo, no se sustituye por una casilla de consentimiento ni por la firma del artefacto de distribución.

## Rechazado deliberadamente del prototipo adjunto

No desplegar el ejemplo que establece la tarea como `completed` sin esperar un worker, devuelve una URL de audio de reserva, inventa `truePeakDb` y chroma, utiliza una etiqueta de federación derivada del identificador o genera un identificador con `Math.random()`. Tampoco incorporar una clave de servicio en el cliente, exponer una clave privada ni tratar el SQLite local como una base multiusuario. Esos comportamientos contradirían los contratos actuales y presentarían datos no verificados como reales.

La propuesta describe componentes OSS que pueden ejecutarse en infraestructura propia, pero no demuestra que un proveedor, una GPU, almacenamiento, colas, modelos y su licencia estén disponibles gratis en un despliegue alojado. Deben verificarse por separado coste, cuotas, licencias de pesos y configuración del proveedor elegido. No se activa Redis, Supabase ni otro servicio por inferencia: primero debe seleccionarse y provisionarse la integración adecuada.

## Estado de lanzamiento

El repositorio es desplegable como **panel y monitor con capacidades premium bloqueadas según certificación**. Eso no equivale a un producto de generación musical en producción. Los criterios vigentes y el procedimiento del propietario están en `docs/DEPLOYMENT-READINESS-2026-11-15.md`.

Antes de habilitar producción con IA o audio hacen falta, como mínimo:

- Firma de distribución emitida con la identidad Ed25519 oficial de TAMV y clave pública correspondiente configurada en el entorno de destino. No crear una identidad sustituta ni guardar la clave privada en el repositorio.
- Autenticación real y prueba de aceptación con una cuenta autorizada.
- Cola y worker reales, almacenamiento con permisos y retención definidos, proveedor de generación y DSP probado con datos reales.
- Auditoría duradera apropiada para el entorno, límites compartidos y autorización por operación antes de efectos externos.
- Revisión de permisos, costes y licencias de los modelos y servicios concretos.
- CI y aceptación del artefacto firmado que se va a desplegar; comprobar la URL desplegada después.

Mientras esos requisitos no estén satisfechos, mantener `403`/`501` en capacidades no certificadas o no implementadas. El destino seguro de esta entrega es el panel verificable con puertas cerradas, no una supuesta plataforma integral de generación ya operativa.

## Verificación reproducible

Desde la raíz, ejecutar `bun run test`, `bun run tamv:check` y `TAMV_CERTIFICATION_REQUIRED=true bun run build` antes de publicar. El último comando debe fallar si falta firma o configuración oficial; resolverlo con la identidad del propietario, no relajando el control. Para el procedimiento completo y las pruebas adicionales exigidas, seguir `docs/DEPLOYMENT-READINESS-2026-11-15.md`.
