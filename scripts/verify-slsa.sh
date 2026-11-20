#!/usr/bin/env bash
set -euo pipefail

# Canonical upstream. A fork can produce valid-looking attestations for its own
# repository; provenance is only meaningful when bound to this source.
CANONICAL_SOURCE_REPO="AnubisVillasenor1/tamv-creator-intelligence"

usage() {
  echo "Uso:" >&2
  echo "  $0 <artifact> <owner/repo> <refs/tags/tag>   # GitHub artifact attestation" >&2
  echo "  $0 <artifact> <provenance.intoto.jsonl> <source-uri> <tag>  # Offline SLSA verifier" >&2
}

if [[ $# -eq 3 ]]; then
  ARTIFACT="$1"
  SOURCE_REPO="$2"
  SOURCE_REF="$3"

  [[ -f "$ARTIFACT" ]] || { echo "ERROR: artefacto ausente: $ARTIFACT" >&2; exit 2; }
  [[ "$SOURCE_REPO" =~ ^[A-Za-z0-9_.-]+/[A-Za-z0-9_.-]+$ ]] || {
    echo "ERROR: el repositorio debe tener formato owner/repo." >&2
    exit 64
  }
  if [[ "${SOURCE_REPO,,}" != "$CANONICAL_SOURCE_REPO" ]]; then
    echo "ERROR: la atestación procede de $SOURCE_REPO; solo se acepta $CANONICAL_SOURCE_REPO." >&2
    exit 64
  fi

  case "$SOURCE_REF" in
    refs/tags/*) ;;
    *) SOURCE_REF="refs/tags/$SOURCE_REF" ;;
  esac
  [[ "$SOURCE_REF" =~ ^refs/tags/[A-Za-z0-9][A-Za-z0-9._/-]*$ ]] || {
    echo "ERROR: se requiere una referencia de tag válida." >&2
    exit 64
  }

  if [[ -z "$(printenv GH_TOKEN 2>/dev/null || true)" ]]; then
    echo "ERROR: GH_TOKEN es obligatorio para verificar atestaciones en GitHub." >&2
    exit 78
  fi
  command -v gh >/dev/null 2>&1 || {
    echo "ERROR: gh CLI con soporte para attestation es obligatorio." >&2
    exit 127
  }

  SOURCE_DIGEST="$(printenv TAMV_SOURCE_DIGEST 2>/dev/null || true)"
  [[ "$SOURCE_DIGEST" =~ ^[A-Fa-f0-9]{40,64}$ ]] || {
    echo "ERROR: TAMV_SOURCE_DIGEST debe contener el SHA del commit verificado." >&2
    exit 64
  }

  gh attestation verify "$ARTIFACT" \
    --repo "$SOURCE_REPO" \
    --predicate-type https://slsa.dev/provenance/v1 \
    --signer-workflow "$SOURCE_REPO/.github/workflows/release-sign.yml" \
    --source-ref "$SOURCE_REF" \
    --source-digest "$SOURCE_DIGEST"

  echo "GitHub SLSA provenance attestation: VERIFIED"
  echo "TAMV ONLINE NETWORK — Orgullosamente Realmontenses."
  exit 0
fi

if [[ $# -eq 4 ]]; then
  ARTIFACT="$1"
  PROVENANCE="$2"
  SOURCE_URI="$3"
  SOURCE_TAG="$4"

  [[ -f "$ARTIFACT" ]] || { echo "ERROR: artefacto ausente: $ARTIFACT" >&2; exit 2; }
  [[ -f "$PROVENANCE" ]] || { echo "ERROR: procedencia ausente: $PROVENANCE" >&2; exit 2; }
  if [[ "$SOURCE_URI" != "https://github.com/$CANONICAL_SOURCE_REPO" && "$SOURCE_URI" != "git+https://github.com/$CANONICAL_SOURCE_REPO" ]]; then
    echo "ERROR: el URI de origen debe apuntar a $CANONICAL_SOURCE_REPO." >&2
    exit 64
  fi
  command -v slsa-verifier >/dev/null 2>&1 || {
    echo "ERROR: slsa-verifier no está instalado. No se acepta una verificación simulada." >&2
    exit 127
  }

  slsa-verifier verify-artifact "$ARTIFACT" \
    --provenance-path "$PROVENANCE" \
    --source-uri "$SOURCE_URI" \
    --source-tag "$SOURCE_TAG"

  echo "Offline SLSA provenance: VERIFIED"
  echo "TAMV ONLINE NETWORK — Orgullosamente Realmontenses."
  exit 0
fi

usage
exit 64
