#!/usr/bin/env bash
set -euo pipefail
umask 077

KEY_DIR="${1:-$HOME/.config/tamv/keys}"
PRIVATE_KEY="$KEY_DIR/tamv-attribution-private.pem"
PUBLIC_KEY="$KEY_DIR/tamv-attribution-public.pem"

if ! command -v openssl >/dev/null 2>&1; then
  echo "Error: OpenSSL is required to generate the TAMV Ed25519 key pair." >&2
  exit 1
fi

if [[ -e "$PRIVATE_KEY" || -e "$PUBLIC_KEY" ]]; then
  echo "Error: a key file already exists in $KEY_DIR; refusing to overwrite keys." >&2
  exit 1
fi

mkdir -p "$KEY_DIR"
chmod 700 "$KEY_DIR"

temporary_private="$(mktemp "$KEY_DIR/.tamv-private.XXXXXX")"
temporary_public="$(mktemp "$KEY_DIR/.tamv-public.XXXXXX")"
cleanup() {
  rm -f "$temporary_private" "$temporary_public"
}
trap cleanup EXIT

openssl genpkey -algorithm ED25519 -out "$temporary_private"
openssl pkey -in "$temporary_private" -pubout -out "$temporary_public"
chmod 600 "$temporary_private" "$temporary_public"

# Publish only after both files have been generated successfully.
mv "$temporary_private" "$PRIVATE_KEY"
mv "$temporary_public" "$PUBLIC_KEY"
trap - EXIT
chmod 600 "$PRIVATE_KEY" "$PUBLIC_KEY"

echo "TAMV Ed25519 key pair generated."
echo "Private key (secret; never commit): $PRIVATE_KEY"
echo "Public key: $PUBLIC_KEY"
echo
echo "Store each PEM value in GitHub Actions secrets:"
echo "  TAMV_ATTRIBUTION_PRIVATE_KEY <- contents of tamv-attribution-private.pem"
echo "  TAMV_ATTRIBUTION_PUBLIC_KEY  <- contents of tamv-attribution-public.pem"
