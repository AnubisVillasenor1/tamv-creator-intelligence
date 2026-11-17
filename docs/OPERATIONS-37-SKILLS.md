# Manual operativo de implementación — TAMV Creator Intelligence

**Versión documental:** 1.1  
**Fecha:** 17 de noviembre de 2026  
**Estado del release:** `UNSIGNED_RELEASE_PENDING`  
**Principio rector:** la IA propone; el humano decide.

## 1. Alcance y advertencias de inventario

El repositorio mantiene dos niveles que no deben confundirse:

- **4 skills públicas v3** configuradas en `skills.sh.json` y `tamv-genesis/v3/pack.json`: `tamv-creator-os`, `tamv-audio-intelligence`, `tamv-growth-engine` y `tamv-sovereign-platform`.
- **37 contratos internos** en `tamv-pack/skills/`, inventariados por `tamv-pack/pack.json`. Se integran como biblioteca de referencia de las cuatro skills públicas; no se configuran como 37 skills independientes en skills.sh.

Por tanto, la frase “37 skills publicadas e instalables individualmente en skills.sh” **no está respaldada por la configuración versionada de este repositorio**. El validador `scripts/validate-skills-sh.mjs` rechaza explícitamente la publicación del directorio de los 37 contratos internos. Antes de cambiar esa decisión se requiere una decisión de producto/licencia, revisión de colisiones de nombres, evaluación de superficie de ataque y actualización deliberada de manifiestos y pruebas.

La instalación de un `SKILL.md` aporta instrucciones a un agente compatible; no crea servicios, credenciales, infraestructura, ejecutores, consentimiento verificable ni autoridad de ejecución.

## 2. Requisitos y comprobaciones iniciales

Requisitos de desarrollo documentados por el repositorio: Bun 1.3.5 para CI, Node.js 24 en pruebas de contratos, Python 3 para validadores y Git. Si se utiliza npm para instalar el SDK local, se debe conservar el lockfile del proyecto consumidor y validar las versiones efectivas en CI.

Antes de integrar el paquete:

```bash
git clone https://github.com/AnubisVillasenor1/tamv-creator-intelligence.git
cd tamv-creator-intelligence
bun install --frozen-lockfile
bun run tamv:check
bun run test
node --test sdk/tests/*.test.mjs
python3 tamv-pack/scripts/validate-manifest.py
python3 tamv-pack/scripts/validate-integrity.py
```

La verificación de integridad local no equivale a una firma de release. No se deben copiar claves privadas a este repositorio, a logs ni a artefactos públicos.

## 3. Instalación de skills

### 3.1 Skills públicas

Desde el proyecto consumidor, instala el pack público con la herramienta skills.sh:

```bash
npx skills add anubisvillasenor1/tamv-creator-intelligence
```

La cantidad real de skills instalables depende de los directorios expuestos por el manifiesto público. En la configuración actual son cuatro. Para validar los nombres y las rutas:

```bash
node scripts/validate-skills-sh.mjs
```

### 3.2 Biblioteca de contratos internos

Para consultar o integrar los 37 contratos internos, utiliza el checkout y sus scripts de validación:

```bash
bash tamv-pack/scripts/validate-pack.sh
sed -n '1,220p' tamv-pack/install.sh
```

Inspecciona `tamv-pack/install.sh` y el README del paquete antes de ejecutar cualquier operación. Ejecuta la instalación en una copia de prueba del proyecto, revisa el diff y no sobrescribas archivos del consumidor sin respaldo. Los contratos son documentación gobernada, no 37 ejecutores de software.

## 4. SDK de gobernanza

El paquete `sdk/` contiene `@tamv/governance-sdk` versión 0.1.0 y no se publica en npm según su documentación. Se instala desde un checkout revisado:

```bash
npm install /ruta/al/checkout-tamv-creator-intelligence/sdk
```

Exportaciones disponibles:

| Exportación | Propósito | Límite |
|---|---|---|
| `POLICY_VERSION` | Versión de política `tamv.governance.v1` | No representa una certificación externa |
| `CORE_CONTROLS` | Siete controles documentados | No ejecuta auditorías por sí sola |
| `evaluateGovernance` | Evaluación determinista de los campos recibidos | Los campos deben venir de adaptadores confiables |
| `createGovernance` | Puerta de ejecución con auditoría | Requiere un adaptador de auditoría durable |
| `createTamvClient` | Cliente de API de proyectos | Requiere token de sesión válido y servidor operativo |

### 4.1 Modos de ejecución

- `certified` es el modo predeterminado y deniega si falta cualquier control.
- `draft` y `local` solo permiten una ejecución no certificada cuando el único control fallido es `integrity`.
- Los modos no certificados no deben utilizarse para efectos externos, acciones irreversibles ni procesamiento real que requiera certificación.
- Consentimiento, derechos, minimización, transparencia y aprobación humana no se pueden omitir en ningún modo.

```js
import { createGovernance, GovernanceDeniedError } from "@tamv/governance-sdk";

const governance = createGovernance({
  // Debe persistir en un ledger durable y autenticado.
  audit: async (event) => await auditStore.append(event),
});

try {
  const result = await governance.run({
    projectId: "id-de-proyecto-real",
    mode: "draft",
    context: {
      consent: true,
      rightsCleared: true,
      containsSensitiveData: false,
      disclosure: true,
      humanApproved: true,
      certified: false,
    },
    execute: async () => runLocalDryRun(),
  });
} catch (error) {
  if (error instanceof GovernanceDeniedError) {
    // Registrar decisión/códigos; no volcar prompts ni datos sensibles.
    console.error(error.decision.reasons);
  }
}
```

**No confíes en `certified: true` proporcionado por el cliente.** El valor debe derivarse de una verificación de servidor de la firma Ed25519, del digest autorizado y del manifiesto exacto. La SDK no contiene claves privadas ni verifica por sí misma el sello.

### 4.2 Eventos de auditoría y atomicidad

La SDK emite `policy.evaluated`, `execution.started`, `execution.succeeded` y `execution.failed`. Si falla la auditoría antes de iniciar, la ejecución no comienza. Los eventos no incluyen prompts, tokens, entradas ni salidas sin procesar por defecto.

Una escritura final de auditoría puede fallar después de que el efecto externo haya ocurrido. Para producción, el adaptador debe usar patrón outbox/transacción cuando sea posible, idempotency keys, reconciliación y alertas. El SDK no garantiza atomicidad distribuida entre un proveedor y el ledger.

## 5. Registro y aprobación de proyectos

El cliente se configura con el origen HTTPS de la aplicación y un resolver que devuelve el token de la sesión actual:

```js
import { createTamvClient } from "@tamv/governance-sdk";

const client = createTamvClient({
  baseUrl: process.env.TAMV_API_ORIGIN,
  getAccessToken: async () => session?.access_token ?? null,
});

const created = await client.create(
  "Proyecto de ejemplo",
  "Caso de uso y finalidad documentados",
);
// Inspeccionar la respuesta antes de leer el identificador.
const projectId = created.project?.id ?? created.id;
if (!projectId) throw new Error("La API no devolvió un identificador de proyecto");
```

Operaciones del cliente: `list`, `create`, `configure`, `approve`, `evaluate` y `audit`. Los campos aceptados, el formato de respuesta y `expectedVersion` deben contrastarse con el contrato del endpoint desplegado. No se deben asumir versiones fijas, ni omitir control optimista de concurrencia. Las operaciones de proyecto requieren sesión autenticada; una clave pública de Supabase no reemplaza la sesión del usuario.

## 6. Supabase, privacidad y cuotas

- Usa RLS con políticas por usuario/tenant y pruebas negativas de aislamiento entre tenants.
- No expongas claves de servicio de Supabase en navegador, skills, ejemplos, logs o artefactos.
- Comprueba consentimiento vigente y finalidad antes de procesar datos; implementa revocación y retención en el servicio persistente.
- La memoria local de proceso no es un límite de cuota distribuido. Redis/BullMQ solo se considera operativo cuando existe despliegue, autenticación, TLS según proveedor, límites, observabilidad y pruebas de recuperación.
- No declares ledger durable si los eventos solo se guardan en memoria o si no existe prueba de restauración.
- Configura secretos de proveedor en el gestor de secretos del entorno de despliegue, nunca en commits.

## 7. Audio, voz y capacidades bloqueadas

El catálogo de contratos no significa que cada capacidad esté conectada a un ejecutor. La aplicación declara generación neuronal y generación de voz como no disponibles sin ejecutor; deben seguir denegadas hasta integrar proveedor, consentimiento específico, verificación de derechos, límites de abuso, pruebas adversariales y puerta de certificación.

AudioCore puede ofrecer análisis local/procedural cuando el endpoint, la sesión, la cuota y las guardas están habilitados. No describas WAV procedural como generación neuronal. No imites una voz identificable sin autorización verificable ni eludas DRM o controles de derechos.

## 8. Integridad y firma del release

El estado documentado del release es `UNSIGNED_RELEASE_PENDING`. Para cambiarlo:

```bash
npm run tamv:hash
npm run tamv:sign
npm run tamv:verify
node --experimental-strip-types tamv-genesis/scripts/v3-seal.mjs --verify --require-signature
```

Ejecuta firma únicamente en un entorno de release autorizado, con clave Ed25519 protegida. Verifica el digest y la firma en un segundo proceso/identidad independiente. No inventes ni pegues una firma, no marques `certified=true` manualmente y no elimines la puerta fail-closed para conseguir un build verde. Los nombres de scripts y sus parámetros deben verificarse contra `package.json` y los propios scripts de la revisión que se va a firmar.

## 9. Observabilidad y respuesta a incidentes

El endpoint de métricas documentado es `/api/tamv/hypercore/metrics` y exige Bearer token. No publiques tokens en comandos registrados, capturas, CI o terminal compartida:

```bash
curl --fail-with-body --silent --show-error \
  -H "Authorization: Bearer ${TAMV_METRICS_TOKEN}" \
  "${TAMV_BASE_URL}/api/tamv/hypercore/metrics"
```

Mide al menos denegaciones de gobernanza, fallos de integridad, errores de auditoría, agotamiento de cuota, latencia y errores de proveedor. Establece alertas y una política de retención; un endpoint Prometheus sin colector ni alertas conectadas no equivale a observabilidad de producción.

## 10. Puertas de salida a producción

- [ ] Cuatro skills públicas y 37 contratos internos coinciden con los manifiestos y sus rutas.
- [ ] Pruebas de SDK pasan: `node --test sdk/tests/*.test.mjs`.
- [ ] Release firmado y verificado con clave autorizada; digest aprobado independientemente.
- [ ] RLS y pruebas negativas por usuario/tenant completadas en una base desechable.
- [ ] Consentimiento y revocación persisten y pueden auditarse.
- [ ] Cuotas distribuidas probadas con concurrencia, reinicio y fallo de Redis.
- [ ] Proveedores externos y ejecutores están configurados, autenticados y sometidos a pruebas de abuso.
- [ ] Backup/restauración, recuperación, alertas, rotación de secretos e incident response probados.
- [ ] Suite ISA-FLOW ejecutada con versión de modelo/runtime, conjunto de casos, resultados, fallos críticos e intervalos estadísticos.
- [ ] Auditoría independiente y revisión legal antes de afirmar cumplimiento formal.

La existencia de este manual o de los contratos no prueba TRL 7–8, cumplimiento SOC 2/NIST, certificación, seguridad total ni despliegue operativo. Publica esas afirmaciones solo con evidencia reproducible y revisada independientemente.
