# Auditoría profunda y ejecución de correcciones — TAMV Creator Intelligence

**Corte:** 15 de noviembre de 2026  
**Repositorio objetivo:** [AnubisVillasenor1/tamv-creator-intelligence](https://github.com/AnubisVillasenor1/tamv-creator-intelligence)  
**Base de trabajo observada:** `e3c13d7ab06e203dadd42e054cccbbca3c4641c1`  
**Rama de implementación:** `audit/comprehensive-hardening-2026-11-15`  
**Alcance:** código, scripts de seguridad, CI, documentación y estado de ramas/PR. No es pentest externo ni evidencia de infraestructura real.

## Dictamen ejecutivo

La revisión encontró defectos de ingeniería que eran corregibles desde el repositorio y bloqueadores que requieren una autoridad externa. Se endureció el control de entorno de cuota (PR #24 ya está integrado), se amplía la CI para cubrir controles que estaban presentes pero no ejecutados consistentemente, se normaliza el toolchain y se refuerza el probe de PostgreSQL. El esquema no se editó porque `AGENTS.md` prohíbe modificar manualmente `drizzle/` y `supabase/migrations/`.

**No puede afirmarse todavía que producción esté completa**. El check Vercel continúa en estado fallido con un destino que contiene `upgradeToPro=build-rate-limit`; la integración administrativa conectada no accede al scope propietario. No se han ejecutado pruebas live contra Redis/Upstash o PostgreSQL y sigue pendiente la firma verificable del artefacto.

## Hallazgos y acciones de esta rama

| ID | Prioridad | Hallazgo | Acción incorporada en esta rama | Estado objetivo |
|---|---|---|---|---|
| AUD-001 | P0 | El validador estático sólo buscaba un advisory lock, aunque `sequence_id` se asigna antes del trigger. Podía dar un falso sentido de seguridad. | `scripts/validate-audit-migration.py` detecta el patrón específico y ofrece modo `--strict-order`; nuevas pruebas sintéticas cubren patrón inseguro, reasignación protegida y función de append con frontera de permisos. | El CI normal reporta el blocker; el workflow de firma rechaza release hasta corregirlo por el flujo de schema owner. |
| AUD-002 | P0 | La solución del ledger está bajo gestión de Lovable y no se puede aplicar desde este flujo. | Se preparó una solicitud de cambio no ejecutable con propuesta, límites de permisos y pruebas de aceptación; se añadió comentario técnico al [Issue #14](https://github.com/AnubisVillasenor1/tamv-creator-intelligence/issues/14). | Bloqueado externamente hasta aplicar la revisión del esquema y guardar evidencia live. |
| AUD-003 | P1 | El probe de ledger podía ejecutarse sobre una tabla con datos ya existentes, produciendo pruebas confusas y acumulando eventos append-only. | El probe ahora exige tabla vacía antes de insertar y verifica que el primer evento tenga el hash génesis de 64 ceros. El nombre de base con percent-encoding inválido se rechaza antes de conectar. | Aún requiere ejecución contra PostgreSQL desechable. |
| AUD-004 | P1 | Dos workflows de CI repetían la validación con acciones Bun sin SHA y Bun 1.2.5, mientras los workflows principales usaban versiones pinned/1.3.5. | Se uniformaron SHA de actions y versión Bun; se quitó del trigger push una rama de feature fija que no forma parte del branch inventory actual. | Pendiente de confirmación por CI en el SHA final de esta rama. |
| AUD-005 | P1 | Los comandos de integridad documental existían pero no estaban conectados de forma consistente a CI en `main`. | Se conectan pruebas y verificación de enlaces en los workflows de CI. | CI debe pasar para el head exacto del PR. |
| AUD-006 | P1 | La guía de variables de entorno contenía una tabla Markdown mal formada. | Se corrigió la estructura de cabecera/separador y se mantuvo la distinción entre forma de variables y conectividad real. | Validar links y Markdown mediante CI. |
| AUD-007 | P1 | La matriz documental reflejaba estados de PR obsoletos y no separaba integración de GitHub de estado Vercel. | La matriz ahora diferencia los PR fusionados, los gates externos pendientes y el bloqueo Vercel. | La matriz actualizada se integra sólo tras revisar y fusionar este PR. |
| AUD-008 | P1 | El trigger `SECURITY DEFINER` instala `pgcrypto` en `extensions`, ordena `public` antes de `extensions` en `search_path` y llama `digest()` sin calificar. | El siguiente hardening añade un detector estático para exigir `extensions.digest(...)` y una regresión para la variante calificada. | El esquema gestionado por Lovable sigue sin corregirse; la alerta es conservadora hasta comprobar grants `CREATE` y aplicar la corrección aprobada. |

## Estado de integración ya confirmado

Actualización posterior al corte inicial: PR #27, #28 y #29 se fusionaron después de la primera versión de esta auditoría. PR #28 fortaleció las condiciones de aceptación del detector de orden (clave de lock coincidente, `SECURITY DEFINER`, `search_path`, permisos); PR #29 cerró los bypasses por reasignación de otra secuencia y por grants explícitos de INSERT/ALL. Los cambios del detector de resolución de extensión actualmente se proponen por separado y aún requieren CI/fusión. No se confunde este hardening estático con corrección de la migración real.

- PR #16–#21 y PR #24 aparecen fusionados en `main`.
- PR #22 y PR #25 estaban abiertos en versiones documentales obsoletas; se cerraron sin fusión.
- PR #24 (#c8a4a00...) integró la barrera de clasificación explícita de cuotas. CI pasó en su SHA exacto antes de la fusión.
- El PR de esta auditoría sigue sujeto a CI y revisión del diff. No se declara integrado antes de que el SHA resultante esté en `main`.

## Riesgos pendientes de cierre

### P0 — Ledger PostgreSQL

La asignación de identidad ocurre antes del bloqueo del trigger. El nuevo validador de esquema registra ese caso como `BLOCKER` y el workflow de release usa modo estricto. La solución necesita aprobación/aplicación de Lovable; no se modifica el schema manualmente. Véase [solicitud de cambio de esquema](../../SCHEMA-CHANGE-REQUEST-HYPERCORE-LEDGER.md) y [Issue #14](https://github.com/AnubisVillasenor1/tamv-creator-intelligence/issues/14).

### P0 — Firma y procedencia

El repositorio contiene scripts/workflows de firma, SBOM y attestations, pero eso no demuestra que haya artefacto firmado publicado ni que su digest esté verificado por una raíz de confianza independiente. No se inventaron llaves o firmas. El flujo de firma ahora se niega a avanzar mientras el orden del ledger no pase el gate estricto.

### P1 — Resolución de funciones `SECURITY DEFINER`

La migración actual usa `pgcrypto` desde `extensions`, pero la función de cadena se ejecuta con `search_path = pg_catalog, public, extensions` y llama a `digest()` sin schema. No se ha probado que el rol atacante pueda crear `public.digest`; aun así, la ruta debe eliminar la ambigüedad calificando `extensions.digest(...)`, reduciendo el `search_path` a schemas confiables y verificando permisos CREATE. El nuevo gate estático reporta esta condición por separado; no sustituye la revisión del propietario de schema ni una prueba en PostgreSQL.

### P1 — Redis/Upstash

El limiter distribuido está implementado y tiene pruebas unitarias. No se dispone de evidencia de concurrencia multiinstancia, expiración, límites diarios, outage ni rotación contra un Redis real. No se afirma que el limitador esté verificado en producción.

### P1 — AuditPort

La revisión creativa devuelve metadatos de auditoría en la respuesta, pero ello no equivale a un append durable. No se conecta el runtime al ledger mientras el esquema no garantice orden e invariantes. Falta prueba que demuestre que un fallo obligatorio de append detiene la operación protegida.

### P1 — Vercel

El check de Vercel para `main` informa `failure` con destino que contiene `upgradeToPro=build-rate-limit`. La causa exacta debe confirmarse en el scope del propietario; no se cambia plan, facturación, variables o proyecto sin acceso autorizado. Seguimiento: [Issue #23](https://github.com/AnubisVillasenor1/tamv-creator-intelligence/issues/23).

### P2 — Capacidades declaradas

Varias rutas de generación/voz/audio/agentes devuelven 501 intencionalmente. No se reemplazaron por respuestas ficticias ni se conectaron a un proveedor no autorizado. Cada capacidad requiere modelo/worker, presupuesto, derechos/consentimiento, persistencia y pruebas antes de habilitarse.

## Limpieza de ramas obsoletas — completada

La limpieza de refs se ejecutó mediante dos workflows temporales de una sola ejecución:
- [Run #43759810431 — limpieza principal](https://github.com/AnubisVillasenor1/tamv-creator-intelligence/actions/runs/43759810431) eliminó seis branches con SHA exacto, sin protección y sin PR abierto.
- [Run #43759942522 — limpieza final](https://github.com/AnubisVillasenor1/tamv-creator-intelligence/actions/runs/43759942522) eliminó el branch operativo restante tras corregir la huella SHA esperada y se eliminó a sí mismo.

Los branches eliminados fueron `audit/comprehensive-hardening-2026-11-15`, `docs/completeness-and-operations-hardening-v2-2026-11`, `docs/refresh-integration-evidence-2026-11-15`, `docs/refresh-mainline-evidence-2026-11-15`, `hardening/explicit-local-quota-fallback-v2-2026-11`, `hardening/require-explicit-deployment-env-2026-11` y `ops/production-readiness-gates-2026-11`. GitHub confirmó después que la lista de ramas contiene únicamente `main` en el SHA `f16f80412da2e6c4e261b1724225f820fef08105`.

La limpieza utilizó allowlist de ramas/SHA, verificación de ausencia de PRs abiertos, comprobación de protección y autoeliminación del branch temporal. Ningún branch protegido ni `main` fue candidato. Los workflows temporales no permanecen en la rama principal.

## Criterio final

Una corrección sólo cuenta como completada cuando:
1. está en el código/documento correcto y en la rama correcta;
2. tests/regresión y CI pasan sobre el SHA concreto;
3. integración externa está demostrada desde un entorno autorizado;
4. la evidencia incluye límites y no se extrapola desde builds a producción.

No se asigna un porcentaje de avance sin una rúbrica ponderada y evidencia por requisito.
