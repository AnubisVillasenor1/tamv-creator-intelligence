# Integración de patrones AIDP en TAMV Creator Intelligence

**Estado:** diseño e implementación parcial en código fuente. No acredita persistencia, autenticación real, firma de recibos, integración con proveedores ni despliegue.

## Propósito

Este documento registra una adopción selectiva de patrones operativos observados en `jgangini/aidp-ai-data-gobernance`. Se integran conceptos y requisitos de interoperabilidad; no se copian fuentes, credenciales, infraestructura OCI, Terraform, tablas Delta, nombres de recursos ni lógica propietaria del proyecto de referencia.

Fuente revisada: https://github.com/jgangini/aidp-ai-data-gobernance
Fecha de revisión: 2026-11-15.

## Matriz de fusión

| Patrón de referencia | Adaptación TAMV | Evidencia en este cambio | Límite |
|---|---|---|---|
| Separación de identidad del operador, administrador y destino | Referencias opacas diferenciadas para actor y destino; la referencia no se trata como credencial | `src/lib/hypercore-turbo/governance-receipt.ts` | No autentica identidades; el adaptador server-side debe resolverlas |
| Recibos de instalación/operación y evidencia verificable | Sobre de recibo metadata-only con digest SHA-256 y referencias opacas | Contrato y pruebas unitarias | No existe todavía almacén durable ni firma de recibos |
| Reanudar la misma operación sin cambiar fuente o destino | Validador de binding que fija operationId, commit, digest, destino e idempotency key | `validateResumeBinding` y pruebas | No ejecuta ni reanuda operaciones por sí mismo |
| Estados terminales e interpretación explícita de fallos | Máquina de transiciones que prohíbe reabrir estados terminales | `canTransitionOperation` y pruebas | Falta persistencia atómica de transiciones |
| Releases inmutables y hashes de artefactos | El recibo vincula commit y digest exacto; no declara release firmada | Contrato de recibo | La firma Ed25519 y la procedencia siguen siendo gates independientes |
| Evidencia y auditoría con minimización de datos | No incluye contenido creativo, prompts, email, tokens ni URLs privadas; exige evidencia para éxito | Contrato, validaciones y pruebas | Los adaptadores deben aplicar redacción y controles de acceso reales |
| Orquestación por etapas y roles diferenciados | Se conserva la separación capacidad/autoridad/ejecución/evidencia | ADR propuesto por este diseño y contratos existentes de política | No se introduce un runtime multiagente nuevo |
| Recuperación sin falsos positivos | `recovery_required` explícito y reanudación limitada a los bindings originales | Contrato y pruebas | No hay backup/restore ni integración con destino en este cambio |

## Contrato de recibo

El recibo identifica la operación, la fase, el estado, la política aplicada, la revisión del código, el digest del artefacto, el actor y destino mediante referencias opacas y los digests de evidencia. No contiene el payload de evidencia.

Un estado `succeeded` sin evidencia es inválido. Un recibo válido **no** prueba por sí solo que el evento ocurrió: el sistema que emite el recibo debe autenticarse, verificar el resultado del destino y almacenar el registro en un backend durable, con autorización de escritura restringida.

## Reglas de operación

1. Denegar por defecto y exigir autorización server-side independiente de los claims del cliente.
2. Fijar commit, digest de artefacto, destino, operación e idempotency key al iniciar una operación.
3. Rechazar reintentos con destino, artefacto, fuente o clave de idempotencia diferentes.
4. Requerir una operación explícita `update` para cambiar el candidato; nunca disfrazar un cambio de fuente como `resume`.
5. Registrar fallo de recuperación como fallo; restaurar una versión previa no convierte una actualización fallida en éxito.
6. No publicar ni ejecutar una acción externa porque un skill la haya propuesto. La autorización humana y el gate de ejecución siguen siendo independientes.
7. Conservar sólo metadatos mínimos. No escribir secretos, datos personales, prompts o contenido creativo en recibos.
8. La clave privada Ed25519 permanece fuera del repositorio y del frontend. Firma, verificación y confianza en la clave pública son controles distintos.
9. No declarar un control durable, global o de producción hasta verificar su adaptador, almacenamiento, permisos y pruebas de integración.

## Siguiente secuencia de producción

- [ ] Conectar un repositorio durable de recibos mediante una interfaz server-only y escrituras atómicas.
- [ ] Vincular la identidad del actor a una sesión autenticada y verificar autorización en el servidor.
- [ ] Implementar idempotencia distribuida con índice único/transacción en el backend elegido.
- [ ] Añadir pruebas de concurrencia, reintento, reinicio, caída parcial y recuperación.
- [ ] Firmar los manifiestos de release con la clave privada protegida y verificar con una clave pública anclada por un canal independiente.
- [ ] Generar SBOM y procedencia de build para el digest exacto de release.
- [ ] Validar el flujo contra un destino de prueba con permisos mínimos; no tocar recursos productivos durante las pruebas.
- [ ] Inspeccionar el CI de este commit y registrar los resultados exactos antes de promoverlo.

## Atribución y licencia

La arquitectura y los cambios de código son específicos de TAMV Creator Intelligence. El repositorio AIDP se cita como referencia técnica; esta integración no implica afiliación, certificación, aprobación ni licencia adicional concedida por sus autores. Revisar la licencia vigente de cada repositorio antes de reutilizar código o textos de terceros.
