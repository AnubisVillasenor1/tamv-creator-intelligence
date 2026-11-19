---
state: draft | auto_generated
---

# Divergencias entre el paquete «Documentación Total — ISABELLA CERO v2.0» y el código (2026-11-12)

Documento auditado: el paquete «Documentación Total — ISABELLA CERO v2.0» recibido como
archivos sueltos en `C:\Users\tamvo\Downloads` (`README.md`, `ARCHITECTURE.md`, `API.md`,
`SECURITY.md`, `SKILLS.md`, `DEPLOYMENT.md`, `ROADMAP.md`, `INTEGRATION.md`, `skills-loader.ts`,
`registry.json`, `ISABELLA_CERO_RISK_BASED_AUTOMATION_V2.md`, `Documento-Cobertura.csv`).
**No vive en este repositorio**: es material de especificación externo. El `README.md` unificado
del repo es la entrada única y veraz; este registro archiva la divergencia para no parecer una
crítica a código inexistente.

Método: cada afirmación se buscó en `src/**` y se clasificó con la escalera del propio
repositorio (`README.md`): **SPECIFIED ≠ IMPLEMENTED ≠ TESTED ≠ PRODUCTION**; el dictamen de
auditoría usa **VERIFIED** para lo revisado contra evidencia. AGENTS.md §6: cuando la
especificación y el código se contradicen, se archiva la divergencia y **no** se reescribe el
código para que el documento tenga razón. Nada de este informe declara «implementado» lo que
hoy es función pura sin consumidor, cuota sin registro, maqueta sin verificador o etiqueta de
diseño sin contrato ejecutable.

## 1. Afirmaciones del paquete v2.0 que no se sostienen como hecho

| # | Afirmación v2.0 | Lo que existe en el repositorio | Veredicto |
|---|---|---|---|
| 1 | «14 capas Ω + **10 Fabrics**» (ARCHITECTURE.md / README) | `src/infinity/architecture.ts:352` exige 14 capas y `:359` exige **9** Fabrics (puerta dura: la auditoría falla si el conteo cambia). El catálogo real registra 9. | **DIVERGENCIA DE CIFRA**: 9 Fabrics, no 10 |
| 2 | «**6 Hyper Cores** (HC-1…HC-6)» (ARCHITECTURE.md) | Cero literales `HC-[1-6]` en `src/**`. Sí existe un motor real `src/hypercore/` con ~11 módulos nombrados (`micro-moe`, `veritas-omega`, `cee`, `hyperpredict`, `energy`, `context-compiler`, `adaptive-model-router`, `governed-semantic-cache`, `speculative-draft-engine`, `turbo-optimizer`, `hypercore`). | **DIVERGENCIA DE NOMBRE/TAXONOMÍA**: el motor existe; la descomposición «6 cores HC-n» no está en el código |
| 3 | «**21 skills externas** de skills.sh integradas» (SKILLS.md / INTEGRATION.md / registry.json) | El `skills-loader.ts` adjunto es un **stub de despacho**: `invoke()` devuelve `{status:'dispatched', skillId, category, tools}` sin ejecutar nada; `registry.json` son 21 filas de metadatos. En este repo la verdad ejecutable es `src/skills/catalog-coherence.ts`: 41 declaradas / 33 registrables / 25 invocables / 22+3 con handler. Las 21 externas **no** están cableadas como ejecutables aquí. | **NO IMPLEMENTADO** (despacho simulado ≠ integración ejecutable) |
| 4 | API `/v1/inference`, `/v1/agents/run`, `/v1/build`, `/v1/skills/invoke`, `/v1/bookpi/seal`, `/v1/crown/evaluate` (API.md) | De las 6, solo `POST /api/v1/agents/run` existe (`test/deployment/route-inventory.json:173`). Las otras 5 no están en el inventario. La superficie real es `/api/v1/*` con **344** rutas congeladas. | **MAYORMENTE FANTASMA**: 1 de 6 con contraparte real; el resto no existe |
| 5 | «BookPI Ω **implementado y probado**» (README / SECURITY) | BookPI es real (Ed25519 + JCS RFC 8785 + SHA3-512, `src/bookpi/crypto.ts`), pero este binario de Node (v24.18.0) **no ofrece `sha3-512`** (medido `false`), así que el sello durable no se ejercita aquí; `wormEnforced:false` (registro 2026-10-29 §3.4). «Probado» exige un Node con OpenSSL SHA3 (CI). | **PARCIAL / CAVEAT AMBIENTAL**: implementado, no probado en este runtime; sin WORM |
| 6 | «Automatización por riesgo **0-4**» (ISABELLA_CERO_RISK_BASED_AUTOMATION_V2.md) | El contrato real usa **5 niveles nominales** `RISK_TIERS = ['CRITICAL','HIGH','MEDIUM','LOW','NEGLIGIBLE']` (`src/authority/method-id.ts:32`) en el segmento RISK_TIER del methodId; Music Genesis usa NEGLIGIBLE/LOW/MEDIUM. La escala numérica 0-4 es una representación de diseño, no el contrato del runtime. | **DIVERGENCIA DE REPRESENTACIÓN** |
| 7 | «**bun** install && bun run test» (DEPLOYMENT.md / README) | `packageManager: pnpm@10.28.0`, `engines.node: 24.x`; scripts reales `tsx`/`tsc`/`esbuild`/`vitest`. bun no es el toolchain del repo. | **DIVERGENCIA DE TOOLCHAIN**: pnpm + Node 24 |
| 8 | «Licencia **Apache 2.0 / CC BY 4.0**» (README) | `LICENSE` es **propietaria, todos los derechos reservados**; `NOTICE.md §5` conserva CC/Apache solo como **procedencia** del material canónico fusionado y declara explícitamente que **no relicencia** este repo. | **DIVERGENCIA DE LICENCIA**: propietaria |
| 9 | «**Neon Postgres + Vercel / Docker Compose / AKS**» (DEPLOYMENT.md) | La topología desplegada y verificada es **Vercel** (framework `Other`) con `api/index.js` importando el bundle `dist/server.js` (esbuild). Hay adaptadores Postgres y Supabase opcional, pero la persistencia durable es un **gate pendiente**; Docker/AKS no están verificados como despliegue real. | **PARCIAL**: Vercel real; Neon/Docker/AKS especificados, no verificados |
| 10 | «Repositorio **OsoPanda1**/ISABELLA-VERSION-TERMINUS-V6» (README) | `git remote get-url origin` → `https://github.com/AnubisVillasenor1/ISABELLA-VERSION-TERMINUS-V6.git`. | **DIVERGENCIA DE ORIGEN**: AnubisVillasenor1 es la fuente de verdad |
| 11 | «CLI **isabella --sovereign**» (DEPLOYMENT.md) | `package.json` `bin: null`: no hay CLI. El arranque real es `tsx src/server.ts` (PORT 8080). «sovereign» es un **modo del motor de inferencia** (`modelEngine:'sovereign'` → `local-fast-lane`/fallback), no una bandera de CLI verificada. | **NO IMPLEMENTADO** (no existe el CLI) |
| 12 | «**ML-KEM-1024 / ML-DSA-87** implementados» (SECURITY.md) | La capa post-cuántica está **fail-closed por puerta de proveedor** (`src/security/pqc/provider-gate.ts`, registro 2026-10-29 §2.5/§3.5): no implementada. La firma real disponible es **Ed25519**; `BOOKPI_SIGNATURE_ALGORITHM=ML-DSA-65` en `.env.example` es una etiqueta, no un backend. | **NO IMPLEMENTADO** (bloqueado, no fingido) |
| 13 | «**Doble pipeline hexagonal**» (ARCHITECTURE.md) | El pipeline real es `src/pipeline/hyper-turbo` (SmartRouter/HotPathExecutor), cuyo estado y límites ya documenta el registro 2026-10-29 §5 (p. ej. `verifyResult()` devuelve `true` siempre). «Doble pipeline hexagonal» es una etiqueta de arquitectura sin contrato ejecutable contrastado. | **ETIQUETA DE DISEÑO** (no verificada como contrato) |

## 2. Lo que el paquete v2.0 sí acierta y se adopta (con evidencia)

- **14 capas Ω**: real, `src/infinity/architecture.ts:47` (puerta dura `:352`).
- **Constitución CROWN `ALLOW = IDENTITY × AUTHORITY × POLICY × EVIDENCE × SAFETY`**: real, la
  evalúa la constitución de `src/infinity/` (README «Master Consolidated»). `ALLOW` no autoriza
  ni ejecuta.
- **10 skills nativas deterministas**: real, `src/infinity/` las ejecuta (investigación léxica,
  bibliometría, legal, open science, gobernanza, prompt, multimodal, música y voz).
- **Terminus Blackout**: real y cableado, `src/governance/blackout.ts` +
  `src/routes/governance-blackout.ts` (registro 2026-10-29 §2.1–2.2).
- **Identidad del autor**: ORCID `0009-0008-5050-1539`, ISNI `0000-0005-3169-9229`, Nodo Cero
  Real del Monte, Hidalgo, México — identificadores públicos de procedencia, consistentes con
  `NOTICE.md`.
- **Music Genesis (nuevo en esta tanda)**: el motor de música del folder TAMV (`play-and-go`) se
  portó **nativo** a `src/music/` + `src/routes/music.ts`: composición determinista → MIDI
  format 1 real, análisis LUFS BS.1770-4 + true-peak, mastering WAV real. 8 rutas gobernadas,
  64 casos verdes. Es la «implementación real y operativa» de audio que el paquete v2.0
  reclamaba: aquí sí produce bytes, con gobernanza y evidencia.

## 3. Sigue sin implementar (no declarar como hecho)

1. Las 21 skills externas como ejecutables reales (hoy: stub de despacho + metadatos).
2. Los 5 endpoints de API fantasma (`/v1/inference`, `/v1/build`, `/v1/skills/invoke`,
   `/v1/bookpi/seal`, `/v1/crown/evaluate`).
3. La taxonomía «6 Hyper Cores HC-1…HC-6» como registro cableado.
4. Firma e intercambio post-cuánticos reales (ML-KEM/ML-DSA): bloqueados por proveedor.
5. WORM real para BookPI y sello durable ejercitado en este runtime (SHA3 no disponible aquí).
6. Persistencia durable verificada (Neon/Postgres/Supabase) y topologías Docker/AKS.
7. CLI `isabella --sovereign`.
8. La escala de automatización 0-4 como contrato (el runtime usa niveles nominales).

## 4. Nota de seguridad sobre el paquete recibido

Esta tanda de archivos v2.0 (docs + `skills-loader.ts` + `registry.json`) **no contiene
credenciales**: `registry.json` son metadatos de skills y el loader es un stub. Los identificadores
ORCID/ISNI son públicos. No se copió ningún secreto al repo ni al commit. El registro
2026-10-29 §4 documenta por separado las URL prefirmadas S3 de otra tanda; esos tokens siguen
debiendo considerarse expuestos y rotarse.

## 5. Evidencia de verificación de esta tanda (2026-11-12)

Medido sobre el árbol actual (`main`, HEAD `6b9d847`), con el Node real v24.18.0:

- `build:dist` (`tsc -p tsconfig.build.json` + esbuild → `dist/server.js` + `node --check
  src/ui/app.js`): **exit 0**, sin errores.
- `smoke:runtime` (`node scripts/runtime-smoke.mjs` contra el servidor construido): **exit 0**.
  Etiquetas: `LOCAL_CONVERSATION_SMOKE_OK` (health 200, chat 200, follow-up 200, motor
  `local-fast-lane`), `ISABELLA_MEDIATION_SMOKE_OK` (benigno admitido, destructivo
  `HUMAN_APPROVAL_REQUIRED`, vacío 400), `PUBLIC_API_GUARDRAILS_OK` (400/413/403/403),
  `PAID_PROVIDER_OPT_IN_GUARD_OK` y `OPEN_SCIENCE_PAID_ISOLATION_OK` (**0 llamadas a proveedores
  externos**), `MULTIMODAL_SPEECH_GUARDRAILS_OK` (fail-closed).
- Suite Music Genesis (`vitest run test/music test/routes/music.test.ts`): **7 archivos, 64
  casos, todos verdes** (13.61 s).
- Inventario de rutas: **344** (espejo congelado `test/deployment/route-inventory.json` y
  `docs/api/route-inventory.json`), de las cuales **8** son `/api/v1/music/*`.
- `src/infinity/architecture.ts`: puertas duras 14 capas (`:352`) y 9 Fabrics (`:359`).
- Caveat ambiental re-confirmado: `crypto.getHashes()` de este binario **no incluye `sha3-512`
  ni `sha3-256`**; el sello durable de BookPI y las pruebas que lo exigen no corren aquí
  (requieren CI Node con OpenSSL SHA3). El smoke prueba arranque HTTP + gobernanza +
  conversación, no el sello criptográfico durable.

Dictamen: el paquete v2.0 es **especificación aspiracional**. Se adopta lo que coincide con el
código (14 capas, constitución CROWN, 10 skills nativas, Blackout, identidad) y se archiva la
divergencia del resto. La «implementación real y operativa» de audio que el paquete reclamaba
queda satisfecha por **Music Genesis** (nativo, con bytes y pruebas), no por las cifras de
inventario del documento. Ningún código se reescribió para que el documento tuviera razón.