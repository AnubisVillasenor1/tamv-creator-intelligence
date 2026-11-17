# Manual de despliegue seguro y pendientes — 15 noviembre 2026

## Decisión de salida

**No declarar producción completa ni revisión con IA operativa todavía.** El monitor y el catálogo pueden funcionar sin certificación, pero la revisión requiere una firma oficial, un usuario autenticado y una prueba real con el modelo. No se generó una identidad de firma sustitutiva ni se eliminaron controles para simular una puesta en producción.

Este manual distingue comprobaciones locales de servicios no comprobados. El saldo indicado por el propietario es un presupuesto de trabajo, no una garantía de costes futuros de inferencia o alojamiento.

## Correcciones y evidencia de esta entrega

- `src/lib/tamv-certification.ts`: acceso seguro a archivos indexados, estrechamiento explícito antes de SHA-256 y lectura tipada de la clave pública. Ausencias siguen bloqueando certificación.
- `src/test/creator-review.test.tsx`: respuestas simuladas compatibles con el contrato real, identificador UUID y cinco skills declaradas; eliminación de aserciones de existencia inseguras.
- `tamv-attribution.json`: hashes recalculados para los archivos protegidos modificados. `tamv-attribution.sig` permanece sin firma; recalcular hashes invalida cualquier firma anterior deliberadamente.
- La suite completa pasó inicialmente: 16 archivos, 187 pruebas. La corrección final del fixture se vuelve a probar antes del cierre.
- `bun run lint`: cero errores, seis advertencias existentes de recarga de componentes.
- `bun run tamv:check`: 37 skills, 20 extensiones gobernadas e inventario de 63 archivos válidos.
- `bash tamv-pack/scripts/test-scripts.sh`: instalación, consentimiento, respaldos y rechazo de alteraciones comprobados; el error de integridad que imprime durante la prueba es intencional.
- Revisión básica de seguridad sin hallazgos; no sustituye análisis profundo de código ni prueba de permisos por usuario. El análisis anterior de dependencias estaba desactualizado.
- No se pudo obtener sesión de prueba: el servicio informó que no existen usuarios de autenticación. Las políticas de registro y proveedores de acceso no fueron verificadas mediante configuración alojada.
- Comprobación final: las 16 pruebas afectadas pasan, las 105 pruebas Genesis pasan y el registro automático confirma `build OK`.
- Navegador: `/`, `/sovereignty` y `/hypercore` cargan sin errores de ejecución; móvil de 390 px sin desbordamiento horizontal. El formulario conserva el borrador y exige sesión; `/api/tamv/status` responde 200 con `certified: false` por firma pendiente. Esto no verifica una revisión autenticada ni una inferencia real.

## Orden obligatorio de activación

1. Guardar y revisar este código en el repositorio correcto; confirmar qué repositorio recibe la sincronización de Lovable. No asumir que el repositorio original y el de distribución son el mismo.
2. Ejecutar validación completa en GitHub Actions y revisar los resultados, no solo la existencia del archivo de flujo.
3. Implementar y configurar el acceso de creadores; registrar y confirmar un usuario real.
4. Firmar el código final con la identidad autorizada de TAMV.
5. Desplegar exactamente ese código firmado con la clave pública correspondiente.
6. Ejecutar aceptación con sesión real, después prueba negativa sin sesión y prueba de límites.
7. Conectar capacidades adicionales una por una. No presentarlas como disponibles por aparecer en el catálogo.

## Pendiente P1 — firma oficial de distribución (bloquea IA)

**Archivos:** `scripts/generate-tamv-ed25519-keypair.sh`, `scripts/tamv-certification.mjs`, `tamv-attribution.json`, `tamv-attribution.sig`, `.github/workflows/release-sign.yml`, `docs/RELEASE-SIGNING.md`.

**Funciones:** `verifyTamvCertification`, `getTamvCertification`, `requireTamvCertification`; acciones CLI `--update-hashes`, `--sign`, `--check --require-signature`.

**Datos requeridos:** par Ed25519 autorizado por TAMV, custodia de la clave privada y clave pública PEM SPKI. El propietario debe autorizar y custodiar esta identidad; ninguna clave generada por un tercero debe presentarse como oficial.

Procedimiento en un equipo de confianza, desde la raíz del repositorio:

```bash
bun install --frozen-lockfile
bash scripts/generate-tamv-ed25519-keypair.sh
bun run tamv:hash
bun run tamv:check
TAMV_ATTRIBUTION_PRIVATE_KEY="$(cat "$HOME/.config/tamv/keys/tamv-attribution-private.pem")" \
TAMV_ATTRIBUTION_PUBLIC_KEY="$(cat "$HOME/.config/tamv/keys/tamv-attribution-public.pem")" \
  bun run tamv:sign
TAMV_ATTRIBUTION_PUBLIC_KEY="$(cat "$HOME/.config/tamv/keys/tamv-attribution-public.pem")" \
TAMV_CERTIFICATION_REQUIRED=true bun run tamv:verify
```

No mostrar ni imprimir la clave privada. Guardarla únicamente en el gestor seguro del propietario y en el secreto de GitHub Actions `TAMV_ATTRIBUTION_PRIVATE_KEY`; nunca en Lovable, `VITE_*`, artefactos ni archivos del repositorio. Configurar `TAMV_ATTRIBUTION_PUBLIC_KEY` en el entorno del servidor de Lovable Cloud. La clave pública no es secreta; puede configurarse también como `VITE_TAMV_ATTRIBUTION_PUBLIC_KEY` si se necesita verificación en navegador. `TAMV_CERTIFICATION_REQUIRED=true` convierte una firma ausente en error de validación de release.

**Diferencia crítica:** el flujo de etiquetas firma su copia dentro de GitHub y publica artefactos; no actualiza automáticamente la firma del código que Lovable despliega. Para desplegar desde Lovable, incorporar el manifest y la firma final verificados al código sincronizado, con la aprobación del propietario, y publicar esa versión exacta. Alternativamente usar el artefacto firmado en un alojamiento compatible expresamente configurado. Cualquier modificación de un archivo protegido exige recalcular y volver a firmar. No ejecutar `tamv:hash` después de firmar.

**Aceptación:** `GET /api/tamv/status` debe devolver `certified: true` y `premiumFeaturesEnabled: true`. Alterar un archivo o retirar la clave debe bloquear las funciones, no degradarse a autorización permisiva.

## Pendiente P2 — acceso real de creadores (bloquea prueba extremo a extremo)

**Archivos existentes:** `src/start.ts`, `src/components/creator-review.tsx`, `src/lib/content.functions.ts`; clientes y middleware administrados en `src/integrations/supabase/` (no editar los generados).

**Faltante:** pantalla de registro/inicio de sesión/cierre de sesión, recuperación de contraseña y retorno OAuth público, si se habilitan proveedores sociales. Conservar el borrador cuando se pide acceso. No existe todavía una comprobación exitosa del recorrido de un usuario real.

Implementar rutas de acceso en TanStack Router y configurar en Lovable Cloud los proveedores que realmente ofrezca la interfaz. Verificar los ajustes alojados de correo, confirmación y redirecciones; no asumir su estado por los archivos del proyecto. No usar registro anónimo ni autoconfirmación de correo. Para Google o Lovable habilitar el proveedor antes de mostrar su botón; usar un retorno público del mismo origen, no una página protegida. Registrar y confirmar un usuario de prueba con consentimiento del propietario.

**Aceptación:** usuario inicia sesión, abre revisión, envía borrador propio y obtiene una propuesta; al cerrar sesión, una solicitud directa no autorizada retorna 401 y no invoca el modelo. Tokens y contraseñas nunca entran en capturas, registros ni archivos exportados.

## Pendiente P3 — inferencia real y costes (bloqueado por P1 y P2)

**Método:** `reviewContent` en `src/lib/content.functions.ts`, POST validado por `contentSchema`, sesión verificada, certificación, consentimiento, gobernanza y guardas antes de inferencia.

**Modelo existente:** `openai/gpt-6-astra` mediante Responses de AI Gateway. Conservar esta selección salvo decisión explícita del propietario o incompatibilidad confirmada. Comprobar elegibilidad real del modelo y superficie con `listModels()`; catálogo público no prueba permiso del workspace. El SDK obtiene sus credenciales en el servidor; no introducir una clave privada en navegador.

**Datos de prueba:** borrador original, audiencia concreta, objetivo, canal y consentimiento explícito. No usar datos personales sensibles ni material sin derechos. Verificar salida con diagnóstico, mejoras, versión revisada y advertencia; exportación JSON con `review` y `audit`, nunca publicación automática.

Si la llamada falla, conservar el texto y usar identificadores de error de AI Gateway para investigar; no reenviar automáticamente una inferencia de resultado desconocido. No confundir UUID/hash de trazabilidad con registro persistente, firma de resultados ni certificación jurídica. Verificar importe disponible y controles de gasto antes de la primera prueba.

## Pendiente P4 — cuotas compartidas y persistencia

**Archivo:** `src/lib/review-guard.ts`. **Métodos:** `checkReviewQuota`, `beginReview`, `endReview`, `endReviewWhenSettled`, `withReviewTimeout`.

Los límites actuales son por proceso: ráfaga 6, reposición 6 por hora, 40 revisiones por día UTC, 4 simultáneas y espera máxima de 45 segundos. Reinicios y múltiples instancias no comparten esos contadores; no son una protección de gasto distribuida.

Antes de abrir IA a usuarios múltiples, implementar reserva atómica de cuota en Lovable Cloud o un servicio compartido equivalente: identidad verificada, ventana UTC, número consumido, reserva activa, identificador de operación, vencimiento y estado de finalización. La misma operación no debe reservar dos veces. Implementar permisos por usuario y probar concurrencia y reinicios; las tablas deben tener permisos explícitos y políticas de acceso. No crear una tabla pública de auditoría o borradores por comodidad.

La revisión actual vive en memoria de la sesión React. Si se requiere historial, primero decidir consentimiento, retención, eliminación y acceso del propietario; después implementar almacenamiento y prueba de lectura posterior. Sin ese trabajo, recargar o salir puede perder borrador y revisión.

## Pendiente P5 — música, voz, audio avanzado y agentes

| Archivo | Capacidad | Estado y trabajo pendiente |
|---|---|---|
| `src/routes/api.generation.ts` | `music.generation` | Guardia de certificación; conectar generación musical, formato de audio, retorno/descarga, derechos, límites y manejo de errores. |
| `src/routes/api.voice.generate.ts` | `voice.generation` | Guardia; conectar síntesis de voz permitida, consentimiento, formato binario y reproducción/descarga. No clonar identidades sin permiso. |
| `src/routes/api.audiocore.advanced.ts` | `audiocore.advanced` | Guardia; falta contrato validado de entrada, procesamiento real, resultados medibles y pruebas con archivos reales. |
| `src/routes/api.agent.ts` | `agent.orchestration` | Guardia; falta motor de ejecución, herramientas autorizadas, aprobación de efectos externos, límites y cancelación. |

Todos llaman a `unavailableTamvCapabilityResponse`; una firma válida no implementa sus servicios. Sin licencia retornan 403; certificados y autorizados pero no conectados retornan 501. No cambiar estas respuestas por éxitos simulados.

> **Actualización 2026-11-16:** `audiocore.advanced` ya tiene procesamiento real
> en proceso (síntesis procedural determinista local + DSP medido BS.1770-4) con
> contrato validado, límites y pruebas; sigue fail-closed (403) hasta la firma
> oficial del release y no es generación neuronal. Ver
> [`AUDIO-ORCHESTRATION.md`](AUDIO-ORCHESTRATION.md) §6. Las demás rutas de la
> tabla permanecen como stubs 501.

Para cada integración nueva: validar entrada, exigir sesión si procesa datos o genera costes, comprobar licencia/consentimiento, usar SDK con modelo y superficie compatibles y probar salida real. APIs externas y webhooks nuevos deben vivir bajo `/api/public/` con verificación del llamante dentro del handler; esa ruta no queda protegida por el acceso del sitio. Las funciones internas usan `createServerFn`. Verificar los contratos con el SDK instalado antes de escribir llamadas.

## Pendiente P6 — auditoría, métricas y procedencia

**Archivos:** `src/lib/hyper-core-orchestrator.ts`, `src/lib/hypercore-turbo/`, `src/routes/api.tamv.hypercore.audit.ts`, `src/routes/api.tamv.hypercore.metrics.ts`, `hypercore/govern-core/policy.json`, `hypercore/velocity-core/turbo-config.json`, `scripts/verify-slsa.sh`.

Revisar los accesos que realmente requiere el monitor, configurar `TAMV_METRICS_TOKEN` como secreto del servidor para consumidores autorizados y no incrustarlo en cliente ni URL. Si se habilita un cron, configurar identidad del llamante y probar denegación sin credencial. No se aplicaron migraciones en esta entrega: confirmar que el almacenamiento de auditoría previsto existe y que el resultado se lee con la misma identidad autorizada antes de declarar persistencia.

En GitHub, configurar secretos de firma, permisos de atestación y ejecutar una etiqueta `v*` de un commit de main aprobado. Revisar SBOM y procedencia por separado de la firma TAMV; descargar y verificar checksum y atestaciones con `scripts/verify-slsa.sh`. El workflow genera artefactos, no una instalación automática del servicio. Revisar que el artefacto contiene la salida real del alojamiento elegido; no asumir que directorios vacíos `dist` o `.output` equivalen a una aplicación desplegable.

## Validación reproducible antes de publicar

```bash
bun install --frozen-lockfile
bun run lint
bun run test
bun run tamv:check
node tamv-pack/scripts/generate-skill-registry.mjs --check
bash tamv-pack/scripts/test-scripts.sh
bun run hooks:test
bun run slsa:test
python3 scripts/validate-repo-hygiene.py
python3 scripts/validate-audit-migration.py
node --experimental-strip-types --test tamv-genesis/tests/*.test.ts
```

Usar Node 22.16 o superior para Genesis. Después de firma y configuración, ejecutar `bun run tamv:verify` y el build de producción en CI con `TAMV_CERTIFICATION_REQUIRED=true`. Confirmar resultado completo del flujo `.github/workflows/validate-pack.yml`, incluyendo ShellCheck; no todas sus etapas se ejecutaron localmente en esta entrega.

## Prueba de aceptación y publicación

- Abrir `/`, `/sovereignty` y `/hypercore`; comprobar textos, navegación, ausencia de errores y tamaños móvil/escritorio.
- Leer `/api/tamv/status`; un 200 de esta ruta solo indica que la consulta respondió: revisar el campo `certified`.
- Completar acceso y revisión real tras P1/P2/P3; descargar JSON y comprobar que coincide con lo mostrado.
- Probar 401 sin sesión, 403 sin firma/licencia y límites 429/503 sin reintento automático.
- Revisar seguridad actualizada y ofrecer análisis profundo antes de exposición amplia; la revisión básica no acredita seguridad total.
- Publicar desde Lovable únicamente la versión final aprobada y firmada. Una solicitud de publicación no prueba que el sitio haya terminado de desplegarse; verificar la URL publicada después.
- Verificar dominios y retorno de acceso contra la URL de producción real. No se configuró dominio personalizado en esta entrega.

**Plan de reversión:** conservar una versión previamente probada y su firma correspondiente; ante fallo retirar acceso a generación, restaurar esa versión completa, volver a comprobar estado y permisos. Nunca restaurar solo una firma sobre código diferente. No usar modificaciones de historial para revertir ni revelar secretos en incidencias.

## Checklist de cierre del propietario

- [ ] Repositorio de destino confirmado y CI completo verde.
- [ ] Identidad de firma autorizada y clave privada custodiada.
- [ ] Código final firmado, clave pública configurada y `certified: true` en alojamiento real.
- [ ] Registro/inicio/cierre de sesión y recuperación probados; al menos un usuario confirmado.
- [ ] Primera revisión real devuelve resultado válido y exportable con costes revisados.
- [ ] Cuotas compartidas implementadas antes de apertura multiusuario.
- [ ] Historial/retención acordados si se requiere almacenamiento.
- [ ] Capacidades de audio/agentes conectadas y probadas o explícitamente no disponibles.
- [ ] Métricas, auditoría, SBOM y procedencia verificadas sin exagerar certificaciones.
- [ ] Seguridad actualizada, aceptación en producción y reversión ensayada.

Hasta completar los bloqueos, el resultado correcto es **monitor verificable con funciones premium bloqueadas**, no una plataforma integral en producción.