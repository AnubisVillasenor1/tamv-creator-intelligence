# Índice de evidencia

## Artefactos del repositorio

La integridad de los 22 archivos protegidos está en `tamv-attribution.json` y se
recomputa con:

```bash
node scripts/tamv-certification.mjs --check
```

Ese comando informa «hashes de origen válidos, pero el release está sin firma».
Ambas cosas son ciertas y se conservan: no se simula la firma.

| Artefacto | Qué prueba |
|---|---|
| `tamv-attribution.json` | Lista canónica, hashes y features licenciadas |
| `tamv-attribution.sig` | Estado de firma (`UNSIGNED_RELEASE_PENDING`) |
| `src/lib/tamv-certification.ts` | Verificación fail-closed en runtime |
| `scripts/tamv-certification.mjs` | Herramienta reproducible de hash/firma |
| `hypercore/govern-core/policy.json` | Política deny-by-default |
| `src/lib/hypercore-turbo/policy.ts` | Allowlist y decisión de autorización |
| `tamv-pack/pack.json` | Inventario de 37 skills |
| `tamv-genesis/data/*.json` | Claims, capacidades, ledger y scorecard |
| `docs/audit/2026-11-13/GENERATED.md` | Tablas recomputadas por el CLI |

## Corpus local catalogado

Hashes SHA-256 calculados el 2026-11-13 sobre los archivos originales. El catálogo
completo, con licencia, sensibilidad y uso, está en
`tamv-genesis/data/knowledge-sources.json`.

| ID | Documento | Bytes | SHA-256 (prefijo) | Uso |
|---|---|---:|---|---|
| KS-01 | Compendio de trazabilidad | 177,093 | `e8dcb6da…` | evidencia |
| KS-02 | Compendio Civilizatorio 3.0 | 647,943 | `2a4e6fc6…` | doctrina |
| KS-03 | Investigación Frontiers | 324,218 | `f0bc8df9…` | evidencia |
| KS-04 | Reporte «firmado» por IA | 145,916 | `a43146a2…` | evidencia del sesgo |
| KS-05 | Resumen ejecutivo | 113,975 | `da903432…` | doctrina |
| KS-06 | Documento maestro ISABELLA | 9,957 | `45b21460…` | doctrina |
| KS-07 | Cero Risk Automation V2 | 11,746 | `eda8db12…` | doctrina (excluida por licencia) |
| KS-08 | Recuperación GitHub | 4,209 | `c945d715…` | **excluida / restringida** |
| KS-09 | XCLUSIVE | 449,205 | `0af23d4e…` | legal (confidencial) |
| KS-10 | XCLUSIVE arquitectura | 270,198 | `7d8f586e…` | legal (confidencial) |
| KS-11 | Auditoría del pack | 2,532 | `f5ed5b57…` | evidencia |
| KS-12 | Documento de investigación | 259,422 | `3312f…` | evidencia |

Los archivos KS-08, KS-09 y KS-10 **no se copian** al paquete. El catálogo
registra su existencia y su hash para que un revisor pueda comprobar que no
fueron importados.

## Perfiles públicos (foto 2026-11-13)

| Perfil | Repos públicos | Rol declarado | Evidencia |
|---|---:|---|---|
| `github.com/OsoPanda1` | 144 | TAMV ONLINE ENTERPRISE; CEO fundador Edwin O. Castillo Trejo | API de GitHub |
| `github.com/AnubisVillasenor1` | 10 | Arquitecto de sistemas; ORCID 0009-0008-5050-1539 | API de GitHub |
| ORCID | — | Identificador académico declarado | Perfil público |

Los repositorios se agrupan en: TAMV/Isabella (mayoría), turismo y territorio
(Real del Monte), educación (UTAMV), infraestructura y utilidades. De los 144 de
`OsoPanda1`, **40 son forks de terceros** y 100 de los 104 originales tienen 0
estrellas. La existencia de 154 repositorios no acredita calidad, adopción ni
horas; solo volumen de publicación. Detalle en `docs/PROFILES.md`.

## Comandos de reproducción

```bash
# Integridad del release
node scripts/tamv-certification.mjs --check

# Auditoría completa (15 chequeos)
node --experimental-strip-types tamv-genesis/cli/sovereign.mjs audit

# Ledger y manifiesto genesis
node --experimental-strip-types tamv-genesis/cli/sovereign.mjs verify

# Regenerar tablas del informe
node --experimental-strip-types tamv-genesis/cli/sovereign.mjs report

# Pruebas del kernel
cd tamv-genesis && node --experimental-strip-types --test tests/*.test.ts

# Bundle distribuible
node --experimental-strip-types tamv-genesis/cli/sovereign.mjs build
```

## Descubrimiento en skills.sh (verificado)

El 2026-11-13, con el CLI oficial `skills` 1.8.1:

```bash
npx skills add . --list
# → Found 37 skills
```

También se verificó contra el remoto público:

```bash
npx skills add AnubisVillasenor1/tamv-creator-intelligence --list
# → clona el repositorio y encuentra 37 skills
```

Y una instalación real en un proyecto temporal:

```bash
npx skills add AnubisVillasenor1/tamv-creator-intelligence \
  --skill '*' --agent opencode -y --copy
# → 37 carpetas en .agents/skills/ y skills-lock.json
```

No se registró ninguna instalación en el repositorio. La página del pack ya está
indexada: `https://skills.sh/anubisvillasenor1/tamv-creator-intelligence` (200, 37
skills, 0 instalaciones al 2026-11-13). Ver `docs/PUBLISHING.md`.

## Evidencia que falta

- Bitácora horaria y método de conteo.
- Atestación de un tercero sobre una muestra de periodos.
- Inventario de DOI resuelto y deduplicado.
- Resultados de pruebas de carga y failover.
- SBOM y attestation SLSA del artefacto publicado.
- Revisión legal de titularidad y contribuciones.
