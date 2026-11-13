# Modelo de amenazas

Método: activos → actores → abusos → controles → estado. No es una evaluación
formal STRIDE; es un mapa de riesgos verificable contra el código.

## Activos

| Activo | Sensibilidad | Dónde vive |
|---|---|---|
| Borradores de creadores | Confidencial | Memoria de sesión; no se persisten |
| Identidad y voz | Restringido | Contratos de skill; sin gateway conectado |
| Corpus documental | Interno/confidencial | Fuera del repositorio; catálogo por hash |
| Claves de firma | Crítico | Fuera del repositorio (`privateSigningKeyInRepository: false`) |
| Manifiesto y hashes | Integridad | `tamv-attribution.json`, 22 archivos |
| Ledger de trabajo | Integridad | JSON encadenado; sin almacén durable |
| Credenciales de cuentas | Crítico | **Fuga local detectada** (F-02) |

## Actores

- Creador legítimo.
- Colaborador con acceso parcial.
- Cliente anónimo que intenta consumir el gateway.
- Atacante que busca imitar voz, marca o contenido.
- Proveedor de IA o de infraestructura.
- Tercero que quiere erosionar la atribución.
- Auditor o académico que evalúa el caso.

## Amenazas principales

| ID | Amenaza | Vector | Control actual | Estado |
|---|---|---|---|---|
| T-01 | Consumo no autorizado del gateway | Invocar `reviewContent` sin sesión | Supabase Auth + cuota + concurrencia | mitigado; cuota por proceso |
| T-02 | Suplantación de voz o artista | Petición a `voice.generate` | Allowlist, consentimiento, 501 | bloqueado por falta de gateway |
| T-03 | Publicación no consentida | `external.publishing` | Solo declarada, sin implementación | bloqueado |
| T-04 | Sustitución de la atribución | Editar archivos protegidos | 22 hashes + runtime fail-closed | controlado |
| T-05 | Release falso | Distribuir con firma ausente | Firma Ed25519 obligatoria | **abierto**: release sin firma |
| T-06 | Secuestro de cuenta | Datos de recuperación filtrados | Exclusión del paquete | **abierto**: rotar y borrar |
| T-07 | Repudio de horas | Cambiar la cifra sin rastro | Cadena hash + historial fechado | parcial: sin almacén durable |
| T-08 | Envenenamiento de corpus | Importar material con derechos de terceros | Catálogo con licencia y sensibilidad | controlado por exclusión |
| T-09 | Abuso de agente | Ejecutar acciones externas | R4 + aprobación humana + 501 | bloqueado |
| T-10 | Dependencia de proveedor | Caída de AI Gateway o Supabase | Sin fallback probado | **abierto** |
| T-11 | Fuga por logs | Errores con datos del borrador | Redacción declarada; no verificada | parcial |
| T-12 | Confusión de auditoría | Presentar salida de IA como auditoría | Tiers y registro de sesgos | documentado |

## Controles que faltan antes de producción

1. **Ledger durable** con escritura append-only, respaldo y prueba de restauración.
2. **Rate limit distribuido** (Postgres o Redis), no solo memoria del proceso.
3. **Rotación de secretos** y eliminación del archivo de recuperación.
4. **SBOM y verificación de procedencia** en CI, con acciones fijadas por SHA.
5. **Pruebas de caos**: caída de proveedor, timeout, reintento idempotente.
6. **Redacción verificable** de logs con prueba que intente inyectar PII.
7. **Consentimiento persistido** por capacidad, no solo validado en tránsito.
8. **Aprobación humana ligada al payload exacto** para R3/R4.

## Riesgo residual declarado

Con el release actual, el riesgo de **operar** es bajo porque casi nada ejecuta.
El riesgo de **creer** que el sistema ya gobierna es alto: la política describe
controles que aún no existen. Esa brecha entre documento y runtime es la amenaza
principal de este repositorio.
