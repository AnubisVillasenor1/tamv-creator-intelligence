# TAMV release signing and certification

**Status:** operational design; release certification remains pending until the repository secrets are configured and a tagged run succeeds.

## Trust model

The release verifier uses three independent checks:

1. The attribution manifest matches the expected schema and policy.
2. SHA-256 hashes for the exact protected-source inventory match the files in the release.
3. An Ed25519 signature authenticates the canonical JSON representation of the manifest using the configured public key.

The private key is used only by the signing job. It must never be committed, placed in build artifacts, exposed to pull-request workflows, or made available to the application runtime. The application needs only the public key. A valid signature does **not** certify legal compliance, model quality, SLSA provenance, or the security of external services.

## One-time key generation

Run from a trusted local machine with OpenSSL installed:

```bash
bash scripts/generate-tamv-ed25519-keypair.sh
```

The script defaults to `$HOME/.config/tamv/keys`, refuses to overwrite existing keys, and sets restrictive directory/file permissions. Back up the private key using an approved secrets manager. Do not upload the private PEM to GitHub as a file.

Add these repository Actions secrets under **Settings → Secrets and variables → Actions**:

- `TAMV_ATTRIBUTION_PRIVATE_KEY`: the complete contents of `tamv-attribution-private.pem`, including PEM delimiters.
- `TAMV_ATTRIBUTION_PUBLIC_KEY`: the complete contents of `tamv-attribution-public.pem`, including PEM delimiters.

The public key is not confidential, but keeping both values in the same controlled release configuration allows the pipeline to verify that they form a matching pair. Never configure the private key as a `VITE_*` variable.

## Local workflow

From the repository root, after making reviewed changes:

```bash
bun install --frozen-lockfile
bun run tamv:check
python3 tamv-pack/scripts/validate-manifest.py
python3 tamv-pack/scripts/validate-integrity.py
bash tamv-pack/scripts/validate-pack.sh
bun run tamv:hash
TAMV_ATTRIBUTION_PRIVATE_KEY="$(cat "$HOME/.config/tamv/keys/tamv-attribution-private.pem")" \
TAMV_ATTRIBUTION_PUBLIC_KEY="$(cat "$HOME/.config/tamv/keys/tamv-attribution-public.pem")" \
  bun run tamv:sign
TAMV_ATTRIBUTION_PUBLIC_KEY="$(cat "$HOME/.config/tamv/keys/tamv-attribution-public.pem")" \
TAMV_CERTIFICATION_REQUIRED=true bun run tamv:verify
TAMV_ATTRIBUTION_PUBLIC_KEY="$(cat "$HOME/.config/tamv/keys/tamv-attribution-public.pem")" \
TAMV_CERTIFICATION_REQUIRED=true bun run build
```

Signing rewrites `tamv-attribution.sig`; hashing deliberately resets the old signature to `UNSIGNED_RELEASE_PENDING`. Do not run `tamv:hash` after signing, because doing so invalidates the signature. Do not commit a generated signature unless the release policy explicitly requires a versioned signature; the tagged workflow produces a signed artifact.

## Release pipeline

The workflow `.github/workflows/release-sign.yml` runs only for tags matching `v*`. It:

1. Requires the tag commit to be reachable from `main`.
2. Installs the locked dependency graph.
3. Validates the repository, the 37 skills and the pack integrity inventory.
4. Recalculates the source hashes.
5. Signs the manifest with Ed25519 and verifies the key pair.
6. Runs tests and lint.
7. Builds with `TAMV_CERTIFICATION_REQUIRED=true`.
8. Re-verifies certification and publishes an artifact containing the manifest, signature and generated build output.

The job fails closed if either secret is missing, if a source hash drifts, if the public/private key pair does not match, if the signature cannot be verified, or if tests/lint/build fail. GitHub Actions does not write the private key to a temporary file; it is passed only to the signing process through the environment.

## Runtime contract

- `GET /api/tamv/status` reports certification state and disables premium capabilities when verification fails.
- Protected generation routes must return `403 TAMV_ATTRIBUTION_INTEGRITY_FAILED` when certification is false.
- If certification is valid but a gateway is not implemented or licensed, the route must return `501 TAMV_CAPABILITY_NOT_IMPLEMENTED` or `403 TAMV_FEATURE_NOT_LICENSED`, respectively.
- A successful signature does not make an unimplemented capability executable.

The public key must be configured on the server as `TAMV_ATTRIBUTION_PUBLIC_KEY`. The unsigned marker in the source checkout is intentional; it is not evidence that a release has been signed.

## Operational acceptance checklist

- [ ] Key pair generated on a trusted machine; private key backed up securely.
- [ ] Both GitHub Actions secrets added and public key matches the private key.
- [ ] Protected-source hashes and the 37-skill pack validations pass.
- [ ] Release tag points to a commit reachable from `main`.
- [ ] Tagged workflow succeeds end-to-end.
- [ ] Downloaded artifact contains the signed manifest, signature and build output.
- [ ] Production environment has the public key only.
- [ ] `GET /api/tamv/status` returns `certified: true` for the deployed signed artifact.
- [ ] Protected endpoints still fail closed if the signature, key, or manifest is missing or invalid.
- [ ] SLSA provenance, SBOM, deployment environment, and provider-side runtime behavior are separately verified before claiming production readiness.

## Scope limitation

This workflow signs the TAMV attribution manifest. It does not by itself produce or validate SLSA provenance, an SBOM, an external security audit, or legal/regulatory certification. Those must remain separate release gates.
