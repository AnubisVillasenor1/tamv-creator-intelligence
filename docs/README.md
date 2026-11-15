# Índice de documentación — TAMV Creator Intelligence

## Para público, usuarios y colaboradores

- [Documento público de divulgación técnica](PUBLIC-TECHNICAL-OVERVIEW.md): propósito, autoría declarada, arquitectura conceptual, capacidades, límites, seguridad y condiciones de producción.
- [Política de gobernanza](../GOVERNANCE.md): principios y proceso de decisión; es una política propuesta y no una certificación.
- [Política de seguridad y divulgación](../SECURITY.md): tratamiento responsable de reportes y requisitos de seguridad.

## Para desarrollo y operación

- [Arquitectura unificada del Creator OS](TAMV-CREATOR-OS-UNIFIED-ARCHITECTURE.md).
- [Operaciones](OPERATIONS.md): procedimientos y límites de capacidades.
- [Recibos de gobernanza](GOVERNANCE-RECEIPTS-OPERATIONS.md): API de intención y condiciones de provisionamiento.
- [Pipeline de audio](AUDIO-PIPELINE.md) y [orquestación de audio](AUDIO-ORCHESTRATION.md).
- [Sello, firma y cifrado v3](SOVEREIGN-V3.md).
- [Estado de cierre de módulos](../tamv-genesis/v3/closure.json).

## Auditorías y evidencia

- [Auditoría técnica y registro de deuda — 15 de noviembre de 2026](audit/2026-11-15/README.md).
- [Auditoría del 13 de noviembre de 2026](audit/2026-11-13/README.md).

## Interpretación de estados

- **Implementado y probado:** existe código y evidencia de pruebas para el alcance señalado; no implica por sí solo producción.
- **Contrato/documentado:** describe el comportamiento esperado, sin demostrar un servicio operativo.
- **Bloqueado:** depende de una acción, credencial, proveedor o aprobación externa verificable.
- **Pendiente de integración:** falta conectar y validar el componente en un entorno real de pruebas.

Los workflows de CI, la documentación y los registros de cierre son fuentes complementarias. Ninguna de ellas, por separado, sustituye la verificación del artefacto, la firma de release, las pruebas de integración ni la validación del entorno de producción.
