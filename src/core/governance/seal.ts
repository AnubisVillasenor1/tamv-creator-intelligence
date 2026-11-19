import { digest } from './engine';

export type ArtifactSeal = { schema: 'tamv.artifact.seal.v1'; algorithm: 'SHA-512'; artifact: unknown; sha512: string };
export async function sealArtifact(artifact: unknown): Promise<ArtifactSeal> {
  return { schema: 'tamv.artifact.seal.v1', algorithm: 'SHA-512', artifact, sha512: await digest(artifact, 'SHA-512') };
}
export async function verifyArtifactSeal(seal: ArtifactSeal) {
  return seal.schema === 'tamv.artifact.seal.v1' && seal.algorithm === 'SHA-512' && /^[a-f0-9]{128}$/.test(seal.sha512) && await digest(seal.artifact, 'SHA-512') === seal.sha512;
}
// Integrity checks never grant approval or certify a release.
export async function verifyDetachedSignature(payload: string, signatureBase64: string, publicKeyBase64: string) {
  try {
    const decode = (value: string) => Uint8Array.from(atob(value), char => char.charCodeAt(0));
    const key = await crypto.subtle.importKey('spki', decode(publicKeyBase64), { name: 'Ed25519' }, false, ['verify']);
    return await crypto.subtle.verify('Ed25519', key, decode(signatureBase64), new TextEncoder().encode(payload));
  } catch { return false; }
}