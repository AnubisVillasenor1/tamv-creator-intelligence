# Perfiles públicos — inventario y límites

**Foto:** 2026-11-13, vía API pública de GitHub. Las cifras cambian; el método no.
Este documento describe lo que los perfiles **muestran**, no lo que prueban.

## Resumen

| Perfil | Repos públicos | Originales | Forks | Estrellas | Forks recibidos | Primer repo |
|---|---:|---:|---:|---:|---:|---|
| [`OsoPanda1`](https://github.com/OsoPanda1) | 144 | 104 | 40 | 4 | 8 | 2024-04-23 |
| [`AnubisVillasenor1`](https://github.com/AnubisVillasenor1) | 10 | 9 | 1 | 0 | 0 | 2026-10-23 |

`AnubisVillasenor1` se creó el **2026-10-16**; el repositorio más antiguo data del
2026-10-23. Es un perfil nuevo, no un historial de una década.

## OsoPanda1 — 144 repositorios

Perfil institucional: «TAMV ONLINE ENTERPRISE · TAMV ONLINE NETWORK. Pioneros en
tecnología Latinoamericana. Orgullosamente Mexicanos. CEO Fundador Edwin O.
Castillo Trejo». Creado el 2022-12-10.

**Composición de los 104 originales:**

| Grupo | Repos | Ejemplos |
|---|---:|---|
| TAMV / ISABELLA / metaverso | 59 | `ISABELLA-VERSION-TERMINUS-V6`, `isabella-s-genesis-ai`, `tamvonline-weboficial.com` |
| Turismo y territorio | 16 | `visitarealdelmonte`, `rdm-live-web`, `WEBINSTITUCIONAL-TAMVONLINE` |
| Educación y música | 2 | `curso-musica-tamvonline`, `interfaz-curso-musica-ai-18` |
| Telegram, bots y scraping | 3 | `SkyNet-Userbot`, `IronBlood_Userbot`, `ELTERRORDETELEGRAM` |
| Otros / utilidades | 24 | plantillas, pruebas, repos vacíos o de un solo archivo |

**Datos que importan:**

- **72 de los 104 originales se crearon en 2026.** El volumen es reciente y
  concentrado, no una producción distribuida en años.
- **100 de los 104 originales tienen 0 estrellas.** El total del perfil es 4
  estrellas y 8 forks recibidos.
- **40 repositorios son forks de terceros**, no obra propia: userbots de Telegram
  (`Ultroid`, `PyroMan-Userbot`, `ZAID-USERBOT`), scrapers (`TeleGram-Scraper`,
  `instagram-scraper`), herramientas de baneo masivo y utilidades ajenas
  (`conda`, `RSSHub`, `remark-lint`). Varios describen capacidades de vigilancia,
  scraping o acceso remoto (`DogeRat`, `telegram-reverse-shell-lib`).
  **No se incluyen en este paquete** y no se presentan como contribución.
- Lenguajes dominantes: TypeScript (76), sin lenguaje declarado (10), Python (5),
  HTML (4).

**Lectura correcta:** 144 repositorios acreditan **actividad de publicación**. No
acreditan calidad, adopción, autoría de los forks ni horas. Un fork no es un
proyecto propio; una estrella no es una revisión.

## AnubisVillasenor1 — 10 repositorios

Perfil profesional: «Arquitecto de Sistemas & Full-Stack. Liderando METAVERSO TAMV
y arquitecturas de soberanía digital. ORCID: 0009-0008-5050-1539».

| Repositorio | Rol |
|---|---|
| `tamv-creator-intelligence` | Este repositorio |
| `TAMV-Online-Network-Creator-Intelligence-Pack-` | Nombre anterior del pack |
| `play-and-go` | Producto educativo/musical |
| `ISABELLA-VERSION-TERMINUS-V6` | Fork del mismo proyecto en el otro perfil |
| `xclusive-by-TAMV-Online` | Vertical de contenido para adultos (excluida del paquete) |
| `elegancia-nica`, `anubisVillasenor1`, `compilacion-isabella`, `proyecto-isabella-cero`, `create-isabella-ai-do` | Portafolio y variantes |

## Identidad

| Dato | Valor | Fuente |
|---|---|---|
| Nombre legal declarado | Edwin Oswaldo Castillo Trejo | Perfiles y corpus |
| Alias | Edwin O. Castillo Trejo | Bio de `OsoPanda1` |
| Handles | `OsoPanda1`, `AnubisVillasenor1` | GitHub |
| ORCID | `0009-0008-5050-1539` | Perfil público |
| Organización | TAMV ONLINE NETWORK | `pack.json`, `identity.json` |
| Origen | Real del Monte (Mineral del Monte), Hidalgo, México | Corpus y perfil institucional |

La identidad está **declarada**, no vinculada criptográficamente: ningún perfil
prueba por sí mismo que ambos handles sean la misma persona, aunque el contenido y
las bio lo declaren. `tamv-genesis/data/identity.json` registra los handles y la
atribución canónica.

## Qué no se incluye

- **XCLUSIVE** (contenido para adultos): solo se usa como caso de arquitectura de
  gobernanza, derechos y cumplimiento. No se reproduce contenido.
- **Material de recuperación de cuentas**: excluido y marcado P0 (F-02). Si algún
  archivo con credenciales estuvo expuesto, debe rotarse; borrarlo después no
  limpia el historial.
- **Forks de terceros**: no se copian ni se relicencian.
- **Corpus con CC BY 4.0 / Apache 2.0**: se cita por hash, no se importa al árbol
  AGPL.

## Regla de lectura

Un perfil de GitHub es **autopublicado** (tier T1). Sirve para establecer
existencia, actividad y líneas de trabajo. No sirve para acreditar horas,
adopción, calidad ni validación académica. Cualquier afirmación que cruce esa
frontera se marca `unverified` en `tamv-genesis/data/claims.json`.
