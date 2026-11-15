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
| DSP C++ (true peak/LUFS/chroma) | `open` | No hay motor nativo; las métricas quedan `null`. |
| Métricas Prometheus | `contract` | `tamv-genesis/src/audio/metrics.ts`; sin endpoint de scrape conectado. |
| Docker Compose de audio | `open` | No se declara un despliegue inexistente. |
| Rutas Next.js | `not-applicable` | El proyecto usa TanStack Start. |
| Cliente frontend tipado | `open` | La UI existente no consume el pipeline. |

## Producto y marca

| Propuesta | Estado | Evidencia / límite |
|---|---|---|
| Posicionamiento TAMV Online / PLAY & GO | `documented` | `docs/PRODUCT-POSITIONING.md`. |
| Tagline y copy del Hero | `implemented` | `src/routes/index.tsx` usa «Aprende. Crea. Analiza. Publica.». |
| Arquitectura Academy / Studio / AI Lab / AudioCore | `documented` | No se crean secciones vacías. |
| Sitemap y navegación completa | `open` | La app sigue siendo un monitor de creación. |
| Sistema visual y motion design | `documented` | Ya existe una dirección visual; no se replica el documento. |
| Onboarding de siete pantallas | `open` | No implementado. |
| Prueba social y precios | `open` | No se inventan testimonios, métricas ni planes. |
| Copy del footer y CTAs | `documented` | Reglas editoriales en `docs/PRODUCT-POSITIONING.md`. |

## Gobernanza y evidencia

| Propuesta | Estado | Evidencia / límite |
|---|---|---|
| Sello fail-closed v2 | `implemented` | `tamv-genesis/src/sovereign/seal.ts`, 19 pruebas. |
| Firma de release Ed25519 | `blocked` | Requiere clave privada fuera del repositorio. |
| Log de transparencia | `implemented` | `tamv-genesis/src/sovereign/transparency.ts`, 11 pruebas. |
| Registro de cierre K-20 | `implemented` | `tamv-genesis/v3/closure.json`; 23 módulos, con estados `closed`, `contract`, `documented`, `blocked` y `open`. |
| Horas de investigación | `documented` | `C-001` sigue `unverified`; la huella pública no mide horas. |
| Validación académica | `open` | No se declara revisión por pares ni acreditación. |

## Regla de mantenimiento

Una fila solo puede pasar a `implemented` cuando existe código, una prueba que lo
ejercite y una ruta reproducible. Cambiar el estado sin esas tres condiciones es
una regresión de honestidad, no una mejora.
