# Publicar en skills.sh — estado y pasos

**Regla:** el catálogo se descubre desde el repositorio; la página del pack la
genera skills.sh cuando indexa el proyecto. No se puede «forzar» una listing ni
comprar adopción. Lo que sigue es lo que está listo y lo que depende de la cuenta.

## Lo que ya está listo (verificado en el repo)

| Requisito | Estado | Verificación |
|---|---|---|
| 37 `SKILL.md` con `name` y `description` en YAML | ✅ | `node tamv-pack/scripts/normalize-skill-frontmatter.mjs --check` |
| `name` único e igual al nombre de carpeta | ✅ | prueba `all 37 skills carry discoverable frontmatter` |
| `skills.sh.json` con la ruta del catálogo | ✅ | `{"paths":["./tamv-pack/skills"]}` |
| Instalación en `.agents/skills/` | ✅ | `tamv-pack/install.sh` |
| Licencia declarada por skill | ✅ | `license: AGPL-3.0-only` en el frontmatter |
| Instalación reproducible por CLI | ✅ | `npx skills add . --list` → «Found 37 skills» (CLI 1.8.1, 2026-11-13) |
| Descubrimiento desde el remoto público | ✅ | `npx skills add AnubisVillasenor1/tamv-creator-intelligence --list` clona el repo y encuentra 37 skills |
| Instalación real en un proyecto | ✅ | 37 carpetas en `.agents/skills/` + `skills-lock.json` (prueba funcional en un directorio temporal, 2026-11-13) |
| Página del pack en skills.sh | ⏳ | `https://skills.sh/anubisvillasenor1/tamv-creator-intelligence` → 404 el 2026-11-13; pendiente de indexación |

## Lo que depende de una cuenta (no ejecutado aquí)

1. **Publicar el repositorio** en `main` (hecho por el propietario).
2. **Verificar el descubrimiento** con el CLI oficial:

   ```bash
   npx skills add AnubisVillasenor1/tamv-creator-intelligence --list
   npx skills find tamv
   ```

3. **Instalar una skill de prueba** en un proyecto vacío y comprobar que aparece
   en `.agents/skills/<nombre>/SKILL.md`. Ya se ejecutó como prueba funcional en
   un directorio temporal: 37 carpetas instaladas y `skills-lock.json` generado.
   Esa instalación es verificación, no una campaña de adopción. La primera
   instalación real es la que dispara la sincronización del pack y la auditoría
   de seguridad de skills.sh.
4. **Esperar la indexación.** skills.sh ordena por telemetría anónima de
   instalación; la página del pack y el badge
   `https://skills.sh/b/AnubisVillasenor1/tamv-creator-intelligence` existen
   cuando el directorio ha indexado el repositorio. No hay formulario de «pack»
   que sustituya ese paso. Al 2026-11-13 la página devuelve 404 y el badge
   devuelve «resource not found»: no se añadió al README.
5. **Badge (solo cuando la página exista).** Añadir al README:

   ```markdown
   [![skills.sh](https://skills.sh/b/AnubisVillasenor1/tamv-creator-intelligence)](https://skills.sh/AnubisVillasenor1/tamv-creator-intelligence)
   ```

   No se añadió antes para no publicar un enlace muerto.

## Lo que no se hará

- Comprar estrellas, instalaciones ni reseñas.
- Crear cuentas o repositorios duplicados para inflar el ranking.
- Declarar «validado» o «certificado» lo que el runtime mantiene bloqueado.
- Presentar la listing como validación académica: es distribución.

## Criterio de éxito realista

| Horizonte | Señal |
|---|---|
| Día 1 | `npx skills add` descubre 37 skills y una instala correctamente |
| Semana 1 | Al menos un proyecto externo reporta uso; issues atendidos |
| Mes 1 | Página del pack indexada; instalaciones verificables sin incentivos |
| Trimestre | Adopción sostenida y evidencia de uso, no picos artificiales |

La adopción es una señal de utilidad, no una prueba de corrección ni de mérito
académico. Se documenta como tal.
