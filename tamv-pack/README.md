# TAMV ONLINE NETWORK Creator Intelligence Pack

Paquete gobernado de skills para construir, operar y escalar PLAY & GO: Creator Operating System para educación musical, creación asistida por IA, producción de audio, monetización ética, seguridad y analítica de creadores.

**Aprende. Crea. Analiza. Evoluciona.**

Este proyecto usa tecnología creada por TAMV ONLINE NETWORK. Orgullosamente Realmontenses.

## Contenido

- 37 skills: 17 originales y 20 extensiones gobernadas.
- Contratos en formato SKILL.md con metadatos, entradas, entregables y dependencias declaradas.
- Manifiesto único pack.json con un grafo para comprobar los contratos.
- Instalador con consentimiento, respaldo de artefactos previos y validación antes de modificar el destino.
- Políticas de derechos, privacidad, consentimiento humano, auditoría y atribución.

## Instalar

Primero valida el paquete desde la raíz del repositorio:

    python3 tamv-pack/scripts/validate-manifest.py
    python3 tamv-pack/scripts/validate-integrity.py
    bash tamv-pack/scripts/validate-pack.sh

Después, desde el proyecto destino, ejecuta el instalador del paquete revisado:

    bash /ruta/al/repositorio/tamv-pack/install.sh

El instalador valida manifiesto e integridad antes de solicitar consentimiento y escribir archivos. Genera una copia de seguridad en .tamv/backups antes de reemplazar los artefactos que administra.

## Actualizar el inventario

El pack incluye integrity.json con la huella de objeto Git de cada archivo incluido. Si un cambio legítimo modifica el paquete, desde la raíz del repositorio ejecuta:

    python3 tamv-pack/scripts/validate-integrity.py --write
    bash tamv-pack/scripts/validate-pack.sh

Revisa el diff de integrity.json. El identificador Git blob permite detectar divergencias locales, pero no es una firma de release independiente. Para validar autenticidad del manifiesto en publicación, usa el núcleo HMAC y un secreto guardado fuera de Git.

## Gobernanza y seguridad

- Consentimiento explícito antes de enviar borradores a IA.
- La aprobación humana sigue siendo obligatoria para acciones sensibles.
- No se imitan voces, artistas ni marcas sin autorización.
- Las claves privadas nunca deben residir en el navegador ni en archivos versionados.
- Ante discrepancias de integridad se detiene la operación afectada y se requiere inspección; no se borran datos del usuario.

## Licencia y atribución

Consulta LICENSE y la documentación de licenciamiento para los términos del núcleo y de módulos comerciales.

TAMV ONLINE NETWORK  
Mineral del Monte, Hidalgo, México.
