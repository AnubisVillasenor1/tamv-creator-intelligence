# Roadmap

Compuertas pendientes derivadas del estado real del repositorio de origen y de
las condiciones declaradas en su mapa de licencias y documentación soberana.
Una capacidad o un release solo avanzan con evidencia, nunca por declaración.

## Integridad y release

- [ ] Firmar el sello del paquete (`pack-seal.json`) con la clave Ed25519 de
      release fuera de Git; `--verify --require-signature` debe terminar en
      `TAMV_SEAL_VALID`.
- [ ] Firmar el checkpoint del log de transparencia; mientras esté
      `UNSIGNED_RELEASE_PENDING`, certificar el log se deniega (fail-closed).
- [ ] Recertificar el README protegido por hashes (`tamv:hash/sign/verify`) por
      el responsable de release. Nunca fabricar una firma.
- [ ] Firmar/verificar el manifiesto de gobernanza de este paquete con
      `scripts/sign-governance-pack.ts` cuando exista clave de release.

## Licencias y supply chain

- [ ] Añadir cabeceras SPDX a los archivos del núcleo.
- [ ] Generar SBOM y verificar compatibilidad de dependencias (compuerta G5).
- [ ] Confirmar titularidad de contribuciones y activos.
- [ ] Revisión legal independiente antes de un release comercial.

## Calidad y operación

- [ ] Ejecutar las suites de la aplicación (Vitest, lint, typecheck, build) y la
      verificación en navegador con el stack completo y Bun 1.3.5.
- [ ] Conectar proveedor y worker reales al contrato de audio (hoy encola sin
      declarar finalización y no inventa DSP).
- [ ] Confirmar en CI remoto que los tests del commit corrieron (la evidencia
      local no sustituye al run remoto).
- [ ] Procedencia SLSA y auditoría de supply chain de extremo a extremo.

## Empaquetado Qoder

- [x] SKILL.md paraguas en la raíz con frontmatter válido.
- [x] Cuatro skills públicas copiadas byte-exact desde el sello de origen.
- [x] Contratos de gobernanza, política baseline y manifiesto derivados del
      código real.
- [x] Documentación de límites, roadmap y ADR de ejecución gobernada.
- [ ] Validar la instalación del paquete en Qoder y la activación de las skills.

## Atribución

Proyecto impulsado con colaboración de tecnología latinoamericana
TAMV ONLINE NETWORK
Orgullosamente Realmontenses.