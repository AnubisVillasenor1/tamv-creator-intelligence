# TAMV Creator Intelligence — documento público de divulgación

**Versión del documento:** 1.0  
**Fecha de revisión:** 15 de noviembre de 2026  
**Proyecto:** TAMV Creator Intelligence  
**Repositorio público:** https://github.com/AnubisVillasenor1/tamv-creator-intelligence  
**Responsabilidad institucional:** TAMV ONLINE NETWORK  
**Dirección creativa e impulsor del proyecto:** Anubis Villaseñor  
**Origen declarado:** Real del Monte, Hidalgo, México

## Resumen ejecutivo

TAMV Creator Intelligence es un proyecto de software abierto orientado a ayudar a creadores, equipos de producto, educadores y comunidades a trabajar con inteligencia artificial bajo reglas explícitas de supervisión humana, trazabilidad, integridad de artefactos y protección de derechos. Su principio rector es: **la IA propone; las personas autorizadas deciden**.

El repositorio reúne una aplicación web, un paquete de habilidades y contratos para agentes compatibles, utilidades de gobernanza e integridad, herramientas de validación y documentación operativa. La intención es ofrecer una base reutilizable para diseñar flujos asistidos por IA sin confundir una recomendación generada por un modelo con una autorización, una acción ejecutada o una prueba de que el resultado ocurrió.

Este documento describe el alcance de forma pública y deliberadamente omite secretos, credenciales, valores de configuración privados, identificadores de infraestructura no necesarios, detalles que faciliten el abuso y procedimientos internos de operación privilegiada.

## Qué problema aborda

Los sistemas que incorporan IA pueden mezclar propuestas, decisiones y acciones en un mismo flujo. Esto dificulta saber qué se solicitó, qué versión se utilizó, qué política se aplicó, quién autorizó una acción y qué evidencia demuestra el resultado.

TAMV Creator Intelligence busca separar esas responsabilidades:

- **Asistencia:** apoyar la ideación, revisión, planificación y organización del trabajo creativo.
- **Gobernanza:** describir reglas, consentimiento, límites y puntos de decisión humana.
- **Integridad:** relacionar el software y los artefactos con huellas criptográficas verificables.
- **Trazabilidad:** conservar referencias de operaciones y evidencia sin almacenar innecesariamente contenido creativo o datos personales.
- **Transparencia:** distinguir entre capacidades documentadas, implementadas, probadas y operadas en un entorno real.
- **Portabilidad:** mantener el núcleo lo más independiente posible de un proveedor concreto.

## Componentes principales

### 1. Aplicación web

La interfaz proporciona superficies de trabajo para revisión creativa, exploración de habilidades, información de modelos y gobernanza. La disponibilidad de una pantalla o contrato no implica que todos los servicios externos estén conectados ni que una función tenga autorización para ejecutar acciones sobre sistemas de terceros.

### 2. Habilidades públicas

El paquete define cuatro habilidades coordinadoras:

| Habilidad | Propósito |
|---|---|
| `tamv-creator-os` | Organización de identidad creativa, estrategia, contenidos, lanzamientos y comunidad. |
| `tamv-audio-intelligence` | Flujos de trabajo para audio y multimedia, con límites explícitos cuando no hay ejecutores conectados. |
| `tamv-growth-engine` | Planificación de descubrimiento, comunicación, conversión y monetización responsable. |
| `tamv-sovereign-platform` | Gobernanza, integridad, seguridad, pruebas y operación de la plataforma. |

Estas habilidades coordinan contratos y reglas. No deben interpretarse como cuatro servicios autónomos ni como prueba de que cada capacidad descrita está disponible en producción.

### 3. Contratos internos

Los contratos internos definen entradas, salidas, condiciones, restricciones y salvaguardas para tareas especializadas. Su existencia facilita la validación y la reutilización, pero un documento de contrato no demuestra por sí solo que exista un ejecutor conectado.

### 4. Gobernanza de operaciones y evidencia

El código incorpora un contrato de recibos de gobernanza y una ruta autenticada para registrar intenciones operativas. El flujo de registro **no despliega, publica, instala, actualiza ni ejecuta por sí mismo** la operación solicitada. Una respuesta que confirma el registro de una intención no significa que el trabajo haya comenzado o concluido.

El diseño exige vincular las operaciones con referencias de origen y artefacto, aplicar controles del lado del servidor y requerir evidencia verificable antes de considerar una operación exitosa. El almacenamiento duradero depende de la configuración y el aprovisionamiento del servicio de datos correspondiente.

### 5. Integridad y certificación

El repositorio incluye comprobaciones de hashes, validación del paquete y soporte de firma/verificación. Una huella SHA-256 identifica contenido, pero no demuestra por sí sola quién lo publicó. Una firma sólo es confiable si se verifica correctamente y la clave pública de confianza está autenticada por un canal independiente.

El estado de certificación debe consultarse en los artefactos y ejecuciones del release concreto. No se debe asumir que el paquete está firmado, certificado o aprobado para producción por el mero hecho de que existan scripts para hacerlo.

## Cómo funciona el flujo previsto

1. Una persona inicia una tarea y aporta únicamente la información necesaria.
2. La aplicación valida la solicitud y las restricciones aplicables.
3. La habilidad o el módulo pertinente prepara una propuesta.
4. Las comprobaciones de gobernanza determinan qué puede continuar y qué requiere autorización humana.
5. Si existe un ejecutor aprobado, éste opera dentro de permisos delimitados; en ausencia de éste, el sistema debe detenerse o limitarse a registrar la intención.
6. Las pruebas y verificaciones independientes producen evidencia vinculada al artefacto y a la revisión exactos.
7. El resultado se presenta con su estado real: propuesto, bloqueado, fallido, pendiente o verificado. No se debe declarar éxito sólo porque una solicitud fue aceptada.

## Tecnologías y diseño

El repositorio utiliza TypeScript y herramientas del ecosistema web moderno, con pruebas automatizadas, validación estática, integración continua y un diseño de aplicación que contempla servicios de identidad y persistencia. Algunos adaptadores y servicios externos se consideran extensiones opcionales y no deben presentarse como conectados sin pruebas verificables.

La arquitectura busca mantener separadas estas dimensiones:

- capacidad técnica;
- identidad y autoridad;
- autorización de una acción;
- ejecución efectiva;
- evidencia independiente;
- aprendizaje o actualización;
- disponibilidad en producción.

Esta separación evita que una salida de IA se trate como permiso para realizar acciones sensibles.

## Privacidad y seguridad

El proyecto sigue una estrategia de minimización: no incluir credenciales, claves privadas, datos personales innecesarios, prompts privados, contenido creativo sensible ni URLs temporales firmadas en artefactos de auditoría.

Los controles previstos incluyen validación de entradas, autenticación del lado del servidor, denegación por defecto ante dependencias ausentes, separación de secretos del código de navegador, pruebas automatizadas y revisión de integridad. La eficacia real de cada control depende de su implementación, configuración y validación en el entorno que lo ejecuta.

**No se publica en este documento** información de acceso, valores secretos, claves privadas, configuraciones privadas, datos de usuarios ni instrucciones operativas privilegiadas.

## Estado y límites conocidos

La transparencia requiere distinguir entre intención de diseño y capacidad comprobada. En la revisión del 15 de noviembre de 2026:

- Existe código de aplicación, paquete de habilidades, contratos, pruebas y herramientas de validación.
- La ruta de recibos registra intenciones; no constituye un ejecutor de despliegue.
- El esquema de persistencia de recibos está documentado como especificación para el flujo de administración de datos; su disponibilidad efectiva debe confirmarse en el proyecto conectado.
- La limitación de solicitudes y las métricas que dependen de memoria local no equivalen a controles distribuidos entre instancias.
- Las integraciones con proveedores de nube, analítica, almacenamiento o ejecución sólo pueden considerarse operativas cuando haya adaptadores, pruebas y evidencia del entorno.
- La firma de un release y su procedencia deben verificarse para la revisión exacta distribuida.
- No se afirma que la deuda técnica sea cero ni que exista certificación integral de producción.

Los criterios y tareas pendientes se mantienen en el repositorio y deben actualizarse a partir de resultados reproducibles, no de porcentajes estimados.

## Quién crea y mantiene el proyecto

TAMV Creator Intelligence forma parte del ecosistema de TAMV ONLINE NETWORK. El proyecto identifica a **Anubis Villaseñor** como su impulsor y dirección creativa. Las contribuciones, decisiones técnicas y estado de mantenimiento deben verificarse mediante el historial público del repositorio, sus revisiones y los artefactos publicados.

## Licencias y uso

El repositorio declara una licencia base AGPL-3.0-only y menciona licencias complementarias para componentes o usos específicos. Antes de redistribuir o incorporar una parte concreta, se debe consultar el archivo de licencia aplicable a ese componente y los avisos de atribución incluidos en el repositorio. Este documento no constituye asesoría legal.

## Cómo evaluar el proyecto

Se recomienda a investigadores, desarrolladores, instituciones y posibles colaboradores:

1. Revisar el código y la documentación del repositorio.
2. Ejecutar las pruebas en un entorno aislado y registrar la revisión exacta evaluada.
3. Confirmar los resultados de CI para ese mismo commit.
4. Verificar las dependencias y la configuración sin compartir secretos.
5. Comprobar la firma y procedencia del artefacto cuando se publique un release.
6. No conectar ejecutores de acciones externas hasta contar con autorización, controles de recuperación, pruebas de concurrencia y evidencia independiente.
7. Reportar vulnerabilidades por un canal privado y no incluir secretos o datos personales en issues públicos.

## Principio de responsabilidad

TAMV Creator Intelligence pretende contribuir a una infraestructura digital más verificable y centrada en las personas. Su criterio de éxito no es la cantidad de capacidades descritas, sino la proporción de capacidades que pueden demostrarse de forma reproducible, segura y útil.

**La IA propone; las personas autorizadas deciden. La evidencia determina qué puede afirmarse.**
