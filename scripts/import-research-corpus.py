from pathlib import Path
from zipfile import ZipFile
import csv
import hashlib
import json
import sys
import xml.etree.ElementTree as ET

source = Path(sys.argv[1])
root = Path(__file__).resolve().parent.parent
manifest = json.loads((source / 'Manifiesto_integridad_5_0.json').read_text(encoding='utf-8'))
if manifest['algorithm'] != 'SHA-512' or manifest['signed'] is not False:
    raise ValueError('Unexpected corpus manifest')
names = ['Bibliografia_nucleo_5_0.bib', 'Manifiesto_integridad_5_0.json', 'Manual_Investigacion_TAMV_Compendio_5_0.docx', 'Matriz_fuentes_e_identificadores_5_0.csv', 'Matriz_normativa_y_limites.csv', 'Protocolos_experimentales_TAMV.csv', 'TESISTAMV2026.docx', 'manual-metodologico-protocolo-doctorado-tamv.md']
artifacts = []
for name in names:
    data = (source / name).read_bytes()
    digest = hashlib.sha512(data).hexdigest()
    expected = manifest['files'].get(name)
    if expected and (expected['bytes'] != len(data) or expected['sha512'] != digest):
        raise ValueError('Manifest mismatch: ' + name)
    artifacts.append({'file': name, 'bytes': len(data), 'sha512': digest, 'manifestMatch': True if expected else None})

def doc_text(name):
    with ZipFile(source / name) as archive:
        root = ET.fromstring(archive.read('word/document.xml'))
        return ''.join(node.text or '' for node in root.iter() if node.tag.rsplit('}', 1)[-1] in ['t', 'delText'])

def rows(name):
    with (source / name).open(encoding='utf-8-sig', newline='') as handle:
        return list(csv.DictReader(handle))

catalog = {'schema': 'tamv.research.corpus.v1', 'version': '5.0', 'signed': False,
    'scope': 'Research protocol, not certification or experimental results',
    'artifacts': artifacts,
    'docxTextEquivalent': doc_text(names[2]) == doc_text(names[6]),
    'manifestReferencesNotSupplied': [name for name in manifest['files'] if name not in names],
    'protocols': rows('Protocolos_experimentales_TAMV.csv'),
    'frameworks': rows('Matriz_normativa_y_limites.csv'),
    'sources': rows('Matriz_fuentes_e_identificadores_5_0.csv')}
(root / 'src/lib/research-catalog.json').write_text(json.dumps(catalog, ensure_ascii=False, indent=2) + '\n', encoding='utf-8')
print(f"Imported {len(catalog['protocols'])} protocols, {len(catalog['frameworks'])} frameworks and {len(catalog['sources'])} source records; no experiments claimed")
