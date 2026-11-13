# Auditoría TAMV Creator Intelligence — 2026-11-13

**Objeto:** `AnubisVillasenor1/tamv-creator-intelligence`, commit base `92a931f`.
**Alcance:** código, gobernanza, cadena de suministro, licencia, claims públicos,
corpus local del autor (1,9 GB de documentación y perfiles públicos).
**Método:** revisión adversarial de artefactos, recomputación de hashes, pruebas
ejecutables y clasificación epistémica de cada afirmación. Lo que no se pudo
probar se marca como declarado, no se infiere.

## Documentos

| Documento | Contenido |
|---|---|
| [EXECUTIVE-SUMMARY.md](EXECUTIVE-SUMMARY.md) | Veredicto, hallazgos principales y qué cambió |
| [FINDINGS.md](FINDINGS.md) | 25 hallazgos con severidad, evidencia y estado |
| [BIAS-REGISTER.md](BIAS-REGISTER.md) | Sesgos del proyecto y del propio auditor |
| [CONSISTENCY-MATRIX.md](CONSISTENCY-MATRIX.md) | Identidad, versión, licencia, capacidades, cifras |
| [WORK-LEDGER.md](WORK-LEDGER.md) | Las 24,000 horas: cadena, denominadores y protocolo |
| [THREAT-MODEL.md](THREAT-MODEL.md) | Activos, actores, abusos y controles |
| [REMEDIATION.md](REMEDIATION.md) | Plan por compuertas con criterios de aceptación |
| [EVIDENCE-INDEX.md](EVIDENCE-INDEX.md) | Artefactos, hashes y comandos reproducibles |
| [GENERATED.md](GENERATED.md) | Tablas recomputadas por el CLI (no editar) |

## Reglas de la auditoría

1. **Separación de planos.** Conocimiento, recomendación, decisión, autoridad y
   ejecución se evalúan por separado. Un documento que describe una capacidad no
   prueba que exista.
2. **Techo de evidencia.** Cada claim tiene un techo T0–T4. La longitud de una
   cadena de documentos autopublicados no la vuelve independiente.
3. **Independencia real.** Una respuesta de IA, un DOI o un repositorio propio no
   son auditoría. Se registran como T1.
4. **Falsabilidad.** Todo claim debe declarar qué lo refutaría. Sin esa frase, se
   degrada a `declared`.
5. **Reproducibilidad.** Los números del informe se recomputan con
   `node --experimental-strip-types tamv-genesis/cli/sovereign.mjs report`.

## Cómo reproducir

```bash
git clone https://github.com/AnubisVillasenor1/tamv-creator-intelligence
cd tamv-creator-intelligence
node --experimental-strip-types tamv-genesis/cli/sovereign.mjs audit
node --experimental-strip-types tamv-genesis/cli/sovereign.mjs report
node --experimental-strip-types --test tamv-genesis/tests/*.test.ts
node scripts/tamv-certification.mjs --check
```

## Límites

- No hubo acceso a registros privados de plataformas, facturación, contratos,
  cuentas de correo ni bitácoras horarias.
- El corpus local se leyó como evidencia documental; no se verificó cada PDF
  contra su fuente original en línea.
- Las cifras de adopción de GitHub se tomaron como foto del 2026-11-13; cambian.
- Esta auditoría no es un dictamen legal, fiscal, académico ni de seguridad
  formal. Es una evaluación técnica adversarial y reproducible.
