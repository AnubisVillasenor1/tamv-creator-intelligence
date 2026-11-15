# Solicitud de cambio de esquema — Hyper-Core audit ledger chain order

**Estado:** requisito de esquema pendiente de aprobación  
**Fecha:** 15 de noviembre de 2026  
**Propietario de esquema:** flujo gestionado por Lovable (ver `AGENTS.md`)  
**Bloqueador relacionado:** [Issue #14 — orden transaccional y cadena concurrente](https://github.com/AnubisVillasenor1/tamv-creator-intelligence/issues/14)

> Este documento es una solicitud de diseño/revisión. No es una migración ejecutable, no autoriza cambios manuales en `drizzle/` o `supabase/migrations/` y no demuestra que el esquema se haya aplicado en un entorno.

## 1. Defecto reproducible

La definición actual usa `sequence_id bigint GENERATED ALWAYS AS IDENTITY`. La identidad se obtiene antes de ejecutar el cuerpo del trigger `BEFORE INSERT`; el trigger posteriormente adquiere `pg_advisory_xact_lock` y lee el encabezado por `ORDER BY sequence_id DESC`.

En una carrera posible:
1. Transacción A reserva un ID inferior y queda planificada antes de tomar el lock del trigger.
2. Transacción B reserva un ID superior y toma primero el lock.
3. B enlaza y confirma su hash.
4. A toma el lock, observa el hash de B, pero conserva el ID inferior.
5. Al ordenar por `sequence_id`, la cadena queda con enlaces que no concuerdan con el orden canónico.

La presencia de un advisory lock en el trigger no basta: protege el bloque posterior al lock, no el momento anterior en el que se asignó el valor de identidad.

## 2. Diseño preferido para que Lovable lo evalúe

Evaluar un único límite de escritura para el ledger mediante una función de append controlada:

1. Una función de PostgreSQL `SECURITY DEFINER` con `search_path` fijo y mínimo privilegio.
2. La función adquiere el mismo `pg_advisory_xact_lock` **antes** de ejecutar el `INSERT`; así la asignación de la identidad sucede dentro de la sección serializada.
3. La función calcula/aplica los campos de evento permitidos y deja que el trigger recompute `previous_hash` y `event_hash` usando el encabezado confirmado.
4. Revocar `INSERT` directo en `public.tamv_hypercore_audit_events` de los roles de aplicación/API (`anon`, `authenticated` y la service role de runtime). Permitir sólo `EXECUTE` de la función de append al rol autorizado. Separar la propiedad de tabla y las facultades de owner/superuser en las pruebas.
5. Mantener el trigger como defensa adicional de hash/invariantes; no confiar en él para serializar una asignación de identidad que ya ocurrió.
6. Aplicar el cambio únicamente por el flujo de schema owner/Lovable, con versionado reproducible. No editar a mano las migraciones existentes.

Una alternativa basada en reasignar `NEW.sequence_id` después del lock también requiere que el propietario de esquema valide formalmente el comportamiento con GENERATED ALWAYS AS IDENTITY y pruebe que no existe un camino de inserción que evite esa reasignación.

## 3. Requisitos de seguridad y consistencia

- Las funciones `SECURITY DEFINER` requieren `search_path` explícito y seguro, objetos calificados por schema y entradas validadas.
- La migración instala `pgcrypto WITH SCHEMA extensions`; la función `tamv_hypercore_audit_chain_insert()` usa `SECURITY DEFINER`, pone `public` antes de `extensions` en `search_path` y llama a `digest()` sin calificar. La revisión de seguridad requiere cambiar a `extensions.digest(...)`, preferir `SET search_path = pg_catalog, extensions` cuando todos los objetos no incorporados estén calificados por schema, y comprobar que roles no confiables no tengan `CREATE` en schemas del path.
- El rol de aplicación no debe poder omitir el camino serializado haciendo INSERT directo.
- No exponer a cliente el actor, autoridad, hash anterior o hash final como valores autoritativos; el backend y la base calculan los campos que correspondan.
- Los eventos del ledger permanecen metadata-only; no guardar prompts, contenido generado, tokens, claves, correos ni datos personales innecesarios.
- Mantener denegadas las mutaciones UPDATE, DELETE y TRUNCATE para roles de aplicación. Un trigger no reemplaza un análisis de permisos ni bloquea a owner/superuser.

## 4. Pruebas de aceptación obligatorias

En una base de datos **nueva, desechable, no productiva**:
- [ ] Registrar versión de PostgreSQL y de la migración aplicada.
- [ ] Insertar 32 o más eventos simultáneamente desde procesos/consultas concurrentes con distintos retardos.
- [ ] Verificar que todos los append esperados se confirman y que no hay IDs duplicados.
- [ ] Ordenar por la secuencia canónica y verificar cada `previous_hash` con el hash del evento precedente; el primer evento debe apuntar al hash génesis de 64 ceros.
- [ ] Recomponer cada `event_hash` desde las columnas persistidas con la misma especificación documentada.
- [ ] Repetir varias veces con scheduling variado y capturar logs/commit SHA.
- [ ] Verificar que INSERT directo es denegado para roles de aplicación y que la función autorizada puede insertar.
- [ ] Verificar que UPDATE, DELETE y TRUNCATE se rechazan para roles no propietarios.
- [ ] Probar RLS/grants desde los roles equivalentes al despliegue.
- [ ] Demostrar persistencia tras reinicio y restauración desde un checkpoint conocido.

## 5. Gate de release

La validación estática ahora detecta el patrón conocido y puede reportarlo como blocker en CI. El workflow de firma de release utiliza `--strict-order` y debe fallar mientras la estructura del schema no demuestre el orden seguro.

Un workflow verde de CI ordinario no acredita que la migración se haya aplicado o que PostgreSQL haya pasado las pruebas. No cerrar el Issue #14 hasta adjuntar la versión real del schema, salida íntegra del probe y resultados de permisos.
