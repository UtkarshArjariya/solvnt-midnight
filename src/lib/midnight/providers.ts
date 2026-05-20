/*
 * Provider factory for `@midnight-ntwrk/midnight-js-contracts`.
 *
 * The midnight-js Contract API wants a `MidnightProviders` set containing:
 *   - publicDataProvider   (indexer GraphQL)
 *   - privateStateProvider (level-db backed key/value)
 *   - zkConfigProvider     (fetch ZK assets — browser uses HTTP, node uses fs)
 *   - proofProvider        (proof server)
 *   - walletProvider       (coin pubkey + balance tx)
 *   - midnightProvider     (submit tx)
 *
 * For the browser path we adapt Lace's `ConnectedAPI` into the wallet+midnight
 * providers. For the node path see `scripts/deploy.mts` — it uses
 * `@midnight-ntwrk/wallet`'s `WalletBuilder` with a seed.
 *
 * Note on typing: the wallet+midnight provider bridge between Lace (which
 * deals in serialized hex strings) and midnight-js (which deals in typed
 * ledger-v8 transaction objects) is structural at runtime. We use `unknown`
 * casts in the adapter; tightening these requires importing the heavyweight
 * Transaction class from `@midnight-ntwrk/ledger-v8` to round-trip the bytes.
 */

import type { ConnectedAPI } from '@midnight-ntwrk/dapp-connector-api';
import { httpClientProofProvider } from '@midnight-ntwrk/midnight-js-http-client-proof-provider';
import { indexerPublicDataProvider } from '@midnight-ntwrk/midnight-js-indexer-public-data-provider';
import { levelPrivateStateProvider } from '@midnight-ntwrk/midnight-js-level-private-state-provider';
import { FetchZkConfigProvider } from '@midnight-ntwrk/midnight-js-fetch-zk-config-provider';
import { midnightConfig } from './config';

/**
 * Browser providers: wallet pieces come from a Lace `ConnectedAPI`, ZK assets
 * are fetched over HTTP from `/contracts/{name}/` (kept in sync with the build
 * output by `scripts/copy-zk-assets.mts`).
 *
 * Returned shape matches `MidnightProviders<string, string, unknown>` from
 * @midnight-ntwrk/midnight-js-types; we cast to `any` at the boundary because
 * the wallet+midnight adapter goes through serialization rather than the
 * SDK's typed Transaction objects.
 */
export const buildBrowserProviders = async (
  walletApi: ConnectedAPI,
  baseAssetsUrl: string = '/contracts'
) => {
  const [{ shieldedCoinPublicKey, shieldedEncryptionPublicKey }, config] = await Promise.all([
    walletApi.getShieldedAddresses(),
    walletApi.getConfiguration(),
  ]);

  // Wallet provider — wraps Lace methods into the midnight-js shape.
  // Lace deals in serialized hex transactions; midnight-js deals in typed
  // ledger-v8 objects. We bridge via the `.serialize()` round-trip both
  // accept. See TODO[deploy-bridge] below.
  const walletProvider = {
    getCoinPublicKey: () => shieldedCoinPublicKey,
    getEncryptionPublicKey: () => shieldedEncryptionPublicKey,
    balanceTx: async (tx: unknown) => {
      // TODO[deploy-bridge]: round-trip via Transaction.deserialize from
      // @midnight-ntwrk/ledger-v8 for full type safety. For now we trust the
      // SDK's tx exposes a `serialize()` returning Uint8Array, hand the bytes
      // to Lace, and re-wrap the returned bytes in a thin `serialize` shim.
      const bytes = (tx as { serialize: () => Uint8Array }).serialize();
      const { tx: balancedHex } = await walletApi.balanceUnsealedTransaction(toHex(bytes));
      const balanced = fromHex(balancedHex);
      return { serialize: () => balanced };
    },
  };

  const midnightProvider = {
    submitTx: async (tx: unknown) => {
      const bytes = (tx as { serialize: () => Uint8Array }).serialize();
      await walletApi.submitTransaction(toHex(bytes));
      // submitTransaction returns void; synthesize an id from the first 32
      // bytes for SDK logging. The indexer is the source of truth for finality.
      return toHex(bytes.slice(0, 32));
    },
  };

  const zkConfigProvider = new FetchZkConfigProvider<string>(baseAssetsUrl);

  const proofServerUri =
    config.proverServerUri && config.proverServerUri.length > 0
      ? config.proverServerUri
      : midnightConfig.proofServer;
  const proofProvider = httpClientProofProvider<string>(proofServerUri, zkConfigProvider);

  const publicDataProvider = indexerPublicDataProvider(
    config.indexerUri ?? midnightConfig.indexer,
    config.indexerWsUri ?? midnightConfig.indexerWs
  );

  // Private-state-provider is scoped per wallet account; the password comes
  // from the wallet's encryption pubkey (deterministic, not user-entered).
  const privateStateProvider = levelPrivateStateProvider({
    accountId: shieldedCoinPublicKey,
    privateStoragePasswordProvider: () => shieldedEncryptionPublicKey,
  });

  return {
    publicDataProvider,
    privateStateProvider,
    zkConfigProvider,
    proofProvider,
    walletProvider,
    midnightProvider,
  };
};

export type BrowserProviders = Awaited<ReturnType<typeof buildBrowserProviders>>;

const toHex = (bytes: Uint8Array): string =>
  Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('');

const fromHex = (hex: string): Uint8Array => {
  const clean = hex.startsWith('0x') ? hex.slice(2) : hex;
  const out = new Uint8Array(clean.length / 2);
  for (let i = 0; i < out.length; i++) {
    out[i] = parseInt(clean.slice(i * 2, i * 2 + 2), 16);
  }
  return out;
};
