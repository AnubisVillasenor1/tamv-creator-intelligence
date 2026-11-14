# Catálogo del corpus local

Generado por `tamv-genesis/scripts/corpus-inventory.mjs`. No editar a mano.

Este catálogo publica **agregados**: no contiene rutas, nombres de archivo ni
texto extraído. El inventario detallado con hashes queda en
`tamv-genesis/.corpus/`, fuera de Git.

| Métrica | Valor |
|---|---:|
| Archivos inventariados | 9948 |
| Bytes totales | 4241742190 |
| Texto extraído (caracteres) | 100091333 |
| Duplicados (grupos / bytes redundantes) | 2358 / 159786215 |
| Archivos retenidos (P0/P1) | 129 |

## Tipos

| Tipo | Archivos |
|---|---:|
| document | 528 |
| text | 696 |
| code | 7406 |
| archive | 12 |
| image | 274 |
| audio | 17 |
| video | 43 |
| other | 972 |

## Sensibilidad

| Nivel | Archivos |
|---|---:|
| P0-credential | 119 |
| P1-restricted | 10 |
| P2-media | 329 |
| P3-normal | 9490 |

Los archivos **P0-credential** (recuperación de cuentas, tokens, claves) y
**P1-restricted** se hashean como **bytes opacos**: nunca se decodifican, no se
extrae su texto y no se listan en este catálogo. Un inventario que leyera
credenciales para catalogarlas sería el incidente, no la mitigación.

> El bucket P0/P1 es conservador: incluye logs, plantillas `.env.example` y código
> que nombra tokens o credenciales. Un archivo retenido **no implica** que contenga
> una credencial válida; implica que no se decodificó para averiguarlo.

## Temas detectados

| Tema | Menciones |
|---|---:|
| isabella | 26110 |
| tamv | 14591 |
| supabase | 5016 |
| gobernanza | 2223 |
| licencia | 1456 |
| ed25519 | 1443 |
| privacidad | 1164 |
| orcid | 1032 |
| rls | 926 |
| real del monte | 905 |
| anubis | 849 |
| derechos | 639 |

## Límites

- Los archivos de audio y video **no se transcriben**; solo se hashean y clasifican.
- Los archivos comprimidos se inventarían por número de entradas y tamaño, no por contenido.
- Los duplicados se detectan por SHA-256 exacto: no detectan copias casi idénticas ni cambios de formato.
- Un recuento de menciones no es una revisión de fondo ni una validación de lo que dice el corpus.
- El resumen agregado se puede recomputar, pero depende del árbol local: no es evidencia portable de terceros.

## Reproducir

```bash
node --experimental-strip-types tamv-genesis/scripts/corpus-inventory.mjs --root .. --date 2026-11-13
node --experimental-strip-types tamv-genesis/cli/sovereign.mjs corpus
```

Hash del inventario local: `sha256:265491fc598595b37c2240249c58f4e783068534052b18b070ee338f36fa3e06`
