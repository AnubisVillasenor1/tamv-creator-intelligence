# TAMV HyperCore Turbo — integración en la aplicación

## Qué queda integrado

- `/hypercore`: panel de auditoría accesible desde la navegación de la aplicación.
- `GET /api/tamv/hypercore/audit`: ejecuta comprobaciones de política, certificación de runtime y un probe de concurrencia limitado.
- `src/lib/hypercore-turbo/policy.ts` y `hypercore/govern-core/policy.json`: política tipada y documento legible por máquinas.
- `src/lib/hypercore-turbo/parallel-runner.ts`: concurrencia asíncrona acotada, timeout, cancelación cooperativa y reintentos solo para tareas idempotentes que marquen el error como reintentable.
- Pruebas Vitest para los controles esenciales.
- `scripts/verify-slsa.sh`: wrapper de fail-closed para SLSA Verifier; requiere artefacto, procedencia, URI de origen y tag reales.

## Veracidad del estado

El panel no inventa una certificación. La procedencia SLSA aparece como `not-integrated` hasta que el pipeline de release genere y verifique una attestation confiable. Una firma Ed25519 del manifiesto no demuestra por sí sola quién construyó el artefacto.

La certificación global queda bloqueada si cualquiera de los controles obligatorios falla o permanece sin verificar. El probe de Velocity Core solo verifica el ejecutor asíncrono en esta función; no es un benchmark de producción ni demuestra que BullMQ, Redis o workers GPU estén desplegados.

## Desarrollo y pruebas

```bash
bun run test
bun run lint
bun run build
```

Abrir `/hypercore` en la aplicación o usar `GET /api/tamv/hypercore/audit` para consultar el informe JSON.

## Verificación SLSA de un artefacto real

Instalar SLSA Verifier desde el proyecto oficial: https://github.com/slsa-framework/slsa-verifier

```bash
bash scripts/verify-slsa.sh \
  dist/package.tar.gz \
  dist/provenance.intoto.jsonl \
  github.com/OWNER/REPO \
  v2.0.0
```

Sustituir los valores de ejemplo por un artefacto y una procedencia reales. No se debe generar una procedencia ficticia ni marcar SLSA como aprobado solo porque exista un archivo JSONL.

## Requisitos antes de producción

1. Integrar el gate de Govern Core en cada capacidad sensible del servidor.
2. Añadir un ledger de auditoría durable, append-only y con controles de acceso.
3. Añadir almacenamiento durable de checkpoints y pruebas de restauración.
4. Generar la attestation SLSA desde un builder confiable y fijar la identidad esperada.
5. Configurar autenticación, cuotas, rate limiting y límites de coste por usuario/tenant.
6. Ejecutar pruebas de carga y failover sobre la infraestructura real.
7. No firmar el release sin autorización institucional y custodia segura de la clave privada.
