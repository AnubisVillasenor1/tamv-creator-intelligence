# Guía de inicio para principiantes

## 1. Define el resultado

Escribe en una frase qué quieres conseguir, para quién y cómo comprobarás que quedó terminado. Evita comenzar eligiendo herramientas sin conocer el objetivo.

## 2. Abre o crea un proyecto

Usa la sección **Proyectos**. Asigna un nombre reconocible, responsable, objetivo y límites. No mezcles trabajos sin relación en un único proyecto.

## 3. Selecciona skills

Abre **Skills** o el **Atlas**. Revisa descripción, entradas, salidas y dependencias. Un contrato no instala automáticamente una integración ni concede permisos. Los blueprints deben identificarse como propuestas.

## 4. Prepara datos y permisos

Usa únicamente datos que tengas derecho a procesar. Confirma licencias, consentimiento, acceso mínimo y requisitos de retención. Nunca compartas contraseñas, tokens, claves privadas ni datos personales innecesarios con el asistente.

## 5. Ejecuta y verifica

Sigue los pasos indicados, revisa cada resultado y guarda evidencia útil. Si una comprobación falla, detente, conserva el mensaje de error sin secretos y vuelve al paso anterior. No marques como terminado un flujo que no hayas verificado.

## 6. Pide ayuda al asistente

Describe el objetivo, la pantalla en la que estás, lo que ya intentaste y el error exacto sin incluir secretos. Pide instrucciones numeradas, prerequisitos, resultado esperado y forma de recuperarte si algo falla. El asistente orienta; no ejecuta acciones externas.

## 7. Cambios sensibles

Migraciones de base de datos, permisos, pagos, despliegues, rotación de claves y cambios de identidad requieren revisión adicional. Un build local no sustituye pruebas de integración ni aprobación de producción.

## Resolución básica de problemas

- **La ruta no abre:** confirma que la ruta esté registrada y que el build haya regenerado el árbol de rutas.
- **No hay respuesta de IA:** comprueba la sesión y que las variables del proveedor estén configuradas en el servidor.
- **No se refleja un pago:** no repitas el cobro a ciegas; revisa el estado de checkout y el webhook mediante soporte autorizado.
- **Falla CI:** usa el SHA exacto del commit, identifica el primer gate fallido y corrige la causa antes de volver a ejecutar.
