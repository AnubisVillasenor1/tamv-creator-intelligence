# Seguridad operativa y respuesta a incidentes

**Revisión:** 2026-11-15  
**Aplicación:** TAMV Creator Intelligence y su paquete distribuible.  
**Naturaleza:** procedimiento propuesto; no demuestra que exista un equipo de guardia, SIEM, canal de incidentes ni recuperación ya probada.

## 1. Objetivos

1. Contener daños sin destruir evidencia.
2. Preservar la distinción entre eventos confirmados, hipótesis y estados desconocidos.
3. Revocar o rotar credenciales afectadas mediante el proveedor autorizado.
4. Restaurar un estado conocido y verificar integridad antes de reactivar capacidades.
5. Registrar decisiones humanas, alcance, tiempos, artefactos y criterios de cierre.

## 2. Severidad sugerida

| Nivel | Ejemplos | Respuesta inicial sugerida |
|---|---|---|
| SEV-1 | Exposición confirmada de clave privada de firma, ejecución no autorizada con impacto grave, corrupción del ledger, exfiltración confirmada de datos sensibles | Suspender la capacidad afectada, revocar credenciales, preservar logs y escalar al responsable de seguridad |
| SEV-2 | Bypass reproducible de autorización, RLS/grants incorrectos, cuota distribuida omitida, firma inválida aceptada | Deshabilitar la ruta afectada o mantenerla fail-closed; preparar corrección y prueba negativa |
| SEV-3 | Degradación de proveedor, errores repetidos, cola atascada, alertas incompletas sin impacto confirmado | Aplicar mitigación limitada, registrar métricas y verificar recuperación |
| SEV-4 | Problema documental, alerta aislada no reproducible o desviación sin impacto observable | Registrar, reproducir y priorizar con evidencia |

Los niveles son una propuesta de triage; deben adaptarse a contratos, jurisdicción, obligaciones de notificación y evaluación de impacto.

## 3. Reglas invariables

- No copiar secretos, tokens, claves privadas ni datos de usuario a issues, logs, commits o conversaciones.
- No borrar evidencia ni reescribir historia Git para ocultar un incidente.
- No ejecutar scripts destructivos contra producción como método de diagnóstico.
- No reintentar ciegamente operaciones externas cuyo resultado sea desconocido.
- No declarar resuelto un incidente solo porque la aplicación responde HTTP 200.
- Mantener fail-closed en operaciones protegidas cuando falten autenticación, autorización, integridad, cuota o auditoría obligatoria.
- Separar contención, erradicación, recuperación y análisis posterior.
- No aplicar migraciones gestionadas por Lovable directamente en `drizzle/` o `supabase/migrations/`; coordinar con el propietario del esquema.

## 4. Procedimiento común

### Fase A — Detectar y registrar

Capturar, cuando esté disponible:
- ID de incidente y severidad provisional.
- Hora UTC y zona local de observación.
- Entorno afectado, ruta, servicio y versión.
- Commit SHA y digest del artefacto desplegado.
- Request/trace ID, código de error y métricas no sensibles.
- Hechos observados, hipótesis separadas y datos que faltan.
- Quién tomó cada decisión y qué autorización la respalda.

No incluir cuerpos completos de prompts, contenido privado, cabeceras de autorización ni valores de entorno.

### Fase B — Contener

1. Identificar la menor capacidad que pueda deshabilitarse sin ampliar el impacto.
2. Bloquear la ruta o desactivar el secreto afectado por el panel del proveedor.
3. Revocar sesiones/tokens cuando el proveedor lo permita y la exposición lo justifique.
4. Conservar logs de auditoría y metadatos de despliegue.
5. Confirmar que la contención funciona con una prueba negativa.
6. Si la integridad de un release está en duda, no emitir una nueva certificación con la misma clave comprometida.

### Fase C — Erradicar

1. Reproducir el defecto en entorno no productivo.
2. Identificar causa raíz, alcance, rutas afectadas y controles que fallaron.
3. Corregir código y pruebas en una rama aislada.
4. Revisar cambios de dependencias y secretos.
5. Si afecta al esquema, obtener aprobación del propietario y usar el flujo de migración administrado.
6. Obtener revisión independiente cuando el impacto sea alto.

### Fase D — Recuperar

1. Identificar un commit y artefacto de confianza.
2. Verificar firma y hashes; si la clave fue comprometida, usar una identidad de firma rotada y documentar la revocación.
3. Verificar configuración mediante el preflight disponible en la rama integrada; un preflight de formato no prueba conectividad.
4. Probar autenticación positiva y negativa, permisos, cuotas y auditoría.
5. Para datos, comprobar integridad, restauración y ausencia de escrituras no autorizadas.
6. Rehabilitar gradualmente, con observación y criterio de rollback explícito.

### Fase E — Cerrar y aprender

- Publicar un informe sin secretos con línea de tiempo, impacto confirmado, incertidumbres y causa raíz.
- Enlazar commit, tests, run de CI, despliegue y evidencia de restauración.
- Añadir pruebas que reproduzcan el fallo.
- Actualizar amenaza, matriz de implementación, runbook y tareas de deuda.
- Asignar responsable y fecha de revisión; no cerrar dependencias externas sin confirmación del proveedor.

## 5. Playbooks por escenario

### 5.1 Clave privada Ed25519 expuesta o sospechosa

1. Tratar la clave como comprometida; no volver a usarla para firmar.
2. Revocar o marcar la identidad anterior como no confiable en los canales de distribución que TAMV controle.
3. Generar un nuevo par en equipo confiable y bajo autorización del titular.
4. Actualizar los secretos de firma en el gestor autorizado y retirar los anteriores.
5. Revisar commits, logs y artefactos en busca de exposición.
6. Regenerar hashes, firmar el manifiesto revisado y verificar la firma con la clave pública nueva.
7. Publicar un aviso de rotación y delimitar los artefactos firmados con la clave antigua.

No colocar la clave privada en el repositorio, variables de frontend, artefactos, logs ni pull requests de terceros.

### 5.2 Redis/Upstash no disponible o cuota no concluyente

1. Confirmar si el fallo es timeout, configuración ausente, HTTP no exitoso o respuesta inválida, sin imprimir credenciales.
2. En producción, denegar la operación protegida si no puede comprobarse la cuota.
3. Revisar latencia, tamaño de respuesta, estado del proveedor y configuración por entorno.
4. No cambiar silenciosamente a cuota local: la cuota por proceso no es global en serverless.
5. Tras recuperación, comprobar consumo de cuota, TTL, límite diario y concurrencia desde más de una instancia.
6. Documentar la ventana de degradación y cualquier solicitud denegada.

### 5.3 PostgreSQL/ledger con cadena inconsistente

1. Suspender operaciones que dependan de la integridad del ledger.
2. Preservar snapshot y logs antes de intentar reparar.
3. No modificar ni borrar eventos para que la cadena “pase”.
4. Identificar el último checkpoint consistente y recalcular los hashes desde columnas persistidas.
5. Verificar asignación de secuencia, bloqueos, transacciones, permisos y escritura concurrente.
6. Reproducir en una base desechable con el probe aprobado.
7. Restaurar desde checkpoint verificado solo con plan aprobado; registrar la discontinuidad si existe.

### 5.4 Bypass de autenticación, autorización o RLS

1. Deshabilitar la ruta afectada o denegarla por defecto.
2. Capturar pruebas sin datos personales innecesarios.
3. Probar como usuario anónimo, usuario propietario, usuario ajeno y rol de aplicación de menor privilegio.
4. Verificar que el cliente no pueda establecer actor, autoridad o estado final de una operación.
5. Validar grants y RLS con el esquema administrado por el propietario.
6. Rehabilitar únicamente después de superar pruebas positivas y negativas.

### 5.5 Gateway de IA o proveedor externo degradado

1. Diferenciar rechazo explícito de timeout con resultado desconocido.
2. Aplicar timeout y límites de tamaño; no reintentar efectos secundarios sin idempotencia.
3. Evitar que prompts, respuestas sensibles o secretos aparezcan en trazas.
4. Mantener las rutas protegidas en estado cerrado cuando no pueda verificarse política, cuota o certificación.
5. Validar recuperación con solicitudes sintéticas no sensibles y un presupuesto de prueba limitado.

### 5.6 Release o despliegue con procedencia incierta

1. Suspender la promoción y no etiquetar el artefacto como certificado.
2. Recuperar SHA del commit, digest del artefacto, run de CI y deployment ID.
3. Verificar firma, manifiesto y procedencia contra ese mismo artefacto.
4. Comparar el artefacto desplegado con el esperado; no asumir que un estado verde de Vercel prueba equivalencia criptográfica.
5. Volver al último artefacto verificado mediante el procedimiento de rollback autorizado.
6. Conservar la evidencia de la promoción incorrecta para investigación.

## 6. Criterios mínimos de recuperación

- [ ] La causa o hipótesis principal está documentada y la incertidumbre restante está explícita.
- [ ] Se revocaron o rotaron los secretos afectados, si aplica.
- [ ] El commit y artefacto recuperados están identificados.
- [ ] CI y las pruebas específicas pasan en el commit exacto.
- [ ] La prueba negativa que reproduce el incidente ahora falla de forma segura.
- [ ] Se verificó la configuración y conectividad del servicio afectado.
- [ ] La auditoría conserva evidencia suficiente sin datos excesivos.
- [ ] Los datos se validaron o restauraron desde un punto conocido.
- [ ] La observación posterior tiene duración, señales y responsable definidos.
- [ ] Se actualizaron runbook, matriz de cobertura y registro de deuda.

## 7. Plantilla de registro

```text
Incident ID:
Severity:
Detected at (UTC):
Environment / deployment:
Commit SHA / artifact digest:
Affected capability:
Confirmed impact:
Potential impact (not yet confirmed):
Evidence references:
Containment decision and approver:
Credentials rotated/revoked:
Root cause / current hypothesis:
Recovery artifact:
Positive tests:
Negative tests:
Data integrity / restore evidence:
Remaining uncertainty:
Follow-up owner and due date:
Closure approver:
```

## 8. Límites actuales conocidos

Este documento no afirma que exista un SOC, un canal de guardia, agregación central de logs, alertas externas, retención configurada, backups verificados ni simulacros completados. Esas capacidades deben aparecer como pendientes hasta que exista configuración y evidencia verificable.
