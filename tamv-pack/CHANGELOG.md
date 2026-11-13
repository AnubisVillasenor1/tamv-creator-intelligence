# Changelog

## 1.2.1 — Atribución canónica y herramientas reproducibles

- Unifica la atribución textual del paquete con el contrato canónico TAMV.
- Hace idempotente la inyección de atribución y prueba que no se duplique.
- Corrige la escritura final del inventario para que `--write` produzca JSON válido.
- Valida la coherencia entre la versión de `pack.json` y la del instalador.

## 1.2.0 — Integridad y endurecimiento del repositorio

- Añade validación de atribución en el servidor antes de enviar borradores al proveedor de IA.
- Incorpora TAMV Sovereign Core con SHA-512, PBKDF2/SHA-384 y autenticación HMAC/SHA-384 para sobres de integridad.
- Añade inventario reproducible de objetos Git para detectar archivos alterados, faltantes o agregados.
- Hace que el instalador rechace manifiestos inválidos o diferencias de integridad antes de escribir en el proyecto destino.
- Retira el archivo de entorno del árbol versionado e incorpora una plantilla sin credenciales.
- Amplía GitHub Actions para validar higiene, scripts, pruebas y build de producción.

## 1.1.0

- Añade 20 skills gobernadas y el grafo de dependencias.
- Conserva consentimiento humano, auditoría y atribución institucional.
