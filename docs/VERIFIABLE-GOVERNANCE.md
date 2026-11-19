# Gobernanza verificable: estado real y candados implementados

Este documento separa lo que el repositorio **ya ejecuta** de lo que es una meta de arquitectura. La
diferencia entre registrar una decisión y probar gobernanza es arquitectónica: un registro
append-only demuestra que se escribió, no quién autorizó, bajo qué delegación ni con qué evidencia.

## Principio operativo

Todo candado nuevo es **fail-closed**: si falta configuración, evidencia o una aprobación válida, la
operación se bloquea. Ningún control emite firmas Ed25519, certificaciones, cobros ni despliegues.

## Controles implementados en esta iteración

### 1. Persistencia opt-in de revisiones

`src/lib/project.functions.ts` expone `saveReviewToProject`. Enviar una revisión **nunca** escribe;
solo una acción explícita con consentimiento separado guarda el registro. Reutiliza el RPC
autenticado `tamv_project_action` con `p_action: "evaluate"`, que añade un evento de auditoría sin
cambiar versión, aprobación ni evaluación. El discriminator es `tamv.review.saved.v1` con
`source: "creator.review"`. El borrador privado se guarda únicamente con otro consentimiento.

### 2. Marca de agua criptográfica por usuario

`src/core/governance/approval-watermark.server.ts` deriva una clave HMAC distinta por usuario desde
un secreto de servidor `TAMV_APPROVAL_WATERMARK_SECRET` mediante HKDF-SHA256. El recibo
`tamv.human.approval.v1` vincula:

- `actorId`: el humano autenticado que dio la orden.
- `artifactDigest` y `contractDigest`: qué se aprobó exactamente y bajo qué contrato.
- `autonomyLevel` y `terminalNode`: con cuánta autonomía actuó la IA y si terminó en un nodo humano.
- `delegationChain`: la cadena de delegación equivalente a un DCT.
- `watermark` y `approverTag`: HMAC-SHA256 sobre el sujeto canónico y sobre el identificador del
  aprobador, comparados en tiempo constante.

Las decisiones de nivel L3 o superior se rechazan si `terminalNode` no es `human_resolved`. La
verificación de integridad es independiente de la ventana de ejecución, para que la evidencia antigua
siga siendo verificable.

El recibo se emite dentro de `approveGovernanceProject` y se guarda en la tabla existente
`governance_evidence` antes de marcar la propuesta como aprobada. `executeGovernanceProject` vuelve a
verificarlo contra el humano autenticado y el digest aprobado antes de llamar al RPC local. Si el
secreto falta, el recibo es inválido o la aprobación corresponde a otra versión, la ejecución se
bloquea. Las aprobaciones creadas antes de este control no tienen recibo y, por diseño fail-closed,
deben ser revisadas y aprobadas de nuevo; no se fabrica evidencia histórica.

**Limitación honesta:** HMAC es simétrico; el verificador necesita el secreto del servidor. Esto da
integridad y atribución dentro de TAMV, **no** no-repudio público ante un tercero. Para eso haría falta
una clave Ed25519 en poder del aprobador y un protocolo de registro público, fuera de este alcance.

### 3. Bloqueo de balance para acciones financieras

`src/core/governance/balance-lock.server.ts` decide si una acción `financial.*` puede intentarse. No
mueve dinero ni concede autoridad. Exige:

- acción incluida en la lista permitida e idempotencia con formato válido;
- importe entero positivo, dentro de un techo y **exactamente igual** al catálogo de precios que
  suministra la aplicación (nunca se inventa un precio aquí);
- divisa permitida y coherente con el plan;
- cotización no expirada y sin divergencia entre solicitud y cotización;
- recibo de aprobación que cubra esa cotización, esa acción y ese humano;
- marca de agua válida y dentro de su ventana de ejecución;
- eslabón humano para autonomía L3+.

`executeWithBalanceLock` nunca ejecuta una acción bloqueada y, si la ejecución termina en estado
incierto, devuelve `UNKNOWN` tras reconciliar en lugar de permitir un reintento ciego.

## Configuración requerida

- `TAMV_APPROVAL_WATERMARK_SECRET`: secreto de servidor de al menos 32 caracteres. Si falta, la
  emisión falla, la aprobación humana no se registra, la ejecución se bloquea y el bloqueo de balance
  deniega. No se guarda en el repositorio ni se envía al navegador. El preflight estricto de producción
  comprueba su presencia y longitud sin imprimir su valor.

## Estado de madurez

| Nivel del modelo propuesto | Situación real |
|---|---|
| V0 Documentado | Sí: 41 contratos internos y 4 paraguas públicos VERSIONADOS como documentación. |
| V1 Ejecutable | Parcial: existen motores de política, sello, evaluación y ahora marca de agua y bloqueo de balance; aún no hay un orquestador que compile los 9 paquetes a reglas aplicadas. |
| V2 Trazable | Parcial: las decisiones pueden producir tuplas verificables, pero no hay un ledger hash-chained central operativo en esta aplicación. |
| V3 Supervisado | Parcial: la aprobación local L3+ genera una marca de agua verificable y su ejecución la exige; el bloqueo de balance aplica el mismo criterio. Faltan las rutas con efectos externos, que siguen sin ejecutores reales. |
| V4 Forense | No implementado: no hay captura sub-microsegundo, BLAKE3 ni pruebas de conocimiento cero. |
| V5 Antifrágil | No implementado: no hay bucle que endurezca contratos a partir de incidentes. |

## Lo que deliberadamente NO se ha implementado

- Los 9 paquetes GovernSpec YAML como "contratos ejecutables": hoy los `SKILL.md` son documentación y
  replicarlos en YAML no los haría ejecutables. Primero debe existir el orquestador que aplique reglas.
- Sellado sub-microsegundo, BLAKE3 y pruebas ZK: requieren infraestructura y criptografía adicional;
  simularlas sería fraudulento.
- Compresión de 50 habilidades a 9 paquetes: cambia inventario canónico y exige rehashear, firmar y
  actualizar el digest aprobado. Se propone como refactor documental, no como cambio encubierto.
- Ejecutores de música, voz y publicación externa: siguen devolviendo `501` hasta que existan
  proveedores reales.

La seguridad absoluta no es garantizable. Estos candados son defensa en profundidad: reducen
superficie de error y hacen detectables las alteraciones, pero no sustituyen revisión, monitoreo ni
control humano.
