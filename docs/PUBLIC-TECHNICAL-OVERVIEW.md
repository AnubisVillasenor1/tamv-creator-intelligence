# TAMV Creator Intelligence — Documento público de divulgación técnica

**Versión del documento:** 1.0  
**Fecha:** 15 de noviembre de 2026  
**Estado del producto:** desarrollo activo; no constituye una certificación de producción.  
**Repositorio oficial:** https://github.com/AnubisVillasenor1/tamv-creator-intelligence

## 1. Resumen ejecutivo

**TAMV Creator Intelligence** es un proyecto de software de TAMV ONLINE NETWORK orientado a organizar el uso de inteligencia artificial (IA) en procesos creativos, de desarrollo, crecimiento digital y operación de plataformas. Su objetivo es que las capacidades asistidas por IA sean más trazables, revisables y respetuosas de los derechos de las personas.

El principio rector es: **la IA propone; la persona autorizada decide**. La plataforma busca distinguir entre una recomendación generada por IA, una decisión humana, una operación realmente ejecutada y la evidencia independiente de su resultado. Esa separación ayuda a evitar que una respuesta plausible se confunda con una acción realizada o con un resultado verificado.

El proyecto combina contratos y skills modulares, validaciones de entrada, controles de gobernanza, mecanismos de integridad de artefactos, pruebas automatizadas y documentación operativa. Algunas piezas son ejecutables; otras son contratos, prototipos o integraciones pendientes. Este documento distingue esos estados y no presenta objetivos de arquitectura como funciones ya disponibles.

## 2. Autoría, origen y responsabilidad

- **Iniciativa institucional:** TAMV ONLINE NETWORK.
- **Dirección creativa pública del proyecto:** Anubis Villaseñor.
- **Repositorio y código fuente:** https://github.com/AnubisVillasenor1/tamv-creator-intelligence
- **Origen declarado en los materiales del proyecto:** Real del Monte, Hidalgo, México.
- **Ecosistema de origen:** PLAY & GO, dentro del ecosistema TAMV.

La atribución anterior describe la identidad pública declarada en los materiales del repositorio. No debe interpretarse como una certificación de personalidad jurídica, titularidad exclusiva de todos los componentes, aval gubernamental, acreditación académica ni asociación comercial con terceros. La autoría y las licencias de cada componente deben verificarse en los avisos y archivos de licencia correspondientes.

## 3. ¿Qué problema intenta resolver?

Los sistemas que integran IA suelen combinar modelos, instrucciones, herramientas, datos, servicios externos y acciones que pueden tener consecuencias reales. Sin controles claros, resulta difícil responder preguntas como:

- ¿Qué versión del software produjo un resultado?
- ¿Qué datos se enviaron a un proveedor?
- ¿La persona usuaria dio su consentimiento?
- ¿La IA solo recomendó una acción o un servicio la ejecutó realmente?
- ¿Qué evidencia respalda una afirmación de éxito?
- ¿Cómo se impide que una capacidad no autorizada se active por accidente?
- ¿Cómo se distingue una función operativa de una función que solo está documentada?

TAMV Creator Intelligence pretende proporcionar un marco común para contestar estas preguntas mediante contratos explícitos, límites de autoridad, verificaciones reproducibles y estados de implementación transparentes.

## 4. Organización funcional

El paquete declara cuatro skills públicas coordinadoras:

| Skill | Área | Finalidad |
|---|---|---|
| `tamv-creator-os` | Creador | Organizar identidad creativa, estrategia, contenido, lanzamientos, comunidad y aprendizaje. |
| `tamv-audio-intelligence` | Audio y multimedia | Estructurar flujos de producción de audio, voz, análisis y recursos visuales. |
| `tamv-growth-engine` | Crecimiento digital | Apoyar planificación de contenidos, SEO, conversión, comunicación y monetización ética. |
| `tamv-sovereign-platform` | Plataforma y gobernanza | Reunir prácticas de integridad, políticas, pruebas, seguridad y operación. |

El repositorio también declara una biblioteca de contratos internos. Los números de inventario deben entenderse como datos del paquete que deben comprobarse con validadores del repositorio, no como una certificación independiente de cobertura o madurez.

Una *skill* es una unidad modular de instrucciones y contratos que puede ayudar a coordinar un trabajo. Su existencia no implica que todos los proveedores, modelos o servicios descritos por ella estén conectados.

## 5. Arquitectura conceptual

El sistema se puede entender en cinco capas:

1. **Interfaz y skills:** organizan las tareas que la persona quiere realizar y los contratos aplicables.
2. **Validación y gobernanza:** comprueban formato, permisos, consentimiento y políticas pertinentes antes de permitir una capacidad.
3. **Capa de IA:** cuando está configurada, envía solicitudes a un gateway o proveedor autorizado y devuelve resultados que deben tratarse como salidas del modelo, no como hechos automáticamente certificados.
4. **Integridad y evidencia:** relacionan versiones, huellas criptográficas y metadatos de operación con los artefactos y resultados disponibles.
5. **Verificación y supervisión humana:** separan las pruebas automáticas de la autorización humana y de la verificación del destino real.

El diseño favorece la denegación por defecto cuando falta una condición de seguridad obligatoria (*fail-closed*). Este principio solo se considera cumplido para una función concreta cuando su implementación y sus pruebas demuestran el comportamiento esperado.

## 6. ¿Cómo funciona un flujo gobernado?

El flujo objetivo se organiza de la siguiente manera:

1. La persona solicita una tarea.
2. El sistema valida la entrada y determina qué capacidad corresponde.
3. Se comprueban autenticación, autorización, consentimiento y reglas aplicables.
4. Si está habilitado, el sistema solicita asistencia a un modelo o servicio permitido.
5. La respuesta se valida y se presenta con los límites pertinentes.
6. Si se propone una operación externa, esta requiere una autorización independiente acorde con su riesgo.
7. Las pruebas y el estado real del destino deben verificarse antes de declarar éxito.
8. Se conserva solo la evidencia necesaria, evitando incluir secretos o datos personales innecesarios.

Este flujo es el modelo de referencia. No todas sus fases están conectadas en todas las capacidades actuales. En particular, registrar una intención no equivale a aprobarla ni ejecutarla.

## 7. Capacidades y estado conocido

Los estados de esta tabla describen los límites conocidos de la implementación; deben actualizarse cuando nuevas pruebas verificables cambien el estado.

| Capacidad | Estado descrito en el repositorio | Límite importante |
|---|---|---|
| Skills públicas v3 | Publicadas como contratos modulares | No convierten automáticamente sus dominios en servicios ejecutables. |
| Revisión creativa `creator.review` | Capacidad de inferencia implementada en la aplicación | La cuota descrita es local al proceso; no equivale a un limitador distribuido. |
| Explorador de modelos y costes | Herramienta de planificación en navegador | No habilita por sí sola un proveedor ni garantiza precios o disponibilidad. |
| Pipeline de audio | Ciclo de vida y adaptadores en memoria probados | No se declara proveedor real, cola durable ni almacenamiento de producción conectados. |
| Integridad y sello v3 | Verificaciones y controles fail-closed disponibles | La firma del release figura como pendiente; una huella no prueba por sí sola la identidad del editor. |
| Recibos de gobernanza | API para registrar intenciones autenticadas | El endpoint de intención no ejecuta despliegues ni publicaciones. La persistencia requiere esquema provisionado y pruebas de integración. |
| Integraciones externas | Algunas están especificadas como objetivos | No se declara que OCI, Databricks, Delta Lake, Redis/BullMQ, MinIO u otros proveedores estén operativos sin evidencia específica. |
| Harness SDLC F0–F17 | Marco de fases documentado | No debe suponerse que cada fase tiene un ejecutor autónomo completo. |

El estado puede cambiar entre revisiones. Antes de usar una función en una decisión sensible, debe consultarse la documentación de operación y la evidencia vinculada a la versión concreta.

## 8. Seguridad, privacidad e integridad

Los principios de seguridad del proyecto incluyen:

- Mantener credenciales y claves privadas fuera del navegador, del repositorio y de los registros públicos.
- Validar las solicitudes en el servidor y limitar las operaciones a los permisos necesarios.
- Separar autenticación, autorización, consentimiento, ejecución y evidencia.
- Evitar almacenar prompts completos, contenido creativo o datos personales cuando no sean necesarios.
- Usar huellas criptográficas para detectar cambios en artefactos y verificar firmas cuando exista una clave de confianza válida.
- Bloquear las capacidades que dependan de una condición de integridad no satisfecha.
- Someter las operaciones de impacto a aprobación humana y a comprobación independiente del resultado.
- Gestionar los cambios de esquema mediante el proceso de administración aprobado para el proyecto.

**Una política documentada no demuestra por sí sola que un control esté desplegado.** La protección real depende de configuración, gestión de claves, permisos, servicios externos, pruebas de integración, monitorización y procedimientos de recuperación.

Este documento no publica credenciales, claves, tokens, datos privados de usuarios, valores de configuración secretos ni instrucciones para eludir controles. La arquitectura se describe deliberadamente a un nivel que permite comprender el propósito sin exponer material operativo sensible.

## 9. Transparencia y límites de la IA

TAMV Creator Intelligence no debe presentarse como una IA consciente, autoridad autónoma ni sistema que garantiza resultados. Los modelos pueden producir respuestas incorrectas, incompletas o sesgadas. Las decisiones importantes requieren revisión humana y comprobación de las fuentes.

El proyecto prohíbe tratar una respuesta de IA como prueba suficiente de ejecución, atribuir resultados no observados, prometer ingresos o viralidad, o presentar como disponible una integración que solo está descrita. También contempla salvaguardas sobre consentimiento, derechos de autor, voz, imagen y uso de datos.

## 10. Instalación y uso responsable

El repositorio documenta la instalación de las skills públicas mediante el ecosistema Skills.sh. Antes de instalar cualquier paquete de terceros:

1. Revisa el repositorio, la licencia y los archivos que se modificarán.
2. Comprueba las dependencias y los permisos solicitados.
3. Ejecuta las validaciones disponibles en un entorno de prueba.
4. No introduzcas secretos, credenciales ni contenido sensible en prompts o ejemplos.
5. No conectes la herramienta a operaciones de producción sin revisar la autorización, la recuperación y la evidencia.
6. Comprueba las instrucciones de instalación y reversión de la versión exacta que vayas a utilizar.

Las instrucciones y los comandos vigentes están en el README del repositorio y en la documentación operativa. No ejecutes un comando basándote únicamente en este documento de divulgación.

## 11. Licencias y uso de componentes

El repositorio describe un modelo de licenciamiento por componentes. Antes de reutilizar o redistribuir código, documentación, modelos, marcas o recursos, revisa los archivos de licencia, atribución y avisos de terceros incluidos en la versión exacta. La licencia de software no concede automáticamente derechos sobre marcas, voces, imágenes ni obras de terceros.

## 12. Madurez y condiciones para producción

El estado público debe describirse como **desarrollo activo con capacidades de madurez desigual**. Antes de afirmar que una versión está lista para producción, el equipo debe reunir, como mínimo:

- CI verde para el commit exacto que se pretende liberar.
- Pruebas unitarias, de integración, seguridad y regresión adecuadas al riesgo.
- Esquemas y permisos reales provisionados y probados en un entorno no productivo.
- Verificación de autenticación, autorización, idempotencia y concurrencia.
- Firma de release válida y confianza en la clave pública establecida por un canal independiente.
- SBOM y procedencia de build verificables cuando correspondan.
- Pruebas de límites, retención, copias de seguridad y recuperación.
- Revisión de proveedores, privacidad, licencias y costes.
- Aprobación humana documentada y plan de reversión.
- Evidencia del funcionamiento real del destino, no solo del éxito de un job de CI.

La aprobación de un workflow de CI prueba únicamente los pasos ejecutados por ese workflow sobre el candidato evaluado. No demuestra por sí sola que las variables de entorno, bases de datos, proveedores externos, dominios o sistemas de producción estén configurados correctamente.

## 13. Documentación de referencia

- [Repositorio y código fuente](https://github.com/AnubisVillasenor1/tamv-creator-intelligence)
- [Operaciones](OPERATIONS.md)
- [Gobernanza](../GOVERNANCE.md)
- [Seguridad y divulgación coordinada](../SECURITY.md)
- [Arquitectura unificada](TAMV-CREATOR-OS-UNIFIED-ARCHITECTURE.md)
- [Operación de recibos de gobernanza](GOVERNANCE-RECEIPTS-OPERATIONS.md)
- [Pipeline de audio](AUDIO-PIPELINE.md)
- [Estado de cierre de módulos](../tamv-genesis/v3/closure.json)

## 14. Declaración pública

TAMV Creator Intelligence busca que la IA sea útil sin borrar la autoría humana, que la automatización tenga límites verificables y que las afirmaciones sobre seguridad o funcionamiento estén respaldadas por evidencia. Su desarrollo se evaluará por capacidades demostrables, transparencia sobre las limitaciones y mejoras verificables, no por promesas de autonomía o por el volumen de documentación.

**La IA propone; la persona autorizada decide. La evidencia determina qué puede afirmarse.**
