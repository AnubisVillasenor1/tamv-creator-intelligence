import { webcrypto } from "node:crypto";
import { describe, expect, it } from "vitest";
import {
  assertTamvAttributionIntegrity,
  createIntegrityEnvelope,
  TAMV_CANONICAL_ATTRIBUTION,
  TAMV_CANONICAL_ATTRIBUTION_SHA512,
  TamvSovereigntyBreachError,
  verifyIntegrityEnvelope,
} from "../../tamv-pack/core/tamv-sovereign-core";

const cryptoProvider = webcrypto as unknown as Crypto;
const testOnlySecret = "test-only-secret-not-for-production-0123456789";
const files = {
  "pack.json": JSON.stringify({ name: "tamv-online-network-creator-intelligence-pack", version: "1.2.0" }),
  "skills/tamv-core-governance/SKILL.md": "name: tamv-core-governance\nattribution: TAMV ONLINE NETWORK",
};

describe("TAMV sovereign integrity core", () => {
  it("checks the pinned SHA-512 attribution fingerprint", async () => {
    await expect(assertTamvAttributionIntegrity(cryptoProvider)).resolves.toBeUndefined();
    expect(TAMV_CANONICAL_ATTRIBUTION_SHA512).toHaveLength(128);
    expect(TAMV_CANONICAL_ATTRIBUTION).toContain("TAMV ONLINE NETWORK");
  });

  it("creates and verifies a PBKDF2/SHA-384 + HMAC/SHA-384 envelope", async () => {
    const envelope = await createIntegrityEnvelope({
      packageName: "tamv-online-network-creator-intelligence-pack",
      version: "1.2.0",
      attribution: TAMV_CANONICAL_ATTRIBUTION,
      files,
    }, testOnlySecret, cryptoProvider);
    await expect(verifyIntegrityEnvelope(envelope, testOnlySecret, files, cryptoProvider)).resolves.toBeUndefined();
  });

  it("rejects a changed file and a changed file set", async () => {
    const envelope = await createIntegrityEnvelope({
      packageName: "tamv-online-network-creator-intelligence-pack",
      version: "1.2.0",
      attribution: TAMV_CANONICAL_ATTRIBUTION,
      files,
    }, testOnlySecret, cryptoProvider);
    await expect(verifyIntegrityEnvelope(
      envelope, testOnlySecret, { ...files, "pack.json": files["pack.json"] + " " }, cryptoProvider,
    )).rejects.toBeInstanceOf(TamvSovereigntyBreachError);
    await expect(verifyIntegrityEnvelope(
      envelope, testOnlySecret, { "pack.json": files["pack.json"] }, cryptoProvider,
    )).rejects.toBeInstanceOf(TamvSovereigntyBreachError);
  });

  it("rejects an altered attribution in the payload", async () => {
    await expect(createIntegrityEnvelope({
      packageName: "tamv-online-network-creator-intelligence-pack",
      version: "1.2.0",
      attribution: "Attribution removed",
      files,
    }, testOnlySecret, cryptoProvider)).rejects.toMatchObject({ code: "TAMV_SOVEREIGNTY_BREACH" });
  });
});
