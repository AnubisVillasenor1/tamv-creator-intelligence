# Manual de cierre — TAMV Creator Intelligence + HCU

Fecha de corte: 2026-11-19. Rama: `claude/hcu-integration`. Estado: **borrador técnico para revisión humana**; no es certificación, pentest ni aceptación de producción.

> **Nota de integración en `main` (2026-11-19).** Este documento se conserva como registro del análisis original sobre un clon en solo lectura. En el commit integrado se ejecutaron `npm run test`, `typecheck`, `lint`, `build` (con regeneración de `routeTree.gen.ts`), `docs:check`, `docs:check:test`, `ops:closure` y `tamv:verify` en verde; este último confirma firma Ed25519 y digest aprobado. Por tanto F-05 y R-21 quedan **cerrados para el artefacto verificado**, sin afirmar por ello ancla externa independiente ni certificación normativa. El resto de hallazgos y cifras se mantienen como estado histórico y deuda abierta según corresponda.

## 0. Alcance, método y límites de este manual

**Qué se revisó.** (a) Los adjuntos: Manual metodológico (M), Tesis (T), Compendio 5.0 (C), matrices CSV, protocolos T01–T20, bibliografía, manifiesto y el pack de skills v2. (b) El repositorio clonado en solo lectura. (c) El prototipo HCU (núcleo, instrumento web, API) que esta rama integra.

**Qué NO se hizo (y por qué importa).**
- No se ejecutaron las suites del repositorio (`vitest`, `tsc`, `eslint`, `build`): la red del entorno bloqueó la instalación de dependencias. Las cifras del README (460/125/17 pruebas) **no fueron reproducidas** aquí.
- Las pruebas nuevas (`src/test/hcu-*.test.ts`, 23 pruebas) se ejecutaron con el runner de pruebas de bun y pasan; **no** se ejecutaron con `vitest` ni con el typecheck estricto del proyecto. Antes de fusionar: `bun run typecheck && bun run lint && bun run test && bun run build`.
- La auditoría estática del repositorio es **parcial**: se inspeccionaron cabeceras, comparación de secretos, cuotas, verificación de webhooks, workflows, catálogo de investigación, cifras del inventario y el gateway SQLite de investigación. No se auditaron en profundidad `tamv-genesis/src/sovereign/*`, el ledger Hyper-Core ni el SDK de permisos (ver WS-1).
- Ningún DOI/ORCID/ISNI fue resuelto externamente (doi.org bloqueado). Solo se validaron formato y checksum ISO 7064.

**Escala de severidad.** P0 bloquea release o invalida una afirmación pública; P1 riesgo relevante; P2 deuda; P3 higiene. **Confianza**: A = verificado leyendo código; M = verificado parcialmente; B = inferido.

## 1. Qué entrega esta rama

| Pieza | Ruta | Función |
|---|---|---|
| Núcleo HCU | `src/lib/hcu/hcu-core.mjs` (+ `.d.mts`) | Hipergrafo dirigido, simulación anual 2026–2050 (T=24), Monte Carlo con semilla, SHA3-512 propio verificado contra `node:crypto`, ledger encadenado, sello de datos, validadores ORCID/ISNI/DOI/TRI |
| Especificación L01–L14 y estados | `src/lib/hcu/pipeline-spec.ts` | Tabla única de capas, invariante «efecto externo solo en L14», máquina de 9 estados con transiciones válidas, verificador de «evidencia antes del efecto» |
| Registro de contradicciones | `src/lib/hcu/contradictions.ts` | 26 contradicciones M/T/C con resolución propuesta |
| Linter de afirmaciones | `src/lib/hcu/claims-lint.ts` | 15 reglas léxicas (absolutos, «inmutable», «poscuántico», TRL, cumplimiento, etc.) derivadas de las sobreafirmaciones S-01…S-28 |
| Servicio y HTTP | `src/lib/hcu/hcu-service.ts`, `http.ts` | Validación estricta de entradas, límites, cuerpo acotado por streaming, `no-store` |
| API | `src/routes/api.hcu.{graph,simulate,lint,spec}.ts` | `GET /api/hcu/graph`, `POST /api/hcu/simulate`, `POST /api/hcu/lint`, `GET /api/hcu/spec` |
| Instrumento | `public/hcu/index.html`, `src/routes/hcu.tsx` | Documento institucional §0–§10 con el instrumento incrustado, servido en `/hcu` |
| Navegación | `src/lib/workspace-navigation.ts` | Entrada «Mapa HCU» |
| Pruebas | `src/test/hcu-core|spec|http.test.ts` | SHA3, ORCID/ISNI, determinismo, cuarentena, ledger, invariantes, estados, linter, validación HTTP |

**Decisiones de diseño que conviene conocer**
1. Las rutas `api.hcu.*` son públicas y de solo cómputo: no persisten, no ejecutan efectos y no leen secretos. Si se vuelven privadas, aplicar el mismo patrón de sesión que `api.public.tamv.projects.ts`.
2. El instrumento se sirve como activo estático en `iframe` de mismo origen. Es una solución de entrega, no de arquitectura: ver WS-6 para el port a componente React.
3. Ningún archivo protegido por el manifiesto de atribución se modificó (`README.md`, `__root.tsx`, etc.); por eso `tamv:check` no debería cambiar. **No verificado** al no poder ejecutar el script.
4. `src/routeTree.gen.ts` es un archivo generado: **debe regenerarse** con `vite build`/`vite dev` para que `/hcu` y `/api/hcu/*` queden registradas. No se editó a mano (AGENTS.md).

## 2. Hallazgos

### 2.1 Verificados en el repositorio

| ID | Sev | Hallazgo | Evidencia | Conf. | Remediación | Aceptación |
|---|---|---|---|---|---|---|
| F-01 | P1 | No hay cabeceras de seguridad de navegador (CSP, `X-Frame-Options`/`frame-ancestors`, HSTS, `Referrer-Policy`) en `src/`, `vite.config.ts` ni `public/`; no hay `vercel.json`/`_headers` en el repo | búsqueda sin coincidencias | M (la plataforma podría añadirlas) | Middleware global o `_headers` con CSP estricta; `frame-ancestors 'self'` (la ruta `/hcu` usa iframe de mismo origen) | Prueba que todas las respuestas HTML incluyen CSP y que un embed externo es rechazado |
| F-02 | P3 | `dangerouslySetInnerHTML` en `src/components/ui/chart.tsx:73` (patrón estándar de shadcn para variables CSS) | grep | A | Confirmar que la entrada son solo constantes del código, nunca datos de usuario | Test que rechaza `config` con caracteres `<`/`}` |
| F-03 | P2 | Cuotas por actor con respaldo en memoria (`localBuckets`, `inFlight`) | `capability-quota.server.ts:119-120` | A | Ya mitigado: en producción deniega sin Redis. Mantener la etiqueta `local-development` y añadir prueba multiinstancia (ya listada como P1 en el registro de deuda) | Prueba con dos procesos y un Redis real de pruebas |
| F-04 | P1 | Verificación de webhooks: TikTok exige ventana de 300 s (`social-webhooks.server.ts:68`); la firma `X-Hub-Signature-256` no lleva marca de tiempo por diseño de la plataforma, por lo que el anti-replay depende de deduplicar por id de evento | `:54`, `:68` | M | Confirmar y probar deduplicación persistente por `provider+eventId` (T11); rechazar eventos fuera de orden | Test: reenvío del mismo evento no duplica efecto; evento antiguo se descarta |
| F-05 | P0 | Release sin firma: `tamv-attribution.sig` contiene `UNSIGNED_RELEASE_PENDING` | archivo | A | Generar clave Ed25519 con custodia separada, publicar huella por canal independiente, `tamv:sign` → `tamv:verify` | `npm run tamv:verify` en verde con ancla externa |
| F-06 | P1 | La máquina de 9 estados y el recibo-antes-del-efecto existen en el **prototipo SQLite** (`scripts/lib/research-gateway.mjs`: terminales, `UNKNOWN`/`RECONCILED`, `nonce UNIQUE`, `UNIQUE(actor,tenant,idem)`, `BEGIN IMMEDIATE`), pero no hay equivalente en el runtime TypeScript de `src/` | `research-gateway.mjs:26,148,200-239` | A | Implementar el gateway sobre PostgreSQL detrás de la interfaz de `pipeline-spec.ts` y reutilizar los 20 protocolos como pruebas de conformidad | T01–T20 en verde contra PostgreSQL desechable |
| F-07 | P2 | Estadística de investigación: solo se implementa la cota de cero fallos `1−0,05^(1/n)` (`research-analysis.ts:53`, fórmula correcta); no hay intervalos de Wilson ni Clopper-Pearson para conteos distintos de cero (R-38) | `research-analysis.ts` | A | Añadir Wilson y Clopper-Pearson con vectores de prueba publicados | Pruebas contra valores de referencia (p. ej. 0/20, 3/20, 20/20) |
| F-08 | P3 | Dos SHAs distintos de `oven-sh/setup-bun` en los workflows | `.github/workflows` | A | Unificar y fijar un único SHA | Un solo SHA en `grep` |
| F-09 | P2 | El inventario de cierre reporta 26 módulos y el README también (coinciden); las cifras de pruebas no se pudieron reproducir | `closure.json`, README:83 | A / sin reproducir | Publicar los logs de CI ligados al SHA en `RELEASE-STATE` | Enlace a runs por SHA |
| F-10 | P1 | Los workflows ya fijan acciones por SHA, con `permissions: contents: read` y sin `pull_request_target` | `.github/workflows` | A | **Control correcto**; conservar | — |

**Controles correctos verificados:** comparación en tiempo constante con digests (`cron-auth.ts`, `metrics-auth.ts`, `studio-metrics.server.ts`, `social-webhooks.server.ts`); `metrics-auth` responde 503 si el token es débil en vez de abrir la telemetría; ausencia del estado ambiguo `FLAG` en el código; cuotas con Redis atómico y denegación sin respaldo; lectura acotada de cuerpos y respuestas; fórmula de cero fallos correcta.

### 2.2 Derivados de los documentos (afectan a lo que se publica o se implementa)

Las 26 contradicciones están en `src/lib/hcu/contradictions.ts` y se exponen en `GET /api/hcu/spec`. Las críticas y altas con acción inmediata:

| ID | Sev | Hallazgo | Acción |
|---|---|---|---|
| D-01 | P0 | M ejecuta la habilidad en L09 y registra en L14: viola «evidencia antes del efecto» | Congelar `PIPELINE_LAYERS` como única tabla; retirar la versión de M |
| D-02 | P1 | L01–L14 definido de tres formas; ARGUS `FLAG` vs `REVIEW` | Misma acción; `ARGUS_VERDICTS = ALLOW/REVIEW/DENY` |
| D-03 | P1 | Fórmula de bloque BookPI: ORCID dentro del hash (dato personal), cuatro funciones hash, «Merkle» sin definición | Registro de algoritmos por propósito; sin datos personales en la entrada; llamar «cadena de hashes» |
| D-04 | P1 | Identificadores: Zenodo 23034324 (T) vs 23034325 (matriz); cinco DOIs sin fuente | Estado `communicated|inspected|resolved` por fila; resolver o retirar |
| D-05 | P1 | «Demuestra», «preregistrados», «poscuántico», «TRL 7», «opacidad a cero» sin evidencia | Reescribir; usar `POST /api/hcu/lint` como puerta editorial |
| D-06 | P1 | Reparto de ingresos 100 % vs 50/30/20 sin regla de remanente | bps con Σ=10 000 y regla pública y versionada |
| D-07 | P2 | `TESISTAMV2026.docx` es el Compendio, no la tesis; CSV duplicado; el manifiesto cita un `.md` no adjunto y no cubre docx/tesis/zip | Regenerar el manifiesto con todos los entregables, versión y fecha; `signed:false` hasta tener ancla |

### 2.3 Sesgos y puntos ciegos

Sesgos: encuadre adversarial «BigTech» sin desagregar; autoevaluación (autor = diseñador = evaluador = titular de los depósitos); oráculo circular cuando el mismo LLM juzga sus decisiones; pruebas T01–T20 solo defensivas (no miden utilidad bajo carga legítima ni abuso por el administrador); hipótesis P1–P6 que presuponen que la propuesta mejora.

Puntos ciegos técnicos: dónde corren L02–L04 (si usan un modelo externo, los datos ya cruzaron el perímetro antes de L08); modelo de amenaza del administrador y de la clave raíz; anclaje externo del ledger (sin ancla no se detecta una reescritura total); relojes y desfase entre `occurred_at`/`recorded_at`; revocación en modo isla (T06 × T12 sin prueba combinada); privacidad en backups/telemetría; coste de falsos bloqueos en comunidades con conectividad limitada; neutralidad dialectal verificada solo por tasa de concesión; pagos reales (KYC, consumidor, impuestos), educación y menores, fuera de alcance de la fase 1.

### 2.4 Superficie de ataque (resumen)

| Superficie | Vector | Control existente | Brecha | Prueba |
|---|---|---|---|---|
| Aprobación → efecto | Cambiar destinatario tras aprobar | Permiso ligado a destinatario/audiencia en prototipo | Sin equivalente en `src/` | T01 |
| Permiso de un solo uso | Doble consumo concurrente | `nonce UNIQUE` + `BEGIN IMMEDIATE` (SQLite) | Sin prueba sobre PostgreSQL | T02 |
| Presupuesto | Reservas simultáneas | Reserva acumulada (prototipo) | Créditos sintéticos | T03 |
| Timeout tras envío | Duplicación ciega | `UNKNOWN` + conciliación (prototipo) | Proveedor sintético | T04 |
| Auditoría caída | Efecto sin recibo | Recibo previo (prototipo) | Almacén real no aprovisionado | T05 |
| Release | Sustitución de clave / rollback | Ed25519 + sello | Sin firma ni ancla externa | T07, T08 |
| Contenido recuperado | Inyección documental | Datos no confiables en la revisión | Sin prueba de llamadas/destinos | T09 |
| Multi-tenant | Acceso a recurso ajeno | RLS en Supabase | Sin probes en PostgreSQL desechable | T10 |
| Webhooks | Duplicado / desorden | Firma + ventana TikTok | Dedupe persistente no verificado | T11 |
| Navegador | Clickjacking / XSS | — | F-01 | Test de cabeceras |

## 3. Matriz de requisitos R-01…R-50

Fuente de los requisitos: análisis de los adjuntos (`R-nn`). Columna «Estado» solo con lo **verificado**; el resto queda **sin inspeccionar** y es la primera tarea del WS-1.

| Req. | Tema | Estado verificado |
|---|---|---|
| R-04 | Máquina de 9 estados | Prototipo SQLite: sí; spec TS + pruebas: añadido en esta rama; runtime TS: **no** |
| R-06 | Efecto solo en L14, pre-recibo en L13 | Spec + invariante comprobable añadidos; runtime: **no** |
| R-07 | ARGUS sin `FLAG` | Sin `FLAG` en el código; spec añadida |
| R-17/18/19/20 | JCS, hash encadenado, Merkle, registro de algoritmos | Existen canonicalizador y transparencia en `tamv-genesis/src/sovereign/*`: **sin inspeccionar** contra RFC 8785 |
| R-21 | Firma Ed25519 con ancla externa | **No** (UNSIGNED) |
| R-22 | Manifiesto ampliado | **No**: `Manifiesto_integridad_5_0.json` cubre 5 archivos, `signed:false`, sin fecha ni versión |
| R-36 | Harness T01–T20 | Prototipo con 20 protocolos y catálogo con `limite`; **sin ejecutar aquí** |
| R-38 | IC Wilson/Clopper-Pearson | Parcial (solo cota de cero fallos) |
| R-40 | Registro de afirmaciones CLM | **No** como esquema; el linter es un primer control |
| Resto (R-01–03, 05, 08–16, 23–35, 37, 39, 41–50) | | **Sin inspeccionar** |

## 4. Plan de cierre por frentes

Cada frente: tareas → criterio de aceptación objetivo. «100 %» significa **inventario delimitado con evidencia por ítem y riesgo residual aceptado por una persona responsable**, nunca ausencia absoluta de riesgo.

**WS-1 Completar la auditoría.** Ejecutar y publicar los logs de `typecheck/lint/test/build` por SHA. Auditar `sovereign/*`, ledger Hyper-Core, `sdk/permit.mjs`, SQL y RLS. Completar la columna de estado de R-01…R-50. *Aceptación:* matriz completa, cada fila con archivo y test.

**WS-2 Gates P0.** (1) Firma Ed25519 y ancla externa (F-05); (2) probes en PostgreSQL desechable para recibos, ledger y RLS; (3) rediseño del `sequence_id` del ledger por el flujo de Lovable (no editar `drizzle/` a mano, AGENTS.md). *Aceptación:* `tamv:verify` verde; probes concurrentes recomputan una única cadena.

**WS-3 Gateway gobernado en TypeScript.** Portar el contrato del prototipo SQLite a una interfaz `GovernedGateway` con `pipeline-spec.ts` como oráculo; permiso con `audience, vigencia, nonce, digest(params)`; revocación con latencia definida. *Aceptación:* T01–T20 automatizados contra la implementación y contra PostgreSQL.

**WS-4 Evidencia.** Registro de algoritmos por propósito; separación de dominios y prefijo de longitud en el hash; sin datos personales en la entrada; anclaje externo periódico; vectores JCS. *Aceptación:* pruebas de edición, truncado y sustitución completa, informando qué ataques no se detectan sin ancla (T13).

**WS-5 Documentación normativa.** Adoptar C como especificación; M solo histórico. Tabla única L01–L14; glosario con un término por eje; perfil de madurez por componente (sin TRL global); matrices normativa/fuentes con estado por fila; manifiesto regenerado. *Aceptación:* `POST /api/hcu/lint` sin hallazgos `block` en README y docs públicos.

**WS-6 Instrumento HCU.** Portar `public/hcu/index.html` a componentes React con el núcleo tipado; mover el estado del expediente a la API autenticada si se requiere persistencia; mantener «sello no emitido» hasta que exista firma real. *Aceptación:* pruebas de componente y recorrido en navegador.

**WS-7 Seguridad web.** CSP, `frame-ancestors`, HSTS, `Referrer-Policy` (F-01); deduplicación de webhooks (F-04); cuotas multiinstancia (F-03). *Aceptación:* pruebas de cabeceras y de replay.

**WS-8 Estadística.** Wilson y Clopper-Pearson con vectores (F-07); latencias p50/p95/p99 descompuestas por etapa. *Aceptación:* valores de referencia reproducibles.

**WS-9 Identificadores y autoría.** Resolver o retirar los DOIs sin fuente; reconciliar 23034324/23034325; no usar alias de marca ajena; declarar asistencia de IA y contribuciones humanas sin atribuir a la IA autoría ni supervisión. *Aceptación:* `status` por fila y fecha de consulta.

**WS-10 Gobernanza editorial.** Gates G0–G8 con responsable, evidencia y decisión; revisor independiente y política de conflicto de intereses. *Aceptación:* acta por gate.

## 5. Cableado de la API HCU

```bash
curl -s localhost:3000/api/hcu/graph
curl -s -X POST localhost:3000/api/hcu/simulate -H 'content-type: application/json' \
  -d '{"scenario":"B","shocks":[{"node":"ia","year":2026,"mag":1}],"quarantine":["ia"],"mcRuns":50,"seed":20261101}'
curl -s -X POST localhost:3000/api/hcu/lint -H 'content-type: application/json' -d '{"text":"Sistema inmutable con TRL 7"}'
curl -s localhost:3000/api/hcu/spec
```

Límites: cuerpo ≤ 32 KiB, ≤ 16 choques, ≤ 64 nodos en cuarentena, ≤ 200 corridas Monte Carlo; `415` si el tipo no es JSON, `413` si excede, `400` ante entradas inválidas. Toda respuesta lleva `Cache-Control: no-store` y una nota de que pesos, rezagos y escenarios son hipótesis.

## 6. Reproducción local

```bash
bun install --frozen-lockfile
bun run typecheck && bun run lint && bun run test && bun run build   # regenera routeTree.gen.ts
bun test src/test/hcu-core.test.ts src/test/hcu-spec.test.ts src/test/hcu-http.test.ts
```

Antes de fusionar, ejecutar además `bun run docs:check` y `bun run ops:closure`: los documentos nuevos pueden requerir alta en la matriz de cobertura documental (**no verificado**).
