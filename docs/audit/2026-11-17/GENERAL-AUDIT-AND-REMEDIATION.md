# Auditoría general y remediación inicial — TAMV Creator Intelligence

Fecha de corte: 17 de noviembre de 2026. Base revisada: main, commit 6ac86430015bc31ae907501a901e3c2f072c856b, workflows de CI y release, documentación de gates de producción y ZIP adjunto TAMV Governance Skills Pack v2. Revisión estática; no es pentest, certificación ni validación del despliegue real.

## Resumen
El repositorio tiene aplicación y CI amplios. El workflow principal para el SHA revisado finalizó con success. El README declara 460 pruebas de aplicación, 125 de Genesis y 17 del prototipo SQLite, además de typecheck, lint y build. Esas cifras son declaraciones del README y no sustituyen logs de las suites ni pruebas de producción.

La documentación identifica gates abiertos: firma del release, probes contra PostgreSQL desechable, roles/RLS, persistencia/restauración y evidencia de infraestructura. El documento de firma aclara correctamente que una firma válida no certifica cumplimiento legal, calidad del modelo ni seguridad de proveedores.

## Hallazgos priorizados
| ID | Prioridad | Hallazgo | Remediación en esta rama | Cierre pendiente |
|---|---|---|---|---|
| AUD-001 | P0 | CI verde no certifica un release. | No se fabrica firma ni se desbloquean capacidades. | El propietario configura secretos seguros, aprueba digest por canal independiente y ejecuta release etiquetado. |
| AUD-002 | P0 | No hay evidencia suficiente de ledger/RLS/restauración en infraestructura real. | El nuevo paquete no conecta a datos reales. | Ejecutar probes en PostgreSQL desechable y adjuntar SHA, versiones y logs redactados. |
| AUD-003 | P1 | El MCP demo no implementa autorización de producción. | Fixtures fijas, solo lectura, sin cliente de red; pruebas locales añadidas. | Validar interoperabilidad MCP y threat model antes de conectar fuentes reales. |
| AUD-004 | P1 | El handoff original no imponía digest hexadecimal estricto. | Esquema integrado exige 64 caracteres hexadecimales. | Ejecutar un validador completo JSON Schema Draft 2020-12. |
| AUD-005 | P1 | El paquete no tenía suite reproducible en el repo. | Tests, validador y workflow independiente añadidos. | Confirmar CI verde del PR. |
| AUD-006 | P2 | SHA-256 no es firma ni prueba de autoría. | Generador de manifiesto declara sus límites. | Firmar mediante proceso separado autorizado si se requiere autenticidad.

## Alcance de la implementación
Cinco skills v2.0.0, servidor MCP sintético, esquema handoff, ocho casos adversariales, tests stdlib, validador, generador de manifiesto y workflow dedicado. No se modifican conectores de producción, base de datos ni firma de release.

## Aceptación
1. Workflow del paquete verde en el SHA del PR.
2. Tests y validación estructural reproducibles.
3. Revisión humana del PR.
4. Cierre de gates P0 con evidencia separada antes de certificar o desplegar.
