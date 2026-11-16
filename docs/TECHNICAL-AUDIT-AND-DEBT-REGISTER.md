# Registro público de auditoría técnica y deuda — TAMV Creator Intelligence

**Fecha de corte:** 15 de noviembre de 2026  
**Repositorio:** https://github.com/AnubisVillasenor1/tamv-creator-intelligence  
**Rama de auditoría:** audit/public-disclosure-hardening-2026-11  
**Alcance:** revisión estática de documentación, manifiestos, scripts, rutas, contratos y especificación SQL; validación automatizada mediante CI. No equivale a pentest, auditoría externa, certificación normativa ni prueba completa de producción.

## Resumen ejecutivo

La rama de auditoría contiene correcciones de seguridad en el límite HTTP, controles de idempotencia, validación defensiva de respuestas de identidad y documentación pública. Para el SHA actual `85adca0ae5b43491da3bc19964c5ea5aa2ce32e3`, los workflows **TAMV Creator Intelligence CI** (run `43737567225`) y **Validate TAMV Pack and Application** (run `43737567234`) finalizaron con conclusión `success`. Esto acredita los controles ejecutados por esos workflows para ese commit, no pruebas de integración con infraestructura externa.

No hay evidencia suficiente para afirmar deuda técnica cero, certificación integral o disponibilidad de todas las integraciones en producción. Persisten bloqueos que requieren entorno conectado, autoridad del propietario del esquema, firma de release y pruebas externas.

## Registro priorizado

| Prioridad | Área | Estado | Hallazgo / riesgo | Criterio objetivo de cierre |
|---|---|---|---|---|
| P0 — release gate | Persistencia de recibos | Bloqueado externamente | Existe especificación SQL y adaptador, pero no evidencia de aprovisionamiento conectado. | Aprovisionamiento aprobado, permisos/RLS, idempotencia y concurrencia probados en Supabase/PostgreSQL no productivo; evidencia ligada a SHA. |
| P0 — release gate | Ledger Hyper-Core | Bloqueado por propietario de esquema | La asignación de sequence_id antes del bloqueo puede divergir del orden de encadenamiento de hashes. | Rediseño mediante el flujo autorizado de Lovable y prueba concurrente real que recompute una única cadena verificable. |
| P0 — release gate | Firma del release | No acreditado | La existencia de scripts no demuestra que el release exacto tenga una firma confiable. | Firma Ed25519 válida, clave pública confiable por canal independiente y verificación del artefacto exacto. |
| P1 | Cuerpo HTTP | Corregido en código; CI satisfactorio en SHA verificado | La lectura debía limitar bytes durante el streaming, no después de materializar todo el cuerpo. | Pruebas del límite exacto, exceso, fragmentación, UTF-8 multibyte, UTF-8 inválido y cabeceras de longitud malformadas; CI verde en el SHA nuevo. |
| P1 | Idempotencia multiusuario | Corregido en código; CI satisfactorio en SHA verificado | La clave original era globalmente única en base de datos y podía provocar colisiones entre actores. | Persistir una clave derivada determinísticamente del actor y de la clave de solicitud; verificar reintentos y aislamiento por actor. |
| P1 | Tiempo y tamaño de identidad externa | Corregido en código; CI satisfactorio en SHA verificado | La llamada al proveedor de identidad no tenía timeout ni límite de bytes en su respuesta; la estructura JSON también debe validarse antes de acceder a propiedades. | Timeout de 5 s, respuesta acotada a 16 KiB, validación de objeto/UUID, fallo cerrado y CI verde; añadir prueba de integración con proveedor lento/no disponible. |
| P1 | Respuestas del backend | Corregido en código; CI satisfactorio en SHA verificado | El adaptador PostgREST debía limitar respuestas de éxito/error y no truncar después de materializar todo el cuerpo. | Lectura acotada en streaming (1 MiB para respuestas normales y 4 KiB para errores), timeout de 10 s y pruebas específicas para respuestas excesivas, JSON inválido y errores sobredimensionados; CI verde en el SHA nuevo. |
| P1 | Control de frecuencia | Pendiente | Las cuotas en memoria no coordinan procesos ni instancias. | Límite compartido, atómico y con pruebas multiinstancia. |
| P1 | Ejecución externa | Intencionalmente no habilitada | La ruta registra intención y no constituye autorización ni ejecución de despliegues. | Modelo de roles, aprobación humana explícita, adaptador de mínimo privilegio, recuperación y pruebas de destino antes de habilitar cualquier ejecutor. |
| P1 | Evidencia independiente | Pendiente | La forma válida de un recibo no demuestra que el sistema externo alcanzó el resultado declarado. | Verificador independiente del destino y del artefacto exacto; evidencia durable y verificable. |
| P1 | Observabilidad | No verificado en producción | La telemetría local no prueba agregación, alertas o continuidad entre instancias. | Backend, retención, alertas probadas y políticas de redacción de datos sensibles. |
| P2 | Inventario de capacidades | Parcial | Los contratos pueden describir capacidades sin ejecutores conectados. | Inventario automático que clasifique capacidades como documentadas, implementadas, probadas, operadas o bloqueadas. |
| P2 | Cadena de suministro | No acreditado para el release actual | Scripts de SBOM/procedencia no demuestran artefactos firmados y verificables publicados. | SBOM y atestación verificable asociados al artefacto y al commit de release. |
| P2 | Documentación de estado | Atendido para el SHA `07e829b` | Los documentos históricos pueden representar estados de fechas diferentes. | Un estado de release fechado, ligado a SHA y con enlaces a CI, advertencias y bloqueos externos: [RELEASE-STATE-2026-11-15.md](RELEASE-STATE-2026-11-15.md); regenerar por SHA en cada release. |

## Correcciones implementadas en la rama

1. **Lectura acotada del cuerpo:** el endpoint usa lectura por streaming y cuenta bytes UTF-8 reales; rechaza cuerpos excesivos, UTF-8 inválido y fallos de lectura.
2. **Cabecera Content-Length:** se valida la sintaxis decimal, el rango seguro y el límite declarado. La cabecera nunca sustituye la medición del flujo real.
3. **Idempotencia aislada por actor:** el valor persistido se deriva de forma determinista de la referencia opaca del actor y de la clave enviada por el cliente. Evita que dos actores colisionen por reutilizar la misma clave global.
4. **Identidad externa acotada:** la llamada al proveedor de identidad tiene un timeout de 5 s y la respuesta se limita a 16 KiB antes de parsear JSON; se valida que el resultado sea un objeto con UUID válido, y los fallos de lectura, UTF-8, estructura o tamaño excesivo se rechazan.
5. **Lector reutilizable de respuestas remotas:** un único lector por streaming aplica límites por bytes, UTF-8 estricto y cancelación al exceder el máximo tanto al proveedor de identidad como a PostgREST.
6. **Respuestas de PostgREST:** el adaptador limita en streaming el tamaño de las respuestas y añade un timeout de red; los cuerpos de error se omiten si exceden el límite. Las pruebas específicas cubren respuestas de éxito excesivas, JSON inválido y cuerpos de error excesivos.
7. **Pruebas de guardas:** se cubren longitudes declaradas inválidas, límites, contenido fragmentado, UTF-8 y payloads malformados del proveedor de identidad.

La evidencia CI del SHA actual `85adca0ae5b43491da3bc19964c5ea5aa2ce32e3` es: [TAMV Creator Intelligence CI, run 43737567225](https://github.com/AnubisVillasenor1/tamv-creator-intelligence/actions/runs/43737567225) y [Validate TAMV Pack and Application, run 43737567234](https://github.com/AnubisVillasenor1/tamv-creator-intelligence/actions/runs/43737567234). Estas señales no solucionan las brechas de base de datos, ledger, límites distribuidos, firma, procedencia ni integración externa. Los cambios de esquema continúan sujetos al flujo de Lovable; no se modifican manualmente migraciones administradas.

## Condiciones para declarar un hallazgo cerrado

Cada hallazgo debe incluir propietario, severidad, cambio trazable, prueba de aceptación, resultado CI en el SHA exacto y, cuando dependa de infraestructura, evidencia del entorno. Los bloqueos externos deben permanecer como bloqueos explícitos. Un build verde no prueba que un proveedor, base de datos, firma o flujo de producción estén configurados correctamente.

## Condiciones para declarar deuda cero

No se puede demostrar «deuda técnica cero» como una propiedad absoluta. Sí puede cerrarse un inventario delimitado cuando cada hallazgo tiene evidencia reproducible y el riesgo residual ha sido aceptado explícitamente por la persona responsable. No deben convertirse dependencias no verificadas en porcentajes de avance ni afirmarse controles que solo existen en documentación.

## Límites de esta auditoría

La revisión utiliza archivos y automatizaciones accesibles en GitHub. No accede a secretos, bases de datos privadas, cuentas de proveedores ni infraestructura de producción. No se ejecutó un pentest ni se certificó cumplimiento de estándares externos. Los resultados representan auditoría de repositorio y seguimiento de remediación, no una garantía de seguridad absoluta.
