# Política de tamaño y propiedad del README

## Propósito

El README raíz es una portada técnica y un mapa de entrada, no un archivo acumulativo de todas las decisiones, auditorías, resultados de CI y manuales.

## Límites

- Objetivo: máximo 100 líneas y 8.000 caracteres.
- Mantener: descripción, estado y límites, inicio rápido, comandos principales, enlaces a documentación, seguridad de secretos, licencia y atribución requerida.
- Mover a `docs/`: procedimientos completos, decisiones de arquitectura, reportes fechados, catálogos extensos, changelogs, matrices de pruebas y evidencia de despliegue.
- No duplicar el mismo contenido en README, wiki, FAQ y auditorías. Cada tema debe tener una fuente canónica.
- Los informes históricos no representan el estado actual a menos que se vuelvan a verificar.

## Cambio del README protegido

El README forma parte del inventario de integridad de `tamv-attribution.json`. Si cambia su contenido, actualiza su SHA-256 usando el flujo oficial `bun run tamv:hash`, revisa el diff del manifest y vuelve a ejecutar `bun run tamv:check`. No inventes una firma ni reemplaces el marcador de firma pendiente. El hash garantiza integridad del contenido, no identidad del autor ni firma criptográfica.

## Mantenimiento

El CI debe validar el tamaño del README y los enlaces mantenidos. Si el contenido crece, no aumentes el límite para acomodar una acumulación: mueve el material al documento especializado y enlázalo desde el índice.
