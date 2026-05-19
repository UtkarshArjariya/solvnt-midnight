/*
 * Midnight network configuration. All endpoints public — no API keys needed.
 *
 * Default network is Preprod. Override via:
 *   NEXT_PUBLIC_MIDNIGHT_NETWORK       preprod | testnet | devnet | undeployed
 *   NEXT_PUBLIC_MIDNIGHT_PROOF_SERVER  full URL — flips to public proofer if set
 *
 * Service matrix (verified 2026-05, compatibility table from docs.midnight.network):
 *   Node (Preprod)   0.22.2
 *   Indexer          4.0.1 (Preprod / Mainnet)
 *   Proof server     8.0.3
 *   Midnight.js      4.0.4
 *   DApp Connector   4.0.1
 *
 * Proof server note: the local Docker proofer on :6300 is used by THIS dApp for
 * its own circuits. Lace's tNIGHT→DUST flow uses Lace's own proof-server
 * setting, which must point to the PUBLIC proofer because the cNgD DApp is
 * served over HTTPS and browsers block HTTP→loopback from HTTPS origins.
 */

export type MidnightNetworkName = 'preprod' | 'testnet' | 'devnet' | 'undeployed';

export type MidnightConfig = {
  network: MidnightNetworkName;
  /** Used by `setNetworkId(...)` from `@midnight-ntwrk/midnight-js-network-id`. */
  networkId: 'MainNet' | 'TestNet' | 'DevNet' | 'Undeployed';
  /** HTTP GraphQL endpoint for the public indexer. */
  indexer: string;
  /** WebSocket endpoint for subscription-based queries. */
  indexerWs: string;
  /** Substrate RPC endpoint for the Midnight node. */
  node: string;
  /** Proof-generation server. Local Docker on `:6300` for Preprod/Testnet/Devnet. */
  proofServer: string;
  /** Optional: faucet URL for funding test wallets. */
  faucet?: string;
};

/** Public Lace proofers — same URLs Lace uses internally. Reach these from any
 *  HTTPS origin without mixed-content issues. */
const PUBLIC_PROOF_SERVERS: Record<MidnightNetworkName, string> = {
  preprod: 'https://lace-proof-pub.preprod.midnight.network',
  testnet: 'https://lace-proof-pub.preprod.midnight.network',
  devnet: 'https://lace-proof-pub.preprod.midnight.network',
  undeployed: 'http://localhost:6300',
};

const LOCAL_PROOF_SERVER = 'http://127.0.0.1:6300';

const CONFIGS: Record<MidnightNetworkName, MidnightConfig> = {
  preprod: {
    network: 'preprod',
    networkId: 'TestNet',
    indexer: 'https://indexer.preprod.midnight.network/api/v4/graphql',
    indexerWs: 'wss://indexer.preprod.midnight.network/api/v4/graphql/ws',
    node: 'https://rpc.preprod.midnight.network',
    proofServer: LOCAL_PROOF_SERVER,
    faucet: 'https://faucet.preprod.midnight.network/',
  },
  testnet: {
    network: 'testnet',
    networkId: 'TestNet',
    indexer: 'https://indexer.testnet.midnight.network/api/v1/graphql',
    indexerWs: 'wss://indexer.testnet.midnight.network/api/v1/graphql/ws',
    node: 'https://rpc.testnet.midnight.network',
    proofServer: LOCAL_PROOF_SERVER,
    faucet: 'https://faucet.testnet.midnight.network/api/request-tokens',
  },
  devnet: {
    network: 'devnet',
    networkId: 'DevNet',
    indexer: 'https://indexer.devnet.midnight.network/api/v3/graphql',
    indexerWs: 'wss://indexer.devnet.midnight.network/api/v3/graphql/ws',
    node: 'wss://rpc.devnet.midnight.network',
    proofServer: LOCAL_PROOF_SERVER,
    faucet: 'https://faucet.devnet.midnight.network/api/request-tokens',
  },
  undeployed: {
    network: 'undeployed',
    networkId: 'Undeployed',
    indexer: 'http://localhost:8088/api/v4/graphql',
    indexerWs: 'ws://localhost:8088/api/v4/graphql/ws',
    node: 'ws://localhost:9944',
    proofServer: 'http://localhost:6300',
  },
};

const ENV_NETWORK = (process.env.NEXT_PUBLIC_MIDNIGHT_NETWORK ?? '').toLowerCase();
const SELECTED = (
  ['preprod', 'testnet', 'devnet', 'undeployed'].includes(ENV_NETWORK)
    ? ENV_NETWORK
    : 'preprod'
) as MidnightNetworkName;

const ENV_PROOF_SERVER = process.env.NEXT_PUBLIC_MIDNIGHT_PROOF_SERVER?.trim();
const ENV_INDEXER = process.env.NEXT_PUBLIC_MIDNIGHT_INDEXER?.trim();
const ENV_INDEXER_WS = process.env.NEXT_PUBLIC_MIDNIGHT_INDEXER_WS?.trim();
const ENV_NODE = process.env.NEXT_PUBLIC_MIDNIGHT_NODE?.trim();

/**
 * Blockfrost API key (project_id) for Blockfrost-hosted Midnight infrastructure.
 * Sent as a request header to indexer + node when set. Distinct from the
 * Cardano Blockfrost project_ids in `BLOCKFROST_PROJECT_ID_*`.
 */
export const blockfrostMidnightKey: string | undefined =
  process.env.NEXT_PUBLIC_MIDNIGHT_BLOCKFROST_KEY?.trim() || undefined;

const applyOverrides = (base: MidnightConfig): MidnightConfig => ({
  ...base,
  proofServer: ENV_PROOF_SERVER || base.proofServer,
  indexer: ENV_INDEXER || base.indexer,
  indexerWs: ENV_INDEXER_WS || base.indexerWs,
  node: ENV_NODE || base.node,
});

export const midnightConfig: MidnightConfig = applyOverrides(CONFIGS[SELECTED]);

export const getMidnightConfig = (override?: MidnightNetworkName): MidnightConfig =>
  applyOverrides(override ? CONFIGS[override] : CONFIGS[SELECTED]);

/** The public Lace proofer for a given network — use when serving over HTTPS. */
export const getPublicProofServer = (n: MidnightNetworkName = SELECTED): string =>
  PUBLIC_PROOF_SERVERS[n];

/**
 * Display label shown in the chrome (e.g., "Preprod", "Testnet"). Title-cased.
 */
export const networkLabel = (n: MidnightNetworkName): string => {
  switch (n) {
    case 'preprod':
      return 'Preprod';
    case 'testnet':
      return 'Testnet';
    case 'devnet':
      return 'Devnet';
    case 'undeployed':
      return 'Local';
  }
};
