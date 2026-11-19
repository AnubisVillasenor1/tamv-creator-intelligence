# Protocolo operativo de gobernanza, seguridad y calidad TAMV

**Versión:** 1.0.0  
**Estado:** propuesta operativa para revisión y aprobación formal.  
**Ámbito:** TAMV Creator Intelligence, interfaz, API, skills, integraciones, datos, automatizaciones, pagos y releases.

> **Tecnología Avanzada Mexicana Versatil. Orgullosamente Latinoamericanos.**  
> Identidad institucional y compromiso regional; no representa por sí mismo una certificación, aval público ni conformidad jurídica.

## 1. Objetivo y principios

Este protocolo convierte la política general de gobernanza en un flujo de trabajo verificable. Se aplica proporcionalmente al riesgo y preserva los siguientes principios:

- Supervisión humana efectiva: la IA propone; una persona autorizada decide y responde.
- Mínimo privilegio, separación de funciones y acceso revocable.
- Fail-closed para controles críticos: si no puede comprobarse identidad, permiso, firma, integridad o configuración obligatoria, la operación sensible se rechaza.
- Privacidad desde el diseño: minimización, finalidad explícita, retención limitada y datos sensibles fuera de logs ordinarios.
- Trazabilidad verificable: decisiones materiales, versiones, resultados de pruebas y aprobaciones quedan asociadas a commit o artefacto.
- Accesibilidad, inclusión, soberanía creativa, respeto a derechos de autor y contexto cultural latinoamericano.
- Comunicación honesta: diferenciar implementación, configuración, prueba, aprobación y despliegue.

## 2. Clases de riesgo y controles mínimos

| Clase | Ejemplos | Controles mínimos |
|---|---|---|
| R0 — Informativo | Documentación pública, navegación sin cuenta | revisión de contenido, accesibilidad básica y enlaces válidos |
| R1 — Usuario | Preferencias locales, borradores, generación no sensible | validación de entradas, límites de tamaño, manejo de errores y consentimiento informado |
| R2 — Datos/cuenta | proyectos privados, autenticación, proveedores, archivos | autorización servidor, RLS, secretos fuera del cliente, auditoría minimizada, cuotas y pruebas negativas |
| R3 — Crítico | pagos, roles, migraciones, firma de release, borrado irreversible | doble revisión, idempotencia, fail-closed, pruebas de integración, plan de reversión y evidencia aprobada |

La clasificación se asigna por el mayor impacto plausible, no por la complejidad aparente de la pantalla. Si existe duda, se adopta la clase superior hasta resolverla.

## 3. Flujo de cambios

1. **Propuesta:** registrar problema, objetivo, alcance, responsables, usuarios afectados, dependencias y criterios de aceptación.
2. **Diseño:** documentar amenazas, datos tratados, permisos, fallos esperados, compatibilidad, impacto legal y alternativa de reversión.
3. **Implementación:** cambios pequeños, tipos estrictos, validación en servidor, límites explícitos y separación entre UI y lógica privilegiada.
4. **Verificación:** pruebas unitarias, integración, negativos, lint, typecheck, build, accesibilidad y revisión de diff.
5. **Revisión:** una persona distinta del autor revisa cambios R2/R3; cambios de seguridad, pagos o migraciones requieren revisión especializada.
6. **Liberación:** fijar commit, dependencias, artefactos y evidencia; comprobar firma y procedencia cuando el pipeline esté habilitado.
7. **Observación:** monitorizar errores y métricas sin registrar secretos ni contenido innecesario; disponer de rollback.
8. **Cierre:** asociar resultados, incidencias residuales, responsable y fecha de reevaluación.

No se deben omitir gates para acelerar una entrega. Los cambios urgentes se documentan como excepción temporal, con alcance limitado, responsable, vencimiento y revisión posterior; no pueden desactivar controles de autorización, firma o protección de datos.

## 4. Reglas de autorización y fail-closed

- La identidad se valida en el servidor con el proveedor de autenticación configurado; no se acepta un ID de usuario enviado por el navegador como prueba.
- Los roles privilegiados provienen de claims controlados por servidor, nunca de metadatos editables por el usuario.
- Denegar por defecto cuando falta un rol, variable, política RLS, firma o resultado de verificación.
- No otorgar membresías por parámetros de retorno del checkout. Solo el procesador de eventos autenticados y verificados puede cambiar el estado de suscripción.
- Verificar firmas sobre el cuerpo original, tolerancia temporal, límite de bytes, idempotencia y tratamiento de eventos fuera de orden.
- Aplicar cuotas de forma atómica en el almacenamiento autoritativo cuando varias instancias puedan atender solicitudes concurrentes.
- No degradar silenciosamente a permisos más amplios cuando un servicio externo falla.
- No incluir claves, tokens, cabeceras de autorización, contenido privado o datos personales innecesarios en errores y telemetría.

## 5. Gobernanza de skills y agentes

Cada skill debe declarar: identificador estable, versión, estado real, propietario, propósito, entradas/salidas, permisos, dependencias, tratamiento de datos, límites, riesgos, pruebas y evidencia.

Estados permitidos:
- **Blueprint:** diseño propuesto, no ejecutable.
- **Contract:** contrato definido, implementación incompleta o inexistente.
- **Partial:** parte funcional, con limitaciones declaradas.
- **Operational:** implementación y pruebas verificadas en un entorno identificado.
- **Blocked:** no debe activarse hasta resolver el bloqueo.
- **Deprecated:** retirada planificada, con alternativa y fecha.

Una entrada en el catálogo no equivale a un servicio ejecutable. Las skills no reciben autoridad implícita para actuar fuera de sus permisos; toda acción externa o destructiva requiere autorización explícita y comprobable.

## 6. Datos, privacidad y derechos

Antes de integrar una fuente de datos, registrar finalidad, categoría, base de uso aplicable, procedencia, permisos/licencias, región, retención, subprocesadores, mecanismo de borrado y contacto responsable. Reducir la recogida a lo estrictamente necesario. Separar datos de cuenta, telemetría técnica y contenido de usuario.

Las solicitudes de acceso, exportación, rectificación o eliminación se gestionan conforme a la ley aplicable y a los contratos vigentes. No prometer plazos ni cumplimiento normativo hasta verificar responsable, canal y proceso operativo. Evaluar transferencias internacionales y requisitos jurisdiccionales antes de habilitar un proveedor nuevo.

## 7. Seguridad y respuesta a incidentes

1. Detectar y clasificar por confidencialidad, integridad, disponibilidad, alcance y riesgo para personas.
2. Contener con el cambio mínimo y revocar credenciales comprometidas.
3. Preservar evidencia con acceso restringido y marcas temporales.
4. Evaluar obligaciones contractuales y legales de notificación.
5. Corregir la causa raíz y añadir pruebas de regresión.
6. Comunicar de forma coordinada y proporcional.
7. Realizar postmortem sin culpabilización, con acciones, responsables y vencimientos.

No publicar detalles explotables ni datos personales. Los canales de seguridad y sus SLA solo se consideran operativos después de verificarlos y asignar cobertura.

## 8. Pagos y cambios financieros

- Separar creación de checkout, recepción de webhook, procesamiento, persistencia, reconciliación y concesión de acceso.
- Usar claves de idempotencia y restricciones de base de datos; los duplicados deben ser inocuos.
- Validar firma del webhook y devolver errores reintentables cuando no se haya persistido de forma durable.
- No considerar un evento recibido como un evento procesado.
- Probar pago completado, fallo, renovación, cancelación, reembolso, disputa, duplicados y eventos fuera de orden en modo de prueba.
- El monitor administrativo expone solo lo mínimo necesario y comprueba rol en cada solicitud.
- No activar cobros reales hasta documentar aceptación, soporte, términos, privacidad, impuestos y reembolsos con revisión competente.

## 9. Release, cadena de suministro y recuperación

El release debe asociar SHA de origen, lockfile, versión de runtime, resultados CI, artefactos, SBOM cuando esté disponible, análisis de dependencias, atestación y firma verificable. La clave privada de firma permanece en un gestor de secretos o hardware autorizado, nunca en Git ni en el artefacto.

Una firma pendiente no se sustituye por un hash, una etiqueta de CI ni una afirmación en el README. La procedencia SLSA solo se declara al producir y verificar una atestación auténtica del nivel aplicable. Backups y recuperación solo se dan por probados después de restaurar y medir el resultado en un entorno controlado.

## 10. Matriz de evidencia y aprobación

| Control | Evidencia requerida | Estado si falta |
|---|---|---|
| Autenticación/autorización | pruebas positivas y negativas, configuración del proveedor | bloqueado para operaciones privadas |
| RLS y migraciones | migración aplicada en entorno de prueba, pruebas con roles reales | no apto para producción |
| Pagos | eventos de prueba, idempotencia, reconciliación y logs sanitizados | solo modo informativo/test |
| Firma de release | firma válida verificada con clave pública de confianza | release no firmado |
| Despliegue | SHA desplegado, smoke tests, observabilidad y rollback comprobado | despliegue no certificado |
| Privacidad/legal | responsable, avisos, contratos y análisis jurisdiccional revisados | uso limitado al alcance aprobado |

## 11. Indicadores de operación

Registrar tendencias de: fallos de autorización, validaciones rechazadas, duplicados de eventos, latencia, errores por proveedor, tiempo de recuperación, vulnerabilidades abiertas por severidad, cobertura de pruebas de seguridad y porcentaje de cambios con evidencia completa. Definir objetivos cuantitativos solo después de establecer línea base y capacidad de operación. Nunca mejorar métricas ocultando errores o relajando controles.

## 12. Responsables y revisión

Las funciones de producto, ingeniería, seguridad, privacidad, finanzas y revisión jurídica deben tener responsables nominales y suplentes aprobados. Hasta que se publiquen formalmente, se consideran funciones requeridas, no comités ya constituidos.

Revisar el protocolo al menos trimestralmente y ante cambios relevantes de proveedor, modelo, datos, jurisdicción, permisos, pagos o arquitectura. Las referencias UNESCO, OECD, NIST, WEF y normativa regional sirven como marco de contraste; no equivalen a certificación ni sustituyen asesoría jurídica.

## 13. Lista de liberación

- [ ] Alcance, riesgo, propietario y criterios de aceptación registrados.
- [ ] Pruebas unitarias, negativas, integración, lint, typecheck y build aprobados.
- [ ] Revisión independiente completada para R2/R3.
- [ ] Secretos, RLS, cuotas y permisos verificados en servidor.
- [ ] Migraciones aplicadas y reversión ensayada en entorno no productivo.
- [ ] Logs minimizados y alertas de fallo comprobadas.
- [ ] Firma y procedencia verificadas o release marcado explícitamente como no firmado.
- [ ] Smoke tests contra el SHA desplegado y rollback probado.
- [ ] Riesgos residuales aceptados por una persona autorizada.
- [ ] Comunicación y documentación actualizadas.

**Regla final:** si una evidencia obligatoria no existe, el estado se declara pendiente; no se sustituye con intención, documentación o inferencia.
