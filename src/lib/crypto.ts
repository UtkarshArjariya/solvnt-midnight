import * as ed from '@noble/ed25519';
import { sha256 } from '@noble/hashes/sha256';
import { sha512 } from '@noble/hashes/sha512';
import { bytesToHex, hexToBytes, randomBytes, utf8ToBytes } from '@noble/hashes/utils';
import type { Attestation } from './schemas';

// @noble/ed25519 v2 requires a sha512 implementation hook (no WebCrypto fallback in Node).
ed.etc.sha512Sync = (...m: Uint8Array[]) => sha512(ed.etc.concatBytes(...m));

export const toHex = (b: Uint8Array): `0x${string}` => `0x${bytesToHex(b)}`;

export const fromHex = (h: string): Uint8Array => {
  const clean = h.startsWith('0x') ? h.slice(2) : h;
  return hexToBytes(clean);
};

export const randomHex = (bytes = 16): `0x${string}` => toHex(randomBytes(bytes));

export const randomBytes32 = (): Uint8Array => randomBytes(32);

const stableStringify = (v: unknown): string => {
  if (v === null || typeof v !== 'object') return JSON.stringify(v);
  if (Array.isArray(v)) return `[${v.map(stableStringify).join(',')}]`;
  const keys = Object.keys(v as Record<string, unknown>).sort();
  return `{${keys
    .map((k) => `${JSON.stringify(k)}:${stableStringify((v as Record<string, unknown>)[k])}`)
    .join(',')}}`;
};

export const hash = (input: string | Uint8Array): Uint8Array =>
  sha256(typeof input === 'string' ? utf8ToBytes(input) : input);

export const hashHex = (input: string | Uint8Array): `0x${string}` => toHex(hash(input));

export const attestationMessage = (a: Omit<Attestation, 'signature'>): Uint8Array =>
  utf8ToBytes(stableStringify(a));

export const attestationDigest = (a: Omit<Attestation, 'signature'>): Uint8Array =>
  hash(attestationMessage(a));

export const generateKeypair = async (): Promise<{
  privateKey: `0x${string}`;
  publicKey: `0x${string}`;
}> => {
  const priv = ed.utils.randomPrivateKey();
  const pub = await ed.getPublicKeyAsync(priv);
  return { privateKey: toHex(priv), publicKey: toHex(pub) };
};

export const keypairFromSeed = async (seed: string): Promise<{
  privateKey: `0x${string}`;
  publicKey: `0x${string}`;
}> => {
  const priv = hash(seed);
  const pub = await ed.getPublicKeyAsync(priv);
  return { privateKey: toHex(priv), publicKey: toHex(pub) };
};

export const publicKeyOf = async (privateKey: string): Promise<`0x${string}`> =>
  toHex(await ed.getPublicKeyAsync(fromHex(privateKey)));

export const sign = async (
  message: Uint8Array,
  privateKey: string
): Promise<`0x${string}`> => toHex(await ed.signAsync(message, fromHex(privateKey)));

export const verifySignature = async (
  signature: string,
  message: Uint8Array,
  publicKey: string
): Promise<boolean> => {
  try {
    return await ed.verifyAsync(fromHex(signature), message, fromHex(publicKey));
  } catch {
    return false;
  }
};

export const issuerIdFromPubkey = (pubkey: string): `0x${string}` =>
  hashHex(fromHex(pubkey));

export const subjectCommitment = (
  subjectPubkey: string,
  nonce: string
): `0x${string}` => hashHex(utf8ToBytes(`${subjectPubkey}|${nonce}`));

export const nullifierOf = (nonce: string, issuerPubkey: string): `0x${string}` =>
  hashHex(utf8ToBytes(`${nonce}|${issuerPubkey}`));
