# TAMV Creator Intelligence — License Map

**Estado:** mapa vigente al 2026-11-13. No constituye dictamen jurídico.
**Titular institucional declarado:** TAMV ONLINE NETWORK.
**Licencia del núcleo:** AGPL-3.0-only (SPDX), texto íntegro en `LICENSE`.
**Aviso:** `NOTICE` aclara que el apéndice "or later" del texto estándar es un
ejemplo de la FSF y no la elección del proyecto.

## 1. Regla de interpretación

La licencia aplicable se determina por archivo, historial, avisos, contribuciones
y dependencias. Ante una contradicción, se detiene la distribución afectada y se
revisa antes de publicar. Una licencia de código no concede derechos sobre marcas,
voz, imagen, datos personales, modelos, pesos ni obras de terceros.

## 2. Zonas del repositorio

| Zona | Licencia | Estado |
|---|---|---|
| `src/**` | AGPL-3.0-only | Cubierta por `LICENSE` raíz y este mapa |
| `tamv-pack/**` | AGPL-3.0-only | Texto íntegro en `tamv-pack/LICENSE`, idéntico al raíz |
| `scripts/**`, `hypercore/**` | AGPL-3.0-only | Cubiertas por `LICENSE` raíz |
| `tamv-genesis/**` | AGPL-3.0-only | Kernel de auditoría; datos y esquemas incluidos |
| `docs/audit/**` | AGPL-3.0-only | Documentación técnica del repositorio |
| `tamv-genesis/data/knowledge-sources.json` | AGPL-3.0-only (metadatos) | Catálogo, no copia del corpus |
| Corpus local externo | Términos propios por documento | **No distribuido**; ver `NOTICE` |
| Módulos marcados `LicenseRef-TAMV-Commercial-1.0` | Comercial TAMV | Requiere acuerdo escrito |
| Marcas y activos de marca | Reservados | No concedidos por AGPL |

## 3. Compatibilidad

- AGPL-3.0-only es incompatible con importar código Apache-2.0 al núcleo sin
  revisión; los conectores Apache-2.0 deben permanecer como procesos separados.
- El corpus con CC BY 4.0 documental y Apache 2.0 declarado (por ejemplo
  `ISABELLA_CERO_RISK_BASED_AUTOMATION_V2.md`) se cita como evidencia y **no** se
  incorpora al árbol distribuible.
- Las dependencias npm conservan sus licencias; su inventario pertenece al SBOM,
  todavía pendiente (compuerta G5).

## 4. Condiciones pendientes

- [x] Declarar una única licencia para el núcleo.
- [x] Incluir el texto íntegro de la licencia.
- [x] Publicar `NOTICE` y este mapa.
- [ ] Añadir cabeceras SPDX a los archivos del núcleo.
- [ ] Generar SBOM y verificar compatibilidad de dependencias.
- [ ] Confirmar titularidad de contribuciones y activos.
- [ ] Revisión legal independiente antes de un release comercial.

**Atribución:** Proyecto impulsado con colaboración de tecnología latinoamericana
TAMV ONLINE NETWORK Orgullosamente Realmontenses.
