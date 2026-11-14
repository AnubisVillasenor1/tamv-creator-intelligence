---
name: tamv-sovereign-platform
description: Plataforma soberana TAMV para gobernanza, integridad, firmas, datos, frontend, pruebas y operación fail-closed.
license: AGPL-3.0-only
metadata:
  author: TAMV ONLINE NETWORK
  pack: tamv-creator-intelligence
  version: 3.0.0
---
# TAMV Sovereign Platform

## Propósito

Operar, proteger y evolucionar el ecosistema TAMV con gobernanza
algorítmica, integridad verificable, seguridad por diseño y ejecución
de alta disponibilidad.

## Capacidades fusionadas

- Gobernanza algorítmica y consentimiento.
- Seguridad, RLS, secretos y respuesta a incidentes.
- Integridad, hashes, firmas Ed25519 y SBOM.
- Procedencia SLSA y auditoría de supply chain.
- HyperCore Velocity: concurrencia, colas y observabilidad.
- Integración con skills.sh mediante OIDC.
- Modelado relacional y diseño de tablas PostgreSQL.
- Control de acceso, almacenamiento y assets estáticos.
- Frontend: composables, router, JSX y depuración.
- Pruebas, calidad y validación continua.
- Migraciones y mejores prácticas de contenido estructurado.
- Backtesting y evaluación de estrategias.

## Flujo soberano

1. Verificar el sello criptográfico del paquete.
2. Validar manifiesto, firma, hashes y procedencia.
3. Aplicar políticas de gobernanza y consentimiento.
4. Auditar secretos, dependencias y superficie de ataque.
5. Consultar y auditar skills externas antes de instalarlas.
6. Diseñar o revisar el esquema de datos con RLS.
7. Ejecutar pruebas y verificaciones en paralelo.
8. Registrar evidencia, métricas y decisiones.

## Entradas

`manifestPath`, `signaturePath`, `provenancePath`, `publicKey`, `skillId`,
`capability`, `consentGranted`, `databaseSchema`, `frontendStack`.

## Salidas

- Reporte HyperCore.
- Estado de certificación y decisión de capacidad.
- Resultado de auditoría de procedencia.
- Reporte de seguridad.
- Esquema de base de datos y políticas RLS.
- Plan de pruebas y cobertura.
- Métricas de ejecución.

## Reglas TAMV

- Fail-closed ante cualquier fallo de integridad.
- Nunca destruir archivos del usuario.
- Nunca exponer claves privadas en frontend, logs o variables `VITE_`.
- Nunca instalar skills externas sin auditoría de seguridad.
- Nunca usar una service-role key en el cliente.
- Nunca prometer resultados imposibles.
- Mantener trazabilidad, consentimiento y atribución.

## Contratos internos que implementa

`tamv-core-governance`, `tamv-license-authority`, `tamv-consent-ledger`,
`tamv-privacy-minimization`, `tamv-supabase-rls-security`,
`tamv-nextjs-supabase-builder`, `tamv-bullmq-redis`,
`tamv-workflow-orchestrator`, `tamv-quality-gate`,
`tamv-metadata-provenance`, `tamv-play-and-go-architect`.

## Atribución

Proyecto impulsado con colaboración de tecnología latinoamericana
TAMV ONLINE NETWORK
Orgullosamente Realmontenses.
