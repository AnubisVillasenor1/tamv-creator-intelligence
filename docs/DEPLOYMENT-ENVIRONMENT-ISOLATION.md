# Aislamiento de entornos y gates de integraciones externas

**Revisión:** 2026-11-15  
**Política canónica:** [ADR-003](adr/ADR-003-environment-isolation-and-evidence.md).  
**Estado:** procedimiento de aceptación; no acredita que los paneles de Vercel, Supabase o Redis hayan sido inspeccionados.

## 1. Matriz de entorno

| Entorno | Datos y credenciales | Inferencia y límites | Escrituras/acciones externas |
|---|---|---|---|
| Local | Datos sintéticos o infraestructura desechable | Fallback local solo con identidad explícita de desarrollo | Nunca utilizar credenciales productivas |
| CI | Sin secretos productivos por defecto; fixtures | Tests deterministas; no llamar proveedores de pago accidentalmente | Ninguna operación productiva |
| Preview | Backend, datasets y credenciales aislados | Smoke visual y contract tests; integración live solo en workflow protegido | Deshabilitar side effects si faltan dependencias dedicadas |
| Staging | Datos de prueba y credenciales dedicadas | Auth, cuotas, persistencia y callbacks integrados | Operaciones reversibles contra datos desechables |
| Production | Secretos administrados por el proveedor | Proveedores autorizados, cuotas distribuidas y observabilidad verificables | Promoción explícita, auditoría y rollback |

## 2. Inventario de configuración

La tabla describe nombres y clasificación, no confirma valores existentes en Vercel. Validar siempre contra .env.example y la rama integrada antes de usarla como checklist activo.

| Grupo | Variables documentadas para el flujo de revisión | Clasificación |
|---|---|---|
| Supabase/Auth | SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, SUPABASE_SERVICE_ROLE_KEY | URL/clave publicable según uso; service role solo servidor |
| Gobernanza | TAMV_GOVERNANCE_ACTOR_SALT | Secreto server-side, estable por entorno |
| Inferencia | LOVABLE_API_KEY | Secreto server-side |
| Cuota distribuida | UPSTASH_REDIS_REST_URL, UPSTASH_REDIS_REST_TOKEN, TAMV_REVIEW_QUOTA_KEY_SALT | HTTPS; token y salt secretos server-side |
| Certificación | TAMV_ATTRIBUTION_PUBLIC_KEY, TAMV_CERTIFICATION_REQUIRED | Clave pública y bandera de política; clave privada solo en job de firma |

No importar nombres de variables de Isabella o Play & Go sin comprobar que el código de este proyecto los consume.

## 3. Checks que no deben confundirse

| Check | Qué demuestra | Qué no demuestra |
|---|---|---|
| Preflight advisory | Script ejecutable sin secretos productivos | No prueba credenciales ni conectividad |
| Preflight estricto | Presencia y forma básica de variables del entorno | No prueba que el proveedor acepte las credenciales |
| Vercel READY | El deployment terminó en el estado reportado por la plataforma | No prueba que el repo, base de datos, permisos o rutas estén bien conectados |
| Smoke API anónimo | Respuesta de la ruta y control de autenticación | No prueba flujo autenticado ni persistencia |
| Smoke autenticado | Camino de un usuario real en ese momento | No prueba aislamiento de permisos ni concurrencia |
| Smoke de modelo externo | Respuesta válida del proveedor durante ese test | No demuestra disponibilidad futura, calidad ni privacidad integral |
| Probe PostgreSQL | Invariantes probados en esa base y commit | No demuestra que producción use el mismo esquema o roles |
| Firma de manifiesto | Relación firmada entre contenido, manifiesto y clave | No certifica ausencia de vulnerabilidades ni procedencia SLSA por sí sola |

## 4. Gate de entorno antes de habilitar escrituras

- [ ] Identificar proyecto Vercel por ID y comprobar repositorio conectado.
- [ ] Verificar rama de producción y SHA del deployment vigente.
- [ ] Comprobar que Production, Preview y Development usan destinos/URLs esperados.
- [ ] Revisar presencia y alcance de las variables sin leer ni imprimir sus valores.
- [ ] Confirmar un proyecto Supabase/Postgres/Redis de staging separado antes de pruebas con escritura.
- [ ] Confirmar claves service-role, firma y tokens de autoridad solo en runtimes o jobs autorizados.
- [ ] Ejecutar prueba negativa que demuestre que Preview no puede escribir en datos productivos.
- [ ] Volver a desplegar el target después de cambiar variables del proveedor.
- [ ] Guardar commit, deployment ID, digest cuando exista, run CI y responsable de aceptación.

## 5. Gate de inferencia live

1. Guardar el secreto solo en el gestor del entorno protegido.
2. Limitar proveedor/modelo, timeout, cantidad de requests y tokens de salida.
3. Deshabilitar fallback a proveedores pagos cuando se está probando una opción gratuita.
4. Fallar ante secreto ausente, timeout, error HTTP, salida vacía, JSON inválido o fallback local.
5. Registrar commit y resultado sin copiar secretos ni contenido sensible a los logs.
6. No desplegar producción ni habilitar capacidades protegidas como efecto del smoke test.

## 6. Rollback

Antes de cambiar producción, identificar el deployment y artefacto verificados, conservar acceso al anterior, comprobar compatibilidad de esquema y tener un plan de retorno. No revertir migraciones de forma ciega. Tras rollback, ejecutar smoke positivo y prueba negativa de autorización.

## 7. Bloqueo actual

La inspección previa observó un estado Vercel en GitHub, pero la API administrativa conectada no tenía acceso al scope propietario del proyecto tamv-creator-intelligence. Por eso no se afirma nada sobre los valores, targets o permisos actuales del panel. La aceptación de estos puntos exige acceso autorizado; no deben resolverse compartiendo secretos por chat.
