# Registro público de auditoría técnica y deuda — TAMV Creator Intelligence

**Fecha de corte:** 15 de noviembre de 2026  
**Repositorio:** https://github.com/AnubisVillasenor1/tamv-creator-intelligence  
**Alcance:** revisión estática de documentación, manifiestos, scripts, ruta de recibos y especificación SQL. No equivale a pentest, auditoría externa, certificación normativa ni prueba de producción.

## Resumen ejecutivo

El repositorio tiene una base técnica significativa: aplicación web, habilidades versionadas, contratos, validadores, pruebas y automatización CI. La integración de recibos de gobernanza introduce un flujo de intención autenticada que deliberadamente no ejecuta operaciones externas.

Sin embargo, la evidencia disponible no permite afirmar que la deuda técnica sea cero, que el proyecto esté certificado integralmente o que todas las integraciones funcionen en producción. Las brechas principales se concentran en la validación del entorno real, persistencia y concurrencia, límites distribuidos, firma/procedencia del release y separación verificable entre contratos y ejecutores.

## Hallazgos priorizados

| Prioridad | Área | Hallazgo | Criterio de cierre |
|---|---|---|---|
| P0 — release gate | Persistencia de recibos | Existe especificación SQL y adaptador, pero no se aporta evidencia de aprovisionamiento en un entorno de prueba conectado. | Aprovisionamiento aprobado, pruebas reales de permisos/RLS, idempotencia y concurrencia, y evidencia asociada a un commit. |
| P0 — release gate | Release firmado | El repositorio dispone de scripts de hash y firma, pero no debe asumirse que el release actual tiene firma válida. | Firma Ed25519 válida, clave pública confiable por canal independiente y verificación del artefacto exacto. |
| P0 — release gate | Integridad del ledger Hyper-Core | La documentación operativa registra una cuestión pendiente sobre el orden de secuencia frente al bloqueo transaccional. | Corregir el diseño bajo el flujo autorizado de gestión de esquema y probarlo con escrituras concurrentes en PostgreSQL real. |
| P1 | Límite de cuerpo HTTP | La ruta comprueba el tamaño después de leer el cuerpo completo; el límite declarado no restringe por sí mismo la memoria consumida durante la lectura. | Leer el flujo por fragmentos, abortar al superar el límite y añadir pruebas para cuerpos fragmentados, sin longitud declarada y sobre el límite. |
| P1 | Idempotencia multiusuario | La especificación usa una clave de idempotencia globalmente única, mientras que las intenciones están vinculadas a un actor. | Definir y probar el ámbito de unicidad compatible con el actor y con el contrato de reintentos, mediante el flujo de esquema aprobado. |
| P1 | Control de frecuencia | Las cuotas que dependen de memoria local no coordinan múltiples instancias o procesos. | Límite compartido y atómico, políticas explícitas y pruebas de concurrencia multiinstancia. |
| P1 | Ejecución externa | La ruta actual registra intención, pero no hay que confundirla con autorización ni ejecución de despliegues. | Modelo de roles, aprobación explícita, adaptador mínimo de ejecución, permisos de mínimo privilegio, recuperación y pruebas de destino. |
| P1 | Evidencia independiente | La validez estructural de un recibo no prueba el resultado del sistema externo. | Verificador independiente que consulta el destino, valida el artefacto exacto y persiste evidencia durable. |
| P1 | Observabilidad | La telemetría local no demuestra agregación, alertas ni continuidad entre instancias. | Backend de observabilidad configurado, retención definida, alertas probadas y tratamiento de datos sensibles. |
| P2 | Inventario de capacidades | Los contratos describen capacidades que pueden no tener ejecutores conectados. | Inventario automático que clasifique cada capacidad como documentada, implementada, probada, operada o bloqueada. |
| P2 | Cadena de suministro | La disponibilidad de scripts no prueba SBOM/procedencia firmada para cada release. | SBOM generado, atestación de procedencia verificable y política de dependencias aplicada al artefacto publicado. |
| P2 | Documentación pública | La documentación histórica y operativa puede describir estados de fechas diferentes. | Un estado de release único, fechado, vinculado a SHA, con enlaces a ejecuciones y advertencias de alcance. |

## Corrección aplicada en esta rama

Se endurece la lectura del cuerpo de la ruta de recibos para aplicar el límite durante la lectura del flujo, en vez de esperar a que todo el cuerpo haya sido materializado en memoria. Se añaden pruebas para el límite, el tamaño exacto y el caso de cuerpo que excede el máximo. Se incorpora además el documento de divulgación pública y este registro de auditoría.

La corrección de lectura HTTP no resuelve las brechas de persistencia, despliegue, firmas ni integración externa. Estas requieren validación de infraestructura y, para el esquema, el flujo de cambios administrado por Lovable.

## Condiciones para declarar deuda cero

No se puede declarar «deuda técnica cero» como una propiedad absoluta. Para una declaración de cierre verificable, cada hallazgo debe tener: propietario, severidad, prueba de aceptación, commit de corrección, resultado CI, evidencia del entorno y decisión explícita de riesgo residual. Los bloqueos externos deben permanecer visibles como bloqueos, no convertirse en porcentajes de avance.

## Límites de esta auditoría

La revisión se basa en los archivos disponibles en GitHub y en la evidencia de CI consultable. No se accedió a secretos, bases de datos privadas, cuentas de proveedores ni infraestructura de producción. No se ejecutó un pentest ni se certificó el cumplimiento de un estándar externo. Los resultados deben interpretarse como una auditoría técnica de repositorio y una lista de cierre, no como garantía de seguridad absoluta.
