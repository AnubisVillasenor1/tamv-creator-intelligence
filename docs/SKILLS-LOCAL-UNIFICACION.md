# Inventario y unificación de skills locales — TAMV Creator Intelligence

Fecha de análisis: 2026-11-19 (inventario local, solo lectura para fuentes externas al repo; sin modificar repositorios de terceros).

## Alcance y método

Se revisaron skills locales en:

- **Repo** `C:\Users\tamvo\Downloads\tamv-creator-intelligence`: `tamv-pack/skills`, `tamv-pack/pack.json`, `tamv-pack/integrity.json`, `src/lib/skill-registry.ts`, `src/lib/skill-roadmap.ts`, `tamv-genesis/v3/skills`, `security-trust/governance-pack-v2/skills`, `docs/archivos-tamv/*`, `docs/archivos-tamv/codigo-referencia/*`, y skills en `node_modules` (dependencias).
- **Perfil de usuario**: `C:\Users\tamvo\.agents\skills`, `C:\Users\tamvo\.claude\skills`, `.config/.local/share/AppData/Roaming` (dirs `skills`/opencode), `.codex/*`, `.cache/*`, `.gemini/*`.
- **Descargas y copias locales**: `C:\Users\tamvo\Downloads` (carpetas y zips con `skill/tamv/atlas/exagon/pack/creator`), incluyendo `tamv-creator-intelligence-skill`, `xclusive-by-TAMV-Online-main`, snapshots `_audit-tci`, `_zip-tci` y `.qoder/isabella-*`.

No se fabricaron firmas, certificaciones, cobros ni despliegues. No se incorporaron datos privados de Isabella/Horizon ni infraestructura ausente (BOOKPI externo, migraciones Lovable/Drizzle, etc.).

## 1. Fuente de verdad actual del paquete (incorporada y alineada)

| Artefacto | Estado | Observación |
|---|---|---|
| `tamv-pack/skills/*/SKILL.md` | **41 contratos** | Directorios y contratos presentes; 4 coordinadores incluidos (`tamv-creator-os`, `tamv-audio-intelligence`, `tamv-growth-engine`, `tamv-sovereign-platform`). |
| `tamv-pack/pack.json` | **41 skills** | Manifiesto de distribución, grafo de dependencias y política de orquestación (`entry/safety/quality`, aprobación humana requerida). |
| `tamv-pack/integrity.json` | **Alineado** | Hashes GIT-BLOB-SHA1 de archivos regulares de `tamv-pack` (excluye `integrity.json` y `.tamv/**`), incluye los 41 `SKILL.md`. |
| `src/lib/skill-registry.ts` | **41 entradas** | Registro de app consumido por Atlas/Marketplace; IDs y dependencias coherentes con el pack. |
| `src/lib/skill-roadmap.ts` | **80 blueprints + meta** | Diseños no ejecutables/certificados declarados como roadmap; los contratos ejecutables declarados siguen siendo los 41 de `pack.json`. |
| Atlas / Marketplace / gobernanza | **Cableados** | `src/routes/atlas.tsx`, `src/routes/marketplace.tsx`, `src/lib/skill-governance.ts` consumen registro/roadmap estáticos y resolución de dependencias. |

**Conclusión:** el ecosistema distribuible y la UI están unificados sobre los 41 contratos actuales. Cualquier incorporación nueva al pack requiere contrato `SKILL.md`, actualización de `pack.json`/`skillGraph` si aplica, actualización de `integrity.json` (script de integridad del pack), actualización de `src/lib/skill-registry.ts` y validaciones (`ops:closure`, `tamv:check`, tests/docs/build).

## 2. Skills TAMV locales en el repo no incluidos en `pack.json` (referencias/variantes)

| Ubicación | Skills | Estado de incorporación | Acción recomendada |
|---|---:|---|---|
| `tamv-genesis/v3/skills/` | 4 (`tamv-audio-intelligence`, `tamv-creator-os`, `tamv-growth-engine`, `tamv-sovereign-platform`) | **Variantes más extensas** (v3 metadata/licencia en frontmatter) que los contratos actuales del pack; no están en `pack.json`/`integrity.json`. | Tratar como **fuente de evolución**. Unificar solo tras revisión humana: comparar con contratos actuales, decidir texto canónico, regenerar integridad/registro y validar gates. No reemplazar automáticamente. |
| `security-trust/governance-pack-v2/skills/` | 5 (`tamv-assurance-gate`, `tamv-ciso-governance`, `tamv-control-mapping`, `tamv-creator-trust-governance`, `tamv-fair-risk-quantification`) | **Pack separado** (`Proprietary`, read-only/no-certifying según contratos). No forma parte del pack público/app. | Mantener separado. Referenciar en roadmap/documentación como **línea de gobernanza y confianza** independiente; no mezclar licencias ni claims con los 41 contratos AGPL/comerciales del pack principal. |
| `docs/archivos-tamv/SKILLS.md` | Catálogo ISABELLA CERO v2.0 (nativas + externas mapeadas) | **Documento de referencia**, no contrato runtime. | Conservar como referencia de arquitectura/planificación; no declarar como implementado en app/pack. |
| `docs/archivos-tamv/SKILL.md` | `dotenv` (BSD-2-Clause, motdotla) | **No es skill TAMV**. | No incorporar al pack TAMV; mantener solo como material de referencia si se desea. |
| `docs/archivos-tamv/codigo-referencia/skill-registry.ts` | 37/41 históricos (según snapshot) | **Referencia antigua**. | No usar como fuente de verdad; `src/lib/skill-registry.ts` y `tamv-pack/pack.json` prevalecen. |
| `docs/archivos-tamv/codigo-referencia/skills-lock.json` | Lock de `find-skills` | Referencia externa. | Útil para trazabilidad de origen; no sustituye el inventario del pack. |
| `node_modules/@tanstack/*/skills/**` | 26 docs de skills | **Dependencias vendorizadas**, no autoría TAMV. | No incorporar al pack; disponibles como documentación de librerías en el entorno. |

## 3. Skills TAMV/en proyecto local fuera del repo (candidatas a referencia o incorporación controlada)

| Ubicación | Hallazgo | Relevancia | Incorporación propuesta |
|---|---|---|---|
| `C:\Users\tamvo\Downloads\tamv-creator-intelligence-skill\` | Umbrella `tamv-creator-intelligence` + 4 subskills (variantes creator-os/audio/growth/sovereign) | Alta relación con TAMV; copia/paquete externo al repo. | **Referencia**. Comparar con `tamv-genesis/v3` y pack actual antes de cualquier merge; no copiar sin revisión de licencia, integridad y coherencia de contrato. |
| `C:\Users\tamvo\Downloads\xclusive-by-TAMV-Online-main\skills\tamv-browser-verification\SKILL.md` | Skill QA web (`agent-browser`, smoke/visual/a11y/evidencia, reglas DEMO/LIVE) | Útil para verificación de productos web TAMV/Xclusive. | **Candidata** a contrato TAMV de QA/verificación (ámbito web) si se generaliza y se des-acopla de supuestos específicos de Xclusive; incorporar como blueprint/contrato solo tras adaptar, revisar seguridad y añadir a pack/registro/integridad. |
| `C:\Users\tamvo\Downloads\background\.qoder\skills\isabella-release-validation\SKILL.md` | Validación/publicación con evidencia para repos Isabella | Relevante para operaciones de release con evidencia. | **Referencia operativa**. No incorporar al pack público sin delimitar alcance, dependencias (node-repl/Bash Windows) y gobernanza de secretos/publicación. |
| `C:\Users\tamvo\Downloads\ISABELLA* / isabella-*` (zips y `.qoder/skills`) | `run-node-without-shell` y copias relacionadas | Utilidad de entorno Windows/shell. | **Referencia de tooling local**, no skill de producto TAMV. |
| `C:\Users\tamvo\Downloads\TAMV_Governance_Skills_Pack_v2.zip` | 5 skills de gobernanza/confianza | Coincide con `security-trust/governance-pack-v2` del repo. | Usar la copia versionada en repo como referencia; evitar duplicados no trazados. |
| `C:\Users\tamvo\Downloads\tamv-creator-intelligence-main*.zip`, `v2/v3/v3.0.1`, `_audit-tci`, `_zip-tci` | Snapshots históricos (37/41 skills, variantes) | Trazabilidad de evolución. | **Archivo histórico**; no sobrescribir el estado actual del repo. |

## 4. Skills de herramientas/agentes instaladas localmente (disponibles, no parte del pack TAMV)

Inventariadas para unificación de conocimiento operativo (no se fusionan en `tamv-pack` ni en el registro de contratos del producto):

| Origen | Ejemplos | Clasificación |
|---|---|---|
| `C:\Users\tamvo\.agents\skills` | `agent-browser`, `airunway-aks-setup`, `deploy-to-vercel`, `find-skills`, `grill-me`, `hf-cli`, `vercel-composition-patterns` | Skills de agente/herramientas de usuario. |
| `C:\Users\tamvo\.claude\skills` | `hf-cli` | Copia instalada. |
| `C:\Users\tamvo\.codex\skills\.system` | `imagegen`, `openai-docs`, `plugin-creator`, `review-agent`, `skill-creator`, `skill-installer` | Sistema Codex. |
| `C:\Users\tamvo\.codex\plugins\cache` | `browser`, `visualize`, `documents`, `pdf`, `presentations`, `spreadsheets`, `template-creator`, etc. | Plugins cacheados. |
| `C:\Users\tamvo\.cache\codex-runtimes` y `.../plugins/github.com-vercel-vercel-plugin` | Playwright skills, Vercel plugin skills (ai-sdk, nextjs, vercel-*, react-best-practices, etc.) | Runtimes/plugins de terceros. |
| `C:\Users\tamvo\.gemini\...` | Builtin Gemini/Antigravity, Redux Toolkit skills, chrome-devtools, data-agent-kit, science plugins | Entorno Gemini/plugins. |
| `C:\Users\tamvo\Downloads\.qoder\...` | `pptx`, `security-scan`, `node-repl-shell-fallback` | Herramientas Qoder locales. |

**Nota:** el inventario de plugins/caches grandes (p. ej. `.codex\.tmp\plugins\plugins`) contiene cientos de skills de terceros; se consideran **catálogo externo local disponible** y no se incorporan al contrato de producto TAMV salvo selección, adaptación y gobernanza explícitas.

## 5. Mapa de unificación (qué está incorporado y qué falta)

### Incorporado ahora
- 41 contratos TAMV en pack/registro/UI alineados.
- Correcciones de código/cableado post-pull aplicadas y validadas (typecheck/lint/tests/build/docs/closure).
- Firma Ed25519 del manifiesto de atribución emitida localmente con las claves proporcionadas por el usuario (`tamv-attribution.sig` actualizado); la certificación runtime completa sigue sujeta a verificación de clave pública y `TAMV_RELEASE_MANIFEST_SHA256` aprobado en entorno (fail-closed sin esos valores).
- Ajustes de honestidad en capacidades/etiquetas de gobernanza y exposición de monitor administrativo en navegación.

### Pendiente de incorporación controlada (requiere decisión humana/revisión)
1. **Unificar variantes `tamv-genesis/v3`** con contratos del pack (si se desea mejorar descripciones/capacidades) → actualizar `SKILL.md`, `pack.json`, `integrity.json`, `skill-registry.ts`, roadmap y pruebas.
2. **Evaluar `tamv-browser-verification`** (Xclusive) como skill TAMV de QA web → generalizar, definir dependencias/entradas/salidas y pasar por flujo de contrato.
3. **Evaluar `security-trust/governance-pack-v2`** como track separado o complementario → decidir distribución/licencia y relación con el pack principal sin mezclar claims.
4. **Referencias ISABELLA/Horizon** (`docs/archivos-tamv/*`) → mantener como material de planificación; incorporar solo capacidades con implementación y evidencia verificable, sin datos privados.
5. **Despliegue/operación real** (fuera de código): secretos/env, migraciones/RPC gestionadas por Lovable/entorno, configuración Stripe/Supabase/guía AI, aprobación externa de digest y validación en producción.

## 6. Criterios de incorporación al pack/registro

Para mover una skill local al estado "incorporada" en TAMV Creator Intelligence:

- Contrato claro en `tamv-pack/skills/<id>/SKILL.md` (frontmatter, entradas, flujo, salida, salvaguardas, atribución/licencia coherente).
- Entrada en `tamv-pack/pack.json` (`skills`, `skillGraph`, dependencias) y política de orquestación respetada.
- `tamv-pack/integrity.json` regenerado para reflejar el contenido real.
- `src/lib/skill-registry.ts` actualizado (y alineado con el generador/validadores del proyecto si aplica).
- UI (Atlas/Marketplace/Exagon) y dependencias gobernadas consistentes.
- Validaciones verdes: `typecheck`, `lint`, `test`, `build`, `docs:check`, `ops:closure`, `tamv:check`/scripts relevantes.
- Sin claims de ejecución externa, certificación normativa o infraestructura no disponible.
