# ADR-001: Ejecución gobernada y fail-closed

- **Estado:** Aceptado
- **Fecha:** 2026-11-15
- **Decisores:** TAMV ONLINE NETWORK
- **Ámbito:** cualquier proyecto que utilice IA y adopte este paquete

## Contexto

Las capacidades de IA pueden producir efectos externos (publicar contenido,
procesar material de creators, tocar datos o infraestructura). Confiar en la
salida de un modelo, en un claim del cliente o en un documento para autorizar una
capacidad es inseguro: esos artefactos son manipulables y no constituyen
evidencia. El paquete necesita una puerta que decida con hechos verificables y
que, ante la duda, deniegue.

## Decisión

La ejecución es **gobernada y deny-by-default**. Dos mecanismos la sostienen:

1. **Punto de decisión de política (PDP).** `tamv.genesis.pdp/2.0.0` recibe
   hechos, nunca intenciones. Evalúa en orden: capacidad desconocida, kill
   switch, madurez mínima (por defecto `M3-tested`), certificación
   (`G1-signed-release`), consentimiento, aprobación humana para R4/R5 y
   prohibición absoluta de R5. Solo devuelve `ALLOWED` cuando todos los controles
   se satisfacen. Los códigos de denegación son explícitos
   (`UNKNOWN_CAPABILITY`, `KILL_SWITCH_ACTIVE`, `MATURITY_TOO_LOW`,
   `EVIDENCE_MISSING`, `CONSENT_REQUIRED`, `RISK_REQUIRES_HUMAN`). La madurez se
   gana con evidencia (M0–M5), nunca por declaración.

2. **Sello criptográfico fail-closed.** El paquete se sella con raíces SHA-256
   por skill y raíz del paquete sobre JSON canónico, vinculado al manifiesto, y
   firma Ed25519 con separación de dominio
   (`tamv.pack-seal.ed25519.v2`). Una firma ausente o `UNSIGNED_RELEASE_PENDING`
   deniega las capacidades certificadas. Editar, quitar o añadir una skill, o
   cambiar el manifiesto, rompe el sello. Un log de transparencia append-only
   encadenado por hash, con árbol Merkle RFC 6962 y checkpoints firmables
   (dominio propio `tamv.seal-transparency.checkpoint.ed25519.v1`), hace visible
   cualquier reescritura silenciosa de un release publicado.

La canonicalización es determinista entre navegador, Node y CI: ordena claves,
rechaza `undefined`, números no finitos, objetos no planos (`Date`, `Map`, `Set`,
`RegExp`, instancias de clase) y rutas no portables (absolutas, `..`,
separadores de Windows, nombres de dispositivo reservados, sufijos de punto o
espacio, caracteres ilegales). Una capacidad no puede pertenecer a dos skills
públicas.

## Consecuencias

**Positivas:** una copia parcial, alterada o sin firma no puede presentarse como
certificada; las decisiones son auditables y reproducibles; el consentimiento y
la protección de derechos son puertas explícitas, no supuestos.

**Negativas / coste:** el release requiere una clave Ed25519 gestionada fuera de
Git y un proceso de firma; rotar la clave obliga a volver a firmar y publicar;
las capacidades certificadas no funcionan hasta que exista firma válida. El
estado actual del sello y del checkpoint es `UNSIGNED_RELEASE_PENDING` y este
paquete no fabrica una firma.

**Límites aceptados:** el sello no es DRM ni impide copiar el paquete público
completo ignorando las licencias; no protege frente a vulnerabilidades de
dependencias o despliegue; un publicador con la clave de release puede firmar un
checkpoint nuevo (la cadena lo hace visible, no lo impide por sí sola).

## Alternativas consideradas

- **Autorizar por salida del modelo o claim del cliente:** rechazada; no es
  evidencia y es manipulable.
- **Fail-open ante fallo de integridad:** rechazada; permitiría que una copia
  alterada se presentara como certificada.
- **Una única firma Ed25519 reutilizada para sello y checkpoint:** rechazada; la
  separación de dominio impide reutilizar una firma de sello como firma de
  checkpoint.
- **DRM / "imposible de piratear":** rechazada; no es alcanzable en software
  distribuido al cliente y sería una afirmación falsa.

## Referencias

- `governance/policies/baseline.json` — códigos y orden de evaluación del PDP.
- `core/governance/contracts.ts` — madurez, riesgo, evidencia y decisión.
- `governance-manifest.json` — integridad, gobernanza y estado del sello.
- `docs/LIMITATIONS.md` — qué prueba y qué no prueba el paquete.
- Repositorio de origen: `tamv-genesis/src/policy.ts`,
  `tamv-genesis/src/sovereign/`, `docs/SOVEREIGN-V3.md`.

## Atribución

Proyecto impulsado con colaboración de tecnología latinoamericana
TAMV ONLINE NETWORK
Orgullosamente Realmontenses.