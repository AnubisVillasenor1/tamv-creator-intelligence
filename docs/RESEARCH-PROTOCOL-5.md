# Investigación TAMV 5.0: implementación y límites

Fecha: 2026-11-17. Alcance: software local y protocolo propuesto; no validación científica, acreditación doctoral, conformidad normativa ni operación federada.

## Corpus y precedencia

Se leyeron los ocho adjuntos del autor. `Manual_Investigacion_TAMV_Compendio_5_0.docx` y `TESISTAMV2026.docx` tienen distinto archivo binario pero texto equivalente. La edición 5.0 corrige las afirmaciones absolutas, TRL no acreditados, confusión entre equal opportunity y equalized odds y el uso de SAE como explicación universal del manual metodológico anterior. Se adopta esa distinción sin alterar originales.

El [catálogo generado](../src/lib/research-catalog.json) conserva nombre, tamaño y SHA-512 de los ocho archivos, veinte protocolos completos, siete marcos y veintidós registros de fuentes. Cuatro archivos coinciden con el manifiesto aportado. El manifiesto no tiene firma y referencia un Markdown del compendio no aportado; no cubre ninguno de los Word. Un hash calculado ahora no demuestra procedencia histórica. Los identificadores y estados de inspección de fuentes son los comunicados por el corpus, no una nueva inspección web ni aval de sus autores. Las etiquetas `web:*` no son enlaces resueltos.

Los originales no se publican íntegros ni se les asigna una licencia nueva. La bibliografía permanece como material de referencia local: no se cambian licencias de código ni se atribuye revisión independiente. Importación reproducible, sin red:

```sh
python scripts/import-research-corpus.py /ruta/al/corpus
```

## Contraste con la tesis y caso de estudio adicional

También se leyó `tesis_doctoral_y_caso_de_estudio_gobernanza_tamv.md`, aportado después del corpus 5.0. Es una referencia adicional del autor, no un noveno archivo cubierto por aquel manifiesto. No se altera ni se republica el manuscrito original. Sus hipótesis H1–H6 y la matriz T01–T20 orientan el trabajo; no acreditan su ejecución ni un prerregistro público verificable.

| Afirmación del manuscrito | Contraste con este repositorio |
| --- | --- |
| Abstract y §5.2: 23 módulos auditados | Inventario actual: 26 módulos; `closed` exige archivos de evidencia/pruebas, no auditoría independiente. El README valida automáticamente el inventario. |
| §5.1: 41 capacidades = 37 contratos + 4 skills | Son categorías diferentes: 37 contratos internos, 4 skills públicas y 19 identificadores de capacidad en el pack. No se suman para contar capacidades ejecutables. |
| Abstract/§3: runtime pentanodal, 14 fronteras, siete federaciones | Arquitectura propuesta. El agente implementado es un plan determinista local; no implica CROWN/ISA/SOPHIA/ORION/ARGUS ejecutándose ni federación física. |
| §3.4: CTH poscuántica y BookPI SHA3-512/PROV | El sello usa Ed25519; el sobre híbrido, X25519/HKDF/AES-GCM. La evidencia del prototipo usa SHA-256 y ancla externa; no ML-KEM, ML-DSA ni conformidad PROV. El log Merkle de Genesis es otro componente. |
| §3.4 y condiciones D/E: EOCT, SAE, outbox y partida doble | EOCT/SAE y condiciones A–E siguen pendientes. El prototipo reserva créditos sintéticos y reconcilia, pero no implementa outbox operacional ni contabilidad de partida doble. |
| Prólogo/§5.3/§7: horas, producción pública, TRL y demostración de invariantes | No se verifican horas, conteos externos, acreditación doctoral ni TRL con pruebas unitarias. No se demuestra imposibilidad universal de violar autoridad. |
| Capítulo IV: blindaje y plazos jurídicos | Mapeo propuesto, sujeto a jurisdicción, hechos y revisión profesional. Un hash no anonimiza por sí solo y una firma Ed25519 no acredita NOM-151 ni cumplimiento automático. |
| Licencias Apache/CC en el manuscrito | No reemplazan LICENSE, LICENSE-MAP ni derechos de terceros; el núcleo continúa AGPL-3.0-only. |

No se verificaron de nuevo los DOI, afiliaciones, estadísticas de repositorios ni afirmaciones editoriales de este adjunto. Ninguna invitación, depósito o especificación se transforma en aceptación, certificación o resultado experimental.

## Superficie de usuario

`/research` permite buscar los veinte protocolos, ver precondiciones/intervención/evidencia/límites, preparar un expediente JSON explícitamente vacío y analizar conteos agregados en el navegador. No persiste datos personales ni envía los conteos al servidor. La edición de los datos invalida el resultado anterior. Los expedientes mantienen `executionStatus: not-run`; las pruebas de software no cambian ese estado científico.

[Análisis tipado](../src/lib/research-analysis.ts): tasas de efectos no autorizados, falso bloqueo, finalización legítima, cobertura y error selectivo. Con cero fallos e independencia Bernoulli declarada, calcula el límite superior unilateral exacto al 95%, `1 - 0.05^(1/n)`. No prueba independencia ni representatividad. Los denominadores cero son `null`, no éxito. Incluye tasas por grupo, brechas de paridad demográfica, equal opportunity y equalized odds, sin atribuir justicia causal. No proporciona todavía intervalos por grupo o ajuste jerárquico.

La separación confirmatoria compara digests de tareas y candidato. Solo informa elegibilidad para revisión humana; no ejecuta aprendizaje ni autoriza un despliegue. Digests distintos no prueban independencia semántica.

## Prototipo E2 con almacenamiento real y efectos sintéticos

[ResearchGateway](../scripts/lib/research-gateway.mjs) es una librería Node con SQLite durable (`WAL`, `synchronous=FULL`, transacciones `BEGIN IMMEDIATE`). Está deliberadamente fuera del servidor web y no sustituye Supabase, Redis, BookPI ni los webhooks sociales.

Solo dos acciones: `resource.read` y `payment.simulate`. La segunda registra un pago sintético en una segunda base SQLite, en unidades enteras `TEST_CREDIT`: no es una transferencia de dinero, un ledger de partida doble ni una integración financiera. No hay llamadas de red, LLM o ejecución arbitraria.

El operador del ensayo crea la política y representa la identidad autenticada. Los argumentos `actor`/`tenant` NO son un mecanismo de autenticación. Nunca exponer esta librería por HTTP sin resolver identidad en servidor y diseñar autorización administrativa. La API de administración, los archivos SQLite y el proveedor son parte de la base de confianza del ensayo.

Secuencia:

1. Validar solicitud estricta: actor, tenant, audiencia, recurso, acción, importe e idempotencia. No acepta políticas o presupuestos del solicitante.
2. Resolver autoridad persistida; reservar presupuesto acumulado y registrar AUTHORIZED o DENIED en una misma transacción.
3. Consumir nonce una vez, comparar todos los parámetros y volver a comprobar revocación y expiración; persistir CLAIMED antes del proveedor.
4. Invocar el adaptador sintético idempotente. Registrar SUCCEEDED y liquidar reserva tras acuse.
5. Ante excepción del proveedor, conservar UNKNOWN y la reserva. No reintentar a ciegas. Conciliar por identificador consultando el proveedor; la ausencia de resultado mantiene incertidumbre.
6. Si falla la persistencia después del efecto, el registro puede quedar CLAIMED y sigue siendo conciliable. Expirar permisos no consumidos libera reservas; no libera operaciones inciertas.

La reconciliación concurrente no liquida dos veces. No se promete exactly-once global. Cambiar la política o restaurar solo una de las bases sin conciliación puede romper coherencia: para recuperación operativa se requiere backup consistente de ambos lados y runbook. El ensayo de backup comprueba restauración de evidencia y operaciones, no recuperación financiera distribuida ni trabajo de otro operador.

Los recibos incluyen secuencia, digest de solicitud, operación, estado y tiempo registrado, sin nonce ni cuerpo del documento. La cadena utiliza separación de dominio y SHA-256. La verificación requiere **longitud y digest de un ancla externa confiable**, no el ancla contenida en el archivo presentado. No es un Merkle tree, almacenamiento inmutable, PROV-DM completo ni firma poscuántica. El administrador del archivo puede reescribirlo; el ancla debe estar fuera de su control.

## Cobertura de los veinte protocolos

| Protocolo | Implementación y prueba local | Trabajo aún requerido |
| --- | --- | --- |
| T01 | Permiso ligado al destino, parámetros y audiencia | Adaptador social real y observación del efecto |
| T02 | Dos workers, consumo transaccional y un efecto SQLite | Varios hosts y garantías del proveedor real |
| T03 | Reserva acumulada concurrente | Contabilidad, monedas y proveedor financiero |
| T04 | UNKNOWN, reserva retenida, consulta y conciliación | Outbox operacional y conciliación externa |
| T05 | Fallo de auditoría impide invocar proveedor | Persistencia y fallos en despliegue real |
| T06 | Revocación leída al consumir | Latencias distribuidas y operaciones en curso |
| T07 | Firma comprobada contra clave externa | Custodia y protección de configuración |
| T08 | Digest exacto de manifiesto aprobado externamente | Aprobación del responsable de release |
| T09 | Lectura trata instrucciones documentales como datos | Red team del LLM y observación de herramientas |
| T10 | Alcance por tenant en prototipo | Pruebas RLS/almacenamiento remoto |
| T11 | Identidad del evento en transporte social, sin efecto monetario | Deduplicación durable y orden del ledger externo |
| T12 | Sin implementación de federación | Política de partición y reconciliación multinodo |
| T13 | Ancla detecta edición, truncación y sustitución | Custodia de ancla, firma y backups independientes |
| T14 | Métricas de cobertura/error disponibles | EOCT, corpus, anotación ciega y experimento |
| T15 | Protocolo conserva alcance dialectal | Pares revisados por hablantes y evaluación |
| T16 | Protocolo y limitaciones visibles | Modelo con activaciones, SAE y controles causales |
| T17 | Candidato congelado y separación por digest | Prerregistro real, pruebas confirmatorias, revisión |
| T18 | Backup y reapertura SQLite | Otro operador y restauración del sistema completo |
| T19 | Round-trip de evidencia JSON | Importación en una alternativa con todos los recursos |
| T20 | Alcance y expiración exacta, sin bypass | Procedimiento humano de recuperación acotada |

## Ejecución reproducible

Node con `node:sqlite` (verificado localmente en Node 24); Python 3 para importar corpus. El comando de pruebas crea bases temporales independientes y las elimina al cerrar los workers. No utiliza credenciales ni datos reales.

```sh
node scripts/test-research-gateway.mjs
bun run test -- src/test/research-analysis.test.ts src/test/research-workbench.test.tsx src/test/tamv-certification.test.ts
```

[Pruebas SQLite](../scripts/test-research-gateway.mjs), [pruebas de análisis](../src/test/research-analysis.test.ts), [pruebas de interfaz](../src/test/research-workbench.test.tsx), [pruebas de release](../src/test/tamv-certification.test.ts).

La firma ahora exige el digest aprobado `TAMV_RELEASE_MANIFEST_SHA256`; véase [firma de releases](RELEASE-SIGNING.md). No se configura esa aprobación automáticamente a partir del paquete, no se genera una firma oficial ni se modifica infraestructura compartida.

## Gates pendientes del programa científico

E-DOC tiene una importación trazable, no revisión sistemática completa. E-ART tiene el prototipo descrito. E-EXP aún necesita preregistro, comparadores A–E, escenarios reservados, tamaño de muestra, datos brutos, análisis de dependencia y revisión externa. E-TERR requiere participantes, protección de datos, accesibilidad, revisión ética aplicable y autorizaciones. Ninguno de esos hitos se crea mediante un booleano, un DOI o una prueba unitaria.
