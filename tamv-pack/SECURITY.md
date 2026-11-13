# Security Policy — TAMV Creator Intelligence Pack

## Alcance

La seguridad cubre el instalador, el manifiesto, las skills, la función de revisión, la atribución y el flujo de publicación.

## Reporte de vulnerabilidades

No publiques secretos, tokens, datos personales ni pruebas que afecten a usuarios en issues públicos. Reporta hallazgos por un canal privado administrado por el propietario del repositorio e incluye pasos mínimos, impacto, alcance y versión afectada.

## Controles implementados

- Validación del manifiesto y del inventario de skills antes de instalar.
- Inventario de objetos Git para detectar cambios, archivos faltantes o agregados en el pack.
- Verificación SHA-512 de la atribución en tiempo de ejecución.
- Soporte para sobres autenticados HMAC-SHA-384 con clave derivada con PBKDF2/SHA-384, mantenida fuera del repositorio.
- Consentimiento explícito en revisión creativa; los borradores no se guardan ni publican automáticamente.
- CI comprueba archivos de entorno versionados, patrones comunes de secretos, scripts, tests y build.

## Gestión de secretos

- No deben versionarse archivos .env locales.
- Solo las plantillas .env.example pueden contener nombres de variables y marcadores.
- SUPABASE_SERVICE_ROLE_KEY, credenciales AI y secretos HMAC se guardan exclusivamente en el gestor de secretos.
- Las variables VITE_* son públicas y no deben contener secretos.
- Si se expone una credencial privada, revócala y genera otra. Borrar el archivo en un commit posterior no elimina el historial anterior.

## Respuesta ante alteración de integridad

Una discrepancia debe detener la operación afectada, producir un error auditable y exigir inspección. No se permite borrar archivos del usuario ni ejecutar autodestrucción automática como mecanismo de licencia.

El inventario Git es una referencia versionada y no sustituye una firma independiente de release, reglas de protección de rama ni revisión de código.
