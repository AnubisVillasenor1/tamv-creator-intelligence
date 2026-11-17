# @tamv/governance-sdk

SDK neutral de gobernanza de TAMV Creator Intelligence. Evalúa controles suministrados por adaptadores confiables y llama a la API de proyectos usando el token de sesión del usuario. No ejecuta modelos, no aporta persistencia propia ni certifica un release por sí mismo.

- Versión: 0.1.0
- Política: tamv.governance.v1
- Controles: 7 (CORE_CONTROLS)
- Licencia: AGPL-3.0-only para el núcleo; ver LICENSE-MAP.md.

## Instalación local

El paquete no se publica en npm. Instálalo desde un checkout revisado:

```bash
npm install /ruta/al/checkout-tamv-creator-intelligence/sdk
```

## Modos de ejecución

El modo predeterminado es certified y deniega por defecto. draft y local permiten una ejecución no certificada únicamente cuando todos los controles pasan excepto integrity. No deben usarse para efectos externos, operaciones irreversibles ni datos reales que requieran certificación.

```js
import { createGovernance } from "@tamv/governance-sdk";

const tamv = createGovernance({
  audit: async (event) => durableAuditStore.append(event),
});

const result = await tamv.run({
  projectId: "00000000-0000-4000-8000-000000000000",
  mode: "draft",
  context: {
    consent: true, rightsCleared: true, containsSensitiveData: false,
    disclosure: true, humanApproved: true, certified: false,
  },
  execute: async () => runLocalDryRun(),
});
```

Si falta consentimiento, derechos, minimización de datos, transparencia o aprobación humana, también se deniega en draft/local. La evidencia debe proceder de adaptadores confiables del servidor, no de campos que el usuario pueda falsificar.

## Auditoría y límites de durabilidad

El SDK exige un adaptador audit y escribe policy.evaluated, execution.started, execution.succeeded o execution.failed. Los errores de auditoría previos a la ejecución bloquean el inicio. No registra prompts, tokens, entradas ni salidas sin procesar por defecto.

Una caída del almacén durante el evento posterior puede ocurrir después de que el efecto ya haya sucedido. Para efectos externos, el integrador debe implementar outbox/transacción, idempotencia y reconciliación; este SDK por sí solo no ofrece atomicidad distribuida.

## Cliente de la API de proyectos

```js
import { createTamvClient } from "@tamv/governance-sdk";

const client = createTamvClient({
  baseUrl: "https://tu-despliegue.example",
  getAccessToken: async () => session?.access_token ?? null,
});
const projects = await client.list();
const project = await client.create("Nombre del proyecto", "Caso de uso verificable");
await client.audit(project.id);
```

Operaciones: list, create, configure, approve, evaluate, audit. Requieren token de sesión válido y controles de versión del servidor. Lee la respuesta real antes de asumir el ID de proyecto o la versión esperada.

## Pruebas

Ejecuta node --test sdk/tests/*.test.mjs.

## Límites

- No contiene claves privadas ni credenciales.
- certified: true en un objeto de entrada no constituye evidencia criptográfica; el integrador debe obtener certificación verificada del servidor.
- Una decisión permitida no sustituye revisión legal, consentimiento verificable, seguridad de infraestructura ni auditoría externa.
- La biblioteca no instala ni ejecuta automáticamente las skills públicas o los 37 contratos internos.
