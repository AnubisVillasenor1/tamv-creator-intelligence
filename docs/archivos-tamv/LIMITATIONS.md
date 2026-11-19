# Límites de este paquete

Este documento declara qué prueba y qué no prueba el paquete, y qué queda fuera
de su alcance. La honestidad sobre los límites es parte del estándar de
transparencia TAMV: una afirmación no verificada se marca como tal.

## 1. Qué es este paquete

Es un **subconjunto documentado** del repositorio de origen
`tamv-creator-intelligence`, empaquetado para instalarse como skills en Qoder.
Incluye el SKILL.md paraguas, las cuatro skills públicas, los contratos de tipos
compartidos, la política baseline, el manifiesto de gobernanza y la documentación
de gobernanza. **No** incluye la aplicación web completa (TanStack Start/Router,
Vite, Supabase), el núcleo criptográfico ejecutable ni los 37 contratos internos.

## 2. Integridad: estado real

| Afirmación | Estado |
|---|---|
| El sello de origen es verificable estructuralmente | Sí. |
| El sello de origen está firmado | **No.** `UNSIGNED_RELEASE_PENDING`. |
| El checkpoint del log de transparencia está firmado | **No.** `UNSIGNED_RELEASE_PENDING`. |
| Este paquete incluye una firma válida | **No.** No se fabrica ni simula una firma. |
| Las capacidades certificadas pueden ejecutarse ahora | **No.** Fail-closed mientras no haya firma Ed25519 válida. |

La raíz del sello de origen es
`sha256:3519d34593e1a01f6685f77c8d3dbc0a3a8a87d75de95c679644e33a17b7b487`
(esquema `tamv.pack-seal.v2`). `scripts/sign-governance-pack.ts` firma y verifica
el manifiesto de gobernanza de este paquete con una clave Ed25519 de release
mantenida fuera de Git; no genera una firma sin clave.

## 3. Qué impide y qué no impide el sello

**Impide:** que una copia parcial, alterada o sin firma se presente como
certificada; que una skill editada, movida o sustituida conserve el sello; que se
añada una quinta skill sin romper la raíz del paquete.

**No impide:** copiar el paquete público completo y usarlo ignorando las
licencias; que un receptor con la clave privada de release firme otra cosa; DRM
ni control de copia posterior al descifrado; vulnerabilidades en dependencias,
despliegues o configuraciones. "Imposible de piratear" no es una propiedad
alcanzable en software distribuido al cliente.

## 4. Fuera de alcance en este paquete

- **Suites de la aplicación:** Vitest, lint, typecheck, build y pruebas de
  navegador de la app no se ejecutan aquí; requieren el stack completo y Bun
  (release fija 1.3.5), no disponible en este entorno.
- **Audio:** el contrato de audio encola sin declarar finalización y no inventa
  DSP; no hay proveedor ni worker conectados en este paquete.
- **Núcleo criptográfico ejecutable:** la canonicalización, los digests, Ed25519,
  X25519, AES-256-GCM, el sello y el log de transparencia viven en
  `tamv-genesis/src/sovereign/` del repositorio de origen, no aquí.
- **SBOM y cabeceras SPDX:** pendientes (compuerta G5 y condiciones de licencia).

## 5. Enlaces del README

`README.md` se copia verbatim del repositorio de origen y enlaza documentos que
**no** se incluyen en este paquete (por ejemplo `docs/OPERATIONS.md`,
`docs/SOVEREIGN-V3.md`, rutas de la app). Esos enlaces apuntan al repositorio
completo, no a este subconjunto. La documentación de gobernanza incluida aquí es
`docs/LIMITATIONS.md`, `docs/ROADMAP.md` y `docs/adr/ADR-001-governed-execution.md`.

## 6. Evidencia disponible

Los contratos de tipos (`core/governance/contracts.ts`) y la política baseline
(`governance/policies/baseline.json`) reflejan el código real del repositorio de
origen (`tamv-genesis/src/types.ts` y `tamv-genesis/src/policy.ts`). En el origen,
el núcleo soberano y el log de transparencia están cubiertos por 78 tests locales
en Node v24.18.0; esos tests no se ejecutan dentro de este paquete.

## Atribución

Proyecto impulsado con colaboración de tecnología latinoamericana
TAMV ONLINE NETWORK
Orgullosamente Realmontenses.