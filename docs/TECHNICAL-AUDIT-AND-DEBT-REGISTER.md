# Registro público de auditoría técnica y deuda — TAMV Creator Intelligence

**Fecha de corte:** 15 de noviembre de 2026  
**Repositorio:** https://github.com/AnubisVillasenor1/tamv-creator-intelligence  
**Rama de auditoría:** audit/public-disclosure-hardening-2026-11  
**Alcance:** revisión estática de documentación, manifiestos, scripts, rutas, contratos y especificación SQL; validación automatizada mediante CI. No equivale a pentest, auditoría externa, certificación normativa ni prueba completa de producción.

## Resumen ejecutivo

La rama de auditoría contiene correcciones de seguridad en el límite HTTP, controles de idempotencia y documentación pública. Las ejecuciones de CI del commit previo a la tanda más reciente pasaron; los cambios de esta tanda deben validarse nuevamente en un commit exacto antes de considerarlos aceptados.

No hay evidencia suficiente para afirmar deuda técnica cero, certificación integral o disponibilidad de todas las integraciones en producción. Persisten bloqueos que requieren entorno conectado, autoridad del propietario del esquema, firma de release y pruebas externas.

## Registro priorizado

| Prioridad | Área | Estado | Hallazgo / riesgo | Criterio objetivo de cierre |
|---|---|---|---|---|
| P0 — release gate | Persistencia de recibos | Bloqueado externamente | Existe especificación SQL y adaptador, pero no evidencia de aprovisionamiento conectado. | Aprovisionamiento aprobado, permisos/RLS, idempotencia y concurrencia probados en Supabase/PostgreSQL no productivo; evidencia ligada a SHA. |
| P0 — release gate | Ledger Hyper-Core | Bloqueado por propietario de esquema | La asignación de sequence_id antes del bloqueo puede divergir del orden de encadenamiento de hashes. | Rediseño mediante el flujo autorizado de Lovable y prueba concurrente real que recompute una única cadena verificable. |
| P0 — release gate | Firma del release | No acreditado | La existencia de scripts no demuestra que el release exacto tenga una firma confiable. | Firma Ed25519 válida, clave pública confiable por canal independiente y verificación del artefacto exacto. |
| P1 | Cuerpo HTTP | Corregido en código; CI pendiente para esta tanda | La lectura debía limitar bytes durante el streaming, no después de materializar todo el cuerpo. | Pruebas del límite exacto, exceso, fragmentación, UTF-8 multibyte, UTF-8 inválido y cabeceras de longitud malformadas; CI verde en el SHA nuevo. |
| P1 | Idempotencia multiusuario | Corregido en código; CI pendiente para esta tanda | La clave original era globalmente única en base de datos y podía provocar colisiones entre actores. | Persistir una clave derivada determinísticamente del actor y de la clave de solicitud; verificar reintentos y aislamiento por actor. |
| P1 | Tiempo de identidad externa | Corregido en código; CI pendiente para esta tanda | La llamada al proveedor de identidad no tenía un tiempo máximo explícito. | Timeout acotado, respuesta de error fail-closed y prueba de integración con proveedor lento/no disponible. |
| P1 | Respuestas del backend | Pendiente | El adaptador PostgREST debe limitar el volumen leído de respuestas de éxito y error; truncar después de response.text() no limita memoria. | Lectura acotada en streaming con límites distintos para respuestas normales y mensajes de error, más pruebas de tamaño y errores de parseo. |
| P1 | Control de frecuencia | Pendiente | Las cuotas en memoria no coordinan procesos ni instancias. | Límite compartido, atómico y con pruebas multiinstancia. |
| P1 | Ejecución externa | Intencionalmente no habilitada | La ruta registra intención y no constituye autorización ni ejecución de despliegues. | Modelo de roles, aprobación humana explícita, adaptador de mínimo privilegio, recuperación y pruebas de destino antes de habilitar cualquier ejecutor. |
| P1 | Evidencia independiente | Pendiente | La forma válida de un recibo no demuestra que el sistema externo alcanzó el resultado declarado. | Verificador independiente del destino y del artefacto exacto; evidencia durable y verificable. |
| P1 | Observabilidad | No verificado en producción | La telemetría local no prueba agregación, alertas o continuidad entre instancias. | Backend, retención, alertas probadas y políticas de redacción de datos sensibles. |
| P2 | Inventario de capacidades | Parcial | Los contratos pueden describir capacidades sin ejecutores conectados. | Inventario automático que clasifique capacidades como documentadas, implementadas, probadas, operadas o bloqueadas. |
| P2 | Cadena de suministro | No acreditado para el release actual | Scripts de SBOM/procedencia no demuestran artefactos firmados y verificables publicados. | SBOM y atestación verificable asociados al artefacto y al commit de release. |
| P2 | Documentación de estado | En progreso | Los documentos históricos pueden representar estados de fechas diferentes. | Un estado de release fechado, ligado a SHA y con enlaces a CI, advertencias y bloqueos externos. |

## Correcciones implementadas en la rama

1. **Lectura acotada del cuerpo:** el endpoint usa lectura por streaming y cuenta bytes UTF-8 reales; rechaza cuerpos excesivos, UTF-8 inválido y fallos de lectura.
2. **Cabecera Content-Length:** se valida la sintaxis decimal, el rango seguro y el límite declarado. La cabecera nunca sustituye la medición del flujo real.
3. **Idempotencia aislada por actor:** el valor persistido se deriva de forma determinista de la referencia opaca del actor y de la clave enviada por el cliente. Evita que dos actores colisionen por reutilizar la misma clave global.
4. **Timeout de identidad:** la llamada al proveedor de identidad tiene un tiempo máximo explícito y falla de forma cerrada si no responde.
5. **Pruebas de guardas:** se cubren longitudes declaradas inválidas, límites, contenido fragmentado y UTF-8.

Estas correcciones no solucionan las brechas de base de datos, ledger, límites distribuidos, firma, procedencia ni integración externa. Los cambios de esquema continúan sujetos al flujo de Lovable; no se modifican manualmente migraciones administradas.

## Condiciones para declarar un hallazgo cerrado

Cada hallazgo debe incluir propietario, severidad, cambio trazable, prueba de aceptación, resultado CI en el SHA exacto y, cuando dependa de infraestructura, evidencia del entorno. Los bloqueos externos deben permanecer como bloqueos explícitos. Un build verde no prueba que un proveedor, base de datos, firma o flujo de producción estén configurados correctamente.

## Condiciones para declarar deuda cero

No se puede demostrar «deuda técnica cero» como una propiedad absoluta. Sí puede cerrarse un inventario delimitado cuando cada hallazgo tiene evidencia reproducible y el riesgo residual ha sido aceptado explícitamente por la persona responsable. No deben convertirse dependencias no verificadas en porcentajes de avance ni afirmarse controles que solo existen en documentación.

## Límites de esta auditoría

La revisión utiliza archivos y automatizaciones accesibles en GitHub. No accede a secretos, bases de datos privadas, cuentas de proveedores ni infraestructura de producción. No se ejecutó un pentest ni se certificó cumplimiento de estándares externos. Los resultados representan auditoría de repositorio y seguimiento de remediación, no una garantía de seguridad absoluta.
