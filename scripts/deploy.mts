#!/usr/bin/env tsx
/*
 * CLI deployment for Solvnt contracts using a seed-based wallet.
 *
 * Reads:
 *   DEPLOY_SEED               — 64-hex (32-byte) wallet seed. Required.
 *   NEXT_PUBLIC_MIDNIGHT_NETWORK  — preprod (default), testnet, devnet, undeployed.
 *
 * Writes:
 *   solvnt-contracts.json     — { network, issuerRegistry, rangeProof, deployedAt }
 *
 * Prereqs:
 *   1. `compact compile +0.31.0 ...` already ran — build/contracts/* exists.
 *   2. Local proof server running on :6300, OR public proofer configured via
 *      NEXT_PUBLIC_MIDNIGHT_PROOF_SERVER.
 *   3. The seed-derived wallet is FUNDED with tNIGHT and has converted some
 *      to DUST (see https://dust.preprod.midnight.network).
 */

import { writeFile } from 'node:fs/promises';
import path from 'node:path';
import { WalletBuilder } from '@midnight-ntwrk/wallet';
import { NodeZkConfigProvider } from '@midnight-ntwrk/midnight-js-node-zk-config-provider';
import { httpClientProofProvider } from '@midnight-ntwrk/midnight-js-http-client-proof-provider';
import { indexerPublicDataProvider } from '@midnight-ntwrk/midnight-js-indexer-public-data-provider';
import { levelPrivateStateProvider } from '@midnight-ntwrk/midnight-js-level-private-state-provider';
import { deployContract } from '@midnight-ntwrk/midnight-js-contracts';
import { setNetworkId, NetworkId, getZswapNetworkId } from '@midnight-ntwrk/midnight-js-network-id';
import { midnightConfig } from '../src/lib/midnight/config.js';
import {
  buildCompiledContracts,
  NODE_ASSET_PATHS,
  RANGE_PROOF_PRIVATE_STATE_ID,
  emptyHolderPrivateState,
} from '../src/lib/midnight/contracts-runtime.js';
import type { ContractAddresses } from '../src/lib/midnight/addresses.js';
import { randomBytes32 } from '../src/lib/crypto.js';

const REPO_ROOT = process.cwd();
const OUT_PATH = path.join(REPO_ROOT, 'solvnt-contracts.json');

const DEPLOY_SEED = process.env.DEPLOY_SEED;
if (!DEPLOY_SEED || !/^[0-9a-fA-F]{64}$/.test(DEPLOY_SEED)) {
  console.error(
    'DEPLOY_SEED env var required (64 hex chars). Generate one with:\n' +
      '  node -e "console.log(require(\'crypto\').randomBytes(32).toString(\'hex\'))"'
  );
  process.exit(1);
}

const NETWORK_MAP: Record<typeof midnightConfig.networkId, NetworkId> = {
  TestNet: NetworkId.TestNet,
  MainNet: NetworkId.MainNet,
  DevNet: NetworkId.DevNet,
  Undeployed: NetworkId.Undeployed,
};

async function main() {
  console.log(`[deploy] network=${midnightConfig.network} (${midnightConfig.networkId})`);
  setNetworkId(NETWORK_MAP[midnightConfig.networkId]);

  console.log(`[deploy] building wallet from seed...`);
  const wallet = await WalletBuilder.build(
    midnightConfig.indexer,
    midnightConfig.indexerWs,
    midnightConfig.proofServer,
    midnightConfig.node,
    DEPLOY_SEED!,
    getZswapNetworkId(),
    'info'
  );
  wallet.start();

  // Wait for a synced wallet state. The wallet emits state observables; we
  // poll once and assume the test wallet is already funded with tDUST.
  const { state } = await new Promise<{ state: any }>((resolve) => {
    const sub = (wallet as any).state().subscribe((s: any) => {
      if (s && s.coinPublicKey) {
        sub.unsubscribe?.();
        resolve({ state: s });
      }
    });
  });
  console.log(`[deploy] wallet ready. coin_pubkey=${state.coinPublicKey?.slice(0, 16)}...`);

  // Build providers — node-side ZK config reads from disk.
  const zkConfigProvider = new NodeZkConfigProvider<string>(NODE_ASSET_PATHS.rangeProof);
  const proofProvider = httpClientProofProvider<string>(midnightConfig.proofServer, zkConfigProvider);
  const publicDataProvider = indexerPublicDataProvider(midnightConfig.indexer, midnightConfig.indexerWs);
  const privateStateProvider = levelPrivateStateProvider({
    accountId: state.coinPublicKey,
    privateStoragePasswordProvider: () => state.encryptionPublicKey ?? state.coinPublicKey,
  });

  // Wallet+midnight provider adapter — uses the wallet's built-in balance +
  // submit methods. Cast to `any` at the SDK boundary because the wallet
  // SDK 5.0.0 surface predates the midnight-js-types `WalletProvider`
  // interface; runtime shape matches (balanceTx, getCoinPublicKey, submitTx).
  const walletProvider = {
    getCoinPublicKey: () => state.coinPublicKey,
    getEncryptionPublicKey: () => state.encryptionPublicKey ?? state.coinPublicKey,
    balanceTx: (tx: any) => (wallet as any).balanceTransaction(tx),
  };
  const midnightProvider = {
    submitTx: (tx: any) => (wallet as any).submitTransaction(tx),
  };

  const providers: any = {
    publicDataProvider,
    privateStateProvider,
    zkConfigProvider,
    proofProvider,
    walletProvider,
    midnightProvider,
  };

  const { issuerRegistry, rangeProof } = buildCompiledContracts(NODE_ASSET_PATHS);
  const holderSecret = randomBytes32();

  console.log(`[deploy] deploying IssuerRegistry...`);
  const issuerRegistryDeploy: any = await deployContract(providers, {
    compiledContract: issuerRegistry,
  } as never);
  const issuerAddr =
    issuerRegistryDeploy.contractAddress ??
    issuerRegistryDeploy.deployTxData?.public?.contractAddress;
  console.log(`[deploy] IssuerRegistry deployed at ${issuerAddr}`);

  console.log(`[deploy] deploying RangeProofVerifier...`);
  const rangeProofDeploy: any = await deployContract(providers, {
    compiledContract: rangeProof,
    privateStateId: RANGE_PROOF_PRIVATE_STATE_ID,
    initialPrivateState: emptyHolderPrivateState(holderSecret),
  } as never);
  const rangeProofAddr =
    rangeProofDeploy.contractAddress ??
    rangeProofDeploy.deployTxData?.public?.contractAddress;
  console.log(`[deploy] RangeProofVerifier deployed at ${rangeProofAddr}`);

  const addresses: ContractAddresses = {
    network: midnightConfig.network,
    issuerRegistry: issuerAddr,
    rangeProof: rangeProofAddr,
    deployedAt: new Date().toISOString(),
  };
  await writeFile(OUT_PATH, JSON.stringify(addresses, null, 2));
  console.log(`[deploy] addresses written to ${OUT_PATH}`);

  await (wallet as any).close?.();
  process.exit(0);
}

main().catch((e) => {
  console.error('[deploy] failed:', e);
  process.exit(1);
});
