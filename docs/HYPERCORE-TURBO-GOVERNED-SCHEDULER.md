# HyperCore Turbo: scheduler gobernado

**Estado:** implementación local acotada cubierta por pruebas unitarias. No es una cola durable, aislamiento de proceso, garantía de disponibilidad ni certificación de producción.

## Integración nativa

`governed-scheduler.ts` añade una capa sobre el runner existente:

- deny-by-default, autorización de capacidad y consentimiento;
- validación de DAG, IDs, prioridad y límite de tareas;
- olas con concurrencia AIMD acotada;
- preflight del recibo de intención antes de ejecutar una ola;
- metadatos de auditoría sin payload creativo;
- dependencia explícita del resultado de tareas y cancelación cooperativa.

## Uso

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

No es exactly-once ni rollback. Los resultados externos no se prueban ni se concilian desde este módulo. El adaptador de auditoría debe ser probado y duradero para que el estado `audit-incomplete` tenga un significado operativo real.

## Evidencia y límites

Las pruebas cubren denegación, fallo de auditoría previo, DAG, prioridades, dependencias fallidas, ciclos, límites y adaptación tras fallo. Ejecútalas con `bun run test` y `bun run typecheck`.

La integración toma patrones conceptuales de los repositorios citados: enforcement determinista, hooks, evidencias verificables, trazabilidad arquitectónica y ejecución acotada. No se incorporó código, marca, archivo, modelo o licencia ajena.
