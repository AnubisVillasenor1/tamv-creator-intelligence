# ADR-003 — Aislamiento de entornos y evidencia de despliegue

- **Fecha:** 2026-11-15
- **Estado:** Adoptado como política documental; aceptación externa pendiente
- **Ámbito:** AnubisVillasenor1/tamv-creator-intelligence
- **Fuentes de motivación:** [RFC-0002 de Isabella V6](https://github.com/AnubisVillasenor1/ISABELLA-VERSION-TERMINUS-V6/blob/5d32a18b0df66770eb0fdeb0e6e5005f4f59882d/docs/rfc/RFC-0002-environment-manual-inputs.md), [ADR 0001 de Play & Go](https://github.com/AnubisVillasenor1/play-and-go/blob/1c0c42c7f1c2336c24c582472d9072b29ed5021a/docs/adr/0001-rate-limit-backend.md), [bloqueos de producción de Play & Go](https://github.com/AnubisVillasenor1/play-and-go/blob/1c0c42c7f1c2336c24c582472d9072b29ed5021a/docs/PRODUCTION_BLOCKERS.md).

## Contexto

El sistema puede ejecutarse en local, CI, Preview, staging o producción. NODE_ENV no debe ser la única señal que decida si una operación puede usar cuota local o realizar un efecto privilegiado. En serverless, la memoria por proceso tampoco equivale a un límite global.

Compartir credenciales de producción con Preview hace que una prueba aparentemente inocua pueda modificar usuarios, registros o evidencias reales. Un build verde o un grupo de variables presentes no acredita que los servicios o los permisos funcionen.

## Decisión

1. **Clasificar el entorno explícitamente.** Para decisiones que afecten cuota, persistencia, autorización o efectos externos, utilizar la señal de plataforma fiable disponible (VERCEL_ENV donde aplique) y/o una variable explícita del proyecto. No inferir autoridad del hostname, del cliente o únicamente de NODE_ENV.
2. **Denegar por defecto en estados desconocidos.** Si falta cuota, firma, autorización, persistencia o auditoría obligatoria, mantener la operación protegida cerrada. Una cuota en memoria es solo desarrollo local, nunca una cuota global.
3. **Separar credenciales.** Production, Preview y Development deben usar proyectos, datos y secretos separados. Claves de servicio, firma o autoridad no se comparten con Preview. Si no hay entorno de staging seguro, deshabilitar escritura y efectos externos en Preview.
4. **Separar preflight de smoke real.** La presencia/forma de variables no prueba credenciales, conectividad o esquema desplegado. La inferencia externa requiere un gate independiente y opt-in con secreto protegido.
5. **Vincular evidencia al artefacto.** Registrar repositorio, branch, commit SHA, deployment ID/URL, digest si existe, resultados CI, limitaciones y rollback.
6. **No imprimir secretos.** Validadores solo reportan nombre de variable y estado, nunca valores, tokens o claves privadas.
7. **Respetar el dueño del esquema.** Según AGENTS.md, cualquier cambio en tablas, triggers, RLS o grants se gestiona mediante el flujo aprobado de Lovable, no editando manualmente drizzle/ o supabase/migrations/.

## Consecuencias

- Preview puede operar en modo read-only o con backend dedicado; no recibe credenciales privilegiadas de producción.
- La disponibilidad de un proveedor se demuestra mediante smoke test, no por la presencia de una variable.
- Cuotas local y distribuida mantienen nombres/estados distintos.
- Un timeout externo con resultado incierto exige conciliación idempotente antes de reintentar.
- Un estado READY de Vercel no demuestra por sí solo identidad del repo, permisos o funcionamiento completo.

## Criterios de aceptación

- [ ] Revisar variables y targets de Production/Preview/Development desde el proveedor autorizado sin exponer valores.
- [ ] Demostrar mediante prueba negativa que Preview no utiliza credenciales productivas.
- [ ] Restringir el fallback local de cuota a desarrollo explícito; no puede habilitarse por clasificación equivocada.
- [ ] Smoke test live demuestra respuesta real y rechaza fallback silencioso.
- [ ] Commit y artifact/digest probados corresponden al deployment observado.
- [ ] Rollback documentado y ensayado.
- [ ] Resultados ligados a fecha, commit, run y limitaciones.

## Estado actual de Creator Intelligence

Esta ADR establece política de revisión; no demuestra que el proyecto Vercel se haya inspeccionado ni que sus secretos estén configurados correctamente. El acceso administrativo al scope propietario no estaba disponible en la auditoría previa. La aceptación requiere acceso autorizado y evidencia nueva.
