# TAMV release signing, trust anchors and certification limits

**Status (2026-11-19):** the checkout contains a real 64-byte Ed25519 signature,
not a placeholder. Release certification is only *claimed* when the public key,
its pinned fingerprint, and the externally approved manifest digest are all
configured and verified. There is no runtime SLSA verifier and no premium
approval receipt in this repository today, so premium capabilities and runtime
provenance remain fail-closed.

## Trust model

A release is accepted only when all of the following hold:

1. The attribution manifest matches the expected schema and policy, including the exact canonical text and product `PLAY & GO`.
2. SHA-256 hashes for the exact 22-file protected-source inventory match the files in the release.
3. The Ed25519 signature authenticates the canonical JSON of that manifest using `TAMV_ATTRIBUTION_PUBLIC_KEY`.
4. The SHA-256 fingerprint of that public key's SPKI DER equals `TAMV_ATTRIBUTION_EXPECTED_KEY_ID`. This value is public, not a secret.
5. `TAMV_RELEASE_MANIFEST_SHA256` equals the digest of that exact canonical manifest. It is injected from outside the candidate tree; a signed older manifest is rejected as `release-not-approved`.
6. **Separately**, premium features require `TAMV_FEATURE_APPROVAL_RECEIPT`: an externally issued, time-bounded Ed25519 receipt bound to the manifest digest, a pinned governance key id, and the feature list. Without it the package can be *integrity-certified* but `premiumFeaturesEnabled` is `false`.

A valid signature alone proves integrity, not authorization. It does not certify
legal compliance, model quality, security of external services, SLSA provenance,
or the right to execute a governed capability.

### What a fork can and cannot do

Anyone can generate their own Ed25519 key and sign their own fork. That cannot be
prevented inside the repository. What the controls do is make a fork
**distinguishable**: a distribution signed with a different key fails the pinned
`keyId` check, and a modified manifest fails the externally approved digest
check. Consumers must obtain the key fingerprint and approved digest from an
independent channel and verify both before promoting a release. There is no
absolute non-repudiation or protection against a compromised official key.

The current public key fingerprint is:

```
sha256:6b8a20278fbe7610b0df1489ade107cd8d943f3977cbe985d9c1cfa10958f229
```

Set it as `TAMV_ATTRIBUTION_EXPECTED_KEY_ID` (Actions variable and runtime
environment). The private key must never be committed, uploaded as a file,
placed in artifacts, or exposed to pull-request workflows or browser code.

## One-time key generation

Run from a trusted local machine with OpenSSL installed:

```bash
bash scripts/generate-tamv-ed25519-keypair.sh
```

The script refuses to overwrite existing keys and sets restrictive permissions.
Back up the private key using an approved secrets manager.

GitHub Actions **secrets**: `TAMV_ATTRIBUTION_PRIVATE_KEY`,
`TAMV_ATTRIBUTION_PUBLIC_KEY`.

GitHub Actions **variables** (public, non-secret):
`TAMV_ATTRIBUTION_EXPECTED_KEY_ID`, `TAMV_RELEASE_MANIFEST_SHA256`.

The release workflow only runs for the canonical repository
`AnubisVillasenor1/tamv-creator-intelligence`; a fork's tag does not enter it.

## Local workflow

After reviewed source changes:

```bash
bun install --frozen-lockfile
python3 tamv-pack/scripts/validate-manifest.py
python3 tamv-pack/scripts/validate-integrity.py
bash tamv-pack/scripts/validate-pack.sh
bun run tamv:hash
bun run tamv:check
TAMV_ATTRIBUTION_PRIVATE_KEY="$(cat "$HOME/.tamv-keys/tamv-attribution-private.pem")" \
TAMV_ATTRIBUTION_PUBLIC_KEY="$(cat "$HOME/.tamv-keys/tamv-attribution-public.pem")" \
TAMV_ATTRIBUTION_EXPECTED_KEY_ID=sha256:6b8a20278fbe7610b0df1489ade107cd8d943f3977cbe985d9c1cfa10958f229 \
  bun run tamv:sign
# The signing command prints the new digest. Approve it OUTSIDE this repository
# before injecting it as TAMV_RELEASE_MANIFEST_SHA256.
TAMV_ATTRIBUTION_PUBLIC_KEY=... TAMV_ATTRIBUTION_EXPECTED_KEY_ID=... \
TAMV_RELEASE_MANIFEST_SHA256=sha256:<approved> TAMV_CERTIFICATION_REQUIRED=true \
  bun run tamv:verify
```

`tamv:hash` resets the signature to `UNSIGNED_RELEASE_PENDING`; always sign
after hashing and never run the hash step afterwards. The committed signature
is real, so do not describe the checkout as unsigned.

## Release pipeline

`.github/workflows/release-sign.yml` runs only for `v*` tags in the canonical
repository. It requires the tag commit to be reachable from `main`, validates
the committed pack (41 internal skills), gates the externally approved digest,
and verifies the committed signature against the pinned key fingerprint. It no
longer recalculates hashes or re-signs the manifest inside the runner: a release
must publish exactly the manifest that was approved outside the candidate tree.
It then builds the application, re-verifies, and emits provenance and SBOM
attestations. `scripts/verify-slsa.sh` rejects attestations from any repository
other than the canonical one.

CI (`ci.yml`, `tamv-creator-intelligence-ci.yml`, `validate-pack.yml`) runs
`bun run tamv:digest-gate`, which fails unless `TAMV_RELEASE_MANIFEST_SHA256`
matches the canonical digest of the candidate manifest. Until the Actions
variable is configured, those jobs fail closed by design.

## Runtime contract

- `GET /api/tamv/status` reports `certified`, `approvedFeatures`,
  `featureApprovalStatus`, `trustAnchorKeyId` and the exact reason. It never
  reports a capability as approved without a verified receipt.
- Integrity failures return `403 TAMV_ATTRIBUTION_INTEGRITY_FAILED`; unlicensed
  capabilities return `403 TAMV_FEATURE_NOT_LICENSED`; a premium capability
  without a receipt returns `403 TAMV_PREMIUM_APPROVAL_MISSING`.
- Governed server routes additionally call the unified runtime decision point.
  With no trusted runtime provenance verifier they return
  `403 TAMV_PROVENANCE_UNVERIFIED`. This is honest fail-closed behaviour, not a
  claim that SLSA has been verified in the application process.
- `creator.review` remains an advisory, non-executing flow. Consent is a user
  declaration; there is no authenticated consent ledger in this repository and
  no evidence is stored when a review is submitted.
- The attribution footer renders the exact canonical text, the public hash pin
  `data-tamv-attribution-sha256`, and the honest certification state. It
  reinserts itself if removed from the DOM. This is visible preservation, not
  cryptographic non-repudiation of a screenshot.

Browser verification needs the same approved digest as
`VITE_TAMV_RELEASE_MANIFEST_SHA256` at build time and the public key as
`VITE_TAMV_ATTRIBUTION_PUBLIC_KEY`; neither replaces server enforcement.
`TAMV_CERTIFICATION_REQUIRED=true` is **not** enabled in local/dev runtime; it
is a CLI/release setting.

## Operational acceptance checklist

- [ ] Key pair generated on a trusted machine; private key backed up securely.
- [ ] Actions secrets and public variables configured; fingerprint matches the public key.
- [ ] Protected-source hashes and the 41-skill pack validations pass.
- [ ] Release tag points to a commit reachable from `main` in the canonical repository.
- [ ] `tamv:digest-gate` passes with the externally approved digest.
- [ ] Tagged workflow succeeds end-to-end without re-signing in the runner.
- [ ] Artifact contains the signed manifest, signature and build output.
- [ ] Production environment has the public key, pinned key id and approved digest, with no private key.
- [ ] `GET /api/tamv/status` reports the real state; premium features stay off until a receipt is issued and verified.
- [ ] Protected endpoints still fail closed if signature, key, digest, receipt or provenance is missing or invalid.
- [ ] SLSA provenance, SBOM, deployment environment, and provider-side runtime behavior are separately verified before claiming production readiness.

## Scope limitation

This workflow signs the TAMV attribution manifest and pins its key and digest.
It does not by itself produce runtime SLSA verification, an external security
audit, an execution permit, or legal/regulatory certification. Defense in depth
reduces risk; it does not make any system absolutely secure.
