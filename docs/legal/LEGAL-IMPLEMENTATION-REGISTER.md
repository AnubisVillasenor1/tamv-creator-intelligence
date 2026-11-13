# Registro de Implementación Jurídico-Normativa

**Versión:** 1.0.0 · **Baseline:** AnubisVillasenor1/tamv-creator-intelligence, main, revisión documental de 2026-11-13.  
**Estado inicial:** parcialmente evaluado; sin certificación externa.

## 1. Estados admitidos
- NOT_ASSESSED: no evaluado.
- APPLICABLE_PENDING: aplicabilidad confirmada, implementación pendiente.
- PARTIAL: control parcial, evidencia o cobertura incompleta.
- IMPLEMENTED_EVIDENCE_PENDING: implementación declarada, evidencia por verificar.
- VERIFIED: evidencia revisada con responsable y fecha.
- NOT_APPLICABLE_JUSTIFIED: no aplica con justificación registrada.
- BLOCKED: falta decisión, contrato, recurso o permiso.

No usar VERIFIED sin evidencia reproducible o aprobación verificable.

## 2. Registro inicial

| ID | Dominio | Resultado requerido | Estado inicial | Evidencia mínima |
|---|---|---|---|---|
| LEG-001 | Titularidad | Cadena de derechos de código, documentos, diseños y modelos | NOT_ASSESSED | Inventario de autores, contribuciones y licencias |
| LEG-002 | Licencias | Mapa definitivo por archivo y textos íntegros | PARTIAL | Escaneo SPDX y revisión manual |
| LEG-003 | Dependencias | SBOM y compatibilidad de licencias | NOT_ASSESSED | SBOM y reporte de obligaciones |
| LEG-004 | IA | Inventario de modelos y evaluación por finalidad | PARTIAL | Fichas de sistema, modelo, pruebas y aprobación |
| LEG-005 | AI Act | Aplicabilidad y rol por sistema/mercado | NOT_ASSESSED | Matriz de roles, finalidad y clasificación |
| LEG-006 | Privacidad | Tratamientos, bases jurídicas y retención | NOT_ASSESSED | Registro de tratamientos y mapa de datos |
| LEG-007 | Copyright | Permisos para voz, imagen, música, samples y datasets | NOT_ASSESSED | Licencias, consentimientos y procedencia |
| LEG-008 | Seguridad | Divulgación, incidentes y notificación por jurisdicción | PARTIAL | Canal probado, playbook y ejercicios |
| LEG-009 | Transparencia | Avisos de IA y limitaciones | PARTIAL | Textos en interfaz y revisión |
| LEG-010 | Supervisión | Revisión humana y rollback para funciones de impacto | NOT_ASSESSED | Procedimiento y prueba de reversión |
| LEG-011 | Proveedores | Contratos, subprocesadores y transferencias | NOT_ASSESSED | Contratos, lista de proveedores y ubicaciones |
| LEG-012 | Marcos globales | Mapeo de UNESCO, WEF, OECD y NIST a controles | PARTIAL | Matriz requisito-control-evidencia |
| LEG-013 | Latinoamérica | Matriz por país de operación | NOT_ASSESSED | Ficha legal por mercado |
| LEG-014 | Sudáfrica | Aplicabilidad POPIA y transferencias | NOT_ASSESSED | Evaluación de alcance y controles |
| LEG-015 | Afirmaciones públicas | No declarar certificación o cumplimiento sin prueba | IMPLEMENTED_EVIDENCE_PENDING | Revisión de README, web, marketing y contratos |

## 3. Puerta de lanzamiento
No autorizar comercialización en un mercado hasta completar controles aplicables de privacidad, consumidor, propiedad intelectual, IA, seguridad y contratos. Ausencia de evaluación significa NOT_ASSESSED, no cumplimiento.

## 4. Revisión
Revisar ante cada release que cambie modelos, datos, finalidad, proveedor, licencia o permisos; antes de entrar a otro país/sector; tras incidentes o cambios regulatorios; y al menos trimestralmente como política interna inicial.

Cada cambio de estado registra ID, estado anterior/nuevo, responsable, fecha, evidencia, versión, decisión, justificación, riesgo residual y próxima revisión.
