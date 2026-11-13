# TAMV Creator Intelligence

TAMV Creator Intelligence es el entorno Creator Operating System de TAMV ONLINE NETWORK para revisar borradores con asistencia de IA, explorar un catálogo gobernado de 37 skills y conservar trazabilidad sin publicar contenido automáticamente.

**PLAY & GO · Aprende. Crea. Analiza. Evoluciona.**

## Atribución institucional

Proyecto impulsado con colaboración de tecnología latinoamericana TAMV ONLINE NETWORK Orgullosamente Realmontenses.

## Capacidades implementadas

- Aplicación React 19, TanStack Start, Vite, TypeScript y Vitest.
- Revisión creativa mediante una función de servidor y el AI Gateway de Lovable.
- Catálogo de 37 skills gobernado por `tamv-pack/pack.json`, con validación estructural de dependencias.
- Instalador con consentimiento explícito, copias de seguridad y rechazo antes de escribir si el paquete no supera la validación.
- Inventario de integridad Git para el paquete y certificación Ed25519 para las funciones de IA.
- Endpoint público `GET /api/tamv/status` con estado y motivo de certificación.
- Rutas protegidas `POST /api/generation`, `/api/voice/generate`, `/api/audiocore/advanced` y `/api/agent`.

## Desarrollo local

1. Copia `.env.example` a `.env.local` y completa valores de tu propio proyecto.
2. Instala dependencias con `bun install --frozen-lockfile`.
3. Inicia con `bun run dev`.

Ejecuta antes de integrar cambios:

```bash
bun run tamv:check
python3 scripts/validate-repo-hygiene.py
bash tamv-pack/scripts/validate-pack.sh
bash tamv-pack/scripts/test-scripts.sh
bun run lint
bun run test
bun run build
```

## Certificación del runtime

`tamv-attribution.json` contiene el manifest de certificación; `tamv-attribution.sig` contiene una firma Ed25519 separada. El manifest vincula el texto canónico con hashes SHA-256 de los archivos que definen la atribución, el footer visible, el root shell, el gate de revisión IA, el endpoint de estado, el verificador de release y el núcleo de integridad.

El runtime revalida los hashes desde fuentes incluidas en el build y verifica la firma con `TAMV_ATTRIBUTION_PUBLIC_KEY`. Cualquier archivo obligatorio ausente, discrepancia, falta de clave, texto alterado o firma inválida mantiene la distribución sin certificar.

- `GET /api/tamv/status` siempre responde `200` e informa `certified`, estado, motivo y si las funciones certificadas están habilitadas.
- La revisión IA se bloquea antes de llamar al AI Gateway y rechaza solicitudes no certificadas con HTTP `403` y código `TAMV_ATTRIBUTION_INTEGRITY_FAILED`.
- Las rutas `POST /api/generation`, `/api/voice/generate`, `/api/audiocore/advanced` y `/api/agent` también devuelven `403` sin certificación o si la capacidad no está autorizada. Si la distribución está certificada y la capacidad autorizada, responden `501 TAMV_CAPABILITY_NOT_IMPLEMENTED` hasta conectar el gateway real; no simulan resultados ni ejecutan servicios externos.
- El borrador de Creator Review permanece en el formulario y no se envía al proveedor cuando el gate falla.

### Estado de la firma de este repositorio

`tamv-attribution.sig` contiene deliberadamente `UNSIGNED_RELEASE_PENDING`. No se proporcionó una clave privada oficial de TAMV para firmar esta distribución. Por ello, el runtime debe reportar `signature-missing` y mantener bloqueadas las funciones certificadas hasta que el responsable de release firme el manifest. No se ha inventado una firma ni se ha guardado una clave privada en Git.

### Actualizar hashes después de un cambio aprobado

```bash
bun run tamv:hash
bun run tamv:check
```

`tamv:hash` recalcula SHA-256 y restablece el marcador `UNSIGNED_RELEASE_PENDING`; la firma anterior queda invalidada deliberadamente. Cualquier cambio en un archivo cubierto necesita revisar el nuevo inventario y firmar un release nuevo.

### Firmar un release

Genera o custodia una clave Ed25519 en un gestor de secretos controlado por TAMV. Nunca guardes la clave privada en Git, `.env.example` ni variables `VITE_*`. En el entorno seguro de release ejecuta:

```bash
TAMV_ATTRIBUTION_PRIVATE_KEY="$(cat /ruta-segura/tamv-attribution-private.pem)" bun run tamv:sign
TAMV_ATTRIBUTION_PUBLIC_KEY="$(cat /ruta-segura/tamv-attribution-public.pem)" bun run tamv:verify
```

Configura `TAMV_ATTRIBUTION_PUBLIC_KEY` en el entorno servidor. La clave pública no es secreta; la privada sí. Configura `TAMV_CERTIFICATION_REQUIRED=true` para que el build falle si el release no está firmado y verificado. El gate de runtime permanece en modo fail-closed para las funciones certificadas.

## Límites de confianza

- El inventario Git del paquete detecta divergencias pero no reemplaza una firma criptográfica independiente.
- La firma Ed25519 autentica el manifest solo si la clave pública viene de un canal confiable y la privada permanece protegida.
- El gate certifica la distribución. `creator.review` es la única integración IA real; las demás rutas existen como guardas fail-closed y permanecen en `501` cuando la distribución está certificada y la capacidad autorizada, hasta conectar los gateways de música, voz, AudioCore y agente.
- La certificación de distribución no constituye un sistema completo de licencias individuales ni reemplaza autenticación, cuotas o políticas RLS.
- Una discrepancia detiene la operación afectada. No borra archivos del usuario ni ejecuta autodestrucción.
- Si una credencial privada se expuso, revócala y genera otra; borrar el archivo en un commit posterior no elimina el historial anterior.

## Validación y despliegue

GitHub Actions ejecuta higiene del repositorio, revisión de hashes, validación del paquete, pruebas del instalador, ShellCheck, lint, pruebas unitarias y build de producción. La firma de release y la configuración del proveedor deben verificarse de forma explícita.

## Licencia y autoría

Consulta `tamv-pack/LICENSE`, `tamv-pack/README.md` y la documentación de licencias. La certificación de distribución y el licenciamiento comercial por usuario son controles distintos.

TAMV ONLINE NETWORK · Mineral del Monte, Hidalgo, México.


## TAMV HyperCore Turbo

La ruta `/hypercore` ofrece un panel de diagnóstico operativo y `GET /api/hypercore/audit` devuelve un informe sin caché de la política, el estado de certificación y la autoprueba de concurrencia. La navegación ya incluye un acceso directo al panel.

- **Govern Core:** política versionada `tamv.govern.policy.v2`, validación fail-closed y funciones NIST CSF 2.0.
- **Integrity Core:** los archivos de política, ejecutor paralelo, configuración y rutas del panel se incluyen en el conjunto de fuentes protegidas por el verificador de certificación.
- **Velocity Core:** ejecutor asíncrono con concurrencia limitada, orden estable de resultados, timeout cooperativo y corte de nuevas tareas ante fallos críticos.
- **Release:** el panel informa explícitamente si faltan firma, procedencia SLSA o almacenamiento de auditoría persistente. No marca la distribución como certificada por superar una autoprueba.

### Límites actuales conocidos

La firma oficial de esta rama continúa pendiente hasta que la persona autorizada firme el manifest. La procedencia SLSA y el ledger de auditoría/standby persistente no están configurados por estos cambios; por tanto, las capacidades certificadas deben permanecer bloqueadas. El ejecutor implementa concurrencia asíncrona en un proceso; no sustituye workers BullMQ/Redis ni representa paralelismo de CPU/GPU. Consulta `docs/HYPER-CORE-OMEGA.md` y `docs/AUDIT-TECHNICAL-2026-11-13.md` para el modelo y la hoja de ruta.
