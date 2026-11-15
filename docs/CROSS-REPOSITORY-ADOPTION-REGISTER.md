# Registro de fuentes e integración entre repositorios

**Revisión:** 2026-11-15  
**Repositorio destino:** AnubisVillasenor1/tamv-creator-intelligence

## 1. Método y límites

Se inspeccionaron fuentes disponibles de [OsoPanda1](https://github.com/OsoPanda1) y [AnubisVillasenor1](https://github.com/AnubisVillasenor1), priorizando ADR, referencias de arquitectura, requisitos de seguridad, runbooks y código relacionado con gobernanza, configuración, inferencia, persistencia, integridad y despliegue.

Este registro distingue: **fuente revisada**, **patrón adaptado**, **pendiente de implementación** y **no adoptado**. La documentación de otro proyecto no se convierte automáticamente en requisito del destino. No se importan variables, tablas, rutas, APIs ni código sin confirmar compatibilidad. No se ha copiado código fuente entre repositorios en esta entrega.

Los commits fijan las versiones de las fuentes y los SHA de blob identifican los archivos examinados.

## 2. Fuentes examinadas

### A. Isabella TERMINUS V6

Repositorio: [AnubisVillasenor1/ISABELLA-VERSION-TERMINUS-V6](https://github.com/AnubisVillasenor1/ISABELLA-VERSION-TERMINUS-V6)  
Commit de main observado: **5d32a18b0df66770eb0fdeb0e6e5005f4f59882d**.

| Fuente | SHA de blob | Conclusión aprovechable |
|---|---|---|
| [RFC-0001 Runtime y operatividad](https://github.com/AnubisVillasenor1/ISABELLA-VERSION-TERMINUS-V6/blob/5d32a18b0df66770eb0fdeb0e6e5005f4f59882d/docs/rfc/RFC-0001-runtime-operability.md) | 4468a0a97198c15eaf8ab9ece88d66fb6bc6e723 | Readiness, CI del SHA desplegado, smoke E2E, persistencia y aprobación humana son gates distintos. |
| [RFC-0002 Variables manuales](https://github.com/AnubisVillasenor1/ISABELLA-VERSION-TERMINUS-V6/blob/5d32a18b0df66770eb0fdeb0e6e5005f4f59882d/docs/rfc/RFC-0002-environment-manual-inputs.md) | 2474464e6019288a2221ed3f55b104c5a3b4deed | Inventario de configuración por grupo; secretos fuera de Git. |
| [RFC-0003 Arquitectura SSOT](https://github.com/AnubisVillasenor1/ISABELLA-VERSION-TERMINUS-V6/blob/5d32a18b0df66770eb0fdeb0e6e5005f4f59882d/docs/rfc/RFC-0003-architecture-ssot.md) | c3ffa8316aa05f7cff624181ac4adeacb84940ea | WIRED no demuestra credenciales, persistencia ni despliegue. |
| [RFC-0004 Gobernanza y seguridad](https://github.com/AnubisVillasenor1/ISABELLA-VERSION-TERMINUS-V6/blob/5d32a18b0df66770eb0fdeb0e6e5005f4f59882d/docs/rfc/RFC-0004-governance-security.md) | c1c47d53d4be1e2eee1b7bc31cb14bec981c3f39 | No confiar en identidad declarada por cliente; separar aprobación y ejecución; service role solo servidor. |
| [RFC-0005 Persistencia](https://github.com/AnubisVillasenor1/ISABELLA-VERSION-TERMINUS-V6/blob/5d32a18b0df66770eb0fdeb0e6e5005f4f59882d/docs/rfc/RFC-0005-persistence-data.md) | 378e1f9a39a27b8390fec87824c4b21185aedecf | Persistencia, integridad y escritura transaccional necesitan aceptación específica. |
| [RFC-0006 Proveedores de inferencia](https://github.com/AnubisVillasenor1/ISABELLA-VERSION-TERMINUS-V6/blob/5d32a18b0df66770eb0fdeb0e6e5005f4f59882d/docs/rfc/RFC-0006-inference-providers.md) | 141155002d0fff4445c259ccb22019dd4b30853f | Un fallback determinista no se presenta como inferencia externa. |
| [RFC-0007 Despliegue](https://github.com/AnubisVillasenor1/ISABELLA-VERSION-TERMINUS-V6/blob/5d32a18b0df66770eb0fdeb0e6e5005f4f59882d/docs/rfc/RFC-0007-deployment-operations.md) | bfe5447654e153fda3ef014e2c963b2eebf99bcc | Hay que verificar el entrypoint y el artefacto que realmente recibe tráfico. |
| [RFC-0009 Sanitización documental](https://github.com/AnubisVillasenor1/ISABELLA-VERSION-TERMINUS-V6/blob/5d32a18b0df66770eb0fdeb0e6e5005f4f59882d/docs/rfc/RFC-0009-documentation-sanitization.md) | cfdc11bf75e2360832df02f5a7c15dda580a5376 | Una fuente primaria por tema; README resumido; conservar artefactos canónicos y generados. |
| [Quality Gates](https://github.com/AnubisVillasenor1/ISABELLA-VERSION-TERMINUS-V6/blob/5d32a18b0df66770eb0fdeb0e6e5005f4f59882d/docs/spec/canonical/QUALITY_GATES.md) | 73c69273e891be7753202033f44ffb6e00b939de | Reproducibilidad, aislamiento, licencias, rollback y revisión humana. |
| [Esquema de evidencia](https://github.com/AnubisVillasenor1/ISABELLA-VERSION-TERMINUS-V6/blob/5d32a18b0df66770eb0fdeb0e6e5005f4f59882d/docs/spec/canonical/EVIDENCE_MANIFEST_SCHEMA.md) | b5c5ee4fcc4390138bd0e328e67a6222c39c7666 | Enlazar afirmaciones con commit, pruebas, decisión de política, rollback y limitaciones. El hash no acredita veracidad. |
| [Política de despliegue](https://github.com/AnubisVillasenor1/ISABELLA-VERSION-TERMINUS-V6/blob/5d32a18b0df66770eb0fdeb0e6e5005f4f59882d/docs/spec/canonical/DEPLOYMENT_POLICY.md) | b70d198ef91c1da0db0821615708c846fadfdc02 | Tests, scan, auth, permisos, smoke, readiness y rollback como gates independientes. |
| [Modelo de amenazas](https://github.com/AnubisVillasenor1/ISABELLA-VERSION-TERMINUS-V6/blob/5d32a18b0df66770eb0fdeb0e6e5005f4f59882d/docs/security/GENESIS-V6-THREAT-MODEL.md) | fbfb2a3af5796fb0997579e105208d48c8a9cf9f | Evaluar injection, replay, fuga de secretos, manipulación del ledger, tenant breakout y sustitución de proveedor. |
| [Beta live-model gate](https://github.com/AnubisVillasenor1/ISABELLA-VERSION-TERMINUS-V6/blob/5d32a18b0df66770eb0fdeb0e6e5005f4f59882d/docs/runbooks/BETA-LIVE-MODEL-GATE.md) | 34fcb43d0b498c22a8027a313ff0754a1f9aad65 | Build no demuestra inferencia real: se requiere smoke aislado, secreto protegido y sin fallback silencioso. |

### B. Play & Go

Repositorio: [AnubisVillasenor1/play-and-go](https://github.com/AnubisVillasenor1/play-and-go)  
Commit de main observado: **1c0c42c7f1c2336c24c582472d9072b29ed5021a**.

| Fuente | SHA de blob | Conclusión aprovechable |
|---|---|---|
| [ADR 0001 rate limiting](https://github.com/AnubisVillasenor1/play-and-go/blob/1c0c42c7f1c2336c24c582472d9072b29ed5021a/docs/adr/0001-rate-limit-backend.md) | dba4df501c375e1001b4f5d348452d49e6bc6556 | NODE_ENV no identifica por sí solo el target; la cuota en memoria no es global y los fallos de Redis no deben transformarse en permiso ilimitado. |
| [ADR 0002 derechos transaccionales](https://github.com/AnubisVillasenor1/play-and-go/blob/1c0c42c7f1c2336c24c582472d9072b29ed5021a/docs/adr/0002-transactional-entitlements.md) | d38f1df6b507b2d7cccb8eff98dbe2e6e826352b | Eventos concurrentes/repetidos requieren idempotencia y un único punto transaccional de mutación. El dominio de pagos no se importa al destino. |
| [ADR 0003 callbacks firmados](https://github.com/AnubisVillasenor1/play-and-go/blob/1c0c42c7f1c2336c24c582472d9072b29ed5021a/docs/adr/0003-callback-signing.md) | 7a3407ba8285c1a60cf4e853b2474a3588fa4705 | Futuras integraciones asíncronas requieren autenticación del objetivo, expiración, anti-replay y consumo atómico. No se crean callbacks por esta documentación. |
| [Bloqueos de producción](https://github.com/AnubisVillasenor1/play-and-go/blob/1c0c42c7f1c2336c24c582472d9072b29ed5021a/docs/PRODUCTION_BLOCKERS.md) | 8a5b538a8ea1e01d4b196cc8b1c088066bb503ac | Preview y producción no deben compartir credenciales privilegiadas. Presencia de variables no demuestra esquema aplicado o conectividad. |
| [Auditoría Vercel/Supabase](https://github.com/AnubisVillasenor1/play-and-go/blob/1c0c42c7f1c2336c24c582472d9072b29ed5021a/docs/VERCEL_SUPABASE_AUDIT_2026-11-07.md) | 9603229d2f8be782eb970294a4dade8864f06035 | Vincular repositorio, branch, commit y deployment; READY no garantiza acceso o función correcta. Los secretos y datos de ese proyecto no se trasladan. |
| [Ciclo de vida de derechos](https://github.com/AnubisVillasenor1/play-and-go/blob/1c0c42c7f1c2336c24c582472d9072b29ed5021a/docs/ENTITLEMENT_LIFECYCLE.md) | 39657a9dbd38b614dac8349a017e0048bae246d3 | Datos históricos ambiguos necesitan conciliación. El modelo comercial es ajeno al alcance de Creator Intelligence. |

### C. Documentación institucional TAMV/DM-X4/Isabella

Repositorio: [OsoPanda1/DOCUMENTACION-TAMV-DM-X4-e-ISABELLA-AI](https://github.com/OsoPanda1/DOCUMENTACION-TAMV-DM-X4-e-ISABELLA-AI)  
Commit de main observado: **b31d490ecfb06096c98e481e46b3f1a531d65672**.

| Fuente | SHA de blob | Tratamiento |
|---|---|---|
| [README institucional](https://github.com/OsoPanda1/DOCUMENTACION-TAMV-DM-X4-e-ISABELLA-AI/blob/b31d490ecfb06096c98e481e46b3f1a531d65672/README.md) | 977fd892e5bab70ebb4e1b713b2251fb807af905 | Contexto y autoría declarada; no evidencia operativa. |
| [OpenAPI Isabella AI](https://github.com/OsoPanda1/DOCUMENTACION-TAMV-DM-X4-e-ISABELLA-AI/blob/b31d490ecfb06096c98e481e46b3f1a531d65672/api/isabella-ai/openapi.yaml) | dee69abe637ed20355c2cae6176b68937f7631b9 | Contrato de otro sistema; no se copia sin correspondencia con rutas reales. |
| [OpenAPI TAMV DM-X4](https://github.com/OsoPanda1/DOCUMENTACION-TAMV-DM-X4-e-ISABELLA-AI/blob/b31d490ecfb06096c98e481e46b3f1a531d65672/api/tamv-dm-x4/openapi.yaml) | 824ade8784a0865ccc870cf226a8e0cd269bd031 | Contrato de referencia; las afirmaciones de JWT/criptografía poscuántica quedan excluidas hasta verificar algoritmo y pruebas reales. |
| [Manifiesto fundacional](https://github.com/OsoPanda1/DOCUMENTACION-TAMV-DM-X4-e-ISABELLA-AI/blob/b31d490ecfb06096c98e481e46b3f1a531d65672/documentacion_legal/manifesto/MANIFIESTO_FUNDACIONAL.md) | d55409c5b996e7bbe6184d434a20c0d7503953d3 | Contexto cultural e institucional, no evidencia técnica, jurídica o académica. |

## 3. Patrones adoptados en el destino

| ID | Patrón | Dónde se refleja | Límite pendiente |
|---|---|---|---|
| SRC-01 | Estados separados: código, test, contrato, integración, producción | [Arquitectura](ARCHITECTURE-REFERENCE.md), [cobertura documental](DOCUMENTATION-COVERAGE-MATRIX.md) | Falta evidencia real para los servicios externos. |
| SRC-02 | Una fuente canónica por tema | [Índice documental](README.md) y matriz | Algunos documentos históricos requieren mantenimiento gradual. |
| SRC-03 | Evidencia vinculada a artefacto exacto | [Gates de producción](PRODUCTION-EVIDENCE-GATES.md) y playbook | Firma/procedencia del release siguen pendientes. |
| SRC-04 | Credenciales aisladas por entorno | [ADR-003](adr/ADR-003-environment-isolation-and-evidence.md) y [guía de aislamiento](DEPLOYMENT-ENVIRONMENT-ISOLATION.md) | La configuración real de Vercel debe revisarse con acceso autorizado. |
| SRC-05 | Fail-closed para controles críticos | Código existente de cuotas y gates documentados | Redis, DB y auditoría necesitan pruebas de integración reales. |
| SRC-06 | Smoke test live distinto de build | Guía de aislamiento y gates de producción | Falta una ejecución live registrada. |
| SRC-07 | Idempotencia y conciliación de operaciones externas | Recibos de gobernanza y gates del ledger | Orden del ledger necesita corrección de esquema y pruebas. |
| SRC-08 | Enlaces internos comprobados en CI | Nuevo validador para documentos canónicos | No prueba consistencia semántica de todo documento histórico. |

## 4. Patrones no adoptados

1. No importar variables de entorno de Isabella o Play & Go a la app destino.
2. No publicar OpenAPI basándose solo en contratos históricos.
3. No afirmar criptografía poscuántica por etiquetas, JWT o nombres de librería; requiere algoritmo, uso real, claves y pruebas.
4. No importar billing, Stripe, entitlements ni callbacks musicales como si fueran parte del alcance actual.
5. No importar capacidades de emoción, memoria afectiva o control IoT a partir de documentación únicamente.
6. No presentar borradores o auditorías antiguas como estado vigente.
7. No copiar implementaciones de terceros sin revisión de licencia y compatibilidad; este registro adopta patrones, no código.

## 5. Preguntas de integración pendientes

| ID | Pregunta | Estado | Aceptación |
|---|---|---|---|
| SRC-Q01 | ¿El scope Vercel conectado corresponde al proyecto y repo correctos? | Bloqueado externamente | Verificar proyecto, branch y SHA desplegado desde el scope propietario. |
| SRC-Q02 | ¿Production y Preview usan credenciales aisladas? | Sin evidencia | Revisar scopes de variables y ejecutar una prueba negativa desde Preview. |
| SRC-Q03 | ¿La inferencia real está conectada? | Sin evidencia live | Smoke test con secreto protegido, timeout y rechazo de fallback silencioso. |
| SRC-Q04 | ¿La auditoría es durable y resistente a reinicios? | Bloqueado por esquema/infra | Aprobación del dueño de esquema, pruebas de roles, concurrencia y restauración. |
| SRC-Q05 | ¿Las referencias internas canónicas existen? | Se añade gate automatizado | CI comprueba rutas internas de los documentos mantenidos. |

Toda futura importación registrará repositorio, commit, path, SHA de blob, decisión, cambio derivado, prueba y límites. La matriz no es una puntuación subjetiva de progreso: es un registro de procedencia y decisiones.
