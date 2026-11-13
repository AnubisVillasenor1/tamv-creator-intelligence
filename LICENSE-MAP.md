# TAMV Creator Intelligence — License Map

**Estado:** control documental provisional; no constituye dictamen jurídico ni concede derechos adicionales.  
**Fecha:** 2026-11-13. **Titular institucional declarado:** TAMV ONLINE NETWORK.

## 1. Regla de interpretación
La licencia aplicable se determina por el archivo, su historial, los avisos, las contribuciones y las dependencias incorporadas. Este mapa no sustituye el texto íntegro de una licencia ni cambia derechos ya concedidos. Ante contradicciones, detener la distribución afectada y solicitar revisión jurídica.

## 2. Estado documental observado

| Ámbito | Estado observado | Control requerido |
|---|---|---|
| tamv-pack/** | Existe tamv-pack/LICENSE, cuyo texto permite AGPL v3 o posterior y añade una reserva para módulos comerciales | Revisar alcance, texto íntegro y compatibilidad de la reserva con cada archivo |
| src/** | No se identificó una licencia raíz en main al elaborar este mapa | No declarar que todo el código está cubierto por AGPL sin confirmar titularidad y licencia |
| docs/** | No existe una declaración general comprobada de CC BY 4.0 | No aplicar CC BY por defecto; revisar derechos y material de terceros |
| scripts/** | No se acreditó una licencia Apache-2.0 general | No asignar Apache-2.0 hasta aprobarlo y añadir su texto íntegro |
| assets, modelos, pesos y datasets | Pueden tener derechos, términos de proveedor y restricciones diferentes | Inventario por activo, procedencia, consentimiento y licencia de origen |
| Dependencias externas | Conservan sus propias licencias y avisos | SBOM, compatibilidad, avisos, patentes y restricciones de modelos |

## 3. Modelo híbrido propuesto — pendiente de aprobación
- Núcleo y componentes de red: evaluar AGPL-3.0-only frente a AGPL-3.0-or-later; seleccionar una opción después de revisar contribuciones y compatibilidad.
- Conectores independientes: evaluar Apache-2.0 archivo por archivo.
- Documentación: evaluar CC BY 4.0 solo para contenido original elegible; excluir código, marcas, datos y contenido de terceros salvo autorización.
- Modelos, pesos, datasets, voz, música, imágenes y otros activos: licencia específica por artefacto; la licencia del código no concede derechos sobre ellos.
- Activos comerciales: acuerdo escrito separado que identifique activos, alcance, duración, territorio y derechos concedidos. LicenseRef-TAMV-Commercial-1.0 es solo un identificador interno sugerido, no una licencia SPDX estándar aprobada.

## 4. Condiciones de aprobación
- [ ] Confirmar titularidad y cadena de derechos.
- [ ] Revisar contribuciones, historial Git y acuerdos.
- [ ] Inventariar dependencias, modelos, datasets, samples, voces y recursos gráficos.
- [ ] Decidir por componente si aplica only u or-later.
- [ ] Incluir los textos íntegros de las licencias aprobadas.
- [ ] Añadir identificadores SPDX precisos y NOTICE cuando corresponda.
- [ ] Revisar compatibilidad entre código, modelos, servicios y SaaS.
- [ ] Validar que términos comerciales no contradigan licencias abiertas ya concedidas.
- [ ] Obtener aprobación del titular y revisión de abogado competente.
- [ ] Automatizar detección de archivos sin licencia y avisos faltantes.

Una licencia no concede por sí sola derechos de marca, imagen, voz, privacidad, datos personales, patentes de terceros o uso de obras incorporadas.

**Atribución:** Proyecto impulsado con colaboración de tecnología latinoamericana — TAMV ONLINE NETWORK — Orgullosamente Realmontenses.
