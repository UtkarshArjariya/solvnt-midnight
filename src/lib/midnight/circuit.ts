/*
 * Thin wrappers around `submitCallTx` for Solvnt's three on-chain circuits:
 *
 *   1. registerIssuer(issuerId, pubkey, label)  — IssuerRegistry
 *   2. issueAttestation(issuerId, commitment)   — RangeProofVerifier
 *   3. proveIncomeAtLeast(...)                  — RangeProofVerifier
 *
 * Each wrapper takes already-built providers (`buildBrowserProviders` from
 * providers.ts) and a `ContractAddresses` object (from addresses.ts). The
 * heavy SDK chain (midnight-js-contracts → compact-js → ledger-v8) is loaded
 * via the `loadDeployModule`-style indirection elsewhere; here we just type-
 * sign the entry points.
 *
 * Type compromise: the compactc-generated `Contract<PS, W>` class is
 * structurally compatible with `@midnight-ntwrk/compact-js`'s `Contract`
 * interface, but the SDK's generic constraints make exact typing brittle
 * across minor versions. We cast at the SDK boundary (`as never`) and rely on
 * runtime structural equivalence — a contract whose `provableCircuits`
 * matches the circuit-id literal type will dispatch correctly.
 */

import { submitCallTx } from '@midnight-ntwrk/midnight-js-contracts';
import {
  buildCompiledContracts,
  BROWSER_ASSET_PATHS,
  RANGE_PROOF_PRIVATE_STATE_ID,
  type AssetPaths,
} from './contracts-runtime';
import type { ContractAddresses } from './addresses';

/**
 * Register an issuer in the IssuerRegistry contract.
 *
 * Permissionless per the hackathon scope (FR-1.4). Re-registering the same
 * `issuerId` overwrites the entry — fine for idempotent demo seeding, should
 * be governance-gated post-MVP.
 */
export const callRegisterIssuer = async (
  providers: unknown,
  addresses: ContractAddresses,
  args: {
    issuerId: Uint8Array; // Bytes<32>
    pubkey: Uint8Array; // Bytes<32>
    label: string;
  },
  paths: AssetPaths = BROWSER_ASSET_PATHS
): Promise<{ txHash: string }> => {
  const { issuerRegistry } = buildCompiledContracts(paths);
  const result = (await submitCallTx(providers as never, {
    compiledContract: issuerRegistry,
    circuitId: 'registerIssuer',
    contractAddress: addresses.issuerRegistry,
    args: [args.issuerId, args.pubkey, args.label],
  } as never)) as { public?: { txId?: string }; txData?: { public?: { txId?: string } } };

  const txHash =
    result.public?.txId ?? result.txData?.public?.txId ?? '';
  return { txHash };
};

/**
 * Publish an attestation commitment to the RangeProofVerifier's per-issuer
 * map. The issuer is expected to compute the commitment off-chain via the
 * same `persistentHash<Vector<6, Bytes<32>>>` shape the circuit uses; see
 * `src/lib/commitments.ts` for the helper.
 */
export const callIssueAttestation = async (
  providers: unknown,
  addresses: ContractAddresses,
  args: {
    issuerId: Uint8Array; // Bytes<32>
    commitment: Uint8Array; // Bytes<32>
  },
  paths: AssetPaths = BROWSER_ASSET_PATHS
): Promise<{ txHash: string }> => {
  const { rangeProof } = buildCompiledContracts(paths);
  const result = (await submitCallTx(providers as never, {
    compiledContract: rangeProof,
    circuitId: 'issueAttestation',
    contractAddress: addresses.rangeProof,
    args: [args.issuerId, args.commitment],
    privateStateId: RANGE_PROOF_PRIVATE_STATE_ID,
  } as never)) as { public?: { txId?: string }; txData?: { public?: { txId?: string } } };

  const txHash =
    result.public?.txId ?? result.txData?.public?.txId ?? '';
  return { txHash };
};

/**
 * Submit a `proveIncomeAtLeast` call. The witness functions read from the
 * holder's private state — the caller is responsible for ensuring the
 * holder's `attestation` slot is populated before invoking (see
 * `contracts/witnesses.ts: requireAttestation`).
 *
 * Returns the on-chain nullifier (also recorded in `spentNullifiers`) and the
 * tx id. The nullifier is the public-input the verifier sees alongside the
 * proof.
 */
export const callProveIncomeAtLeast = async (
  providers: unknown,
  addresses: ContractAddresses,
  args: {
    issuerId: Uint8Array; // Bytes<32>
    threshold: bigint; // Uint<64>
    claimType: Uint8Array; // Bytes<32>
    verifierId: Uint8Array; // Bytes<32>
  },
  paths: AssetPaths = BROWSER_ASSET_PATHS
): Promise<{ txHash: string; nullifier: Uint8Array }> => {
  const { rangeProof } = buildCompiledContracts(paths);
  const result = (await submitCallTx(providers as never, {
    compiledContract: rangeProof,
    circuitId: 'proveIncomeAtLeast',
    contractAddress: addresses.rangeProof,
    args: [args.issuerId, args.threshold, args.claimType, args.verifierId],
    privateStateId: RANGE_PROOF_PRIVATE_STATE_ID,
  } as never)) as {
    public?: { txId?: string; result?: Uint8Array };
    txData?: { public?: { txId?: string } };
    privateState?: unknown;
    result?: Uint8Array;
  };

  const txHash = result.public?.txId ?? result.txData?.public?.txId ?? '';
  const nullifier = result.public?.result ?? result.result ?? new Uint8Array(32);
  return { txHash, nullifier };
};

export const ON_CHAIN_PROVE_AVAILABLE = true;
