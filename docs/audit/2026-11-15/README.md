# Auditoría técnica y registro de deuda — TAMV Creator Intelligence

**Fecha de revisión:** 15 de noviembre de 2026  
**Repositorio:** `AnubisVillasenor1/tamv-creator-intelligence`  
**Rama de trabajo:** `audit/public-disclosure-hardening`  
**Alcance:** revisión estática de documentación de arquitectura, inventario de cierre, políticas, scripts declarados, paquete y estado de CI disponible durante esta revisión. No equivale a una auditoría de penetración ni a una validación de la infraestructura externa.

> Este informe conserva el contexto de la auditoría anterior. Para el corte operativo actual, las correcciones propuestas y los hallazgos adicionales detectados el 15 de noviembre, consulta la [auditoría profunda e implementación de correcciones](DEEP-AUDIT-IMPLEMENTATION-REPORT.md).

## 1. Dictamen ejecutivo

El proyecto contiene código ejecutable, pruebas automatizadas y controles de integridad; sin embargo, el conjunto no puede declararse libre de deuda técnica ni certificado para producción. Hay dependencias externas pendientes, capacidades descritas como contratos, un release que declara firma pendiente y controles operativos que requieren pruebas en infraestructura real.

Este informe separa:

- **Corregido en esta entrega:** publicación de una descripción técnica segura y registro auditable de los límites conocidos.
- **Verificado por evidencia disponible:** estado de PR y ejecuciones de CI que se completaron para la revisión previa.
- **Pendiente de verificación:** comportamiento en base de datos real, servicios externos, configuración de despliegue, firma y recuperación.
- **Deuda reconocida:** capacidades incompletas que deben permanecer bloqueadas o etiquetadas hasta que exista implementación y evidencia.

No se asigna un porcentaje global de finalización: sin un inventario exhaustivo ponderado y evidencia por requisito, un porcentaje sería engañoso.

## 2. Evidencia consultada

La revisión utilizó el contenido accesible del repositorio, incluidos:

- `README.md`, `package.json` y `AGENTS.md`.
- `SECURITY.md` y `GOVERNANCE.md`.
- `tamv-genesis/v3/closure.json`.
- `docs/TAMV-CREATOR-OS-UNIFIED-ARCHITECTURE.md`.
- `docs/GOVERNANCE-RECEIPTS-OPERATIONS.md` y su especificación SQL.
- Metadatos del PR #9 y resultados de los workflows asociados.

El PR #9 se encuentra fusionado en `main`. Los dos workflows reportados para el head revisado terminaron con conclusión `success`. Esto respalda la ejecución de los checks configurados en ese commit; no sustituye las comprobaciones externas indicadas a continuación. El estado de la rama de esta auditoría deberá evaluarse de nuevo cuando se abra su PR.

## 3. Hallazgos por prioridad

### P0 — Bloqueadores para declarar producción certificada

#### P0.1 — Firma del release pendiente

**Evidencia:** el README y el registro de cierre indican `UNSIGNED_RELEASE_PENDING` y que la firma Ed25519 de release no está disponible en el repositorio.

**Riesgo:** no se puede afirmar autenticidad de la versión publicada mediante una firma de release válida. Un hash detecta cambios respecto de una referencia, pero no identifica por sí solo quién produjo esa referencia.

**Acción requerida:** generar o custodiar la clave de firma fuera del repositorio; definir la raíz de confianza de forma independiente; firmar los manifiestos mediante el proceso autorizado y verificar la firma desde un entorno limpio. No añadir claves privadas ni fabricar una firma.

**Criterio de cierre:** verificación criptográfica satisfactoria sobre el artefacto exacto y evidencia de cómo se confía en la clave pública.

#### P0.2 — Persistencia de recibos de gobernanza pendiente de provisionamiento real

**Evidencia:** el esquema está descrito en `docs/sql/tamv-governance-receipts.sql`; `AGENTS.md` indica que la base de datos es administrada por Lovable y prohíbe editar manualmente `supabase/migrations/` o `drizzle/`.

**Riesgo:** la API puede fallar de forma cerrada si la configuración o el esquema no existen. Un contrato SQL estático no prueba la existencia de tablas, triggers, políticas, permisos ni comportamiento transaccional en Supabase.

**Acción requerida:** aplicar/revisar el esquema por el flujo aprobado de Lovable y probarlo en un proyecto no productivo. Validar RLS, permisos, idempotencia, transiciones concurrentes, inmutabilidad, atomicidad del ledger, retención de evidencia y restauración.

**Criterio de cierre:** pruebas de integración reproducibles contra el esquema real y registro de los resultados; no basta con que el validador estático termine correctamente.

#### P0.3 — No existe autorización para ejecutar operaciones externas en el flujo de recibos

**Evidencia:** el endpoint registra intenciones pendientes y no ejecuta despliegues, publicaciones ni operaciones destructivas. La arquitectura exige aprobación humana y verificación independiente.

**Riesgo:** conectar un ejecutor antes de definir autoridad, roles, aprobación y evidencia podría convertir una solicitud registrada en una acción no autorizada o declarar éxito sin comprobar el destino.

**Acción requerida:** definir RBAC/roles y límites de cada operación; enlazar la aprobación al actor, candidato, artefacto y destino; implementar un adaptador de ejecución con permisos mínimos, idempotencia y rollback; validar el resultado por un verificador independiente.

**Criterio de cierre:** pruebas negativas de acceso, pruebas de concurrencia/reintentos y prueba de extremo a extremo en un entorno no productivo. Mientras no exista, mantener el endpoint limitado a registrar intención.

### P1 — Riesgos importantes de robustez y operación

#### P1.1 — Limitación de frecuencia no distribuida

**Evidencia:** la cuota de revisión creativa está documentada como local al proceso.

**Riesgo:** múltiples instancias o reinicios pueden eludir la cuota agregada. La cuota en memoria no es un control distribuido.

**Acción requerida:** implementar un limitador compartido, definir claves de partición, límites, política ante indisponibilidad, observabilidad y pruebas de concurrencia.

**Criterio de cierre:** pruebas multiinstancia que demuestren el límite agregado y el comportamiento ante fallo del backend de cuotas.

#### P1.2 — Pipeline de audio sin proveedor ni infraestructura durable de producción

**Evidencia:** el registro de cierre describe el ciclo de vida y adaptadores en memoria; no declara proveedor real, cola durable, almacenamiento de objetos ni servicio de audio conectados.

**Riesgo:** el pipeline de referencia no demuestra generación de audio real, persistencia entre reinicios ni ejecución de trabajos a escala.

**Acción requerida:** seleccionar proveedores y servicios, validar derechos/consentimiento, diseñar almacenamiento seguro y cola durable, implementar adaptadores reales y pruebas de artefactos. Los valores de DSP deben seguir siendo desconocidos (`null`) cuando no se hayan medido.

**Criterio de cierre:** pruebas con proveedor de prueba o sandbox, almacenamiento y cola reales en entorno no productivo, validación de integridad del artefacto y recuperación de trabajos.

#### P1.3 — Procedencia y SBOM no equivalen a integración completa

**Evidencia:** la documentación declara que la procedencia SLSA del runtime no está integrada. La existencia de scripts o workflows no demuestra por sí sola que todos los artefactos tengan atestaciones verificadas.

**Riesgo:** no se puede establecer una cadena completa y verificable desde el código hasta cada artefacto desplegado.

**Acción requerida:** generar SBOM y atestaciones para el artefacto concreto; vincularlas a commit y digest; verificar procedencia en el gate de release y probar que artefactos sin evidencia se rechazan.

**Criterio de cierre:** artefacto de ejemplo validado desde un entorno limpio y fallo demostrado ante atestación ausente o inválida.

#### P1.4 — Integraciones externas descritas, pero no acreditadas como operativas

**Evidencia:** la arquitectura marca OCI, Databricks/Delta, AI Functions, colas, almacenamiento y otras integraciones como objetivos o dependencias no demostradas.

**Riesgo:** usuarios o colaboradores podrían interpretar referencias de arquitectura como servicios disponibles.

**Acción requerida:** mantener un inventario de integración con proveedor, entorno, adaptador, credenciales gestionadas, pruebas, responsable y evidencia. Marcar cada integración como `implemented`, `contract`, `blocked` o `not-integrated` según corresponda.

**Criterio de cierre:** prueba de integración reproducible por servicio y evidencia del entorno de prueba.

#### P1.5 — Orden cronológico de la cadena de auditoría bajo concurrencia no demostrado

**Evidencia:** el ledger SQL utiliza una columna identity como orden de consulta y un trigger que serializa el cálculo del hash anterior. El repositorio no aporta una prueba de integración PostgreSQL concurrente que demuestre que el orden de asignación de identidad siempre coincide con el orden serializado de la cadena.

**Riesgo:** una cadena puede parecer íntegra en pruebas secuenciales y no conservar el orden esperado en condiciones concurrentes. No debe tratarse como registro cronológico resistente a alteraciones hasta resolver y probar esta propiedad.

**Acción requerida:** solicitar al responsable de esquema una corrección mediante el flujo de Lovable, sin editar manualmente `drizzle/` ni las migraciones administradas. El diseño debe asignar el orden canónico dentro de la sección crítica de serialización o usar un mecanismo equivalente probado; añadir pruebas concurrentes reales que verifiquen continuidad de hashes y orden canónico.

**Criterio de cierre:** prueba de concurrencia contra PostgreSQL que demuestre cero bifurcaciones, cero enlaces fuera de orden y verificación completa de la cadena después de múltiples inserciones simultáneas.

#### P1.6 — Puerto de auditoría del orquestador sin adaptador durable de producción acreditado

**Evidencia:** `AuditPort.append` es una interfaz requerida por el orquestador, pero una interfaz y sus pruebas unitarias no demuestran que el flujo protegido esté conectado a un adaptador persistente y durable en el entorno de despliegue.

**Riesgo:** una ruta de ejecución podría carecer de un registro duradero si se conecta un adaptador en memoria, se omite el wiring o se pierden eventos durante una caída.

**Acción requerida:** localizar y verificar el punto de composición del runtime, implementar un adaptador server-only durable, fallar de forma cerrada ante error de escritura y vincular cada evento con trace, operación, commit y evidencia mínima sin almacenar contenido sensible.

**Criterio de cierre:** prueba de extremo a extremo con fallo inducido del almacenamiento, reinicio del proceso y lectura posterior del registro; el evento no puede desaparecer silenciosamente ni declarar éxito sin persistencia.

### P2 — Deuda de producto, mantenibilidad y documentación

#### P2.1 — Skills públicas con estado documental

El registro de cierre marca las cuatro skills públicas como `documented`. Deben seguir etiquetadas como contratos hasta que cada capacidad publicada tenga implementación, pruebas y evidencia correspondiente.

**Cierre:** validar automáticamente referencias a capacidades, evitar nombres que sugieran disponibilidad inexistente y publicar una matriz de cobertura derivada del árbol real.

#### P2.2 — Harness F0–F17 no debe presentarse como automatización completa

La arquitectura describe fases objetivo. Cada fase requiere un ejecutor identificable, criterios de entrada/salida, artefactos y pruebas.

**Cierre:** crear un inventario fase por fase y marcar como implementada únicamente la fase con ejecución reproducible y evidencia.

#### P2.3 — Inventario de contratos y estados de cierre

El repositorio declara 37 contratos internos, pero la cifra debe comprobarse automáticamente contra el árbol canónico y las referencias de skills.

**Cierre:** validador que enumere contratos reales, detecte referencias rotas, capacidades sin módulo, pruebas inexistentes y estados `closed` sin evidencia; ejecutar en CI.

#### P2.4 — Documentación pública y estado real

La documentación de arquitectura contiene un nivel de detalle superior al de algunas integraciones ejecutadas. Sin una vista pública clara, puede ser difícil distinguir diseño de implementación.

**Corrección en esta entrega:** se añade un documento de divulgación que explica autoría declarada, propósito, arquitectura, capacidades y limitaciones sin divulgar secretos ni datos operativos confidenciales.

**Criterio de mantenimiento:** actualizar el documento en cada release y citar el estado comprobado de la versión correspondiente.

## 4. Controles que no deben debilitarse

- No insertar secretos ni claves privadas en el repositorio o frontend.
- No modificar manualmente los directorios de esquema administrados por Lovable.
- No cambiar un estado de cierre a `closed` solo por tener documentación o un mock.
- No declarar un resultado exitoso antes de verificarlo en el destino.
- No deshabilitar verificaciones de integridad para conseguir un build verde.
- No tratar una huella SHA-256 como sustituto de firma autenticada.
- No tratar CI verde como certificación de la infraestructura de producción.
- No fusionar ni desplegar una revisión con controles obligatorios pendientes sin aprobación explícita y evidencia.

## 5. Plan de reducción de deuda técnica

### Fase A — Integridad de release
- [ ] Confirmar inventario y hashes del candidato.
- [ ] Custodiar clave privada fuera de Git y del frontend.
- [ ] Firmar manifiesto y sello con el proceso autorizado.
- [ ] Verificar firma y trust root desde entorno limpio.
- [ ] Generar y validar SBOM/procedencia para el artefacto exacto.

### Fase B — Persistencia y autorización
- [ ] Provisionar el esquema de recibos mediante Lovable.
- [ ] Probar RLS, privilegios y ledger append-only en Supabase no productivo.
- [ ] Ejecutar pruebas concurrentes de idempotencia y transiciones.
- [ ] Definir roles y aprobaciones humanas.
- [ ] Implementar ejecutor aislado solo después de cerrar las pruebas anteriores.

### Fase C — Resiliencia
- [ ] Implementar rate limit distribuido.
- [ ] Conectar cola y almacenamiento durables para audio si se mantiene esa capacidad en alcance.
- [ ] Probar reinicios, fallos parciales, reintentos y recuperación.
- [ ] Probar backups y restauración con evidencia.
- [ ] Incorporar alertas y telemetría operativa verificables.

### Fase D — Inventario y cierre de módulos
- [ ] Enumerar contratos desde el árbol real.
- [ ] Validar las referencias de las cuatro skills.
- [ ] Mapear cada capacidad a código, pruebas, integración y evidencia.
- [ ] Hacer que CI rechace estados `closed` sin pruebas/evidencia.
- [ ] Distinguir automatización ejecutable de fases SDLC meramente documentadas.

### Fase E — Aprobación de release
- [ ] Ejecutar CI completo en el commit candidato exacto.
- [ ] Revisar dependencias, licencias, seguridad y privacidad.
- [ ] Verificar firma, SBOM y procedencia.
- [ ] Ejecutar smoke tests en un entorno no productivo equivalente.
- [ ] Obtener aprobación humana y plan de reversión.
- [ ] Publicar notas de versión con capacidades y limitaciones reales.

## 6. Definición operativa de “deuda técnica cero”

La ausencia absoluta de deuda técnica no es una propiedad que pueda probarse de forma universal en un sistema en evolución. Para este proyecto, el objetivo verificable debe definirse como:

1. Cero defectos críticos o altos conocidos sin mitigación aceptada.
2. Cero capacidades marcadas como operativas sin evidencia de implementación y pruebas.
3. Cero secretos expuestos conocidos y controles de secretos ejecutados en CI.
4. Cero dependencias críticas sin propietario, versión y plan de actualización.
5. Cero gates obligatorios omitidos en el proceso de release.
6. Cero rutas de operación sensible sin autenticación, autorización y auditoría aplicables.
7. Cero estados `closed` que carezcan de código, pruebas y evidencia verificables.
8. Cero afirmaciones públicas de producción, certificación o integración que excedan la evidencia disponible.

El cumplimiento debe medirse con un inventario automatizado, análisis de dependencias, pruebas y evidencia de entorno. Este informe no declara alcanzado ese objetivo; establece los bloqueadores conocidos y sus criterios de cierre.

## 7. Conclusión

La integración de recibos de gobernanza y los controles de CI constituyen una base útil, pero no completan por sí solos el ciclo de ejecución segura. Las prioridades son validar la persistencia real, definir autorización para acciones externas, firmar releases mediante una raíz de confianza verificable y convertir el inventario de capacidades en un gate automatizado.

La documentación pública creada en esta entrega reduce la ambigüedad sobre el alcance del proyecto. La deuda técnica restante debe cerrarse por etapas, con cambios aislados, CI del commit exacto, pruebas de integración y evidencia verificable. No se afirmará “100 % producción” hasta satisfacer los criterios correspondientes.
