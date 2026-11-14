# TAMV Creator Intelligence

**Creator Operating System de TAMV ONLINE NETWORK** para PLAY & GO: contratos de skills gobernados, revisión creativa asistida por IA, evidencia reproducible y controles de integridad.

**PLAY & GO · Aprende. Crea. Analiza. Evoluciona.**

[![Licencia AGPL-3.0-only](https://img.shields.io/badge/licencia-AGPL--3.0--only-blue.svg)](LICENSE)
[![Release sin firma](https://img.shields.io/badge/release-UNSIGNED__RELEASE__PENDING-orange.svg)](tamv-attribution.sig)
[![Catálogo 37 skills](https://img.shields.io/badge/skills-37%20contratos-64748b.svg)](tamv-pack/pack.json)
[![skills.sh 37 skills](https://img.shields.io/badge/skills.sh-37%20skills-0a0a0a.svg)](https://skills.sh/anubisvillasenor1/tamv-creator-intelligence)
[![Scorecard 58.6 · D](https://img.shields.io/badge/scorecard-58.6%2F100%20%C2%B7%20D-yellow.svg)](docs/audit/2026-11-13/EXECUTIVE-SUMMARY.md)
[![Auditoría](https://img.shields.io/badge/auditor%C3%ADa-hallazgos%20y%20evidencia-64748b.svg)](docs/audit/2026-11-13/README.md)

> **Estado: release sin certificar.** `tamv-attribution.sig` conserva `UNSIGNED_RELEASE_PENDING`. La existencia de controles, políticas, skills o documentación no demuestra certificación, disponibilidad productiva, conformidad legal ni validación académica. Las capacidades que requieren certificación o procedencia verificadas deben permanecer bloqueadas.

**Atribución canónica:** Proyecto impulsado con colaboración de tecnología latinoamericana TAMV ONLINE NETWORK Orgullosamente Realmontenses.

## Índice

- [Propósito y alcance](#propósito-y-alcance)
- [Estado documentado](#estado-documentado)
- [Arquitectura](#arquitectura)
- [Catálogo de skills](#catálogo-de-skills)
- [Instalación](#instalación)
- [Desarrollo y pruebas](#desarrollo-y-pruebas)
- [Certificación y releases](#certificación-y-releases)
- [Triple hardening](#triple-hardening)
- [Gobernanza de IA y derechos](#gobernanza-de-ia-y-derechos)
- [Auditoría y evidencia](#auditoría-y-evidencia)
- [Perfiles, horas y validación académica](#perfiles-horas-y-validación-académica)
- [Deuda técnica](#deuda-técnica)
- [Contribuciones y seguridad](#contribuciones-y-seguridad)
- [Licencias](#licencias)
- [Gate de producción](#gate-de-producción)

## Propósito y alcance

El proyecto organiza flujos de trabajo para creación, educación musical, revisión de contenido, gobernanza, derechos de creadores y operaciones de producto. Sus superficies deben evaluarse por separado:

1. **Pack de skills:** contratos Markdown que describen activación, entradas, salvaguardas y salida esperada.
2. **Creator OS:** aplicación y servicios de revisión creativa. El número de contratos no equivale al número de ejecutores funcionales.
3. **TAMV GENESIS Ω e HyperCore:** utilidades de evidencia, integridad, políticas de autorización y diagnóstico. Una política no prueba que exista un servicio operativo detrás.

Regla de autoridad: **la IA analiza y recomienda; las personas autorizadas deciden y aprueban las acciones sensibles**. No se declara conciencia, autonomía institucional ni autoridad legal de los componentes de IA.

Este repositorio es software en evolución; no constituye certificación de seguridad, opinión jurídica, garantía de resultados ni declaración universal de conformidad.

## Estado documentado

Estos estados proceden de la auditoría versionada del repositorio. Deben comprobarse de nuevo para el SHA y entorno exactos de cualquier release.

| Área | Estado documentado | Significado |
|---|---|---|
| Catálogo | 37 contratos de skills | No son 37 ejecutores. |
| Revisión creativa | Un ejecutor real identificado | Requiere configuración segura del proveedor. |
| Integridad | 22 archivos protegidos por SHA-256 | Detecta divergencias; no sustituye una firma. |
| Firma Ed25519 | `UNSIGNED_RELEASE_PENDING` | Release sin certificar hasta verificar una firma real. |
| Procedencia SLSA | El workflow de release genera y verifica atestación del bundle; el runtime no aplica esa política | Solo se considera acreditado tras ejecutar el workflow con tag y permisos válidos. |
| Música, voz y AudioCore | No habilitadas como capacidades certificadas | No simular éxito; denegar o responder `501`. |
| Ledger durable | Pendiente | No prometer persistencia append-only sin almacenamiento y pruebas. |
| RLS multi-tenant | Pendiente de migraciones y pruebas | La documentación no demuestra aislamiento. |
| SBOM y atestación | Generación CycloneDX y atestaciones configuradas en release workflow | Falta evidencia de ejecución real del workflow de release autorizado. |
| Producción | No certificada | Requiere superar los gates de este documento. |

No conviertas “planeado”, “declarado” o “configurado” en “implementado”, “operativo” o “certificado” sin evidencia reproducible.

## Arquitectura

```text
TAMV Creator Intelligence
├── tamv-pack/       # pack.json, 37 SKILL.md, instalador y validadores
├── src/             # UI, rutas, revisión creativa y HyperCore
├── tamv-genesis/    # CLI, claims, scorecard y evidencia
├── hypercore/       # políticas y configuración
├── scripts/         # certificación, hashes y releases
├── docs/audit/      # hallazgos, amenazas y remediación
├── tamv-attribution.json
└── tamv-attribution.sig
```

- **Govern Core:** política, allowlists, consentimiento y denegación por defecto.
- **Integrity Core:** hashes y verificación de firma del manifiesto.
- **Velocity Core:** ejecución paralela limitada y observabilidad local; no equivale a una cola distribuida durable.
- **TAMV GENESIS Ω:** evaluación de claims, capacidades y evidencias.
- **Aplicación:** muestra solo capacidades conectadas y errores reales.
- **Skills:** contratos para agentes compatibles; no conceden permisos de sistema ni ejecutan código por sí solos.

Las siete federaciones TAMV son una arquitectura conceptual de gobernanza. Este repositorio no acredita siete despliegues independientes ni contratos operativos completos entre ellas.

## Catálogo de skills

El inventario está en [`tamv-pack/pack.json`](tamv-pack/pack.json). Abarca gobernanza, arquitectura de PLAY & GO, desarrollo web, música generativa, voz, DSP, colas, seguridad de datos, licencias, crecimiento, marketing, SEO, soporte, investigación, revisión editorial, aprendizaje, accesibilidad, metadatos, consentimiento, privacidad, calidad y orquestación.

La validación debe comprobar 37 IDs únicos coincidentes con carpetas y archivos `SKILL.md`, títulos y atribución, frontmatter coherente cuando exista, dependencias válidas, ausencia de ciclos y controles de gobernanza obligatorios. Un skill puede estar contratado sin tener ejecutor; la UI debe mostrar el estado real por capacidad.

Estado actual: **37/37 contratos completos**. Cada `SKILL.md` declara entradas
requeridas, reglas, contrato de salida y atribución; `src/lib/skill-registry.ts` se
genera desde esos archivos con
`node tamv-pack/scripts/generate-skill-registry.mjs --check`, así que el marcador
«Consultar contrato del skill» ya no existe. Contrato completo no significa
ejecutor: sigue habiendo **una** capacidad de IA implementada (`creator.review`).

## Instalación

Requisitos: Git, Bun compatible con el lockfile, Node.js compatible con Vite/TanStack Start, Python 3 y OpenSSL para generación local de claves.

### CLI de skills

```bash
npx skills add AnubisVillasenor1/tamv-creator-intelligence
```

`skills.sh.json` declara `./tamv-pack/skills` como ruta de descubrimiento; el CLI
instala en `.agents/skills/` del proyecto destino. El pack está indexado en
[`skills.sh/anubisvillasenor1/tamv-creator-intelligence`](https://skills.sh/anubisvillasenor1/tamv-creator-intelligence)
(37 skills; 37 instalaciones de skill al 2026-11-13, procedentes de **una sola**
instalación de prueba de los 37 skills, no de 37 usuarios). La página la genera la
indexación: no se compra ni se infla. Estado y límites en
[`docs/PUBLISHING.md`](docs/PUBLISHING.md).

### Validación manual

```bash
git clone https://github.com/AnubisVillasenor1/tamv-creator-intelligence.git
cd tamv-creator-intelligence
python3 tamv-pack/scripts/validate-manifest.py
python3 tamv-pack/scripts/validate-integrity.py
bash tamv-pack/scripts/validate-pack.sh
bash tamv-pack/scripts/test-scripts.sh
```

Para instalar en el proyecto destino:

```bash
bash /ruta/al/repositorio/tamv-pack/install.sh
```

El instalador debe solicitar consentimiento, validar antes de escribir, respaldar archivos reemplazados y registrar el resultado. El destino por defecto es `.agents/skills/`; puede cambiarse mediante `TAMV_SKILLS_DIR`. Revisa el diff después de instalar.

### Instalar desde un repositorio existente sin reemplazarlo

Usa una copia del paquete **fuera del proyecto destino**. No copies su `.git`,
`package.json`, `.env` ni configuración de la aplicación a tu proyecto.
Guarda primero tus cambios locales. Con Git Bash o Bash/WSL:

```bash
git clone https://github.com/AnubisVillasenor1/tamv-creator-intelligence.git /tmp/tamv-source
bash /tmp/tamv-source/tamv-pack/scripts/validate-pack.sh
bash /tmp/tamv-source/tamv-pack/scripts/test-scripts.sh
# En otra terminal, abierta en la raíz de TU proyecto existente:
bash /tmp/tamv-source/tamv-pack/install.sh
git diff -- README.md TAMV_ATTRIBUTION.md TAMV_GOVERNANCE.md
git status --short
```

Acepta únicamente después de revisar los contratos y scripts. Se instalan
`.agents/skills/`, `.tamv/pack.json`, atribución y gobernanza; el README del destino
solo recibe la atribución si no existe. Los archivos previos se respaldan en
`.tamv/backups/backup-XXXXXXXX`; el resultado queda en `.tamv/install.log`.
No se activa automáticamente ningún skill de Lovable ni se aprovisionan servicios.

### Actualizar y revertir una instalación existente

1. Guarda o confirma los cambios del **proyecto destino**, especialmente tus skills
   personalizados. No actualices mientras tengas modificaciones sin respaldo.
2. Obtén una copia nueva del repositorio del paquete en una carpeta separada; usa
   un tag o SHA revisado para fijar la versión. No hagas un pull del paquete dentro
   de un repositorio de otra aplicación.
3. Ejecuta `validate-pack.sh` y `test-scripts.sh` en esa copia; compara sus contratos
   con los instalados y revisa licencias y dependencias.
4. Desde el proyecto destino, ejecuta el instalador nuevo y acepta. Conserva la
   misma variable `TAMV_SKILLS_DIR` si elegiste una ruta distinta en la instalación
   original. El instalador crea un respaldo nuevo antes de reemplazar archivos.
5. Revisa el diff y prueba tu aplicación antes de confirmar cambios. Los skills
   retirados del nuevo catálogo no se borran automáticamente: revísalos aparte.

Para revertir, consulta la ruta `backup=` de la última instalación en
`.tamv/install.log`. Compara y restaura solo los archivos reemplazados desde ese
respaldo; los archivos creados por primera vez no tienen una copia anterior.
No restaures todo el repositorio ni elimines skills de terceros. En Windows,
ejecuta el instalador con Git Bash o WSL; PowerShell no ejecuta Bash directamente.

La revisión con IA permanece bloqueada si falta una sesión válida o la firma
oficial Ed25519 del release. Instalar los contratos no habilita esa capacidad.

## Desarrollo y pruebas

```bash
bun install --frozen-lockfile
bun run test
bun run lint
bun run tamv:check
bun run build
```

| Comando | Función |
|---|---|
| `bun run dev` | Desarrollo local. |
| `bun run test` | Pruebas Vitest. |
| `bun run lint` | ESLint. |
| `bun run build` | Comprueba integridad y compila; exige firma cuando `TAMV_CERTIFICATION_REQUIRED=true`. |
| `bun run tamv:check` | Verificación de certificación e inventario. |
| `bun run tamv:hash` | Recalcula hashes e invalida la firma anterior. |
| `bun run tamv:sign` | Firma el manifiesto con Ed25519. |
| `bun run tamv:verify` | Verifica hashes y exige firma válida. |
| `bun run tamv:keygen` | Genera un par Ed25519 local. |
| `bun run hooks:install` | Instala guardas Git locales sin sustituir una configuración de hooks existente. |
| `bun run hooks:test` | Prueba los hooks y el escáner del índice Git. |
| `bun run slsa:test` | Prueba los modos de verificación de atestaciones GitHub y procedencia SLSA offline. |

Para instalar guardas locales opcionales en este checkout, ejecuta `bun run hooks:install`; valida su sintaxis, instalación y regresiones con `bun run hooks:test`. `pre-commit` inspecciona el índice Git y el árbol de trabajo, hashes de certificación, inventario del pack y sintaxis Bash. `pre-push` ejecuta lint, pruebas y build. No sustituyen CI: pueden omitirse deliberadamente y la protección autoritativa debe mantenerse en GitHub.

Ejecuta también los validadores Python y Bash anteriores. Un comando aislado exitoso no acredita toda la cadena. Conserva SHA, logs y artefactos CI.

## Certificación y releases

El script `scripts/verify-slsa.sh` ofrece dos modos: verificación en línea de atestaciones GitHub (repo, workflow firmante, tag y SHA fuente explícitos) y verificación de procedencia offline con `slsa-verifier`. El modo GitHub requiere `GH_TOKEN` y `TAMV_SOURCE_DIGEST`; nunca acepta éxito simulado si falta una de esas precondiciones.

Cada mecanismo prueba algo diferente:

- **SHA-256:** compara los archivos con el manifiesto.
- **Ed25519:** verifica que el manifiesto canónico fue firmado por quien controla la clave privada asociada a la clave pública confiable.
- **SLSA:** aporta evidencia sobre cómo y desde qué fuente se construyó un artefacto; no se deduce de la firma.
- **SBOM:** inventaría dependencias, pero no demuestra ausencia de vulnerabilidades.
- **CI:** demuestra que controles concretos pasaron para un commit y entorno, no certificación universal.

Ciclo esperado: revisar el diff; validar catálogo, licencias e inventarios; recalcular hashes; invalidar firma anterior; firmar el manifiesto canónico; verificar con clave pública; ejecutar pruebas, lint, build y controles de seguridad; generar SBOM y atestación verificables; publicar artefacto, manifiesto, firma y evidencias juntos; verificar que producción ejecuta el artefacto publicado.

El workflow de release implementa un bundle con metadatos normalizados, checksum SHA-256, SBOM CycloneDX, atestación de procedencia y atestación SBOM; después verifica ambas contra el repositorio y la identidad del workflow. Está condicionado a un tag autorizado sobre main, secretos Ed25519 reales y permisos GitHub de atestación. La validación normal de PR no ejecuta ese workflow de release: no declares una release certificada hasta que el run del tag concluya correctamente.

La clave privada no debe aparecer en Git, logs, artefactos, frontend ni mensajes de error. Usa secretos protegidos o un servicio de firma auditado. No guardes la clave privada en el repositorio.

El marcador actual `UNSIGNED_RELEASE_PENDING` no puede convertirse en una firma mediante una variable de entorno o un cambio textual. Solo se acredita certificación cuando una firma real verifica el manifiesto exacto distribuido.

## Triple hardening

### Capa 1 — Integridad y cadena de suministro

- Manifiesto SHA-256, firma Ed25519 real y claves fuera de Git.
- Verificación de procedencia SLSA independiente.
- SBOM por release y análisis de vulnerabilidades.
- Dependencias fijadas, lockfile reproducible y revisión de cambios.
- Artefactos y evidencias vinculados al SHA del commit.

**Gate:** un artefacto alterado, sin firma o sin procedencia requerida no se publica como certificado.

### Capa 2 — Seguridad y ejecución

- Denegación por defecto ante fallos de integridad, procedencia, autenticación o autorización.
- Consentimiento específico y vigente cuando aplique.
- Límites de tamaño, tiempo, concurrencia y consumo en servidor.
- No registrar secretos ni datos sensibles.
- Rutas no implementadas con error explícito, nunca éxito simulado.
- Pruebas negativas, abuso, concurrencia, recuperación y aislamiento multi-tenant.
- Persistencia y cuotas distribuidas solo se declaran cuando existen y están probadas.

**Gate:** cada capacidad activa tiene responsable, contrato, autorización, pruebas, límites y evidencia operativa.

El endpoint /api/tamv/hypercore/metrics exige el encabezado Authorization: Bearer y el secreto de servidor TAMV_METRICS_TOKEN (mínimo 32 caracteres aleatorios). Si el secreto no está configurado, el endpoint devuelve 503; si falta o no coincide el token, devuelve 401. Mantén la variable fuera del cliente: no uses el prefijo VITE_. La plantilla .env.example la deja vacía de forma deliberada.

### Capa 3 — Calidad, gobernanza y evidencia

- Separar capacidades declaradas, contratadas, implementadas, probadas y operadas.
- Vincular obligaciones con controles y evidencias.
- Mantener claims de autoría, horas, impacto y validación en su nivel real.
- Revisar licencias, datos, voz, imagen, derechos y jurisdicciones.
- Registrar hallazgos, severidad, responsables, remediación y prueba de cierre.
- Sincronizar documentación con el código.

**Gate:** ninguna afirmación pública supera la evidencia reproducible del commit y entorno.

## Gobernanza de IA y derechos

Para cada capacidad registra propósito, responsable, datos de entrada, finalidad, base jurídica, retención, derechos, riesgos, supervisión humana, pruebas, incidentes y reversión.

Pueden usarse como referencias NIST CSF 2.0, NIST AI RMF, principios UNESCO y marcos legales aplicables. Esta referencia no implica aval, certificación ni cumplimiento automático; la aplicabilidad debe analizarse por jurisdicción, función, datos y relación contractual.

No generes ni distribuyas voces, interpretaciones, grabaciones, composiciones, imágenes o datos protegidos sin derechos o autorización suficientes. La atribución no sustituye el permiso del titular.

## Auditoría y evidencia

Consulta [`docs/audit/2026-11-13/`](docs/audit/2026-11-13/README.md) para el resumen, hallazgos, matriz de consistencia, registro de sesgos, modelo de amenazas, remediación e índice de evidencias.

Madurez por capacidad: `M0-declared → M1-contracted → M2-implemented → M3-tested → M4-operated → M5-audited`. El nivel se gana con evidencia. Para cada claim técnico conserva commit, prueba, entorno, resultado y limitaciones. Un DOI, repositorio o número de archivos no constituye por sí solo revisión por pares ni certificación externa.

```bash
node --experimental-strip-types tamv-genesis/cli/sovereign.mjs audit
node --experimental-strip-types tamv-genesis/cli/sovereign.mjs report
node --experimental-strip-types tamv-genesis/cli/sovereign.mjs packet
node --experimental-strip-types --test tamv-genesis/tests/*.test.ts
```

`packet` escribe `tamv-genesis/dist/review-packet.json`: scorecard, 19 claims con
qué los refutaría, 10 capacidades, ledger, 15 chequeos, hashes de los artefactos y
limitaciones explícitas. Está pensado para que un revisor externo verifique sin
confiar en la narrativa del autor; el protocolo y las preguntas difíciles están en
[`docs/ACADEMIC-EVALUATION.md`](docs/ACADEMIC-EVALUATION.md). La suite del kernel
son 39 pruebas en Node; el scorecard (58.6/100, grado D) se recomputa, no se
escribe a mano.

Verifica la versión de Node.js y archiva la salida con el SHA auditado.

## Perfiles, horas y validación académica

| Superficie | Rol declarado | Evidencia |
|---|---|---|
| [github.com/OsoPanda1](https://github.com/OsoPanda1) | TAMV ONLINE ENTERPRISE · CEO fundador Edwin O. Castillo Trejo | 144 repos públicos (foto 2026-11-13) |
| [github.com/AnubisVillasenor1](https://github.com/AnubisVillasenor1) | Arquitecto de sistemas y full-stack · ORCID `0009-0008-5050-1539` | 10 repos públicos |

Los perfiles son **autopublicados**: acreditan actividad y existencia, no calidad,
adopción ni horas. El inventario con límites está en [`docs/PROFILES.md`](docs/PROFILES.md).

Las **24,000 horas** se registran como claim autobiográfico `unverified`, no como
hecho. La procedencia es 19,000 h (2025-10-07) → >23,000 h → 24,000 h
(2026-11-13); el salto implica 12.4 h/día y no existe bitácora ni atestación
independiente. El ledger encadenado permite que la cifra suba de nivel cuando
exista evidencia T3/T4, sin reescribir la historia: hoy registra **0 horas
atestiguadas**.

La adopción, la popularidad y la infraestructura abierta **no obligan** a ninguna
institución a validar nada. Lo que este repositorio hace es **bajar el costo de
evaluar**: condiciones de refutación escritas, datos reproducibles, límites
declarados, paquete instalable e historial íntegro.

Eso **no vuelve falsable al sistema**. El marco, los pesos del scorecard y los
tiers los define este proyecto, y una auditoría interna no puede certificarse a sí
misma: mientras el criterio y la evidencia los administre el autor, el circuito
sigue cerrado. La refutación solo cuenta cuando la comprueba alguien fuera de él;
adoptar el marco no es evaluarlo. Cualquier texto que convierta la adopción en
validación académica —incluido un ranking— es marketing, no evaluación.

## Deuda técnica

La auditoría identifica tareas que no se cierran solo con documentación:

1. Release Ed25519 real validado de extremo a extremo.
2. Aplicar política de procedencia en runtime/despliegue cuando corresponda y comprobar la identidad del artefacto desplegado.
3. Integrar análisis de vulnerabilidades y política de bloqueo para dependencias; el workflow genera SBOM, pero eso no detecta ni elimina CVE por sí solo.
4. Ledger durable append-only con control de acceso, retención, integridad y recuperación.
5. Migraciones, políticas RLS y pruebas de aislamiento multi-tenant.
6. Cuotas distribuidas si hay múltiples instancias.
7. Gateways reales para capacidades no implementadas, con contratos y pruebas.
8. Los 37 contratos ya declaran entradas y salidas; falta que cada skill tenga procedimiento verificable y ejecutor cuando aplique.
9. Pruebas de carga, timeout, degradación, recuperación y failover.
10. Evidencia independiente para claims externos de autoría, actividad o impacto.

Prioriza por riesgo y dependencia, no por número de commits ni porcentajes sin método reproducible.

## Contribuciones y seguridad

Las contribuciones deben incluir problema, alcance, pruebas, riesgos, licencias y plan de reversión. Los cambios a archivos protegidos requieren regenerar hashes y revisar el diff; toda firma anterior queda invalidada.

Reporta vulnerabilidades por un canal privado verificado por los mantenedores. No publiques exploits ni secretos en issues. Las pruebas contra producción requieren autorización expresa.

No incluyas en commits, logs o artefactos archivos de recuperación, tokens, claves privadas, datos personales ni documentos que no puedan redistribuirse. Si una credencial se expone, revócala y rótala; borrar el archivo en un commit posterior no elimina el historial.

## Licencias

La licencia depende de los archivos de licencia vigentes y del mapa correspondiente al commit:

- Núcleo: [`LICENSE`](LICENSE).
- Alcance por rutas: [`LICENSE-MAP.md`](LICENSE-MAP.md).
- Avisos: [`NOTICE`](NOTICE) y [`ATTRIBUTION.md`](ATTRIBUTION.md).
- Activos comerciales: licencia específica y acuerdo firmado.
- Dependencias, modelos, datasets, voces y medios: conservan sus licencias.

La licencia de software no concede derechos de marca, imagen, voz, obras de terceros ni autorización para procesar datos personales. Ante dudas de titularidad o compatibilidad, detén la redistribución y solicita revisión jurídica.

## Gate de producción

- [ ] Revisión de código y alcance aprobada.
- [ ] Catálogo, manifiestos e inventarios sin divergencias.
- [ ] Firma Ed25519 válida sobre el manifiesto final.
- [ ] Clave pública confiable configurada en destino.
- [ ] Procedencia del artefacto verificada.
- [ ] SBOM generado y análisis de vulnerabilidades revisado.
- [ ] Pruebas, lint, build y seguridad aprobados para el SHA liberado.
- [ ] Pruebas fail-closed y de rutas no implementadas aprobadas.
- [ ] Autenticación, autorización, consentimiento, cuotas y límites probados.
- [ ] Persistencia, aislamiento, recuperación y observabilidad demostrados cuando apliquen.
- [ ] Secretos y variables de entorno revisados en el proveedor de despliegue.
- [ ] Rollback probado y evidencias archivadas.
- [ ] Licencias, datos y derechos revisados para los mercados objetivo.
- [ ] Comunicación pública ajustada a la evidencia.

Si un control crítico no está implementado o no puede verificarse, no se libera o se publica únicamente una versión limitada que mantenga deshabilitada esa capacidad.

**TAMV ONLINE NETWORK · PLAY & GO**

Proyecto impulsado con colaboración de tecnología latinoamericana TAMV ONLINE NETWORK Orgullosamente Realmontenses.
