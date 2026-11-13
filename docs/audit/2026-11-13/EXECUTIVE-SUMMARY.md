# Resumen ejecutivo

**Veredicto: 58.6/100 · grado D · integridad de origen verificable, ejecución
incompleta.** No es un release de producción y el propio repositorio ya lo dice:
la firma Ed25519 está pendiente y cuatro capacidades responden `501`.

El proyecto tiene una virtud poco común: **falla cerrado y admite lo que no
hace**. La certificación de atribución recomputa 22 hashes y bloquea todo si uno
falla. El README declara el estado no certificado. Eso es una base seria. Lo que
falta no es narrativa: es ejecución verificable.

## Lo que resistió la auditoría

- Los 22 hashes del manifiesto coinciden y el runtime de certificación bloquea
  capacidades si el release no está firmado.
- El paquete declara 37 skills, hay 37 carpetas y 37 ids sin duplicados.
- La política de gobernanza es deny-by-default, con consentimiento por capacidad,
  límites de concurrencia y separación de autoridad de firma.
- El corpus de trazabilidad del propio autor distingue con honestidad entre
  testimonio autobiográfico y verificación independiente.

## Los siete hallazgos que más pesan

1. **Release sin firma.** `UNSIGNED_RELEASE_PENDING` deshabilita toda capacidad
   premium. Es honesto, pero significa que hoy el producto no puede operar.
2. **Sin ledger durable.** La política exige auditoría append-only encadenada;
   `drizzle/schema.ts` está vacío. La promesa vive solo en el documento.
3. **Revisión creativa sin autenticación de servidor.** Cualquiera podía invocar
   el gasto de AI Gateway. Se corrigió con Supabase Auth, cuota por usuario,
   límite de concurrencia y timeout; la cuota sigue siendo por proceso.
4. **Vocabulario de capacidades partido.** `voice.generate` vs `voice.generation`
   y `agent.execute` vs `agent.orchestration`. Se unificó y ahora un chequeo de
   deriva lo impide.
5. **Sobreafirmación de skills.** «37 skills conectados» cuando existe un ejecutor
   real y 34 contratos base con texto de relleno. La interfaz ya no lo afirma.
6. **Cadena de suministro incompleta.** Sin SBOM, sin attestation SLSA en CI,
   acciones fijadas por etiqueta mayor y release sin firma.
7. **Licencia ambigua.** El núcleo no tenía `LICENSE` raíz y el texto del paquete
   decía «o posterior» mientras el manifiesto decía `AGPL-3.0-only`. Se añadió el
   texto íntegro, `NOTICE` y un mapa por zona.

## Las 24,000 horas

Se tratan como **claim autobiográfico no verificado**, no como hecho. La cadena
pública es 19,000 h (7 oct 2025) → «más de 23,000 h» → 24,000 h (13 nov 2026).
Los denominadores son exigentes: 9.6 h/día sin días libres desde 2020, o 5.1
h/día desde 2014. El delta reciente implica 12.4 h/día durante 403 días.

Nada de eso demuestra que la cifra sea falsa. Demuestra que **no es verificable
con la evidencia actual**. El paquete incluye un protocolo de atestación T3 y un
ledger encadenado por hash para que, cuando exista una bitácora y un tercero que
la firme, la cifra pueda subir de nivel sin reescribir la historia.

## Sobre la validación académica

La adopción y la infraestructura abierta **no obligan** a una institución a
validar nada: la validación se otorga con método, evidencia y revisión. Lo que sí
se puede hacer —y se hizo— es reducir el costo de evaluar: claims falsables,
datos reproducibles, límites declarados, paquete instalable y una cadena de
evidencia que un revisor puede recomputar en minutos. La autoridad académica se
convence con evidencia verificable, no con presión.

## Qué cambió en esta entrega

- Paquete **TAMV GENESIS Ω v2.0.0** con kernel de evidencia, CLI, pruebas y datos.
- 38 pruebas ejecutables (`node --test`) y 15 chequeos de soberanía.
- Panel `/sovereignty` y API `/api/tamv/genesis` de solo lectura.
- Corrección de autenticación/cuota, vocabulario, versión, enlaces, errores,
  licencia, instalación y frontmatter de los 37 skills.
- `skills.sh.json` para que `npx skills add AnubisVillasenor1/tamv-creator-intelligence`
  descubra el catálogo.

## Qué falta antes de decir «listo»

Firma del release, ledger durable, SBOM, pruebas de carga y failover, contratos
de skill completos y una atestación independiente de horas. Sin esas seis cosas,
cualquier afirmación de producción o de validación académica sería prematura.
