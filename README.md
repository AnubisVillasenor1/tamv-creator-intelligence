# TAMV Creator Intelligence

**Creator Operating System** de TAMV ONLINE NETWORK: un catálogo gobernado de 37
contratos de skill, un kernel de evidencia auditable (`TAMV GENESIS Ω`) y una
aplicación que revisa borradores sin publicarlos.

**PLAY & GO · Aprende. Crea. Analiza. Evoluciona.**

[![Licencia: AGPL-3.0-only](https://img.shields.io/badge/licencia-AGPL--3.0--only-blue.svg)](LICENSE)
[![Estado: release sin firma](https://img.shields.io/badge/release-UNSIGNED__RELEASE__PENDING-orange.svg)](tamv-attribution.sig)
[![Scorecard: 58.6 / D](https://img.shields.io/badge/scorecard-58.6%2F100%20%C2%B7%20D-yellow.svg)](docs/audit/2026-11-13/EXECUTIVE-SUMMARY.md)
[![Skills: 37 contratos](https://img.shields.io/badge/skills-37%20contratos-6b7280.svg)](tamv-pack/pack.json)

> **Lee esto antes de instalar.** El release está deliberadamente **sin firma**
> (`UNSIGNED_RELEASE_PENDING`) y el propio runtime bloquea las capacidades
> certificadas. El paquete **no es un producto certificado** ni una validación
> académica. Es infraestructura abierta, reproducible y honesta sobre lo que le
> falta. La auditoría completa está en [`docs/audit/2026-11-13/`](docs/audit/2026-11-13/README.md).

---

## 1. Instalar

### Con el CLI de skills.sh

```bash
npx skills add AnubisVillasenor1/tamv-creator-intelligence
```

`skills.sh.json` declara `./tamv-pack/skills` como ruta de descubrimiento. El CLI
instala en `.agents/skills/` del proyecto destino y detecta los 37 `SKILL.md`
por su frontmatter YAML (`name`, `description`, `license`). Los pasos de
publicación e indexación están en [`docs/PUBLISHING.md`](docs/PUBLISHING.md).

### Instalación manual (con consentimiento y respaldo)

```bash
git clone https://github.com/AnubisVillasenor1/tamv-creator-intelligence.git /tmp/tamv-source
bash /tmp/tamv-source/tamv-pack/scripts/validate-pack.sh
cd /ruta/a/tu-proyecto
bash /tmp/tamv-source/tamv-pack/install.sh
```

El instalador valida el manifiesto y la integridad **antes** de escribir, pide
consentimiento explícito, respalda los archivos que reemplaza y registra la
operación en `.tamv/install.log`. Destino por defecto: `.agents/skills/`;
sobrescríbelo con `TAMV_SKILLS_DIR=/otra/ruta`.

---

## 2. Qué hay dentro

| Zona | Qué es | Estado |
|---|---|---|
| `tamv-pack/skills/` | 37 contratos de skill con gobernanza, salvaguardas y contrato de salida | 37/37 con frontmatter válido |
| `tamv-pack/` | Manifiesto `pack.json`, instalador, validadores y registro | operativo |
| `src/` | App React 19 + TanStack Start; `creator.review` es la única capacidad de IA real | 1 ejecutor |
| `tamv-genesis/` | Kernel de evidencia: claims, capacidades, ledger, scorecard y CLI | 38 pruebas |
| `docs/audit/2026-11-13/` | Auditoría adversarial del repositorio y del corpus | 25 hallazgos |
| `hypercore/` | Política deny-by-default y ejecutor con concurrencia limitada | en proceso |
| `tamv-attribution.*` | Manifiesto de 22 hashes y estado de firma | sin firma |

### Los 37 skills

Cubren gobernanza, derechos y seguridad, voz e identidad, audio y DSP, música,
agente, publicación externa, monetización, licencias, SEO, crecimiento,
marketing, Supabase/RLS, Next.js, BullMQ/Redis, soporte y calidad. Cada uno
declara cuándo activarse, entradas requeridas, reglas obligatorias, salvaguardas
y formato de salida.

**Un contrato no es un ejecutor.** 34 entradas del registro todavía usan el
marcador «Consultar contrato del skill». La UI ya no afirma «37 skills
conectados»: informa el estado real por capacidad.

---

## 3. Qué funciona y qué no

| Afirmación | Realidad verificada |
|---|---|
| Revisión creativa con IA | ✅ Funciona, con Supabase Auth, cuota por usuario, límite de concurrencia y timeout |
| Integridad de 22 archivos | ✅ Se recomputa con SHA-256; cualquier cambio falla cerrado |
| Descubrimiento en skills.sh | ✅ `skills.sh.json` + 37 `SKILL.md` válidos |
| Panel `/sovereignty` y API `/api/tamv/genesis` | ✅ Solo lectura, datos regenerables |
| Firma Ed25519 del release | ❌ **Pendiente**; bloquea las capacidades certificadas |
| Generación de voz, música, AudioCore, agente | ❌ Contratos declarados; responden `501`, no simulan |
| Publicación externa | ❌ Solo declarada, sin implementación |
| Ledger durable append-only | ❌ La política lo exige; `drizzle/schema.ts` está vacío |
| RLS multi-tenant | ❌ Declarada en skills, sin migraciones en el repositorio |
| Atestación independiente de horas | ❌ 0 horas atestiguadas |
| Validación académica | ❌ No existe; ver §6 |

---

## 4. Scorecard y auditoría

**58.6 / 100 · grado D.** Lo recomputa el CLI; no está escrito a mano:

```bash
node --experimental-strip-types tamv-genesis/cli/sovereign.mjs audit
node --experimental-strip-types tamv-genesis/cli/sovereign.mjs report
```

15 chequeos de soberanía. Los que fallan son los que deben fallar: firma ausente,
contratos incompletos, ledger sin atestación. Un sistema que se declara auditable
tiene que ser incómodo cuando la evidencia no alcanza.

| Documento | Contenido |
|---|---|
| [EXECUTIVE-SUMMARY.md](docs/audit/2026-11-13/EXECUTIVE-SUMMARY.md) | Veredicto y siete hallazgos principales |
| [FINDINGS.md](docs/audit/2026-11-13/FINDINGS.md) | 25 hallazgos P0/P1/P2 con estado |
| [BIAS-REGISTER.md](docs/audit/2026-11-13/BIAS-REGISTER.md) | 12 sesgos del proyecto y 6 del auditor |
| [CONSISTENCY-MATRIX.md](docs/audit/2026-11-13/CONSISTENCY-MATRIX.md) | Discrepancias entre superficies y su resolución |
| [WORK-LEDGER.md](docs/audit/2026-11-13/WORK-LEDGER.md) | Las 24,000 horas y su protocolo de atestación |
| [THREAT-MODEL.md](docs/audit/2026-11-13/THREAT-MODEL.md) | Activos, actores, abusos y controles |
| [REMEDIATION.md](docs/audit/2026-11-13/REMEDIATION.md) | Compuertas con criterios de aceptación |
| [EVIDENCE-INDEX.md](docs/audit/2026-11-13/EVIDENCE-INDEX.md) | Artefactos, hashes y comandos |
| [GENERATED.md](docs/audit/2026-11-13/GENERATED.md) | Tablas recomputadas (no editar) |

### Modelo de evidencia

- **Madurez por capacidad:** `M0-declared` → `M1-contracted` → `M2-implemented`
  → `M3-tested` → `M4-operated` → `M5-audited`. El nivel se **gana**, no se declara.
- **Estado de claim:** `declared`, `unverified`, `corroborated`, `verified`,
  `contradicted`, `retracted`. Un claim autopublicado nunca pasa de `unverified`.
- **Tiers de evidencia:** `T0` testimonio → `T1` autopublicado → `T2` artefacto
  propio reproducible → `T3` revisor identificable → `T4` auditoría independiente.
  Solo T3/T4 acreditan horas.

---

## 5. Las 24,000 horas

Se registran como **claim autobiográfico `unverified`**, no como hecho.

| Fecha | Cifra | Fuente | Estado |
|---|---:|---|---|
| 2025-10-07 | 19,000 h | Blog del autor | `declared-published` |
| sin fecha | >23,000 h | Material del autor | `declared` |
| 2026-11-13 | 24,000 h | Declaración directa | `declared` |

Los denominadores son exigentes: 9.6 h/día sin días libres desde 2020, o 5.1
h/día desde 2014. El salto 19,000 → 24,000 en 403 días implica 12.4 h/día.

Nada de eso prueba falsedad; prueba que **la cifra no es auditable sin método**.
El ledger encadenado por hash (`tamv-genesis/data/work-ledger.json`) permite que
la cifra suba de nivel cuando exista bitácora y un tercero que la firme, sin
reescribir la historia. Hoy registra **0 horas acreditadas por artefactos** y
expone `unattested-hours` como hallazgo abierto.

---

## 6. Sobre la validación académica

La adopción, la popularidad y la infraestructura abierta **no obligan** a ninguna
institución a validar nada. La validación académica se otorga con método,
evidencia y revisión por pares; no se conquista con presión, volumen ni
viralidad.

Lo que este repositorio sí hace es **bajar el costo de evaluar**:

1. **Claims falsables.** Cada uno declara qué lo refutaría.
2. **Datos reproducibles.** Scorecard, ledger y capacidades se recomputan en minutos.
3. **Límites declarados.** Lo que no existe se marca como inexistente.
4. **Paquete instalable.** Un revisor puede usar los 37 skills y el CLI sin pedir permiso.
5. **Historial íntegro.** Los hashes detectan cualquier reescritura posterior.

Un revisor externo puede reproducir la auditoría completa en menos de una hora:

```bash
node scripts/tamv-certification.mjs --check
node --experimental-strip-types tamv-genesis/cli/sovereign.mjs audit
node --experimental-strip-types --test tamv-genesis/tests/*.test.ts
```

Si una institución evalúa este trabajo, encontrará un artefacto verificable y una
lista explícita de lo que falta. Eso es lo máximo que la evidencia permite
afirmar, y es más útil que cualquier narrativa de validación.

---

## 7. Identidad y perfiles públicos

| Superficie | Rol declarado | Evidencia |
|---|---|---|
| [github.com/OsoPanda1](https://github.com/OsoPanda1) | TAMV ONLINE ENTERPRISE · CEO fundador Edwin O. Castillo Trejo | 144 repos públicos (foto 2026-11-13) |
| [github.com/AnubisVillasenor1](https://github.com/AnubisVillasenor1) | Arquitecto de sistemas y full-stack · ORCID `0009-0008-5050-1539` | 10 repos públicos |
| ORCID | Identificador académico declarado | Perfil público |

Los perfiles son **autopublicados**: acreditan actividad y existencia, no calidad,
adopción ni horas. Detalle y límites en [`docs/PROFILES.md`](docs/PROFILES.md).
La identidad, los handles y la atribución canónica están en
`tamv-genesis/data/identity.json`. Origen: **Real del Monte (Mineral del Monte),
Hidalgo, México**.

**Atribución canónica:** Proyecto impulsado con colaboración de tecnología latinoamericana TAMV ONLINE NETWORK Orgullosamente Realmontenses.

---

## 8. Arquitectura

```
.
├── src/                     App React 19 + TanStack Start
│   ├── routes/              index, hypercore, sovereignty, api.tamv.*
│   └── lib/                 certification, policy, review-guard, genesis-bundle
├── tamv-pack/               37 skills + manifiesto + instalador + validadores
├── tamv-genesis/            Kernel de evidencia
│   ├── src/                 types, evidence, claims, capabilities, workledger, scorecard
│   ├── data/                identity, claims, capabilities, ledger, scorecard, corpus
│   ├── cli/sovereign.mjs    audit · verify · score · report · build
│   └── dist/                genesis.json · public.json · manifest.json
├── hypercore/               Política deny-by-default + ejecutor
├── docs/audit/2026-11-13/   Auditoría adversarial
├── scripts/                 Certificación, higiene, validación
└── skills.sh.json           Descubrimiento del catálogo
```

**Gobernanza:** deny-by-default. Cada capacidad declara tier de riesgo (`R0`–`R5`),
requiere consentimiento y tiene allowlist explícita. `voice.generation` y
`agent.orchestration` son los identificadores canónicos; un chequeo de deriva
impide reintroducir alias (`voice.generate`, `agent.execute`).

**Privacidad:** los borradores viven en el estado de React y no se persisten. La
revisión usa AI Gateway con la clave siempre en servidor. Los errores se
correlacionan por petición con `AsyncLocalStorage`, no con un slot global.

---

## 9. Desarrollo

Requisitos: Node 22+ (usa `--experimental-strip-types`), Python 3 y Bash para los
validadores del paquete.

```bash
# App
npm install
npm run dev

# Verificación antes de integrar
npm run tamv:check
npm run test
npm run build

# Kernel de evidencia
cd tamv-genesis && node --experimental-strip-types --test tests/*.test.ts

# Validadores del paquete
python3 tamv-pack/scripts/validate-manifest.py
python3 tamv-pack/scripts/validate-integrity.py
bash tamv-pack/scripts/validate-pack.sh
```

### Certificación y firma

`tamv-attribution.json` contiene el manifiesto con 22 hashes SHA-256.
`tamv-attribution.sig` contiene `UNSIGNED_RELEASE_PENDING`: no se inventó una
firma ni se guardó una clave privada en Git.

```bash
# Tras un cambio aprobado en un archivo protegido
node scripts/tamv-certification.mjs --update-hashes
node scripts/tamv-certification.mjs --check

# Firma en un entorno custodiado (nunca en el repo)
TAMV_ATTRIBUTION_PRIVATE_KEY="$(cat /ruta-segura/private.pem)" node scripts/tamv-certification.mjs --sign
TAMV_ATTRIBUTION_PUBLIC_KEY="$(cat /ruta-segura/public.pem)" node scripts/tamv-certification.mjs --check --require-signature
```

La clave privada jamás entra al repositorio, a `.env.example` ni a variables
`VITE_*`. Una discrepancia detiene la operación afectada; no borra archivos del
usuario ni ejecuta autodestrucción.

---

## 10. Límites y advertencias

- **No es un producto certificado.** El release está sin firma y las capacidades
  premium están bloqueadas por diseño.
- **No es una validación académica.** Es un artefacto evaluable; la validación la
  otorga quien la revisa, con su propio método.
- **No hay ledger durable.** La política lo describe; el esquema está vacío. Es la
  compuerta G3, abierta.
- **La cuota es por proceso.** No sustituye un rate limit distribuido.
- **No hay SBOM ni attestation SLSA en CI.** Acciones fijadas por etiqueta mayor.
- **Sin pruebas de carga ni failover.** No se afirma disponibilidad de producción.
- **El corpus externo no se distribuye.** Se cataloga por hash; documentos con
  CC BY 4.0, Apache 2.0 o derechos reservados conservan sus términos y no se
  relicencian como AGPL.
- **Autoría:** el ecosistema se atribuye institucionalmente a TAMV ONLINE NETWORK;
  las herramientas y proveedores no se presentan como coautores.
- **Credenciales:** si alguna credencial privada se expuso, revócala y genera otra.
  Borrar un archivo en un commit posterior no elimina el historial anterior.

---

## 11. Licencia

Núcleo (`src/`, `tamv-pack/`, `scripts/`, `hypercore/`, `tamv-genesis/`,
`docs/`): **AGPL-3.0-only**. Texto íntegro en [`LICENSE`](LICENSE); avisos en
[`NOTICE`](NOTICE); mapa por zona en [`LICENSE-MAP.md`](LICENSE-MAP.md).

Los módulos marcados `LicenseRef-TAMV-Commercial-1.0` y los activos de marca
requieren acuerdo escrito. La licencia de software no concede derechos sobre
marcas, voz, imagen, datos personales, modelos ni obras de terceros.

TAMV ONLINE NETWORK · Real del Monte (Mineral del Monte), Hidalgo, México.
