# Matriz de consistencia

Cada fila es una afirmación que aparece en más de una superficie. La columna
«resolución» indica qué valor queda vigente y con qué evidencia.

| Dimensión | Superficie A | Superficie B | Conflicto | Resolución |
|---|---|---|---|---|
| Versión del paquete | UI: `PACK v1.2.0` | `pack.json`: `1.2.1` | Menor y visible al usuario | `1.2.1`; la UI ahora lee el mismo valor |
| Repositorio | UI y docs: `.../TAMV-Online-Network-Creator-Intelligence-Pack-` | Remoto real: `.../tamv-creator-intelligence` | Enlaces rotos o a otro repo | URL canónica única en UI, README y `identity.json` |
| Licencia | `pack.json` / manifiesto: `AGPL-3.0-only` | `LICENSE`: «o posterior» | Ambigüedad de grant | AGPL-3.0-only; texto íntegro + `NOTICE` |
| Licencia del corpus | Documentos locales: CC BY 4.0 + Apache 2.0 | Núcleo: AGPL-3.0-only | Contaminación si se importa | Corpus excluido del árbol distribuible |
| Capacidad de voz | Política: `voice.generation` | Ruta: `voice.generate` | Una allowlist que no cubre al emisor | `voice.generation` en política, ruta y certificación |
| Capacidad de agentes | Política: `agent.orchestration` | Ruta: `agent.execute` | Id fuera de allowlist | `agent.orchestration` en todas las superficies |
| Skills | UI: «37 skills conectados» | Código: 1 ejecutor | Sobreafirmación | «37 contratos declarados»; estado por capacidad |
| Contratos de skill | `pack.json`: 37 ids | 34 campos «Consultar contrato del skill» | Inventario sin contrato | Reconocido como deuda; prueba bloquea frontmatter inválido |
| Descubrimiento | `install.sh`: `.tamv/skills` | Skills CLI: `.agents/skills`, `skills/`… | Ruta invisible | Default `.agents/skills` + `skills.sh.json` |
| Frontmatter | 20 skills con YAML | 17 sin YAML | Catálogo incompleto | 37/37 normalizados |
| Organización | `TAMV ONLINE NETWORK` | `metaversotamvonline-3484s-projects` | Autoridad de firma ambigua | Emisor único declarado; cuenta técnica documentada |
| Identidad | `OsoPanda1` | `AnubisVillasenor1` | Autoría no ligada | Registro de identidad + handles en `identity.json` |
| Volumen de repos | «144 repositorios públicos» | 40 son forks de terceros y 100 de 104 originales tienen 0 estrellas | Volumen leído como obra propia | `docs/PROFILES.md` separa originales, forks y actividad reciente |
| Horas | 19,000 (oct 2025) | 24,000 (nov 2026) | Incremento sin método | Cadena fechada; estado `unverified` |
| DOI | «23 obras» | Recuentos previos distintos | Cifra no reconciliada | Claim `unverified`; inventario pendiente |
| Auditoría | Reporte firmado por IA | Compendio: no es certificación | Confusión de estatus | Reclasificado como T1 |
| Riesgo | «Cero riesgo» | Política con riesgo R0–R5 | Claim absoluto vs modelo graduado | Se usa el modelo R0–R5; «cero» queda como metáfora |
| Arquitectura | «Siete federaciones operan» | Sin despliegues separados | Presente vs propuesta | Estado `declared`, no implementado |
| Persistencia | Política: append-only | Esquema vacío | Control inexistente | Compuerta G3 abierta |
| Certificación | `certified` en el nombre del producto | Firma pendiente | Nombre sugiere lo que el estado niega | Estado explícito `signature-missing` |

## Regla

Cuando dos superficies discrepan, **no se elige la más favorable**: se elige la
que puede recomputarse. Si ninguna puede, se marca `contradicted` o `declared` y
se abre un hallazgo.

## Verificación automática

`tamv-genesis/cli/sovereign.mjs` comprueba versión, enlaces, vocabulario,
inventario, frontmatter, licencia y claims. Un cambio que reintroduzca una
divergencia hace fallar el chequeo correspondiente.
