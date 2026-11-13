# Las 24,000 horas — ledger de trabajo

**Estado: `unverified`.** No es un rechazo. Es la única clasificación honesta
mientras no exista una bitácora y un tercero que la firme.

## Cadena de procedencia

| Fecha | Cifra | Fuente | Tier | Estado |
|---|---:|---|---|---|
| 2025-10-07 | 19,000 h | Blog «Un llamado de apoyo para el WEF» | T1 | `declared-published` |
| sin fecha registrada | >23,000 h | Material del autor | T1 | `declared` |
| 2026-11-13 | 24,000 h | Declaración directa para esta auditoría | T0/T1 | `declared` |

La cadena es monótona y fechada. Su integridad se verifica con SHA-256 sobre cada
entrada; alterar una hora rompe la cabeza de cadena.

## Denominadores

| Ventana | Periodo | Horas | Años | h/día | h/semana |
|---|---|---:|---:|---:|---:|
| W-A | 2020-01-01 → 2026-11-13 | 24,000 | 6.87 | 9.57 | 67.0 |
| W-B | 2014-01-01 → 2026-11-13 | 24,000 | 12.87 | 5.11 | 35.7 |
| W-C | 2025-10-07 → 2026-11-13 | 5,000 | 1.10 | 12.41 | 86.8 |

Tres lecturas posibles, tres exigencias distintas:

- Si el conteo empieza en 2020, la cifra exige **9.6 h/día sin un solo día libre**
  durante casi siete años. Posible, pero requiere método.
- Si empieza en 2014, exige **5.1 h/día**, una jornada parcial sostenida. Es la
  lectura más plausible.
- El salto de 19,000 a 24,000 en 403 días exige **12.4 h/día** en ese periodo.
  Es el tramo que más necesita evidencia.

Ninguna lectura prueba falsedad. Las tres prueban que **la cifra sin método no es
auditable**.

## Lo que un artefacto sí prueba

| Artefacto | Prueba | No prueba |
|---|---|---|
| Grafo de commits y PRs | Actividad en fechas concretas | Horas trabajadas |
| 22 hashes de certificación | Integridad de los archivos | Autoría ni dedicación |
| PDFs y blogs | Existencia y coherencia del relato | Veracidad de la cifra |
| DOI | Preservación de un documento | Revisión por pares |
| Repositorios públicos | Volumen de publicación | Calidad ni adopción |

## Protocolo de atestación (T3)

Para mover 24,000 h de `unverified` a `corroborated` o `verified`:

1. **Bitácora por periodos.** Registro diario o semanal, con fecha, duración y
   actividad. Puede ser reconstruido, pero debe declararse como reconstrucción.
2. **Método de conteo.** Qué cuenta como hora (desarrollo, investigación,
   despliegue, soporte) y qué no.
3. **Muestra verificable.** Al menos tres periodos de 30 días, elegidos por el
   atestador, contrastados con commits, issues, facturas o testimonios.
4. **Tercero identificable.** Nombre, rol, relación con el autor y conflicto de
   interés declarado.
5. **Declaración publicada.** Qué revisó, qué encontró, qué no pudo verificar y
   con qué límites.
6. **Repetición.** Otro revisor debe poder repetir el ejercicio con los mismos
   artefactos.

Sin los seis, la cifra permanece `unverified`. La atestación no requiere que el
total sea exacto: requiere que el método sea inspeccionable.

## Por qué no se convierten artefactos en horas

Sería fácil asignar «1 commit = 2 horas» o «1 PDF = 40 horas» y producir un número
más alto. Sería fabricación. El ledger registra **cero horas acreditadas por
artefactos** y muestra `unattested-hours` como hallazgo, no como error del código.
Ese es el punto: el sistema debe incomodar cuando la evidencia no alcanza.

## Estado actual

- Horas declaradas: **24,000**
- Horas con atestación independiente: **0**
- Entradas de cadena: **7**
- Cabeza de cadena: `sha256:26b88c85…` (ver `data/work-ledger.json`)
- Hallazgo abierto: `unattested-hours`
- Compuerta: **G6** (no bloquea el producto; bloquea el claim)
