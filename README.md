# TAMV Creator Intelligence

**Creator Operating System para proyectos asistidos por IA.** Reúne una aplicación web, SDK, contratos de skills y controles de gobernanza bajo supervisión humana.

> **Principio rector:** la IA propone; la persona decide.

## Estado y límites

El repositorio contiene módulos con distintos niveles de madurez. Una skill publicada no implica que un blueprint esté implementado, que una integración esté configurada ni que una capacidad esté certificada. Consulta el inventario y la evidencia antes de usar una función en producción.

- **Stack:** React, TypeScript, TanStack Start/Router, Vite y Bun.
- **Gobernanza y persistencia:** Supabase/PostgreSQL, migraciones versionadas y controles de auditoría.
- **Skills:** contratos existentes y blueprints diferenciados.
- **Asistente IA:** requiere sesión autenticada y proveedor configurado en servidor; orienta, pero no ejecuta herramientas ni cambios externos.
- **Pagos:** no se consideran activos hasta verificar checkout, webhooks, persistencia y reconciliación.
- **Firma:** `UNSIGNED_RELEASE_PENDING` significa que el release sigue pendiente de firma verificable; no declarar certificación hasta validarla.

## Inicio rápido

Requisitos: Bun 1.3.5 y Node.js 24 para pruebas de Genesis. Supabase es necesario para validar autenticación y persistencia reales.

```bash
bun install --frozen-lockfile
cp .env.example .env.local
bun run dev
```

Validación recomendada:

```bash
bun run test
bun run lint
bun run typecheck
bun run readme:check
bun run docs:check
bun run tamv:check
bun run build
```

Un build local no demuestra que servicios externos, pagos, webhooks ni despliegue estén operativos.

## Secciones de la aplicación

- [Atlas inteligente](/atlas) — guía, catálogo y grafo conceptual.
- [Primeros pasos](/guide) — orientación de uso.
- [Wiki y documentación](/wiki) — arquitectura y procedimientos.
- [Preguntas frecuentes](/faq) — límites y respuestas comunes.
- [Ajustes](/settings) — preferencias locales de interfaz.
- [Pagos y membresía](/billing) — estado de configuración; no simula cargos.
- [Skills](/marketplace) — contratos y dependencias.
- [Auditoría](/audit) — evidencia y trazabilidad.

## Documentación canónica

El README es una portada breve; el contenido extenso vive en `docs/`. Consulta [índice](docs/README.md), [arquitectura](docs/architecture/overview.md), [guía para principiantes](docs/user-guide/getting-started.md), [política de tamaño del README](docs/README_POLICY.md), [preparación de despliegue](docs/DEPLOYMENT-READINESS-2026-11-15.md), [estado del release](docs/RELEASE-STATE-2026-11-15.md), [gobernanza](GOVERNANCE.md), [seguridad](SECURITY.md) y [reglas de agentes](AGENTS.md).

## Secretos y licencia

Las claves de IA, claves de servicio, claves de firma, tokens administrativos y secretos de Stripe deben permanecer en el gestor de secretos del servidor. Nunca uses `VITE_` para secretos privados. Consulta `LICENSE`, `LICENSE-MAP.md`, `LICENSE-COMMERCIAL.md` y `NOTICE` antes de redistribuir.

## Atribución institucional

```text
Proyecto impulsado con colaboración de tecnología latinoamericana TAMV ONLINE NETWORK Orgullosamente Realmontenses.
```

Las comprobaciones automáticas producen evidencia técnica; no sustituyen revisión humana, auditoría independiente ni aceptación explícita de producción.
