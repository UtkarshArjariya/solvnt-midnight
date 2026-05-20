/*
 * Deploy both Solvnt contracts via `@midnight-ntwrk/midnight-js-contracts`.
 *
 * Used by both the /admin browser deploy page and `scripts/deploy.mts`. The
 * caller is responsible for building the providers (browser vs node split
 * lives in providers.ts and the CLI script).
 */

import { deployContract } from '@midnight-ntwrk/midnight-js-contracts';
import {
  buildCompiledContracts,
  RANGE_PROOF_PRIVATE_STATE_ID,
  emptyHolderPrivateState,
  type AssetPaths,
} from './contracts-runtime';
import type { ContractAddresses } from './addresses';
import { midnightConfig } from './config';
import { randomBytes32 } from '../crypto';

export type DeployAllResult = {
  addresses: ContractAddresses;
};

/**
 * Deploys IssuerRegistry first, then RangeProofVerifier. Returns both
 * addresses with the deployment timestamp.
 *
 * @param providers — built via `buildBrowserProviders` (Lace) or the CLI
 *   script's seed-wallet provider set.
 * @param paths — where the compiled assets live (NODE vs BROWSER paths).
 * @param holderSecret — optional 32-byte secret for the range-proof contract's
 *   initial private state. A fresh random secret is generated if absent. The
 *   private state never goes on-chain — it's held by the deployer's private-
 *   state-provider keyed by the contract address.
 */
export const deployAll = async (
  providers: unknown,
  paths: AssetPaths,
  holderSecret?: Uint8Array
): Promise<DeployAllResult> => {
  const { issuerRegistry, rangeProof } = buildCompiledContracts(paths);
  const secret = holderSecret ?? randomBytes32();

  const issuerRegistryDeploy = await deployContract(providers as never, {
    compiledContract: issuerRegistry,
  } as never);

  const rangeProofDeploy = await deployContract(providers as never, {
    compiledContract: rangeProof,
    privateStateId: RANGE_PROOF_PRIVATE_STATE_ID,
    initialPrivateState: emptyHolderPrivateState(secret),
  } as never);

  const issuerAddr = extractAddress(issuerRegistryDeploy);
  const rangeProofAddr = extractAddress(rangeProofDeploy);

  return {
    addresses: {
      network: midnightConfig.network,
      issuerRegistry: issuerAddr,
      rangeProof: rangeProofAddr,
      deployedAt: new Date().toISOString(),
    },
  };
};

/**
 * Pull the contract address off a DeployedContract result. The exact field
 * name varies across SDK minor versions (`contractAddress` vs
 * `deployTxData.public.contractAddress`); we tolerate both.
 */
const extractAddress = (deployed: unknown): string => {
  const d = deployed as {
    contractAddress?: string;
    deployTxData?: { public?: { contractAddress?: string } };
  };
  const addr =
    d.contractAddress ??
    d.deployTxData?.public?.contractAddress ??
    '';
  if (!addr || typeof addr !== 'string') {
    throw new Error('deploy_no_address_returned');
  }
  return addr;
};
