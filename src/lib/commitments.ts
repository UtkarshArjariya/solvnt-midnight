/*
 * Off-chain reproductions of the `persistentHash` derivations the
 * range-proof.compact circuit performs in-circuit. Used by:
 *   - the issuer (to compute the commitment it publishes via issueAttestation)
 *   - the holder (to derive its subjectCommitment from `secret` at registration time)
 *
 * Both sides must produce IDENTICAL bytes for the on-chain membership check
 * to pass. The Compact runtime's `persistentHash` is Poseidon over BLS12-381,
 * exposed by `@midnight-ntwrk/compact-runtime`. We use the same primitives
 * the generated TS bindings use (`CompactTypeVector`, `CompactTypeBytes`,
 * `convertFieldToBytes`) to guarantee byte-equality.
 *
 * Domain separators are pinned to the same string literals as the circuit:
 *   - "solvnt:subject:v1"      — subject commitment derivation
 *   - "solvnt:attestation:v1"  — attestation commitment derivation
 *   - "solvnt:nullifier:v1"    — nullifier derivation (in-circuit only; here for completeness)
 */

import {
  persistentHash,
  convertFieldToBytes,
  CompactTypeVector,
  CompactTypeBytes,
} from '@midnight-ntwrk/compact-runtime';

const BYTES32 = new CompactTypeBytes(32);
const VEC2 = new CompactTypeVector(2, BYTES32);
const VEC5 = new CompactTypeVector(5, BYTES32);
const VEC6 = new CompactTypeVector(6, BYTES32);

/** UTF-8-encode and right-pad to 32 bytes. Matches `pad(32, "...")` in Compact. */
export const padToBytes32 = (s: string): Uint8Array => {
  const out = new Uint8Array(32);
  const bytes = new TextEncoder().encode(s);
  if (bytes.length > 32) throw new Error('padToBytes32_overflow');
  out.set(bytes);
  return out;
};

/** `convertFieldToBytes(32, value, ...)` — matches `value as Field as Bytes<32>`. */
export const uintToBytes32 = (value: bigint, srcLabel: string): Uint8Array =>
  convertFieldToBytes(32, value, srcLabel);

/**
 * Subject commitment — the holder publishes this to the issuer so the issuer
 * can bind the attestation to a stable identity WITHOUT learning the secret.
 *
 *   subjectCommitment = persistentHash<Vector<2, Bytes<32>>>([secret, "solvnt:subject:v1"])
 */
export const subjectCommitmentFromSecret = (secret: Uint8Array): Uint8Array => {
  if (secret.length !== 32) throw new Error('secret_must_be_32_bytes');
  return persistentHash(VEC2, [secret, padToBytes32('solvnt:subject:v1')]);
};

export type AttestationCommitmentInput = {
  /** Uint<64> in the circuit; bigint here. */
  readonly value: bigint;
  /** Bytes<32>. */
  readonly nonce: Uint8Array;
  /** Bytes<32> — output of `subjectCommitmentFromSecret`. */
  readonly subjectCommitment: Uint8Array;
  /** Uint<64> (seconds since epoch) in the circuit. */
  readonly expiresAt: bigint;
  /** Bytes<32> — typically hash of the claim type string. */
  readonly claimType: Uint8Array;
};

/**
 * Attestation commitment — the issuer publishes this on-chain via
 * `issueAttestation(issuerId, commitment)`. The circuit recomputes this same
 * value from witnesses and asserts membership in the issuer's bucket.
 *
 *   commitment = persistentHash<Vector<6, Bytes<32>>>([
 *     value as Bytes<32>, nonce, subjectCommitment,
 *     expiresAt as Bytes<32>, claimType, "solvnt:attestation:v1"
 *   ])
 */
export const attestationCommitment = (
  input: AttestationCommitmentInput
): Uint8Array => {
  if (input.nonce.length !== 32) throw new Error('nonce_must_be_32_bytes');
  if (input.subjectCommitment.length !== 32)
    throw new Error('subject_commitment_must_be_32_bytes');
  if (input.claimType.length !== 32) throw new Error('claim_type_must_be_32_bytes');
  return persistentHash(VEC6, [
    uintToBytes32(input.value, 'attestationCommitment.value'),
    input.nonce,
    input.subjectCommitment,
    uintToBytes32(input.expiresAt, 'attestationCommitment.expiresAt'),
    input.claimType,
    padToBytes32('solvnt:attestation:v1'),
  ]);
};

/**
 * Nullifier preview — what the circuit will emit on a successful
 * `proveIncomeAtLeast`. Available off-chain for tests / UI previews; the
 * authoritative value is the one returned by the circuit.
 *
 *   nullifier = persistentHash<Vector<5, Bytes<32>>>([
 *     secret, verifierId, claimType, issuerId, "solvnt:nullifier:v1"
 *   ])
 */
export const nullifierPreview = (input: {
  readonly secret: Uint8Array;
  readonly verifierId: Uint8Array;
  readonly claimType: Uint8Array;
  readonly issuerId: Uint8Array;
}): Uint8Array =>
  persistentHash(VEC5, [
    input.secret,
    input.verifierId,
    input.claimType,
    input.issuerId,
    padToBytes32('solvnt:nullifier:v1'),
  ]);
