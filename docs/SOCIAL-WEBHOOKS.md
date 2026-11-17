# Integraciones sociales y relay firmado

Revisión: 2026-11-17. Código: [receptor](../src/lib/social-webhooks.server.ts), [catálogo](../src/lib/social-integrations.ts), [ruta](../src/routes/api.webhooks.$provider.ts), [pruebas](../src/test/social-webhooks.test.ts).

## Alcance

`/integrations` ofrece diez proveedores, filtros y guía de configuración. Nueve receptores implementan autenticación de transporte; **ninguna tarjeta prueba una cuenta conectada**. Longe.ai permanece no verificado y devuelve 501. No se inventó su API.

Se reciben eventos oficiales mediante `POST /api/webhooks/{provider}` y, con habilitación explícita del operador, se reenvían a un relay HTTPS. No se han implementado OAuth de cuentas, publicación de posts, envío de mensajes, respuestas automáticas ni una bandeja de aprobación humana. El relay es un servicio externo que el operador debe proporcionar y controlar; no se provisiona con esta entrega.

## Protocolos y secretos

Todos los nombres siguientes corresponden a secretos exclusivamente de servidor. Nunca `VITE_*`, repositorio, logs ni formulario web. Se aceptan secretos de proveedor de 16–4096 caracteres sin espacios; para secretos propios generar valores aleatorios de al menos 32 caracteres, independientes por entorno y propósito.

| ID de ruta | Autenticación POST | Variable |
|---|---|---|
| facebook | `X-Hub-Signature-256: sha256=<hex HMAC-SHA256(cuerpo)>` | `TAMV_FACEBOOK_APP_SECRET` |
| instagram | Protocolo Meta anterior | `TAMV_INSTAGRAM_APP_SECRET` |
| threads | Protocolo Meta anterior; suscripciones concretas requieren validación en el portal | `TAMV_THREADS_APP_SECRET` |
| whatsapp | Protocolo Meta anterior | `TAMV_WHATSAPP_APP_SECRET` |
| github | `X-Hub-Signature-256`, HMAC-SHA256 hexadecimal del cuerpo | `TAMV_GITHUB_WEBHOOK_SECRET` |
| telegram | Comparación del header `X-Telegram-Bot-Api-Secret-Token` | `TAMV_TELEGRAM_WEBHOOK_SECRET` |
| tiktok | `TikTok-Signature: t=<segundos>,s=<hex>`; HMAC-SHA256 de `timestamp.cuerpo` | `TAMV_TIKTOK_CLIENT_SECRET` |
| linkedin | `X-LI-Signature` contiene solo el digest hexadecimal; se firma **`hmacsha256=` + cuerpo**, según contrato consultado | `TAMV_LINKEDIN_CLIENT_SECRET` |
| twitter | `X-Twitter-Webhooks-Signature-OAuth2: sha256=<base64 HMAC-SHA256(cuerpo)>` | `TAMV_X_CLIENT_SECRET` |
| longe | No verificado, sin autenticación inventada | Ninguna |

TikTok permite ±300 segundos; se rechazan marcas temporales fuera de esa ventana. No es el protocolo de TikTok Shop. X solo implementa la variante OAuth2, no el header legacy OAuth1. Telegram usa el `secret_token` de `setWebhook`, **no el token del bot**; su seguridad depende también del transporte HTTPS. El servidor compara valores de igual longitud en tiempo constante.

### Verificación GET

- Meta: `hub.mode=subscribe`, `hub.verify_token`, `hub.challenge`. Configurar además `TAMV_FACEBOOK_VERIFY_TOKEN`, `TAMV_INSTAGRAM_VERIFY_TOKEN`, `TAMV_THREADS_VERIFY_TOKEN` o `TAMV_WHATSAPP_VERIFY_TOKEN`. Devuelve el desafío exacto como texto.
- LinkedIn: `challengeCode` UUID; responde `{challengeCode, challengeResponse}` con HMAC-SHA256 hexadecimal. No admite `applicationId` ni aplicaciones hijas.
- X: `crc_token`; responde `{response_token: "sha256=<base64>"}`.
- Otros proveedores: GET 405. Los desafíos no necesitan relay configurado.

## Contrato de relay

Configuración obligatoria para reenvío:

- `TAMV_WEBHOOK_FORWARDING_ENABLED=true`: consentimiento operativo para reenviar el contenido completo verificado.
- `TAMV_WEBHOOK_RELAY_URL`: URL HTTPS del receptor externo, con ruta opcional; sin credenciales, query, fragmento ni puerto no estándar.
- `TAMV_WEBHOOK_RELAY_ALLOWED_ORIGIN`: origen exacto de esa URL, sin ruta ni barra final.
- `TAMV_WEBHOOK_RELAY_SECRET`: secreto independiente compartido exclusivamente con ese receptor.

Se rechazan IP literales y nombres locales conocidos. La URL nunca proviene de la petición entrante. La validación **no resuelve DNS ni bloquea por sí sola DNS rebinding o destinos privados detrás de un nombre público**: configurar políticas de egress y un destino bajo control del operador. No usar endpoints suministrados por usuarios finales.

El POST saliente lleva JSON:

```json
{
  "schema": "tamv.social.event.v1",
  "provider": "github",
  "eventId": "<sha256 hexadecimal>",
  "receivedAt": "<fecha ISO UTC>",
  "payload": { "<campos del proveedor>": "<valores verificados>" }
}
```

`eventId = SHA256(provider + "\n" + cuerpo original)`. Headers salientes:

- `Idempotency-Key`: eventId.
- `X-TAMV-Timestamp`: segundos Unix.
- `X-TAMV-Signature`: `sha256=` + HMAC-SHA256 hexadecimal de `timestamp + "." + JSON saliente exacto`.

El relay debe verificar firma y vigencia, validar el esquema, persistir atómicamente el evento con idempotencia y responder HTTP 2xx con `{ "accepted": true, "eventId": "<mismo id>" }`. Solo entonces TAMV devuelve HTTP 200, `delivery: relay-acknowledged` y `publicationStarted: false` al proveedor. Una respuesta 2xx sin ese cuerpo no basta. El receptor no puede comprobar que el relay realmente escribió en disco: el acuse es su contrato de responsabilidad.

Hay un solo intento, sin redirects, timeout de transporte de 5 segundos y acuse limitado a 8 KiB. Un timeout puede ocurrir después de que el relay haya persistido: **el siguiente intento debe ser idempotente**. `receivedAt` cambia en reentregas; `eventId` no cambia si los bytes originales son idénticos.

No hay cola ni deduplicación local durable. El hash deduplica cuerpos idénticos, no eventos semánticamente equivalentes con serialización o lotes distintos. El relay debe deduplicar también por ID oficial de notificación/evento cuando aplique, separar entornos/proveedores y conservar resultados idempotentes durante todo el horizonte de reintentos del proveedor. Autenticidad de un evento no autoriza ejecutar comandos de su contenido.

## Límites y errores

Cuerpo JSON objeto, máximo 256 KiB; ocho solicitudes simultáneas por proceso. Esta concurrencia **no es protección distribuida** ni sustituye un límite de ingreso, timeout de lectura y protección contra clientes lentos en el borde.

| HTTP | Condición / código |
|---|---|
| 200 | Desafío válido o evento confirmado por relay |
| 400 | `TAMV_WEBHOOK_BODY_INVALID`, `PAYLOAD_INVALID` o `CHALLENGE_INVALID` con prefijo `TAMV_WEBHOOK_` |
| 401 | `TAMV_WEBHOOK_UNAUTHORIZED` |
| 404 | `TAMV_WEBHOOK_PROVIDER_UNKNOWN` |
| 405 | `TAMV_WEBHOOK_METHOD_NOT_ALLOWED` |
| 413 | `TAMV_WEBHOOK_TOO_LARGE` o `TAMV_WEBHOOK_BODY_INVALID` |
| 415 | `TAMV_WEBHOOK_JSON_REQUIRED` |
| 501 | `TAMV_WEBHOOK_PROVIDER_UNVERIFIED` |
| 502 | `TAMV_WEBHOOK_RELAY_REJECTED`, `TAMV_WEBHOOK_RELAY_ACK_INVALID` o `TAMV_WEBHOOK_RELAY_UNAVAILABLE` |
| 503 | `TAMV_WEBHOOK_CONFIG_REQUIRED`, `TAMV_WEBHOOK_RELAY_REQUIRED` o `TAMV_WEBHOOK_BUSY` (Retry-After: 5) |

Son respuestas no-store/nosniff. El receptor no aplica la licencia de generación: transporta eventos autenticados, no invoca capacidades de IA, audio ni agentes.

## Activación y privacidad

1. El propietario registra una aplicación oficial, obtiene permisos y aprueba los eventos específicos del producto. Verificar especialmente disponibilidad de Threads y elegibilidad de LinkedIn.
2. El operador define finalidades, minimización, retención, borrado y autorización del destino. El payload completo puede incluir mensajes personales, identificadores y contenido sensible. No habilitar reenvío sin base legal y controles apropiados.
3. Configurar secretos en el gestor del despliegue, sin mostrarlos. Registrar callback público HTTPS.
4. Configurar relay y sus políticas de egress; probar firma inválida, replay, acuse incorrecto, caída y recuperación durable. No registrar cuerpos ni headers secretos en logs de proxy/APM.
5. Usar la prueba oficial del portal; comprobar persistencia y reintento con la misma identidad. Medir tiempos contra los límites de respuesta de cada proveedor; si requiere menos de 5 segundos, el relay debe aceptar antes de ese plazo.
6. Registrar evidencia por SHA, entorno y proveedor, sin datos personales. Sin esa aceptación, el estado sigue siendo **implementado localmente, integración externa pendiente**.

Para detener reenvíos, retirar la habilitación explícita y revisar suscripciones oficiales: los proveedores pueden acumular reintentos o desactivar el webhook. Rotar secretos coordinadamente con proveedor/relay; no hay ventana automática de doble clave. No se han cambiado servicios, permisos ni cuentas externas.

## Referencias oficiales

- [Meta Webhooks](https://developers.facebook.com/docs/graph-api/webhooks/getting-started/)
- [TikTok Webhooks Verification](https://developers.tiktok.com/doc/webhooks-verification?enter_method=left_navigation)
- [LinkedIn Webhook Validation](https://learn.microsoft.com/en-us/linkedin/shared/api-guide/webhook-validation)
- [X Webhooks Quickstart](https://docs.x.com/x-api/webhooks/quickstart)
- [GitHub signature validation](https://docs.github.com/en/webhooks/using-webhooks/validating-webhook-deliveries)
- [Telegram Bot API setWebhook](https://core.telegram.org/bots/api#setwebhook)

Estas referencias explican protocolos; no prueban aprobación de una app ni entrega live. Las pruebas locales usan secretos sintéticos y relay simulado, nunca cuentas reales.
