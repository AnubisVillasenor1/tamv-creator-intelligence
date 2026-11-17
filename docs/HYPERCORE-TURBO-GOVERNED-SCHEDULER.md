# HyperCore Turbo: gobernanza de ejecución y scheduler adaptativo

**Estado:** implementación local acotada y cubierta por pruebas unitarias; no es una cola durable, aislamiento de proceso, garantía de disponibilidad ni certificación de producción.

## Qué integra

`src/lib/hypercore-turbo/governed-scheduler.ts` añade una capa aditiva sobre el runner canónico existente:

- Autoriza capacidad, consentimiento y certificación usando Govern Core; rechaza por defecto.
- Valida identificadores, tamaño máximo de trabajo, dependencias desconocidas, dependencias duplicadas y ciclos antes de auditar o ejecutar.
- Ejecuta tareas en olas DAG con prioridad estable, límites de concurrencia y un máximo explícito de tareas en memoria.
- Hace preflight de todos los recibos de intención de cada ola antes de iniciar cualquier tarea de esa ola. Si la escritura de intención falla, esa ola no se ejecuta.
- Ajusta la concurrencia entre olas con AIMD acotado: reducción multiplicativa al observar error/latencia alta y aumento aditivo tras muestras sanas.
- Mantiene latencia y tasa de fallo en un buffer circular de tamaño fijo; emite recibos con metadatos mínimos, nunca payloads.
- Propaga cancelación y conserva reintentos únicamente para tareas explícitamente idempotentes, mediante `runTurboParallel`.

## Contrato de autoridad y uso

El contexto de identidad, consentimiento y certificación debe derivarse en el servidor de fuentes confiables. No debe pasarse como autoridad un valor enviado por el navegador. El adaptador de auditoría debe ser durable si el caso de uso lo requiere; esta implementación solo define y consume su interfaz y no provisiona almacenamiento.

```ts
const result = await runGovernedTurbo({
  actorId: authenticatedUser.id,
  capability: "agent.orchestration",
  consentGranted: serverConsent.isCurrent,
  certificationValid: release.certified,
  tasks,
  audit: auditPort.append,
  initialConcurrency: 4,
  maxConcurrency: 12,
  targetLatencyMs: 1500,
});
```

La llamada es de concurrencia asíncrona dentro del proceso, no paralelismo de CPU. Las tareas deben respetar `AbortSignal`; un timeout no garantiza la cancelación de sistemas externos. Por eso no se permite inferir exactly-once, rollback, durabilidad o ejecución exitosa en proveedores a partir del scheduler.

## Criterios de prueba

`governed-scheduler.test.ts` cubre denegación, fallos de auditoría antes de ejecutar, orden DAG/prioridad, fallos y dependencias, ciclos, límites de entrada y descenso adaptativo. Ejecutar `bun run test` y `bun run typecheck` desde la raíz.

## Referencias de diseño

La evaluación tomó como referencias conceptuales los proyectos indicados por el solicitante: separación entre política y ejecución/gobernanza explícita (Microsoft Agent Governance Toolkit, FINOS AI Governance Framework), inspección y evidencia operacional (Cisco DefenseClaw), flujos de arquitectura trazables (ArcKit), y estructuras acotadas/telemetría de velocidad (HyperRing, HyperVelocity, Hyperion y HypeRadar). Los demás repositorios citados se consideran referencias de investigación, no dependencias.

No se copió ni incorporó código, archivos, marcas, datasets, políticas textuales o licencias de esos proyectos. La implementación es TypeScript original sobre las APIs TAMV existentes. La mención de una referencia no implica afiliación, aval ni compatibilidad. Debe revisarse la licencia del repositorio correspondiente antes de adoptar código en una futura integración.
