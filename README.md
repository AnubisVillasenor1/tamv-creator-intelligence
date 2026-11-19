# TAMV Creator Intelligence

**Creator Operating System de TAMV ONLINE NETWORK (PLAY & GO).** Gobernanza para creación asistida por IA con supervisión humana, trazabilidad y evidencia verificable.

> Principio operativo: la IA propone; la persona decide.

[![Despliegue](https://img.shields.io/badge/Estado-Desarrollo-2563eb)](https://tamv-creator-intelligence.vercel.app)
[![Licencia](https://img.shields.io/badge/Licencia-AGPL--3.0--only-blue)](LICENSE)
[![Gobernanza](https://img.shields.io/badge/Modelo-Human--in--the--loop-7c3aed)](GOVERNANCE.md)

## Propósito

Convierte capacidades generativas en productos controlados: separa la propuesta automatizada de la autorización humana y conserva evidencia de cada decisión. No considera operativa una capacidad solo por existir como contrato, documento o interfaz.

## Modelo de gobernanza

| Fase | Control | Resultado |
|---|---|---|
| Propuesta | Contexto y consentimiento | La IA propone sin autoridad ejecutiva |
| Revisión | Aprobación humana | Decisión registrada antes de continuar |
| Evaluación | Derechos, datos e integridad | Ejecución permitida, denegada o diferida |
| Ejecución | Permisos atómicos | Efecto controlado y auditable |
| Evidencia | Eventos y referencias | Trazabilidad y revisión independiente |
| Liberación | Validación técnica e institucional | Distribución autorizada |

Principios: **fail-closed**, **human-in-the-loop**, integridad SHA-256/Ed25519, minimización de datos, trazabilidad, responsabilidad y seguridad desde el diseño. Ver [gobernanza](GOVERNANCE.md), [seguridad](SECURITY.md) y [protocolo institucional](docs/GOVERNANCE-OPERATING-PROTOCOL.md). Esto no sustituye auditoría jurídica, reglamentaria ni técnica independiente.

## Capacidades

- **Creator OS:** workspace de ideación, revisión y organización con separación entre UI, contratos y adaptadores.
- **Gobernanza:** política `tamv.governance.v1` en el SDK; denegación por defecto ante integridad insuficiente.
- **Evidencia:** receipts operativos, auditoría y matrices de cierre sujetas a revalidación.
- **Skills y SDK:** 4 skills públicas, 41 contratos internos y el SDK `@tamv/governance-sdk` con adaptadores confiables.

Inventario validado: **26 módulos** · **4 skills públicas** · **41 contratos internos** · **19 capacidades**; estados: closed=11, contract=2, documented=7, partial=1, blocked=4, open=1.

Revalida este inventario con `npm run ops:closure`.

## Arquitectura

React, TypeScript, TanStack Start/Router, Vite, Bun y Node.js en la interfaz y herramientas; Supabase/PostgreSQL y migraciones versionadas en persistencia; servicios de dominio para gobernanza, cuotas y auditoría; proveedores externos solo desde el servidor; evidencia de CI, firma Ed25519 y release.

```text
Interfaz web -> API/contratos -> núcleo de gobernanza -> PostgreSQL | proveedores IA/efectos
                                      -> auditoria -> evidencia y release
```

Detalle: [arquitectura general](docs/architecture/overview.md) y [referencia operativa](docs/ARCHITECTURE-REFERENCE.md).

## Inicio rápido

Requisitos: Bun 1.3.5, Node.js 24 para las pruebas de Genesis y Supabase para autenticación y persistencia reales.

```bash
bun install --frozen-lockfile
cp .env.example .env.local
bun run dev
```

Un servidor iniciado no demuestra servicios externos, pagos ni despliegue operativos.

## Validación

```bash
bun run test
bun run lint
bun run typecheck
bun run readme:check
bun run docs:check
bun run tamv:check
bun run build
node --test sdk/tests/*.test.mjs
```

Para un release firmado, configura fuera del repositorio la clave pública y el digest aprobado, y ejecuta `npm run tamv:verify`. El marcador `UNSIGNED_RELEASE_PENDING` significa que la firma está pendiente; no declares certificación hasta verificar hashes, firma Ed25519 y digest aprobado. La verificación local es integridad TAMV, no certificación normativa, procedencia SLSA ni auditoría externa.

## Secretos y licencia

Claves privadas, tokens y secretos de Stripe/IA deben permanecer en el gestor de secretos del servidor; nunca uses `VITE_` para información sensible. Núcleo **AGPL-3.0-only**; los módulos `LicenseRef-TAMV-Commercial-1.0` y los activos de marca requieren acuerdo escrito. Consulta [LICENSE](LICENSE), [LICENSE-MAP.md](LICENSE-MAP.md), [LICENSE-COMMERCIAL.md](LICENSE-COMMERCIAL.md) y [NOTICE](NOTICE).

## Documentación

Índice: [docs/README.md](docs/README.md). Inicio: [guía](docs/user-guide/getting-started.md). Entrega: [preparación](docs/DEPLOYMENT-READINESS-2026-11-15.md), [estado histórico](docs/RELEASE-STATE-2026-11-15.md), [firma](docs/RELEASE-SIGNING.md), [evidencia](docs/PRODUCTION-EVIDENCE-GATES.md) y [deuda técnica](docs/TECHNICAL-AUDIT-AND-DEBT-REGISTER.md). Los documentos fechados son registros históricos: revalídalos antes de usarlos como evidencia actual.

SDK: [sdk/README.md](sdk/README.md).

## Atribución institucional

```text
Proyecto impulsado con colaboración de tecnología latinoamericana TAMV ONLINE NETWORK Orgullosamente Realmontenses.
```
