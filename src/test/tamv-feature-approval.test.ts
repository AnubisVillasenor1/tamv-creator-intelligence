import { webcrypto } from "node:crypto";
import { beforeAll, describe, expect, it } from "vitest";
import { canonicalizeTamvJson } from "../lib/tamv-canonical-json";
import { verifyFeatureApproval } from "../lib/tamv-feature-approval";
import { spkiKeyId } from "../lib/tamv-trust-anchors";

const cryptoProvider = webcrypto as unknown as Crypto;
const manifestDigest = "sha256:" + "a".repeat(64);

beforeAll(() => {
  Object.defineProperty(globalThis, "crypto", { value: webcrypto, configurable: true });
});

async function receipt(overrides: Record<string, unknown> = {}) {
  const pair = (await cryptoProvider.subtle.generateKey(
    { name: "Ed25519" } as AlgorithmIdentifier,
    true,
    ["sign", "verify"],
  )) as CryptoKeyPair;
  const der = await cryptoProvider.subtle.exportKey("spki", pair.publicKey);
  const publicPem =
    "-----BEGIN PUBLIC KEY-----\n" + Buffer.from(der).toString("base64") + "\n-----END PUBLIC KEY-----";
  const keyId = await spkiKeyId(publicPem, cryptoProvider);
  const now = Date.now();
  const unsigned = {
    schema: "tamv.feature.approval.v1",
    manifestDigest,
    features: ["agent.orchestration"],
    keyId,
    issuedAt: new Date(now - 60_000).toISOString(),
    expiresAt: new Date(now + 3_600_000).toISOString(),
    ...overrides,
  };
  const signature = await cryptoProvider.subtle.sign(
    { name: "Ed25519" },
    pair.privateKey,
    new TextEncoder().encode(canonicalizeTamvJson(unsigned)),
  );
  return {
    receipt: { ...unsigned, signature: Buffer.from(signature).toString("base64url") },
    publicPem,
    keyId,
  };
}

describe("external premium approval", () => {
  it("fails closed when no receipt is configured", async () => {
    const result = await verifyFeatureApproval({ manifestDigest, receipt: undefined, cryptoProvider });
    expect(result.status).toBe("receipt-missing");
    expect(result.approved).toBe(false);
  });

  it("rejects a receipt that names a different manifest digest", async () => {
    const signed = await receipt();
    const result = await verifyFeatureApproval({
      manifestDigest: "sha256:" + "b".repeat(64),
      receipt: signed.receipt,
      publicKeyPem: signed.publicPem,
      expectedKeyId: signed.keyId,
      cryptoProvider,
    });
    expect(result.status).toBe("digest-not-approved");
  });

  it("rejects a receipt signed by a key outside the governance anchor", async () => {
    const signed = await receipt();
    const other = await receipt();
    const result = await verifyFeatureApproval({
      manifestDigest,
      receipt: signed.receipt,
      publicKeyPem: other.publicPem,
      expectedKeyId: other.keyId,
      cryptoProvider,
    });
    expect(result.status).toBe("receipt-invalid");
  });

  it("approves only the features named in a valid, time-bounded receipt", async () => {
    const signed = await receipt();
    const result = await verifyFeatureApproval({
      manifestDigest,
      receipt: signed.receipt,
      publicKeyPem: signed.publicPem,
      expectedKeyId: signed.keyId,
      cryptoProvider,
    });
    expect(result.status).toBe("approved");
    expect(result.features).toEqual(["agent.orchestration"]);
  });
});
