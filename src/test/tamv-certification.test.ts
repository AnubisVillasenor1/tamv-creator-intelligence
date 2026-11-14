import { webcrypto } from "node:crypto";
import { describe, expect, it } from "vitest";
import {
  TAMV_ATTRIBUTION_MANIFEST,
  buildUnavailableCapabilityResponse,
  TAMV_EXPECTED_ATTRIBUTION,
  TAMV_CERTIFICATION_SOURCE_FILES,
  canonicalizeTamvManifest,
  getTamvCertification,
  requireTamvCertification,
  verifyTamvCertification,
} from "../lib/tamv-certification";

const cryptoProvider = webcrypto as unknown as Crypto;

async function signManifest(manifest: unknown) {
  const pair = (await cryptoProvider.subtle.generateKey(
    { name: "Ed25519" } as AlgorithmIdentifier,
    true,
    ["sign", "verify"],
  )) as CryptoKeyPair;
  const signatureBytes = await cryptoProvider.subtle.sign(
    { name: "Ed25519" },
    pair.privateKey,
    new TextEncoder().encode(canonicalizeTamvManifest(manifest)),
  );
  const publicDer = await cryptoProvider.subtle.exportKey("spki", pair.publicKey);
  const publicPem =
    "-----BEGIN PUBLIC KEY-----\n" +
    Buffer.from(publicDer).toString("base64") +
    "\n-----END PUBLIC KEY-----";
  return { signature: Buffer.from(signatureBytes).toString("base64url"), publicPem };
}

describe("TAMV attribution certification runtime", () => {
  it("accepts valid source hashes and a valid Ed25519 signature", async () => {
    const signed = await signManifest(TAMV_ATTRIBUTION_MANIFEST);
    const result = await verifyTamvCertification({
      manifest: TAMV_ATTRIBUTION_MANIFEST,
      signature: signed.signature,
      publicKeyPem: signed.publicPem,
      sourceFiles: TAMV_CERTIFICATION_SOURCE_FILES,
      cryptoProvider,
    });
    expect(result.status).toBe("certified");
    expect(result.certified).toBe(true);
    expect(result.premiumFeaturesEnabled).toBe(true);
  });

  it("fails closed when an attested attribution source is modified", async () => {
    const signed = await signManifest(TAMV_ATTRIBUTION_MANIFEST);
    const result = await verifyTamvCertification({
      manifest: TAMV_ATTRIBUTION_MANIFEST,
      signature: signed.signature,
      publicKeyPem: signed.publicPem,
      sourceFiles: {
        ...TAMV_CERTIFICATION_SOURCE_FILES,
        "README.md": TAMV_CERTIFICATION_SOURCE_FILES["README.md"].replaceAll(
          TAMV_EXPECTED_ATTRIBUTION,
          "Atribución retirada",
        ),
      },
      cryptoProvider,
    });
    expect(result.status).toBe("attribution-modified");
    expect(result.certified).toBe(false);
  });

  it("rejects missing required files before checking the signature", async () => {
    const signed = await signManifest(TAMV_ATTRIBUTION_MANIFEST);
    const sourceFiles = { ...TAMV_CERTIFICATION_SOURCE_FILES };
    delete sourceFiles["ATTRIBUTION.md"];
    const result = await verifyTamvCertification({
      manifest: TAMV_ATTRIBUTION_MANIFEST,
      signature: signed.signature,
      publicKeyPem: signed.publicPem,
      sourceFiles,
      cryptoProvider,
    });
    expect(result.status).toBe("required-file-missing");
  });

  it("rejects unsigned or tampered signature data", async () => {
    const unsigned = await verifyTamvCertification({
      manifest: TAMV_ATTRIBUTION_MANIFEST,
      signature: "UNSIGNED_RELEASE_PENDING",
      publicKeyPem: "",
      sourceFiles: TAMV_CERTIFICATION_SOURCE_FILES,
      cryptoProvider,
    });
    expect(unsigned.status).toBe("signature-missing");

    const signed = await signManifest(TAMV_ATTRIBUTION_MANIFEST);
    const invalid = await verifyTamvCertification({
      manifest: TAMV_ATTRIBUTION_MANIFEST,
      signature: (signed.signature.startsWith("A") ? "B" : "A") + signed.signature.slice(1),
      publicKeyPem: signed.publicPem,
      sourceFiles: TAMV_CERTIFICATION_SOURCE_FILES,
      cryptoProvider,
    });
    expect(invalid.status).toBe("signature-invalid");
  });

  it("rejects canonical-text changes even if source files are otherwise intact", async () => {
    const changedManifest = {
      ...TAMV_ATTRIBUTION_MANIFEST,
      attribution: {
        ...TAMV_ATTRIBUTION_MANIFEST.attribution,
        canonicalText: "Attribution removed",
      },
    };
    const result = await verifyTamvCertification({
      manifest: changedManifest,
      signature: "UNSIGNED_RELEASE_PENDING",
      publicKeyPem: "",
      sourceFiles: TAMV_CERTIFICATION_SOURCE_FILES,
      cryptoProvider,
    });
    expect(result.status).toBe("attribution-modified");
  });

  it("returns an honest unsigned state and HTTP 403 for a protected capability", async () => {
    const status = await getTamvCertification();
    expect(status.certified).toBe(false);
    expect(["signature-missing", "signing-key-missing", "crypto-unavailable"]).toContain(status.status);
    const response = await requireTamvCertification("creator.review");
    expect(response).not.toBeNull();
    expect(response?.status).toBe(403);
    const body = await response?.json();
    expect(body.code).toBe("TAMV_ATTRIBUTION_INTEGRITY_FAILED");
  });

  it("returns 403 for uncertified capabilities and 501 only for certified, licensed but unwired gateways", async () => {
    const unsignedCertification = await getTamvCertification();
    const blocked = buildUnavailableCapabilityResponse("music.generation", unsignedCertification);
    expect(blocked.status).toBe(403);
    expect((await blocked.json()).code).toBe("TAMV_ATTRIBUTION_INTEGRITY_FAILED");

    const certified = {
      status: "certified" as const,
      certified: true,
      premiumFeaturesEnabled: true,
      reason: "test signature",
      checkedAt: new Date().toISOString(),
    };
    const licensedManifest = {
      ...TAMV_ATTRIBUTION_MANIFEST,
      license: {
        ...TAMV_ATTRIBUTION_MANIFEST.license,
        features: ["creator.review", "music.generation"],
      },
    };
    const notImplemented = buildUnavailableCapabilityResponse(
      "music.generation",
      certified,
      licensedManifest,
    );
    expect(notImplemented.status).toBe(501);
    expect((await notImplemented.json()).code).toBe("TAMV_CAPABILITY_NOT_IMPLEMENTED");
  });
});
