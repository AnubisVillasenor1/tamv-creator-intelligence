# Huella pública y límites de corroboración

Este documento reúne las fuentes públicas que el autor aportó para contextualizar
su trayectoria. Sirven para **corroborar identidad, autoría y actividad pública**.
No convierten las 24,000 horas declaradas en un hecho verificado.

> **Estado de la cifra:** el claim `C-001` sigue en `unverified`. Una huella web
> extensa demuestra publicación y presencia; no demuestra cuántas horas se
> trabajaron, ni que no haya solapamiento, delegación o estimación retrospectiva.
> Solo una atestación T3/T4 con bitácora, método de conteo y muestra verificable
> podría elevar la cifra.

## 1. Fuentes aportadas

| Fuente | URL | Qué puede corroborar | Qué no puede corroborar |
|---|---|---|---|
| GitHub `OsoPanda1` | https://github.com/OsoPanda1 | Volumen y fechas de repositorios, actividad pública, lenguajes declarados. | Horas trabajadas, calidad, autoría de cada línea, adopción real. |
| GitHub `AnubisVillasenor1` | https://github.com/AnubisVillasenor1 | Perfil, repositorios y actividad reciente. | Horas, originalidad de ideas, impacto externo. |
| LinkedIn | Perfil de Edwin Oswaldo Castillo Trejo | Trayectoria profesional declarada y vínculos públicos. | Registro horario independiente; el perfil es autodeclarado. |
| ORCID | https://orcid.org/0009-0008-5050-1539 | Identidad de investigador y metadatos de trabajos depositados. | Horas de trabajo, revisión por pares de todos los trabajos. |
| Zenodo | https://zenodo.org | Depósitos, fechas y DOI si existen. | Horas, calidad científica, revisión independiente. |
| Figshare | https://figshare.com | Depósitos y metadatos públicos si existen. | Horas, validación académica. |
| DataCite | https://datacite.org | Metadatos de DOI y atribución. | Horas, exactitud del contenido. |
| OSF | https://osf.io | Proyectos y materiales publicados si existen. | Horas, revisión por pares. |
| ResearchGate | https://www.researchgate.net | Perfil y publicaciones declaradas. | Horas, validación institucional. |
| Blogs «Metaverso TAMV MD-X4», «TAMV Online Network», «Metaverso TAMV» | Blogger | Narrativa pública, cronología de anuncios y la primera cifra de 19,000 h. | Independencia: son autopublicaciones. |
| Odoo oficial | https://tamvonline-oficial.odoo.com | Presencia comercial declarada. | Horas, ingresos, contratos. |
| Portafolio | https://portafolio-edwin.lovable.app/ | Presentación pública de proyectos. | Horas, verificación de resultados. |

No se afirma que todos los enlaces estén disponibles en todo momento ni que su
contenido haya sido auditado en esta ejecución. La disponibilidad web cambia.

## 2. Qué sí se puede comprobar

1. **Identidad enlazada:** el mismo nombre, ORCID y enlaces aparecen en GitHub,
   ORCID, portafolio y sitios declarados. Eso reduce el riesgo de suplantación,
   no prueba experiencia.
2. **Actividad publicada:** los repositorios y blogs tienen fechas observables.
   Un historial de commits puede acotar periodos de actividad, pero no mide horas
   reales: un commit puede representar minutos o semanas, y el historial puede
   reescribirse o generarse en lote.
3. **Coherencia narrativa:** la cifra de 19,000 h publicada en 2025 y la de
   24,000 h en 2026 son compatibles como progresión declarada, no como medición.

## 3. Qué no se puede comprobar con la huella web

- Horas efectivas, pausas, trabajo delegado o tiempo no registrado.
- Calidad, impacto o adopción de los proyectos por número de repositorios.
- Revisión por pares o validación académica de los documentos depositados.
- Que la cifra no sea una estimación retrospectiva.
- Que el autor haya trabajado solo o de forma continua.

## 4. Qué elevaría el estado del claim

| Nivel | Evidencia necesaria | Efecto |
|---|---|---|
| T0 | Declaración del autor | `declared` |
| T1 | Publicaciones propias con fechas | `unverified` o `corroborated` según el claim |
| T2 | Repositorios, commits y artefactos verificables | `corroborated` para actividad, no para horas |
| T3 | Atestación de un tercero con bitácora de periodos y método de conteo | puede elevar horas a `verified` |
| T4 | Auditoría independiente con muestreo y acceso a registros primarios | `verified` con mayor confianza |

La decisión de este repositorio es explícita: **no se sube el estado de `C-001`
por volumen de enlaces**. La huella se registra como contexto y como evidencia de
identidad, no como prueba de horas.

## 5. Reproducción

```bash
# Estado actual del claim y su contraevidencia
node --experimental-strip-types tamv-genesis/cli/sovereign.mjs audit

# Inventario de perfiles GitHub con fecha de foto
node tamv-genesis/scripts/profile-inventory.mjs --help
```

Cualquier actualización futura debe añadir la fuente, la fecha de captura, qué
campo corrobora y qué campo sigue sin probar. No se acepta una captura de pantalla
sin URL, fecha ni método.
