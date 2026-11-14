# TAMV Sovereign v3 — sello, firma y cifrado híbrido

Este documento describe la capa criptográfica de la superficie pública v3.0.0:
qué comprueba, qué no comprueba y qué debe hacer un operador de release antes de
declarar una versión certificada.

> **Estado del release actual:** `pack-seal.json` existe y es verificable
> estructuralmente, pero su firma es `UNSIGNED_RELEASE_PENDING`. El runtime
> **deniega** las capacidades certificadas mientras no exista una firma Ed25519
> válida. Esta documentación no fabrica ni simula una firma.

## 1. Superficie que protege

| Elemento | Ruta | Rol |
|---|---|---|
| Manifiesto público | `tamv-genesis/v3/pack.json` | Declara las cuatro skills paraguas, capacidades y matriz de fusión. |
| Skills públicas | `tamv-genesis/v3/skills/<id>/SKILL.md` | Contratos publicados en skills.sh. |
| Sello del paquete | `tamv-genesis/v3/seals/pack-seal.json` | Raíces SHA-256 por skill, raíz del paquete y bloque de firma. |
| Contratos internos | `tamv-pack/skills/` (37) | Biblioteca referenciada, no republicada como skills independientes. |
| Núcleo criptográfico | `tamv-genesis/src/sovereign/` | Canonicalización, digests, Ed25519, X25519, AES-256-GCM y sello. |
| CLI de sello | `tamv-genesis/scripts/v3-seal.mjs` | Construye, firma y verifica el sello. |
| CLI híbrida | `tamv-genesis/scripts/v3-hybrid.mjs` | Sella y abre payloads protegidos. |

## 2. Cómo se calcula el sello

1. Cada archivo de una skill se serializa a UTF-8 y se hashea con SHA-256.
2. La raíz de la skill hashea un JSON canónico con `id`, `path`,
   `requiresConsent`, `capabilities` ordenadas y la lista ordenada de archivos.
3. La raíz del paquete hashea un JSON canónico con esquema, pack, versión,
   `issuedAt`, las tuplas `{id, path, root}` y el recuento de contratos internos.
4. La firma Ed25519 cubre el sello completo sin el bloque `signature`.

La serialización canónica ordena claves, rechaza `undefined`, rechaza números no
finitos y rechaza rutas absolutas, retrocesos (`..`) y separadores de Windows.
El mismo payload debe producir los mismos bytes en navegador, Node y CI.

## 3. Comportamiento fail-closed

`verifyPackSeal()` y `requireCertifiedPack()` aplican estas reglas:

| Situación | Código | Resultado |
|---|---|---|
| Sello firmado y todo coincide | `TAMV_SEAL_VALID` | Permitido. |
| Firma ausente o `UNSIGNED_RELEASE_PENDING` | `TAMV_SEAL_UNSIGNED` | Denegado. |
| Sin clave pública configurada | `TAMV_SEAL_KEY_MISSING` | Denegado. |
| Un byte editado en una skill | `TAMV_SEAL_CONTENT_MISMATCH` | Denegado. |
| Skill eliminada del paquete | `TAMV_SEAL_SKILL_MISSING` | Denegado. |
| Skill no declarada añadida | `TAMV_SEAL_CONTENT_MISMATCH` | Denegado. |
| Firma de otra clave | `TAMV_SEAL_SIGNATURE_INVALID` | Denegado. |
| JSON malformado | `TAMV_SEAL_MALFORMED` | Denegado. |

La auditoría `K-19` recalcula las raíces desde el árbol real y las compara con el
sello. Comprueba estructura y contenido; la verificación de firma requiere
`TAMV_V3_PUBLIC_KEY`, porque la auditoría no debe inventar una clave.

## 4. Qué impide y qué no

**Impide:**

- Que una copia parcial del paquete pase como certificada.
- Que una skill editada, movida o sustituida conserve el sello.
- Que se añada una quinta skill sin romper la raíz del paquete.
- Que un sello sin firma habilite capacidades certificadas.

**No impide:**

- Copiar el paquete público completo y usarlo sin atribución si se ignoran las
  licencias. El texto público es público.
- Que un receptor con la clave privada de release firme otra cosa.
- DRM ni control de copia posterior al descifrado.
- Vulnerabilidades en dependencias, despliegues o configuraciones.

“Imposible de piratear” no es una propiedad alcanzable en software que se
distribuye al cliente. La propiedad real es más estrecha y verificable: **una
copia parcial, alterada o sin firma no puede presentarse como certificada.**

## 5. Cifrado híbrido

`sealHybrid()` protege payloads que deliberadamente no se publican en claro:

```text
X25519 efímero → ECDH → HKDF-SHA256 (salt 32 B, info "tamv.hybrid.v1")
→ AES-256-GCM (IV 12 B, tag 128 bits) con AAD explícito
```

El sobre resultante declara `schema`, `kdf`, `aead`, `ephemeralPublic`, `salt`,
`iv`, `ciphertext` y `aadSha256`. Abrir el sobre con otra clave privada, otro AAD
o un ciphertext alterado falla.

Esto no protege las skills públicas, que por diseño son texto verificable. Solo
protege material que se mantiene fuera del repositorio público. Si se pierde la
clave privada X25519 no hay recuperación.

## 6. Operación de release

```bash
# 1. Construir el sello (queda UNSIGNED_RELEASE_PENDING).
node --experimental-strip-types tamv-genesis/scripts/v3-seal.mjs --write

# 2. Verificar estructura y contenido sin clave (esperado: KEY_MISSING).
node --experimental-strip-types tamv-genesis/scripts/v3-seal.mjs --verify

# 3. Firmar con la clave de release fuera de Git.
TAMV_V3_PRIVATE_KEY="$(cat /ruta/segura/release.pem)" \
TAMV_V3_PUBLIC_KEY="$(cat /ruta/segura/release.pub.pem)" \
node --experimental-strip-types tamv-genesis/scripts/v3-seal.mjs --write --sign

# 4. Verificar con la clave pública.
TAMV_V3_PUBLIC_KEY="$(cat /ruta/segura/release.pub.pem)" \
node --experimental-strip-types tamv-genesis/scripts/v3-seal.mjs --verify --require-signature
```

Payload protegido:

```bash
node --experimental-strip-types tamv-genesis/scripts/v3-hybrid.mjs seal \
  --in protected.txt --out protected.envelope.json \
  --public-key recipient.pub.pem --aad "tamv:pack:3.0.0"
```

## 7. Gestión de claves

- La clave privada Ed25519 de release nunca entra en Git, logs, artefactos,
  frontend ni variables `VITE_`.
- La clave pública se distribuye y se fija en la verificación del runtime.
- Rotar una clave exige volver a firmar y volver a publicar el sello; las copias
  con la clave anterior dejan de verificar contra la nueva.
- La clave X25519 de un destinatario es independiente de la clave Ed25519 de
  release; no deben reutilizarse.

## 8. Migración desde 1.2.1

1. `tamv-pack/` y sus 37 contratos permanecen sin cambios y siguen siendo la
   biblioteca interna.
2. `skills.sh.json` apunta solo a `./tamv-genesis/v3/skills`, con cuatro
   agrupaciones.
3. Instalar una skill v3 no instala las 37 internas: el contrato público las
   referencia.
4. Una instalación 1.2.1 sigue siendo válida; v3 es aditivo.
5. El release v3 no se considera certificado hasta que `pack-seal.json` tenga
   firma Ed25519 y `--verify --require-signature` termine en `TAMV_SEAL_VALID`.

## 9. Evidencia y límites

| Afirmación | Estado |
|---|---|
| Canonicalización determinista y rechazo de rutas inseguras | Probado por tests locales. |
| SHA-256, Ed25519, X25519 y AES-GCM operan en Node 22.16 | Probado localmente. |
| Editar, quitar o añadir una skill rompe el sello | Probado por tests locales. |
| El sello actual está firmado | **No.** `UNSIGNED_RELEASE_PENDING`. |
| La auditoría K-19 verifica la firma sin clave externa | **No.** Solo estructura; la firma requiere clave. |
| El paquete es “imposible de piratear” | **No.** Copia completa verificable; copia parcial/modificada rechazada. |
| Los tests corrieron en CI para este commit | Solo si el run remoto lo confirma. |

## Atribución

Proyecto impulsado con colaboración de tecnología latinoamericana
TAMV ONLINE NETWORK
Orgullosamente Realmontenses.
