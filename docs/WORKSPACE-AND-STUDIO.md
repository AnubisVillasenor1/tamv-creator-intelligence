# Workspace, tutorial y estudio

Revisión: 2026-11-17. Alcance: código local; no aceptación de producción.

## Organización

La navegación agrupa Crear (vista general, proyectos, estudio), Conectar (integraciones, skills, modelos), Gobernar (auditoría, SDK) y Aprender (primeros pasos e investigación). La búsqueda encuentra herramientas por nombre y descripción. En pantallas pequeñas la navegación se abre en un diálogo con cierre, manejo de foco y acceso a la sesión.

La vista general muestra conteos reales del catálogo y, solo con sesión y datos disponibles, proyectos y versiones aprobadas. El dibujo del hero es conceptual, no telemetría. No se atribuye una mejora porcentual medida al rediseño.

## Tutorial

`/guide` ofrece seis pasos: conocer TAMV, organizar, crear, conectar, gobernar y verificar. Cada paso explica propósito, ejemplo, límite y enlace a la herramienta. Se puede avanzar, retroceder, saltar y reiniciar. Finalizar significa únicamente terminar el recorrido: no concede permisos ni certifica una cuenta.

Las únicas preferencias añadidas son `tamv.guide.v1` (posición/completado) y `tamv.workspace.theme` (claro/oscuro), almacenadas en este navegador. No contienen secretos ni resultados de proyectos. No se sincronizan entre dispositivos ni cuentas; se pueden borrar desde los datos del sitio. El tutorial y el cambio de tema siguen funcionando si el almacenamiento está bloqueado.

## Estudio privado

1. Abrir `/studio` e iniciar sesión mediante el formulario de la plataforma.
2. Elegir modo, prompt, duración entera de 5–30 segundos y frecuencia 44100/48000 Hz.
3. Indicar título, licencia e identificador de atestación de derechos.
4. Otorgar consentimiento explícito. El servidor vuelve a verificarlo.
5. Solicitar render. La certificación oficial, autenticación y cuotas deben permitirlo.
6. Tras un resultado válido, reproducir o descargar WAV y revisar SHA-256, sonoridad integrada LUFS y chroma.

Es **síntesis procedural local**, no un modelo neuronal, voz ni canto. El campo histórico `truePeakDb` se presenta como pico de muestra: no calcula picos intersample mediante sobremuestreo. FLAC no está disponible. El cliente valida contrato, tamaño, RIFF/WAVE y SHA-256 antes de ofrecer el artefacto.

Un plan de agente ejecuta `digest.sha256` y opcionalmente `audio.render`. Requiere consentimiento del plan y también de audio cuando lo incluye. El resultado del paso de audio contiene metadatos, no bytes descargables. No utiliza LLM ni publica contenido.

Los borradores y resultados del estudio viven en memoria de la sesión React. Cerrar sesión o cambiar de cuenta cancela solicitudes pendientes y descarta resultados; las URLs de reproducción se revocan. No hay biblioteca de artefactos persistente ni reintentos automáticos. Descargar un WAV sí conserva una copia en el dispositivo del usuario.

## Fallos esperados

| Estado | Acción |
|---|---|
| 401 | Iniciar una sesión válida; no copiar tokens a formularios. |
| 403 | Revisar consentimiento, derechos, licencia y firma del release. No desactivar gates. |
| 429 | Respetar `Retry-After`; no reenviar automáticamente. |
| 501 | Usar una capacidad realmente disponible, no simular al proveedor. |
| 502 | La ejecución o integridad falló; el cliente no reproduce la respuesta. |
| 503 | Revisar configuración/cuota o concurrencia; no afirmar que se ejecutó. |

## Métricas del estudio

`GET /api/studio/metrics` exige `Authorization: Bearer` con `TAMV_METRICS_BEARER_TOKEN`, distinto de `TAMV_METRICS_TOKEN` usado por Hyper-Core. Se recomienda un secreto aleatorio independiente de 32 caracteres o más, solo en servidor. Sin configuración responde 503; sin credencial válida 401; sin certificación `audiocore.advanced` 403.

Con acceso válido devuelve Prometheus y `X-TAMV-Metrics-Scope: process-local`, no-store y nosniff. El registro se comparte entre las rutas de audio y agente dentro de la misma instancia. Solo emite eventos observados; un registro vacío devuelve texto vacío. No sintetiza ceros, LUFS ni disponibilidad. Reiniciar pierde contadores; las instancias no se agregan solas. Scraper, retención, alertas y acceso de red requieren configuración externa.

## Skills y privacidad

[skill-governance.ts](../src/lib/skill-governance.ts) resuelve dependencias en orden topológico, rechaza IDs desconocidos, duplicados y ciclos. Los contratos resueltos de revisión creativa se incluyen como instrucciones y metadatos (`skillEvidence: resolved-contracts`), no como supuestos servicios ejecutados. El catálogo muestra estas relaciones.

Los listados de proyectos descartan respuestas de otra sesión; el exportador de auditoría solo utiliza eventos asociados al proyecto seleccionado. Esto complementa, no reemplaza, la autorización del servidor y RLS administrado por Lovable.

## Evidencia y aceptación

Pruebas en [studio-client.test.ts](../src/test/studio-client.test.ts), [studio-workbench.test.tsx](../src/test/studio-workbench.test.tsx), [studio-metrics.test.ts](../src/test/studio-metrics.test.ts), [workspace-guide.test.tsx](../src/test/workspace-guide.test.tsx), [skill-governance.test.ts](../src/test/skill-governance.test.ts) y [governed-project-session.test.tsx](../src/test/governed-project-session.test.tsx).

Verificación local del 2026-11-17: tutorial completo, persistencia tras recarga, reinicio, cambio de tema y navegación por búsqueda comprobados en el navegador; el estudio anónimo exige sesión y no ofrece ejecución. El catálogo social muestra filtrado, estado vacío y Longe.ai no disponible. No hubo acceso con credenciales reales. Se inspeccionaron capturas del estudio y del panel en temas claro/oscuro, en viewport reducido sin desbordamiento horizontal; fallos intermitentes de la herramienta limitaron la cobertura visual y no se probaron varios breakpoints. La consola mostró configuración Supabase ausente y un aviso de foco/`aria-hidden` al abrir el diálogo mediante interacción programática; falta aceptación con teclado y lector de pantalla reales. No se afirma mejora porcentual medida. Un enlace CSS obsoleto del servidor de desarrollo se resolvió reiniciando Vite: el HTML inicial volvió a referenciar `/src/workspace.css`, sin cambiar rutas de producción.

Para producción todavía se necesita firma oficial, configuración Supabase/gateway/Redis, comprobaciones RLS y pruebas autenticadas contra el despliegue. Véanse [audio](AUDIO-ORCHESTRATION.md), [agentes](AGENT-ORCHESTRATION.md), [webhooks](SOCIAL-WEBHOOKS.md) y [contratos HTTP](API-SURFACE-AND-ERROR-CONTRACTS.md).
