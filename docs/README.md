# Índice de documentación — TAMV Creator Intelligence

## Para público, usuarios y colaboradores

- [Documento público de divulgación técnica](PUBLIC-TECHNICAL-OVERVIEW.md): propósito, autoría declarada, arquitectura conceptual, capacidades, límites, seguridad y condiciones de producción.
- [Política de gobernanza](../GOVERNANCE.md): principios y proceso de decisión; es una política propuesta y no una certificación.
- [Política de seguridad y divulgación](../SECURITY.md): tratamiento responsable de reportes y requisitos de seguridad.
- [Divulgación del proyecto](PUBLIC-PROJECT-DISCLOSURE.md): alcance, afirmaciones públicas y limitaciones.
- [Huella pública](PUBLIC-FOOTPRINT.md): referencias públicas y límites de verificación.

## Arquitectura y desarrollo

- [Referencia de arquitectura operativa](ARCHITECTURE-REFERENCE.md): mapa de capas, flujos críticos, fronteras de confianza y condiciones para afirmar operación real.
- [Superficie API y contratos de error](API-SURFACE-AND-ERROR-CONTRACTS.md): rutas reales, autenticación, límites, códigos de respuesta y diferencias entre diagnóstico, intención y ejecución.
- [Registro de fuentes e integración entre repositorios](CROSS-REPOSITORY-ADOPTION-REGISTER.md): procedencia de fuentes de ambos perfiles, patrones adoptados, límites y decisiones excluidas.
- [Arquitectura unificada del Creator OS](TAMV-CREATOR-OS-UNIFIED-ARCHITECTURE.md).
- [Operaciones](OPERATIONS.md): procedimientos y límites de capacidades.
- [Matriz de implementación](IMPLEMENTATION-MATRIX.md): distingue código, contratos, documentación y dependencias bloqueadas.
- [Catálogo del corpus](CORPUS-CATALOG.md): inventario y organización del paquete.
- [Pipeline de audio](AUDIO-PIPELINE.md) y [orquestación de audio](AUDIO-ORCHESTRATION.md).
- [Orquestación local de agentes](AGENT-ORCHESTRATION.md): planes deterministas sin LLM, herramientas locales y efectos externos denegados por defecto.
- [Recibos de gobernanza](GOVERNANCE-RECEIPTS-OPERATIONS.md): API de intención y condiciones de provisionamiento.
- [Sello, firma y cifrado v3](SOVEREIGN-V3.md).
- [Estado de cierre de módulos](../tamv-genesis/v3/closure.json).

## Despliegue, hardening y recuperación

- [Estado de release — 15 de noviembre de 2026](RELEASE-STATE-2026-11-15.md): estado fechado y ligado al SHA de main, con evidencia CI, puertas locales, advertencias y bloqueos externos.
- [Preparación de despliegue — 15 de noviembre de 2026](DEPLOYMENT-READINESS-2026-11-15.md).
- [Solicitud de cambio de esquema — Hyper-Core](SCHEMA-CHANGE-REQUEST-HYPERCORE-LEDGER.md): especificación de remediación pendiente para el propietario de esquema; no es migración ejecutable.
- [Aislamiento de entornos y gates de integraciones](DEPLOYMENT-ENVIRONMENT-ISOLATION.md): criterios separados para local, CI, Preview, staging y producción.
- [ADR-003 — aislamiento y evidencia](adr/ADR-003-environment-isolation-and-evidence.md): política de clasificación de entorno y evidencia ligada al artefacto.
- [Plan de hardening de producción](PRODUCTION-HARDENING-PLAN.md).
- [Gates de evidencia de producción](PRODUCTION-EVIDENCE-GATES.md).
- [Firma de releases](RELEASE-SIGNING.md).
- [Seguridad operativa y respuesta a incidentes](SECURITY-OPERATIONS-AND-INCIDENT-PLAYBOOK.md): contención, recuperación y playbooks por escenario.
- [Integración Hyper-Core/Vercel](HYPERCORE-VERCEL-INTEGRATION.md).

## Auditorías, cobertura y evidencia

- [Matriz de cobertura documental](DOCUMENTATION-COVERAGE-MATRIX.md): fuentes canónicas, vacíos, criterios de actualización y límites de inferencia.
- [Auditoría técnica y registro de deuda — 15 de noviembre de 2026](audit/2026-11-15/README.md).
- [Auditoría profunda e implementación de correcciones](audit/2026-11-15/DEEP-AUDIT-IMPLEMENTATION-REPORT.md): hallazgos reproducibles, cambios, validaciones y bloqueos externos.
- [Auditoría del 13 de noviembre de 2026](audit/2026-11-13/README.md).
- [Registro técnico de deuda](TECHNICAL-AUDIT-AND-DEBT-REGISTER.md).
- [Evaluación académica](ACADEMIC-EVALUATION.md): alcance evaluativo y límites de las afirmaciones.

## Gobernanza, derechos y contexto institucional

- [Política de gobernanza de IA](legal/AI-GOVERNANCE-POLICY.md).
- [Protección de datos y derechos de creadores](legal/DATA-PROTECTION-AND-CREATOR-RIGHTS.md).
- [Matriz regulatoria](legal/REGULATORY-MATRIX.md).
- [Registro de implementación legal](legal/LEGAL-IMPLEMENTATION-REGISTER.md).
- [Posicionamiento de producto](PRODUCT-POSITIONING.md).
- [Publicación](PUBLISHING.md).

## Interpretación de estados

- **Implementado y probado:** existe código y evidencia de pruebas para el alcance señalado; no implica por sí solo producción.
- **Contrato/documentado:** describe el comportamiento esperado, sin demostrar un servicio operativo.
- **Bloqueado:** depende de una acción, credencial, proveedor o aprobación externa verificable.
- **Pendiente de integración:** falta conectar y validar el componente en un entorno real de pruebas.
- **Sin evidencia de producción:** el repositorio no contiene evidencia suficiente de aceptación contra el entorno real.
- **Histórico:** refleja un commit o una fecha específica; no debe reutilizarse como estado actual sin revalidación.

Los workflows de CI, la documentación, las matrices de cierre y los despliegues son fuentes complementarias. Ninguna de ellas, por separado, sustituye la verificación del artefacto, la firma del release, las pruebas de integración, las pruebas negativas de autorización, la restauración ni la validación del entorno de producción.

## Mantenimiento documental

Cuando un cambio modifique comportamiento, contratos, rutas, variables, políticas o estado de capacidades, actualiza la fuente canónica y la [matriz de cobertura](DOCUMENTATION-COVERAGE-MATRIX.md). No marques una capacidad como operativa por el mero hecho de documentarla.

Ejecuta `bun run docs:check:test` y `bun run docs:check` para validar enlaces internos de los documentos mantenidos. Los enlaces externos no se verifican mediante este gate.