# Registro de deuda técnica y evidencia de producción

Este documento registra advertencias y bloqueos observados en CI, sin confundirlos con errores de ejecución ni declarar un cierre que no se haya demostrado.

## Hallazgos observados en CI

| Hallazgo | Evidencia | Tratamiento |
|---|---|---|
| Advertencias Fast Refresh | 7 advertencias ESLint en componentes UI | Separar exports no-componentes cuando sea seguro; revisar visualmente cada componente y no silenciar la regla global |
| API de validación de TanStack Start obsoleta | 8 advertencias de `createServerFn().inputValidator()` en `project.functions.ts`, `content.functions.ts` y `governance.functions.ts` | Migrar solo mediante cambio de fuente y actualización de la atestación/firma de release |
| Aviso de tamaño de chunk | Vite advierte que un chunk supera el umbral | Analizar composición real y dividir rutas/paquetes solo donde reduzca el coste de carga |
| Advertencias de Node/transitivas | `punycode` y `url.parse()` durante herramientas/dependencias | Identificar dependencia de origen antes de actualizar; no editar paquetes instalados ni ocultar avisos |
| Configuración de producción incompleta | El preflight de CI reportó 14 ajustes ausentes o inválidos en la ejecución observada | Configurar mediante gestor de secretos y volver a ejecutar el preflight; la presencia no demuestra conectividad ni validez |
| Firma de release | La certificación distingue integridad de fuente y firma de release | No declarar distribución certificada sin clave pública de confianza, manifiesto aprobado y firma verificable |

Los siete avisos Fast Refresh estaban localizados en:

- `src/components/governance-projects.tsx`
- `src/components/ui/badge.tsx`
- `src/components/ui/button.tsx`
- `src/components/ui/form.tsx`
- `src/components/ui/navigation-menu.tsx`
- `src/components/ui/sidebar.tsx`
- `src/components/ui/toggle.tsx`

## Restricción de integridad

Los módulos de servidor de proyectos, contenido y gobernanza forman parte de las fuentes verificadas por la certificación TAMV. No se deben modificar y presentar como listos sin actualizar el inventario de hashes y producir una firma válida con la clave de release autorizada. La clave privada no debe almacenarse en el repositorio ni en este documento.

## Criterios de cierre

- [ ] Refactorizar los exports de Fast Refresh y confirmar lint sin advertencias relevantes.
- [ ] Migrar la API obsoleta con una nueva atestación y firma válida.
- [ ] Investigar el chunk de producción con reporte de composición.
- [ ] Resolver avisos transitivos mediante actualizaciones compatibles y pruebas.
- [ ] Aplicar migraciones de billing en Supabase de prueba y ejecutar pruebas de RPC/RLS con roles reales.
- [ ] Probar Stripe en modo test: checkout, eventos duplicados, cancelación, renovación y reintentos.
- [ ] Configurar secretos y ejecutar el preflight estricto en el entorno de despliegue.
- [ ] Verificar la firma del artefacto y el SHA desplegado, guardar logs de pruebas y comprobar rollback.

## Estado de producción

El CI verde verifica la construcción y pruebas ejecutadas por el workflow; no certifica por sí solo el entorno externo, la conectividad con Supabase/Stripe, las migraciones aplicadas ni el despliegue. Hasta adjuntar esas evidencias, el estado debe seguir marcado como pendiente.
