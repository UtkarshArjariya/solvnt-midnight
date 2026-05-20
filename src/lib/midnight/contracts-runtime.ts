/*
 * CompiledContract wrappers around the compactc-generated TypeScript bindings.
 *
 * The bindings under `build/contracts/{name}/contract/index.js` are generated
 * by `compact compile`. We wrap each with `CompiledContract.make(...)` so they
 * plug into `@midnight-ntwrk/midnight-js-contracts`' `deployContract` /
 * `submitCallTx` APIs.
 *
 * Asset-path resolution: `withCompiledFileAssets(path)` tells the SDK where to
 * find `keys/${circuitId}.prover`, `keys/${circuitId}.verifier`, and
 * `zkir/${circuitId}.bzkir`. CLI deploys point at the build output directly;
 * browser deploys point at the same files copied under `public/contracts/`
 * (see `scripts/copy-zk-assets.mts`).
 */

import { pipe } from 'effect';
import { CompiledContract } from '@midnight-ntwrk/compact-js';
import { Contract as IssuerRegistryContractClass } from '../../../build/contracts/issuer-registry/contract/index.js';
import { Contract as RangeProofContractClass } from '../../../build/contracts/range-proof/contract/index.js';
import { witnesses as rangeProofWitnesses, type HolderPrivateState } from '../../../contracts/witnesses';

export const ISSUER_REGISTRY_TAG = 'solvnt.issuer-registry.v1';
export const RANGE_PROOF_TAG = 'solvnt.range-proof.v1';

/** Asset paths — relative to the process cwd in Node, served from /contracts in browser. */
export type AssetPaths = {
  readonly issuerRegistry: string;
  readonly rangeProof: string;
};

export const NODE_ASSET_PATHS: AssetPaths = {
  issuerRegistry: 'build/contracts/issuer-registry',
  rangeProof: 'build/contracts/range-proof',
};

export const BROWSER_ASSET_PATHS: AssetPaths = {
  issuerRegistry: '/contracts/issuer-registry',
  rangeProof: '/contracts/range-proof',
};

/**
 * Build the `CompiledContract` bindings for both contracts at runtime.
 *
 * The compactc-generated `Contract` class is structurally compatible with
 * `@midnight-ntwrk/compact-js`'s `Contract<PS, W>` interface — both expose
 * `witnesses`, `circuits`, `provableCircuits`, and an `initialState` method.
 * We pass them through `CompiledContract.make` to brand them for the SDK and
 * then attach witnesses + the asset path via effect-style `pipe`.
 */
export const buildCompiledContracts = (paths: AssetPaths) => {
  const issuerRegistry = pipe(
    CompiledContract.make(ISSUER_REGISTRY_TAG, IssuerRegistryContractClass as never),
    CompiledContract.withVacantWitnesses,
    CompiledContract.withCompiledFileAssets(paths.issuerRegistry)
  );

  const rangeProof = pipe(
    CompiledContract.make<ReturnType<typeof newRangeProof>, HolderPrivateState>(
      RANGE_PROOF_TAG,
      RangeProofContractClass as never
    ),
    CompiledContract.withWitnesses(rangeProofWitnesses as never),
    CompiledContract.withCompiledFileAssets(paths.rangeProof)
  );

  return { issuerRegistry, rangeProof } as const;
};

const newRangeProof = () => new RangeProofContractClass(rangeProofWitnesses as never);

export type CompiledContracts = ReturnType<typeof buildCompiledContracts>;

/** Private-state id used by midnight-js-private-state-provider for the range-proof contract. */
export const RANGE_PROOF_PRIVATE_STATE_ID = 'solvnt.range-proof.holder-private-state';

/** Empty initial private state for a freshly-deployed range-proof contract. */
export const emptyHolderPrivateState = (secret: Uint8Array): HolderPrivateState => ({
  secret,
  attestation: null,
});
