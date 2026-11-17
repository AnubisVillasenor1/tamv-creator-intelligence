# Matriz de implementación de `paquetefinal.md`

Esta matriz evita dos errores: declarar implementado lo que solo está documentado,
y descartar trabajo viable por no tener la infraestructura completa. Cada fila
indica el estado real en este repositorio.

## Estados

| Estado | Significado |
|---|---|
| `implemented` | Código presente, probado y ejecutable en este repositorio. |
| `contract` | Contrato ejecutable y probado con puertos; no hay proveedor o servicio real conectado. |
| `documented` | Copy, arquitectura o método publicado; no implica ejecución. |
| `blocked` | Depende de una acción externa verificable (clave, credencial, servicio). |
| `not-applicable` | La propuesta asume otra arquitectura (por ejemplo, Next.js). |
| `open` | Reconocido y no iniciado. |

## Audio

| Propuesta | Estado | Evidencia / límite |
|---|---|---|
| Validación estricta de peticiones | `implemented` | `tamv-genesis/src/audio/contracts.ts`, pruebas de gateway. |
| Gateway de admisión con consentimiento y derechos | `implemented` | `tamv-genesis/src/audio/gateway.ts`. |
| Ciclo de vida y reintentos | `implemented` | `tamv-genesis/src/audio/lifecycle.ts`, 12 pruebas de pipeline. |
| Worker de generación | `contract` | `tamv-genesis/src/audio/worker.ts`; in-process, sin daemon. |
| Cola BullMQ/Redis | `contract` | Puerto `AudioWorkQueue`; adaptador en memoria, sin Redis. |
| Persistencia Drizzle/Postgres | `blocked` | `AGENTS.md` prohíbe editar `drizzle/` y `supabase/migrations/`; lo gestiona Lovable. |
| Almacenamiento MinIO/S3 | `contract` | Puerto `AudioStoragePort`; adaptador en memoria con SHA-256. |
| MusicGen local | `contract` | Puerto `AudioGenerationPort`; no hay modelo desplegado. |
| DSP C++ | `open` | No hay motor C++; el DSP TypeScript local sí mide LUFS, pico de muestra y chroma, no picos intersample. |
| DSP TypeScript local | `implemented` | `tamv-genesis/src/audio/local-dsp.ts`, vectores de referencia en `audio-local-dsp.test.ts`. |
| Métricas Prometheus | `implemented` | Registro compartido y `/api/studio/metrics` autenticado/certificado; solo una instancia, sin scraper ni retención provisionados. |
| Docker Compose de audio | `open` | No se declara un despliegue inexistente. |
| Rutas Next.js | `not-applicable` | El proyecto usa TanStack Start. |
| Cliente frontend tipado | `implemented` | `/studio`, validación WAV/SHA-256, reproducción, descarga, consentimiento y cancelación; pruebas locales con transporte controlado, sin aceptación autenticada en producción. |

## Producto y marca

| Propuesta | Estado | Evidencia / límite |
|---|---|---|
| Posicionamiento TAMV Online / PLAY & GO | `documented` | `docs/PRODUCT-POSITIONING.md`. |
| Tagline y copy del Hero | `implemented` | `src/routes/index.tsx`: «Grandes ideas. Decisiones conscientes.», sin promesas de publicación automática. |
| Arquitectura Academy / Studio / AI Lab / AudioCore | `documented` | Existen estudio y tutorial; no un LMS, AI Lab ni catálogo de cursos. |
| Navegación operativa | `implemented` | Crear/Conectar/Gobernar/Aprender, búsqueda y menú móvil; no completa servicios externos. |
| Sistema visual | `implemented` | `src/workspace.css`, claro/oscuro y responsive; no se atribuye mejora porcentual medida. |
| Tutorial | `implemented` | Seis pasos, progreso local, reinicio y funcionamiento sin storage; sustituye la propuesta de siete pantallas. |
| Webhooks sociales | `implemented` | Nueve receptores y relay firmado; pruebas criptográficas locales. Sin cuentas, OAuth ni publicaciones conectadas; Longe pendiente de contrato. |
| Prueba social y precios | `open` | No se inventan testimonios, métricas ni planes. |
| Copy del footer y CTAs | `documented` | Reglas editoriales en `docs/PRODUCT-POSITIONING.md`. |

## Gobernanza y evidencia

| Propuesta | Estado | Evidencia / límite |
|---|---|---|
| Sello fail-closed v2 | `implemented` | `tamv-genesis/src/sovereign/seal.ts`, 19 pruebas. |
| Firma de release Ed25519 | `blocked` | Requiere clave privada fuera del repositorio. |
| Log de transparencia | `implemented` | `tamv-genesis/src/sovereign/transparency.ts`, 11 pruebas. |
| Registro de cierre K-20 | `implemented` | `tamv-genesis/v3/closure.json`; 26 módulos, con estados `closed`, `contract`, `documented`, `blocked` y `open`. |
| Horas de investigación | `documented` | `C-001` sigue `unverified`; la huella pública no mide horas. |
| Validación académica | `open` | No se declara revisión por pares ni acreditación. |

## Investigación TAMV 5.0

| Propuesta | Estado | Evidencia / límite |
|---|---|---|
| Corpus verificable y veinte protocolos | `implemented` | Importador, `research-catalog.json`, `/research` y pruebas; manifiesto sin firma y ensayos confirmatorios pendientes. |
| Gateway con evidencia durable | `implemented` | `scripts/lib/research-gateway.mjs`, SQLite, dos operaciones sintéticas, concurrencia, conciliación y respaldo; no autenticación de producción ni pagos reales. |
| Análisis de conteos, equidad y separación confirmatoria | `implemented` | `research-analysis.ts` y pruebas; cálculos descriptivos y elegibilidad para revisión humana, nunca aprobación automática. |
| Protección contra rollback de release firmado | `implemented` | Verificación de digest aprobado externamente; configurar aprobación y firma oficial permanece bloqueado. |
| Ledger externo ordenado, federación, EOCT y SAE causal | `open` | T11, T12, T14, T15 y T16 no tienen implementación experimental completa; consultar [alcance y límites](RESEARCH-PROTOCOL-5.md). |
| Piloto territorial y validación científica | `blocked` | Requiere protocolo preregistrado, participantes autorizados, datos y revisión independiente; los tests no los sustituyen. |

## Regla de mantenimiento

Una fila solo puede pasar a `implemented` cuando existe código, una prueba que lo
ejercite y una ruta reproducible. Cambiar el estado sin esas tres condiciones es
una regresión de honestidad, no una mejora.
