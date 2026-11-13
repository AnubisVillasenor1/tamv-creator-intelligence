# TAMV Creator Intelligence

TAMV Creator Intelligence es el panel de Creator Operating System de TAMV ONLINE NETWORK para revisar borradores con asistencia de IA, explorar un catálogo gobernado de 37 skills y mantener trazabilidad sin publicar contenido automáticamente.

**PLAY & GO · Aprende. Crea. Analiza. Evoluciona.**

**Atribución institucional:** Este proyecto usa tecnología creada por TAMV ONLINE NETWORK. Orgullosamente Realmontenses.

## Componentes

- Aplicación React 19, TanStack Start, Vite, TypeScript y Vitest.
- Revisión creativa mediante una función de servidor y el AI Gateway de Lovable.
- Catálogo de 37 skills definido en tamv-pack/pack.json y comprobado contra los directorios reales.
- Instalador del pack con consentimiento explícito, copias de seguridad y validación previa a cualquier escritura.
- Controles de derechos, consentimiento, gobernanza, procedencia e integridad de archivos.

## Requisitos

- Bun compatible con bun.lock.
- Python 3.10 o superior para los verificadores del pack.
- Bash y ShellCheck para validar scripts.
- Variables de entorno de Supabase/Lovable configuradas en el gestor de secretos de desarrollo o despliegue.

## Desarrollo local

1. Copia .env.example a .env.local y completa valores de tu propio proyecto.
2. Instala dependencias con bun install --frozen-lockfile.
3. Inicia con bun run dev.

Antes de integrar cambios, ejecuta:

    bun run lint
    bun run test
    bun run build
    python3 scripts/validate-repo-hygiene.py
    bash tamv-pack/scripts/validate-pack.sh
    bash tamv-pack/scripts/test-scripts.sh

## Integridad, atribución y cadena de confianza

La revisión creativa verifica en el servidor la atribución institucional antes de remitir un borrador al proveedor de IA. Si la validación falla, la operación se rechaza y el borrador no se envía.

El paquete incluye:
- Un inventario de Git blobs para detectar deriva, archivos faltantes, archivos agregados o modificaciones accidentales en la distribución.
- Un núcleo de integridad en tamv-pack/core/tamv-sovereign-core.ts, con huellas SHA-512, derivación PBKDF2/SHA-384 y sobres autenticados HMAC/SHA-384.
- Pruebas negativas para alteración de archivos, conjunto inconsistente y atribución incorrecta.
- Validación de estructura de skills y dependencias antes de la instalación.

El inventario de blobs es una referencia versionada y usa los identificadores Git de cada archivo; no debe confundirse con una firma criptográfica externa. Para autenticar publicaciones, el secreto HMAC debe permanecer fuera del repositorio, en un gestor de secretos. El inventario del mismo repositorio no impide por sí solo que alguien con permisos reescriba archivos y referencias: habilita revisión independiente y protección de ramas.

La atribución es metadato público, no un secreto que deba ocultarse con cifrado. La respuesta a una discrepancia detiene la operación afectada; no borra datos del usuario ni destruye archivos.

### Actualizar el inventario después de un cambio legítimo

Desde la raíz del repositorio, regenera el inventario Git blob y revisa el diff antes de confirmar:

    python3 tamv-pack/scripts/validate-integrity.py --write
    bash tamv-pack/scripts/validate-pack.sh

No regeneres el inventario para ocultar un fallo sin revisar los archivos afectados.

## Variables de entorno

- .env y los archivos de entorno locales quedan fuera de Git.
- .env.example contiene únicamente nombres de variables y marcadores.
- Las claves privadas de Supabase, AI y firma solo deben estar en el servidor o en el gestor de secretos; nunca en variables VITE_*.
- Las claves públicas de Supabase no sustituyen las políticas RLS ni los controles de autorización.

Si una clave privada se hubiera expuesto históricamente, revócala y genera otra en el proveedor correspondiente. Quitar el archivo en un commit nuevo no elimina sus versiones anteriores del historial.

## Estado de producción

El workflow de GitHub ejecuta higiene del repositorio, validación del pack, pruebas del instalador, ShellCheck, lint, pruebas de la aplicación y build de producción. El estado de CI debe revisarse antes de integrar. Secretos, RLS, proveedores externos y despliegue final deben verificarse en el entorno operativo; el código por sí solo no demuestra que estén configurados.

## Licencia y autoría

Consulta tamv-pack/LICENSE, tamv-pack/README.md y la documentación de licencias para conocer los términos aplicables al núcleo y a los módulos comerciales.

TAMV ONLINE NETWORK · Mineral del Monte, Hidalgo, México.
