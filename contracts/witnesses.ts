/*
 * TypeScript implementations of the `witness` declarations in
 * range-proof.compact. The Compact prover invokes these at proving time on
 * the holder's machine. They feed private values into the circuit's witness
 * column without exposing them publicly.
 *
 * Convention from `midnightntwrk/example-bboard/contract/src/witnesses.ts`:
 * each witness returns `[newPrivateState, value]` and receives a
 * `WitnessContext<Ledger, PrivateState>` argument. The Compact-generated
 * `Ledger` type is supplied at deploy time by `compact compile`.
 */

import type { WitnessContext } from '@midnight-ntwrk/compact-runtime';

export type HolderPrivateState = {
  // 32-byte ed25519-style secret — the holder's long-term identity binding.
  readonly secret: Uint8Array;

  // The attestation currently selected for the proof. Set by the holder app
  // before calling `proveIncomeAtLeast`.
  readonly attestation: {
    readonly value: bigint; // Uint<64>
    readonly nonce: Uint8Array; // Bytes<32>
    readonly expiresAt: bigint; // Uint<64> — seconds since epoch
    readonly claimType: Uint8Array; // Bytes<32>
  } | null;
};

export const createHolderPrivateState = (
  secret: Uint8Array
): HolderPrivateState => ({
  secret,
  attestation: null,
});

const requireAttestation = (s: HolderPrivateState) => {
  if (!s.attestation) {
    throw new Error(
      'holder.attestation is null — set it before generating a proof'
    );
  }
  return s.attestation;
};

type Ledger = unknown; // Compact-generated ledger snapshot type.

export const witnesses = {
  holderSecret: ({ privateState }: WitnessContext<Ledger, HolderPrivateState>) =>
    [privateState, privateState.secret] as const,

  attestationValue: (ctx: WitnessContext<Ledger, HolderPrivateState>) =>
    [ctx.privateState, requireAttestation(ctx.privateState).value] as const,

  attestationNonce: (ctx: WitnessContext<Ledger, HolderPrivateState>) =>
    [ctx.privateState, requireAttestation(ctx.privateState).nonce] as const,

  attestationExpiresAt: (ctx: WitnessContext<Ledger, HolderPrivateState>) =>
    [ctx.privateState, requireAttestation(ctx.privateState).expiresAt] as const,

  attestationClaimType: (ctx: WitnessContext<Ledger, HolderPrivateState>) =>
    [ctx.privateState, requireAttestation(ctx.privateState).claimType] as const,
};
