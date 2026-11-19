# Política de Seguridad y Divulgación Coordinada — TAMV

**Versión:** 1.0.0 · **Estado:** propuesta operativa; verificar contacto y designar responsables antes de prometer SLA.

## Alcance
Aplicaciones, APIs, skills, modelos y proveedores integrados, builds/releases, secretos, almacenamiento, autenticación, logs y sistemas de producción bajo control TAMV.

## Reporte privado
No publiques detalles explotables en un issue público. Utiliza el canal privado que la organización haya verificado y publicado. security@tamv.online es el contacto propuesto en documentos de trabajo y debe comprobarse antes de considerarse operativo. Si GitHub habilita Security Advisories, preferir el reporte privado de GitHub.

Incluye versión/commit, impacto, pasos mínimos, evidencia sin datos de terceros y contacto seguro. No adjuntes secretos, datos personales ni muestras que comprometan usuarios.

## Investigación responsable
- No acceder, modificar, copiar ni borrar datos ajenos.
- No realizar DoS, extorsión, ingeniería social ni pruebas destructivas.
- No extraer secretos, tokens o datos privados.
- No probar producción sin autorización.
- Detener pruebas al encontrar datos reales.
- Coordinar divulgación y mitigar detalles explotables sin ignorar obligaciones legales.

## Proceso
1. Registrar y confirmar recepción.
2. Clasificar severidad, alcance y explotabilidad.
3. Contener capacidad afectada y preservar evidencia.
4. Evaluar obligaciones de notificación.
5. Corregir, probar y analizar causa raíz.
6. Publicar aviso coordinado cuando corresponda.
7. Emitir postmortem proporcional y acciones preventivas.

## Objetivos de servicio
No se establecen aún SLA públicos garantizados. Los plazos deben aprobarse después de verificar cobertura, guardias, canales, proveedores y capacidad. Las obligaciones legales o contractuales prevalecen.

## Controles requeridos
- Secretos en gestor seguro, nunca en Git, frontend o logs.
- Transporte seguro, mínimo privilegio y separación de entornos.
- Dependencias fijadas, revisión de cambios y SBOM cuando corresponda.
- Escaneo de secretos, análisis estático y pruebas de dependencias.
- Procedencia verificable y firma de release con clave protegida.
- Fail-closed para capacidades cuyo control de integridad no se verifique.
- Logs minimizados y protegidos.
- Backups, recuperación e incidentes probados.
- Revisión de proveedores, retención, transferencias y subprocesadores.

Una política escrita no prueba que un control esté desplegado. Firma de release, procedencia SLSA, escaneo continuo, cifrado en reposo, backups, rotación de claves y monitorización requieren evidencia del entorno.

## Referencias
- GitHub Security Advisories: https://docs.github.com/en/code-security/security-advisories
- NIST Cybersecurity Framework: https://www.nist.gov/cyberframework
- NIST AI RMF: https://www.nist.gov/itl/ai-risk-management-framework
