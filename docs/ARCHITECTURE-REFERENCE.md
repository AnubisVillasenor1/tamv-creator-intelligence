# TAMV Creator Intelligence — referencia de arquitectura operativa

**Revisión:** 2026-11-15  
**Repositorio:** `AnubisVillasenor1/tamv-creator-intelligence`  
**Estado:** referencia documental derivada del código y de la documentación existente. No es una certificación ni una prueba de despliegue.

Consulta también el [registro de adopción entre repositorios](CROSS-REPOSITORY-ADOPTION-REGISTER.md), que fija las fuentes externas y los patrones rechazados, y la [guía de aislamiento de entornos](DEPLOYMENT-ENVIRONMENT-ISOLATION.md), que separa evidencia de configuración de aceptación de integraciones live.

## 1. Propósito y límites

TAMV Creator Intelligence combina una aplicación web de monitorización/revisión, un paquete de skills y contratos, controles de gobernanza, verificaciones de integridad y componentes de operación. El principio rector es **la IA propone; el humano decide**.

La documentación distingue deliberadamente entre:
- **Código presente:** implementación visible en este repositorio.
- **Probado:** una prueba automatizada cubre el comportamiento descrito.
- **Contrato:** tipos, puertos o respuestas definen una integración sin demostrar un proveedor operativo.
- **Configurado externamente:** depende de credenciales, servicios o esquema administrado fuera del repositorio.
- **Verificado en producción:** requiere evidencia de una prueba contra el entorno real y el artefacto exacto.

Una etiqueta de skill, una ruta API, una prueba unitaria o un deployment exitoso no demuestran por sí solos que un flujo completo esté operativo.

## 2. Mapa de componentes

| Capa | Ubicación principal | Responsabilidad | Límite que debe conservarse |
|---|---|---|---|
| Aplicación | `src/routes/`, `src/components/` | Interfaz, páginas y endpoints TanStack Start | La interfaz no debe recibir claves privadas ni decidir autoridad |
| Revisión de creador | `src/lib/content.functions.ts`, `content-schema.ts`, `review-guard.ts` | Validación de entrada, controles de revisión y llamada al gateway | La inferencia depende de sesión, configuración y proveedor disponibles |
| Catálogo de modelos | `src/lib/model-catalog.ts` | Describir modelos/proveedores utilizables por la app | Un catálogo no acredita credenciales, disponibilidad ni calidad del proveedor |
| Registro de skills | `src/lib/skill-registry.ts`, `skills.sh.json`, `tamv-genesis/v3/` | Mantener correspondencia entre capacidades, manifiestos y distribución | Un contrato publicado no equivale a un ejecutor conectado |
| Gobernanza | `src/lib/hypercore-turbo/policy.ts`, `governance-receipt.ts`, `governance-request-guards.ts` | Evaluar políticas y registrar intenciones controladas | Una intención no ejecuta la operación que describe |
| Persistencia de recibos | `src/lib/hypercore-turbo/governance-receipt-store.server.ts`, `docs/sql/tamv-governance-receipts.sql` | Adaptador server-side y contrato de persistencia | La disponibilidad real depende del esquema aprobado por Lovable y de credenciales |
| Hyper-Core ledger | `src/routes/api.tamv.hypercore.audit.ts`, `docs/HYPERCORE-AUDIT-LEDGER.md`, `scripts/test-hypercore-ledger-postgres.mjs` | Evidencia append-only y validación de integridad | Orden transaccional, permisos y restauración aún requieren aceptación contra PostgreSQL real |
| Cuotas de revisión | `src/lib/distributed-review-quota.server.ts` | Cuota distribuida mediante Redis en la ruta protegida | Redis debe estar configurado; la aceptación real requiere pruebas de integración y fallo |
| Integridad y certificación | `src/lib/tamv-attribution.ts`, `tamv-attribution.json`, `tamv-attribution.sig`, `scripts/tamv-certification.mjs` | Hashes y verificación de firma del manifiesto | No declarar certificado un release sin firma válida del artefacto exacto |
| Observabilidad | `src/lib/hypercore-turbo/metrics.ts`, `metrics-auth.ts`, `src/lib/error-capture.ts` | Métricas y captura local de errores | No asumir agregación, retención ni alertas externas sin configuración comprobada |
| Paquete distribuible | `tamv-pack/`, `tamv-genesis/v3/`, `skills.sh.json` | Contratos, skills públicas e inventario de cierre | El estado debe coincidir entre manifiestos, pruebas y evidencia de release |
| Automatización | `.github/workflows/`, `scripts/`, `package.json` | CI, validadores, comprobaciones de integridad y release | La definición del workflow no es evidencia; se requiere run exitoso del SHA exacto |

## 3. Flujos críticos

### 3.1 Revisión de contenido asistida por IA

1. El cliente envía una solicitud a la función de servidor tipada.
2. El servidor valida el payload y aplica los guardas de revisión.
3. La cuota distribuida debe autorizar la operación antes de invocar el gateway.
4. El servidor realiza la llamada al gateway configurado; las credenciales no deben exponerse al navegador.
5. La respuesta se valida y se devuelve al cliente como resultado de revisión.
6. Los metadatos de auditoría no deben interpretarse como evidencia de un registro durable salvo que el adaptador persistente esté conectado y haya superado sus pruebas.

**No implica:** publicación automática, almacenamiento permanente del borrador, certificación del contenido, ejecución de otras skills ni garantía de calidad del modelo.

### 3.2 Recibos de gobernanza

1. El usuario debe autenticarse mediante el mecanismo configurado.
2. El servidor valida la intención, la clave idempotente, los identificadores y la política.
3. La intención se persiste solo si el esquema y las credenciales están disponibles.
4. La API puede devolver un recibo de intención; eso no es aprobación ni ejecución.
5. La transición a éxito exige evidencia generada y verificada por un componente de confianza.

**Regla:** no aceptar autoridad declarada por el cliente como sustituto de identidad autenticada o aprobación explícita.

### 3.3 Integridad y distribución

1. Se actualizan los hashes del inventario protegido después de los cambios revisados.
2. Se valida el inventario y el manifiesto.
3. El responsable autorizado firma el manifiesto con la clave privada bajo custodia.
4. Se verifica la firma con la clave pública correspondiente.
5. Se genera y verifica la procedencia/SBOM requerida por la política de release.
6. Se publica exactamente el artefacto cuyo digest se verificó.

Un hash demuestra coincidencia de contenido respecto de un valor esperado; una firma autentica la relación con una clave; ninguna de las dos demuestra por sí sola seguridad, legalidad o ausencia de vulnerabilidades.

## 4. Fronteras de confianza

- **Navegador → servidor:** toda entrada es no confiable; validar esquema, tamaño, tipo de contenido, autenticación y autorización en servidor.
- **Servidor → gateway de IA:** mantener claves en el entorno server-side, limitar tiempo y tamaño, validar la salida y evitar registrar prompts o datos personales innecesarios.
- **Servidor → Supabase/PostgreSQL:** utilizar el cliente/rol mínimo requerido; probar RLS, grants y denegaciones con roles equivalentes a despliegue.
- **Servidor → Redis:** tratar errores, timeouts y respuestas malformadas como fallos; en producción, la cuota protegida debe fallar de forma cerrada.
- **CI → secretos de release:** exponer la clave privada solo al job de firma autorizado; no a ejecuciones no confiables de pull requests.
- **Manifestación pública → capacidades:** no inferir disponibilidad a partir de nombres, documentación o presencia en el catálogo.
- **Proveedor externo → resultado:** un timeout tras enviar una operación puede dejar el resultado en estado desconocido; conciliar mediante identificadores idempotentes y evidencia antes de reintentar efectos secundarios.

## 5. Contratos y estados de capacidad

Los estados del inventario deben interpretarse de manera conservadora:

| Estado | Significado operativo |
|---|---|
| `closed` | Cumple el criterio de cierre definido por el registro y tiene evidencia/pruebas referenciadas; no equivale automáticamente a producción |
| `contract` | Existe un contrato/puerto, pero no se ha demostrado un ejecutor o proveedor real |
| `documented` | Existe documentación, diseño o guía; no implica código ejecutable |
| `blocked` | Una dependencia externa, autorización, secreto o decisión de esquema impide completar el flujo |
| `open` | Trabajo reconocido y no completado |
| `not-applicable` | La propuesta no corresponde a la arquitectura de este repositorio |

El estado debe verificarse en `tamv-genesis/v3/closure.json`, los manifiestos del paquete y la matriz de implementación; no se debe inferir desde el texto promocional.

## 6. Gestión del esquema

`AGENTS.md` declara que Lovable administra el esquema y prohíbe editar manualmente `drizzle/` y `supabase/migrations/`. Cualquier cambio de tablas, triggers, RLS o grants debe:
1. Proponerse al responsable del esquema mediante el flujo autorizado.
2. Revisarse en un entorno no productivo.
3. Validarse con pruebas de permisos positivos y negativos.
4. Registrar la versión aplicada y el commit probado.
5. Someterse a una prueba de restauración antes de aceptar el cambio para producción.

No copiar SQL de documentación a producción sin revisión y autorización.

## 7. Comandos de orientación

Consultar primero `package.json` y `docs/OPERATIONS.md` para la lista vigente de scripts. El flujo base documentado incluye:

```bash
bun install --frozen-lockfile
bun run test
bun run lint
bun run tamv:check
bun run build
```

Los nombres de scripts pueden evolucionar. Ejecutar solo comandos presentes en la versión inspeccionada del manifiesto y guardar el resultado con el SHA de commit. Los comandos anteriores no prueban conectividad de servicios externos.

## 8. Condiciones mínimas para afirmar operación real

- [ ] El commit de código y el artefacto desplegado están identificados por SHA/digest.
- [ ] El pipeline CI del commit exacto terminó correctamente.
- [ ] La configuración de entorno fue validada sin revelar secretos.
- [ ] Se completó una prueba autenticada real y su correspondiente prueba negativa.
- [ ] PostgreSQL: concurrencia, digest, permisos, RLS, persistencia y restauración demostrados.
- [ ] Redis: cuotas distribuidas, concurrencia, expiración, timeout, indisponibilidad y fail-closed demostrados.
- [ ] El camino protegido registra auditoría durable y bloquea la operación si la auditoría obligatoria falla.
- [ ] Firma de release y verificación del artefacto exacto correctas.
- [ ] SBOM/procedencia verificada conforme a la política del release.
- [ ] Observabilidad, alertas, responsables y runbook de incidentes probados.
- [ ] Las capacidades anunciadas corresponden a ejecutores efectivamente disponibles.

Hasta que la evidencia exista, la conclusión correcta es **desarrollo endurecido con gates parciales**, no certificación completa de producción.
