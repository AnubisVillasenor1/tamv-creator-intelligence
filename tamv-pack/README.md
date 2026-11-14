# TAMV ONLINE NETWORK Creator Intelligence Pack

Paquete gobernado de skills para construir, operar y escalar PLAY & GO: Creator Operating System para educación musical, creación asistida por IA, producción de audio, monetización ética, seguridad y analítica de creadores.

**Aprende. Crea. Analiza. Evoluciona.**

Proyecto impulsado con colaboración de tecnología latinoamericana TAMV ONLINE NETWORK Orgullosamente Realmontenses.

## Contenido

- 37 skills: 17 originales y 20 extensiones gobernadas.
- Contratos SKILL.md con metadatos, entradas, entregables y dependencias declaradas.
- Manifiesto único pack.json y un grafo para comprobar estructura y gobernanza.
- Instalador con consentimiento, respaldos de artefactos previos y validación antes de escribir.
- Política de derechos, privacidad, consentimiento humano, auditoría y atribución.

## Instalar

Desde la raíz del repositorio, valida antes de instalar:

```bash
python3 tamv-pack/scripts/validate-manifest.py
python3 tamv-pack/scripts/validate-integrity.py
bash tamv-pack/scripts/validate-pack.sh
bash tamv-pack/scripts/test-scripts.sh
```

Después ejecuta el instalador desde el proyecto destino:

```bash
bash /ruta/al/repositorio/tamv-pack/install.sh
```

El instalador valida manifiesto e integridad antes de solicitar consentimiento y modificar archivos. Copia los skills a `.agents/skills/` —la ruta que escanean el CLI de skills.sh, Claude Code, Cursor y Codex— y guarda respaldos bajo `.tamv/backups`. Para conservar instalaciones antiguas en su ruta previa:

```bash
TAMV_SKILLS_DIR=.tamv/skills bash /ruta/al/repositorio/tamv-pack/install.sh
```

También puedes instalar sin clonar, con el CLI oficial:

```bash
npx skills add AnubisVillasenor1/tamv-creator-intelligence
```

## Actualizar el inventario del paquete

Para **actualizar una instalación** (no el inventario de desarrollo), descarga una
copia nueva fuera del proyecto destino, valida estructura y scripts, compara tus
skills personalizados y ejecuta otra vez `install.sh` desde el destino. Conserva
`TAMV_SKILLS_DIR` si elegiste otra ruta. Cada instalación respalda los archivos
previos en `.tamv/backups`; consulta `backup=` en `.tamv/install.log` para restaurar
solo los archivos afectados. Los skills retirados no se eliminan automáticamente.
Las instrucciones completas están en el README raíz, sección «Actualizar y
revertir una instalación existente». En Windows usa Git Bash o WSL.

Después de un cambio legítimo en los archivos del pack, actualiza el inventario Git blob y revisa el diff:

```bash
python3 tamv-pack/scripts/validate-integrity.py --write
bash tamv-pack/scripts/validate-pack.sh
```

El inventario detecta archivos faltantes, nuevos o modificados. Es una referencia versionada, no una firma criptográfica de release.

## Gobernanza y seguridad

- Consentimiento explícito antes de enviar borradores a IA.
- La aprobación humana sigue siendo obligatoria para acciones sensibles.
- No se imitan voces, artistas ni marcas sin autorización.
- Las claves privadas no deben residir en el navegador ni en archivos versionados.
- Ante discrepancias de integridad se detiene la operación afectada; no se borran datos del usuario.

## Licencia y atribución

Consulta LICENSE y la documentación de licenciamiento para los términos del núcleo y de módulos comerciales.

TAMV ONLINE NETWORK · Mineral del Monte, Hidalgo, México.
