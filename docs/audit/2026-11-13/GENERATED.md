# Evidencia generada — TAMV GENESIS Ω

Generado: 2026-11-13T00:00:00Z. No editar a mano: `node --experimental-strip-types tamv-genesis/cli/sovereign.mjs report`.

## Chequeos

| ID | Chequeo | Estado | Detalle |
|---|---|---|---|
| K-01 | Integridad de los 22 archivos protegidos | pass | 22 archivos coinciden con el manifiesto. |
| K-02 | Firma del release | fail | tamv-attribution.sig = UNSIGNED_RELEASE_PENDING. Honesto, pero bloquea toda capacidad premium. |
| K-03 | Vocabulario de capacidades | pass | política=6 rutas=4 rutas-fuera-de-política=ninguna política-ausente-del-catálogo=ninguna |
| K-04 | Catálogo genesis vs política | warn | capacidades adicionales fuera de la allowlist=tamv.certification,hypercore.audit,sovereignty.dashboard,skills.install |
| K-05 | Inventario de skills | pass | manifiesto=37 carpetas=37 registro=37 duplicados=0 |
| K-06 | Contratos de skill completos | pass | 0 campos usan «Consultar contrato del skill». |
| K-07 | Versión y enlaces canónicos | pass | UI=1.2.1 manifiesto=1.2.1 enlaces=3 |
| K-08 | Claims sin sobreafirmación | pass | 19 claims; 0 verificados; 6 contradichos. |
| K-09 | Cadena del work ledger | pass | 7 entradas verificadas. |
| K-10 | Consistencia del ledger | warn | unattested-hours |
| K-11 | Scorecard reproducible | pass | calculado=58.6 declarado=58.6 |
| K-12 | Gobernanza del corpus | pass | 12 fuentes; 1 excluidas. |
| K-13 | Licencia única | pass | NOTICE=true LICENSE=true MAP=true |
| K-14 | Revisión con autenticación y cuota | pass | auth=true cert=true quota=true timeout=true |
| K-15 | Correlación de errores por petición | pass | ALS=true scope=true |
| K-16 | Inventario de perfiles GitHub | pass | 2 perfiles; 154 repos; 41 forks; 109 originales con 0 estrellas. |
| K-17 | Inventario del corpus local | pass | 9948 archivos; 129 retenidos (P0=119, P1=10); extraídos=0. |
| K-18 | Gobernanza de material sensible | pass | 121 archivos escaneados; 0 patrones de secreto; restringidos excluidos=true (1). |
| K-19 | Sello criptográfico del paquete v3 | pass | Raíz sha256:3519d34593e1a01f6685f77c8d3dbc0a3a8a87d75de95c679644e33a17b7b487; firma=UNSIGNED_RELEASE_PENDING (runtime fail-closed). |
| K-20 | Registro de cierre de skills, módulos y capacidades | pass | 23 módulos; 19 capacidades y 4 skills cubiertas; sin módulos closed sin pruebas. |

## Claims

| ID | Estado | Efectivo | Evidencias | Independiente | Dominio |
|---|---|---|---:|---|---|
| C-001 | unverified | unverified | 4 | no | biographical |
| C-002 | corroborated | corroborated | 1 | no | technical |
| C-003 | contradicted | contradicted | 2 | no | technical |
| C-004 | contradicted | contradicted | 2 | no | technical |
| C-005 | contradicted | contradicted | 3 | no | technical |
| C-006 | contradicted | contradicted | 2 | no | technical |
| C-007 | contradicted | contradicted | 2 | no | technical |
| C-008 | unverified | unverified | 1 | no | institutional |
| C-009 | unverified | unverified | 1 | no | technical |
| C-010 | unverified | unverified | 2 | no | academic |
| C-011 | declared | declared | 1 | no | technical |
| C-012 | unverified | unverified | 2 | no | technical |
| C-013 | contradicted | contradicted | 2 | no | academic |
| C-014 | corroborated | corroborated | 2 | no | technical |
| C-015 | corroborated | corroborated | 2 | no | technical |
| C-016 | corroborated | corroborated | 2 | no | legal |
| C-017 | corroborated | corroborated | 2 | no | technical |
| C-018 | corroborated | corroborated | 2 | no | technical |
| C-019 | corroborated | corroborated | 2 | no | biographical |

## Capacidades

| ID | Declarado | Logrado | Ejecutable | Bloqueos |
|---|---|---|---|---|
| creator.review | M2-implemented | M2-implemented | no | ninguno |
| music.generation | M1-contracted | M1-contracted | no | G1-signed-release, gateway-not-connected |
| voice.generation | M1-contracted | M1-contracted | no | G1-signed-release, voice-gateway-not-connected, no-voice-consent-ledger |
| audiocore.advanced | M1-contracted | M1-contracted | no | G1-signed-release, dsp-provider-not-connected |
| agent.orchestration | M1-contracted | M1-contracted | no | G1-signed-release, no-durable-queue, agent-gateway-not-connected |
| external.publishing | M0-declared | M0-declared | no | no-implementation, G1-signed-release |
| tamv.certification | M3-tested | M3-tested | sí | ninguno |
| hypercore.audit | M3-tested | M3-tested | sí | ninguno |
| sovereignty.dashboard | M2-implemented | M2-implemented | sí | ninguno |
| skills.install | M1-contracted | M1-contracted | no | no-agent-discovery-path |

## Perfiles GitHub

| Perfil | Repos | Originales | Forks | Estrellas (orig.) | Originales con 0 estrellas |
|---|---:|---:|---:|---:|---:|
| AnubisVillasenor1 | 10 | 9 | 1 | 0 | 9 |
| OsoPanda1 | 144 | 104 | 40 | 4 | 100 |

## Corpus local

| Métrica | Valor |
|---|---:|
| Archivos | 9948 |
| Bytes | 4241742190 |
| Extraídos | 8818 |
| Retenidos P0/P1 | 129 |
| Duplicados (grupos) | 2358 |
| Caracteres extraídos | 100091333 |

# Scorecard — TAMV Creator Intelligence — tamv-genesis v2.0.0

Score: **58.6/100 (D)**

| Dimension | Weight | Score | Evidence | Next point |
|---|---:|---:|---|---|
| Integridad de atribución | 10 | 88 | 22 archivos con SHA-256, texto canónico verificado y runtime fail-closed. | Firmar el manifiesto y publicar la clave pública en el canal de release. |
| Cadena de suministro | 12 | 30 | Release sin firma, sin SBOM, sin attestation SLSA en CI y acciones fijadas por etiqueta mayor. | Fijar acciones por SHA, generar SBOM CycloneDX y verificar procedencia en cada build. |
| Autorización y abuso | 12 | 72 | Revisión con autenticación Supabase, cuota por usuario, concurrencia máxima y timeout de respuesta. | Mover la cuota a un almacén durable y probarla con concurrencia entre instancias. |
| Persistencia y recuperación | 10 | 15 | drizzle/schema.ts vacío; no hay ledger durable, respaldo probado ni standby. | Diseñar el ledger append-only con encadenamiento y una prueba de restauración documentada. |
| Observabilidad | 10 | 68 | Correlación por petición con AsyncLocalStorage; sin trazas, métricas agregadas ni alertas. | Exportar trazas con identificador de petición y alertar sobre denegaciones y fallos de integridad. |
| Consistencia documental | 10 | 72 | Versión y URL corregidas; contratos de skill base siguen con marcadores de posición. | Generar el registro de skills desde los SKILL.md y eliminar textos de relleno. |
| Honestidad de capacidades | 12 | 82 | Las rutas sin gateway devuelven 501; el vocabulario de capacidades quedó unificado. | Rebajar a M1 las capacidades declaradas por encima de su evidencia y publicar el catálogo. |
| Operabilidad de skills | 8 | 30 | 37 contratos declarados, un ejecutor real y entradas/salidas genéricas en la base. | Definir contrato verificable por skill y conectar al menos un ejecutor por categoría. |
| Claridad de licencia | 8 | 78 | NOTICE raíz, LICENSE completo y mapa por zona; el corpus externo con otras licencias queda excluido. | Añadir cabeceras SPDX a los archivos del núcleo y validarlo en CI. |
| Evidencia de trayectoria | 8 | 45 | Cadena de procedencia documentada con tres cifras; cero horas con atestación independiente. | Publicar bitácora por periodos y solicitar una atestación T3 sobre una muestra. |

| Gate | Blocking | Status | Detail |
|---|---|---|---|
| Release firmado (Ed25519) | yes | fail | tamv-attribution.sig contiene UNSIGNED_RELEASE_PENDING; toda capacidad premium queda bloqueada. |
| Autorización de servidor en revisión creativa | yes | pass | requireSupabaseAuth aplicado a reviewContent, con cuota y timeout. |
| Ledger durable append-only | yes | fail | La política lo exige; no existe almacén ni tabla. |
| Licencia única y mapeada | no | pass | NOTICE + LICENSE raíz + LICENSE-MAP; AGPL-3.0-only. |
| SBOM y auditoría de dependencias | yes | fail | No hay SBOM ni paso de auditoría de dependencias en CI. |
| Atestación independiente de horas | no | fail | 24,000 h siguen en estado unverified; bloquea el claim, no el producto. |
| Vocabulario único de capacidades | no | pass | Verificado por el chequeo de deriva del CLI. |
| Carga y failover probados | no | fail | No hay pruebas de carga, caos ni proveedor alterno. |
| Correlación de errores por petición | no | pass | AsyncLocalStorage por fetch; estado global solo como respaldo. |
| Ruta de descubrimiento para agentes | no | fail | install.sh copia a .tamv/skills; los agentes buscan .claude/skills u otra ruta declarada. |

## Ledger de trabajo

| Hallazgo | Detalle |
|---|---|
| unattested-hours | 24000h are declared with no independent attestation |
