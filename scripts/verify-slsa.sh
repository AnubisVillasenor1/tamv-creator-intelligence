#!/usr/bin/env bash
set -euo pipefail

if [[ $# -ne 4 ]]; then
  echo "Uso: $0 <artifact> <provenance.intoto.jsonl> <github-owner/repo> <tag>" >&2
  echo "Ejemplo: $0 dist/package.tar.gz dist/provenance.intoto.jsonl github.com/OWNER/REPO v2.0.0" >&2
  exit 64
fi

ARTIFACT="$1"
PROVENANCE="$2"
SOURCE_URI="$3"
SOURCE_TAG="$4"

[[ -f "$ARTIFACT" ]] || { echo "ERROR: artefacto ausente: $ARTIFACT" >&2; exit 2; }
[[ -f "$PROVENANCE" ]] || { echo "ERROR: procedencia ausente: $PROVENANCE" >&2; exit 2; }
command -v slsa-verifier >/dev/null 2>&1 || {
  echo "ERROR: slsa-verifier no está instalado. No se acepta una verificación simulada." >&2
  exit 127
}

slsa-verifier verify-artifact "$ARTIFACT" \
  --provenance-path "$PROVENANCE" \
  --source-uri "$SOURCE_URI" \
  --source-tag "$SOURCE_TAG"

echo "SLSA provenance: VERIFIED"
echo "TAMV ONLINE NETWORK — Orgullosamente Realmontenses."