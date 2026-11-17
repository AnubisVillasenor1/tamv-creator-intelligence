# @tamv/governance-sdk

SDK neutral de gobernanza de TAMV Creator Intelligence. No ejecuta modelos ni
guarda datos: evalúa el contexto que el integrador declara, devuelve una
decisión auditable y, si se usa `createTamvClient`, habla con la API de
proyectos de TAMV usando el token del usuario.

- Versión: `0.1.0`
- Política: `tamv.governance.v1`
- Controles: 7 (`CORE_CONTROLS`)
- Licencia: AGPL-3.0-only para el núcleo; ver `LICENSE-MAP.md` en la raíz

## Instalación local

El paquete no se publica en npm. Instálalo desde el checkout revisado:

```bash
npm install /ruta/al/checkout-tamv-creator-intelligence/sdk
```

## Evaluación deny-by-default

```js
import { createGovernance, GovernanceDeniedError } from "@tamv/governance-sdk";

const tamv = createGovernance({
  audit: async (event) => {
    // Persistencia del integrador: el SDK no escribe en ningún almacén.
    await myAuditStore.append(event);
  },
});

try {
  const result = await tamv.run({
    projectId: "00000000-0000-4000-8000-000000000000",
    context: {
      consent: true,
      rightsCleared: true,
      containsSensitiveData: false,
      disclosure: true,
      humanApproved: true,
      certified: false, // sin firma de release, la ejecución certificada se deniega
    },
    execute: async () => runYourProviderCall(),
  });
} catch (error) {
  if (error instanceof GovernanceDeniedError) {
    console.error(error.decision.reasons);
  }
}
```

`evaluateGovernance` devuelve `allowed`, `policyVersion`, `reasons` y `checks`.
Cualquier control ausente o falso se trata como denegado.

## Cliente de la API de proyectos

```js
import { createTamvClient } from "@tamv/governance-sdk";

const client = createTamvClient({
  baseUrl: "https://tu-despliegue.example",
  getAccessToken: async () => session?.access_token ?? null,
});

const projects = await client.list();
await client.create("Nombre del proyecto", "Caso de uso verificable");
await client.audit(projectId);
```

Operaciones disponibles: `list`, `create`, `configure`, `approve`, `evaluate`,
`audit`. Todas requieren un token de Supabase válido y respetan el control de
versión (`expectedVersion`) y las guardas de certificación del servidor.

## Límites

- El SDK no contiene claves privadas ni credenciales.
- `certified: false` mantiene bloqueadas las capacidades certificadas.
- Una decisión `allowed: true` no sustituye aprobación legal, consentimiento
  verificable ni auditoría externa.
- Los ejemplos ejecutables están en `examples/provider-neutral.mjs` y
  `examples/http-api.sh`.
