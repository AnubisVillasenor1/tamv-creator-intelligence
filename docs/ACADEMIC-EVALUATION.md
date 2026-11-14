# Kit de evaluación académica

**Qué es:** un conjunto de artefactos para que una persona o institución externa
pueda evaluar el trabajo en menos de una hora, sin pedir acceso al repositorio ni
depender de la narrativa del autor.

**Qué no es:** una validación, un aval, una revisión por pares ni una certificación.
La validación académica la otorga quien evalúa, con su propio método y sus propios
criterios. Este kit solo reduce el costo de evaluar. No la exige, no la compra y no
la presume.

---

## 1. Regla de juego

| Afirmación | Estado |
|---|---|
| «Este repositorio está validado académicamente» | **Falso.** No existe tal validación. |
| «Este repositorio es evaluable de forma reproducible» | **Cierto.** Scorecard, claims y hashes se recomputan. |
| «La adopción en skills.sh demuestra mérito académico» | **Falso.** La adopción mide uso, no corrección. |
| «El autor declara 24,000 horas de trabajo» | **Cierto como declaración**, `unverified`. |
| «Un tercero puede refutar cada claim» | **Cierto.** Cada claim declara qué lo refutaría. |

Cualquier texto que convierta la primera fila en cierta —incluido este documento—
debe tratarse como error.

---

## 2. Qué recibe el revisor

Ejecutar:

```bash
node --experimental-strip-types tamv-genesis/cli/sovereign.mjs packet
```

Genera `tamv-genesis/dist/review-packet.json`, que contiene:

- identidad declarada, repositorio y atribución canónica;
- scorecard completo con pesos, puntajes, evidencia y siguiente punto;
- los 19 claims con estado declarado, estado efectivo, evidencias e independencia;
- las 10 capacidades con madurez declarada, madurez lograda y bloqueos;
- el ledger de trabajo: cadena, ventanas, atestaciones y horas independientes;
- el estado de certificación (hashes válidos, firma ausente);
- los 15 chequeos de soberanía con su detalle;
- los comandos exactos para reproducir cada número;
- una lista explícita de limitaciones.

El paquete **no incluye** el corpus externo, borradores, credenciales ni datos
personales. Los artefactos se referencian por ruta y SHA-256.

Orden de regeneración: primero `node scripts/tamv-certification.mjs
--update-hashes`, después `packet`. Si se invierte, el paquete conserva hashes de
la versión anterior del manifiesto y la comprobación falla (correctamente).

---

## 3. Protocolo de evaluación (menos de una hora)

| Paso | Tiempo | Acción | Resultado esperado |
|---|---:|---|---|
| 1 | 2 min | Clonar el repositorio y leer `README.md` | Entiende qué existe y qué no |
| 2 | 3 min | `node scripts/tamv-certification.mjs --check` | 22 hashes válidos; aviso de release sin firma |
| 3 | 3 min | `…/sovereign.mjs audit` | 15 chequeos; falla la firma, advierte contratos/ledger |
| 4 | 5 min | `…/sovereign.mjs packet` | Paquete de revisión con hashes |
| 5 | 5 min | `node --experimental-strip-types --test tamv-genesis/tests/*.test.ts` | 39 pruebas en verde |
| 6 | 10 min | Revisar `docs/audit/2026-11-13/FINDINGS.md` | 25 hallazgos con estado y evidencia |
| 7 | 10 min | Revisar `WORK-LEDGER.md` y el claim C-001 | La cifra de horas es `unverified` |
| 8 | 10 min | Inspeccionar una capacidad, por ejemplo `creator.review` | Auth, cuota, timeout y fail-closed |
| 9 | 5 min | Contrastar 3 claims con su evidencia | Techos T0–T4 respetados |
| 10 | 5 min | Emitir juicio con criterios propios | Informe del revisor, no del autor |

Si algún paso no se reproduce, ese es el hallazgo. El repositorio debe fallar de
forma visible, no defender el resultado.

---

## 4. Criterios que un revisor puede aplicar

| Dimensión | Pregunta | Evidencia disponible |
|---|---|---|
| Coherencia | ¿Lo declarado coincide con lo ejecutable? | 10 capacidades, 3 ejecutables, 7 bloqueadas |
| Falsabilidad | ¿Cada claim dice qué lo refutaría? | 19/19 claims con `whatWouldChangeIt` |
| Reproducibilidad | ¿Los números se recomputan? | Scorecard 58.6/D recalculado por CLI |
| Integridad | ¿Se detecta una alteración? | 22 hashes; prueba de manipulación del ledger |
| Gobernanza | ¿La política se aplica en runtime? | Allowlist, consentimiento, `501` en lugar de simulación |
| Límites | ¿Se declara lo que falta? | Firma, ledger durable, SBOM, RLS, atestación |
| Ética | ¿Hay contenido o mecánicas de manipulación? | Corpus restringido excluido; sin métricas infladas |
| Originalidad | ¿Qué es aporte propio y qué es dependencia? | `LICENSE-MAP`, perfiles y catálogo por hash |

**No se pide** que el revisor acepte la cosmovisión del autor, el marco «TAMV» ni
la cifra de horas. Se le pide evaluar los artefactos.

---

## 5. Preguntas difíciles y respuestas actuales

| Pregunta | Respuesta honesta |
|---|---|
| ¿Está certificado el release? | No. Firma Ed25519 pendiente. |
| ¿Funcionan las 37 skills? | Son 37 contratos; una capacidad de IA está implementada. |
| ¿De dónde salen las 24,000 horas? | Declaración del autor, sin bitácora ni atestación. |
| ¿Hay auditoría independiente? | No. Hay auditoría adversarial interna reproducible. |
| ¿Qué pasa si un claim es falso? | Se marca `contradicted` y se conserva el historial. |
| ¿Se puede usar comercialmente? | AGPL-3.0-only; módulos marcados requieren acuerdo aparte. |
| ¿Hay datos personales? | El catálogo excluye material restringido y no distribuye corpus. |
| ¿Por qué debería evaluarlo? | Porque el artefacto es verificable y declara sus límites. No por presión. |

---

## 6. Qué contaría como validación (y qué no)

| Acto | ¿Es validación académica? |
|---|---|
| Instalar el pack y usarlo | No. Es adopción. |
| Dar una estrella o recomendarlo | No. Es una señal social. |
| Publicar un blog elogiándolo | No. Es opinión. |
| Una revisión por pares con método declarado | **Sí**, en el alcance de esa revisión. |
| Un dictamen institucional con criterios públicos | **Sí**, en el alcance de ese dictamen. |
| Una auditoría técnica independiente | **No es académica**, pero es evidencia T4. |

---

## 7. Invitación neutral a evaluar

> Estimado/a revisor/a:
>
> Pongo a su disposición el repositorio `AnubisVillasenor1/tamv-creator-intelligence`
> y su paquete de evaluación (`tamv-genesis/dist/review-packet.json`). El material
> declara explícitamente lo que no está verificado, incluido el release sin firma y
> las 24,000 horas como claim autobiográfico.
>
> Le solicito, si lo considera pertinente, una evaluación con sus propios criterios.
> No solicito un resultado favorable: solicito que el método y los hallazgos queden
> registrados. Cualquier corrección será incorporada con su atribución o mantenida
> como desacuerdo documentado.
>
> Atentamente,
> Edwin Oswaldo Castillo Trejo · TAMV ONLINE NETWORK
> ORCID `0009-0008-5050-1539`

Esta carta no debe enviarse como presión ni en campaña masiva. Una invitación sin
capacidad de evaluación es spam; con evidencia, es una solicitud legítima.

---

## 8. Cómo citar

```text
Castillo Trejo, E. O. (2026). TAMV Creator Intelligence (TAMV GENESIS Ω v2.0.0)
[Software]. TAMV ONLINE NETWORK. https://github.com/AnubisVillasenor1/tamv-creator-intelligence
ORCID: https://orcid.org/0009-0008-5050-1539
```

La cita acredita la existencia del artefacto. No implica que una institución lo
haya validado.

---

## 9. Límites del kit

- No sustituye una revisión por pares ni un comité de ética.
- No incluye datos privados, contratos ni bitácoras horarias.
- No certifica seguridad, cumplimiento legal ni calidad del modelo.
- No garantiza que el revisor llegue a una conclusión favorable.
- Su valor es hacer que la evaluación sea barata, no obligatoria.

**Atribución:** Proyecto impulsado con colaboración de tecnología latinoamericana TAMV ONLINE NETWORK Orgullosamente Realmontenses.
