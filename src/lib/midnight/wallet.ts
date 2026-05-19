'use client';

import semver from 'semver';
import type {
  InitialAPI,
  ConnectedAPI,
  Configuration,
} from '@midnight-ntwrk/dapp-connector-api';
import { midnightConfig } from './config';

/*
 * Browser-side wallet discovery + connect for Midnight.
 *
 * The Midnight DApp Connector spec registers each compatible wallet under a
 * unique key in `window.midnight`. Older builds use named keys (`mnLace`);
 * newer builds use UUIDs with `name` / `icon` / `rdns` metadata. We support
 * both shapes and produce a uniform `DiscoveredWallet[]` for the UI.
 */

export const COMPATIBLE_CONNECTOR_API_VERSION = '>=1.0.0';

export type DiscoveredWallet = {
  /** The key under `window.midnight` — either a UUID or a legacy name. */
  key: string;
  /** Human-readable name ("Lace", "1am"). */
  name: string;
  /** Optional icon as data URL or http URL. */
  icon: string | null;
  /** Reverse-DNS identifier (e.g., `io.lace.midnight`). */
  rdns: string | null;
  /** Connector API version reported by the wallet. */
  apiVersion: string;
  /** True iff `apiVersion` satisfies `COMPATIBLE_CONNECTOR_API_VERSION`. */
  compatible: boolean;
};

/**
 * Curated catalog of known Midnight wallets. The `match` predicate is checked
 * against each `DiscoveredWallet`; the first match wins. Used to show install
 * fallbacks when a wallet isn't present, and to render brand-correct icons /
 * marketing copy.
 */
export type KnownWallet = {
  id: 'lace' | '1am';
  name: string;
  tagline: string;
  installUrl: string;
  /** Match against a `DiscoveredWallet` to pick its branded card. */
  match: (w: DiscoveredWallet) => boolean;
};

export const KNOWN_WALLETS: readonly KnownWallet[] = [
  {
    id: 'lace',
    name: 'Lace',
    tagline: 'Cardano + Midnight, official IOG build.',
    installUrl: 'https://www.lace.io/',
    match: (w) =>
      w.key === 'mnLace' ||
      /lace/i.test(w.name) ||
      (w.rdns?.toLowerCase().includes('lace') ?? false),
  },
  {
    id: '1am',
    name: '1am Wallet',
    tagline: 'Midnight-native wallet.',
    // TODO: confirm canonical install URL once published; placeholder for now.
    installUrl: 'https://1am.wallet/',
    match: (w) =>
      w.key === 'mn1am' ||
      /1am/i.test(w.name) ||
      (w.rdns?.toLowerCase().includes('1am') ?? false),
  },
] as const;

const isObject = (x: unknown): x is Record<string, unknown> =>
  typeof x === 'object' && x !== null;

type MidnightWindow = Window & {
  midnight?: Record<string, unknown>;
};

const safeWindow = (): MidnightWindow | null =>
  typeof window === 'undefined' ? null : (window as MidnightWindow);

/**
 * Inspect `window.midnight` and return every compatible wallet present.
 * Safe to call during SSR — returns an empty array there.
 */
export const discoverWallets = (): DiscoveredWallet[] => {
  const w = safeWindow();
  const root = w?.midnight;
  if (!isObject(root)) return [];

  const out: DiscoveredWallet[] = [];
  for (const [key, value] of Object.entries(root)) {
    if (!isObject(value)) continue;
    const apiVersion = typeof value.apiVersion === 'string' ? value.apiVersion : '';
    if (!apiVersion) continue;
    const name = typeof value.name === 'string' ? value.name : prettifyKey(key);
    const icon = typeof value.icon === 'string' ? value.icon : null;
    const rdns = typeof value.rdns === 'string' ? value.rdns : null;
    let compatible = false;
    try {
      compatible = semver.satisfies(
        semver.coerce(apiVersion) ?? '0.0.0',
        COMPATIBLE_CONNECTOR_API_VERSION
      );
    } catch {
      compatible = false;
    }
    out.push({ key, name, icon, rdns, apiVersion, compatible });
  }
  return out;
};

const prettifyKey = (k: string) =>
  k
    .replace(/^mn/, '')
    .replace(/^./, (c) => c.toUpperCase())
    .replace(/[_-]/g, ' ');

/**
 * Match a discovered wallet against the curated `KNOWN_WALLETS` catalog. Falls
 * back to the wallet's self-reported name for unknown wallets.
 */
export const brandedNameFor = (
  w: DiscoveredWallet
): { known: KnownWallet | null; displayName: string } => {
  const known = KNOWN_WALLETS.find((k) => k.match(w)) ?? null;
  return { known, displayName: known?.name ?? w.name };
};

/**
 * Connect to a wallet by its `window.midnight[key]`. Returns the connected
 * API along with the service configuration the wallet reports. Throws if
 * the wallet isn't present, the API version is incompatible, or the user
 * rejects the connection.
 *
 * Uses the newer DApp Connector spec: `InitialAPI.connect(networkId)` →
 * `ConnectedAPI`, and `ConnectedAPI.getConfiguration()` for service URIs.
 */
export const connectWallet = async (
  key: string
): Promise<{
  walletApi: ConnectedAPI;
  configuration: Configuration;
  walletName: string;
}> => {
  const w = safeWindow();
  const root = w?.midnight;
  if (!isObject(root) || !isObject(root[key])) {
    throw new Error('wallet_not_found');
  }
  const api = root[key] as unknown as InitialAPI;
  if (
    !api.apiVersion ||
    !semver.satisfies(
      semver.coerce(api.apiVersion) ?? '0.0.0',
      COMPATIBLE_CONNECTOR_API_VERSION
    )
  ) {
    throw new Error('wallet_api_incompatible');
  }
  // Map our network slug to the wallet's expected networkId string.
  const networkId = midnightConfig.network === 'preprod'
    ? 'preprod'
    : midnightConfig.network === 'testnet'
      ? 'testnet'
      : midnightConfig.network === 'devnet'
        ? 'devnet'
        : 'undeployed';
  const walletApi = await api.connect(networkId);
  const configuration = await walletApi.getConfiguration();
  return {
    walletApi,
    configuration,
    walletName: api.name ?? prettifyKey(key),
  };
};

/**
 * Truncate a Midnight address for chrome display. Keeps the leading prefix and
 * trailing checksum bytes; useful for the WalletPill.
 */
export const shortenAddress = (addr: string, head = 10, tail = 6): string =>
  addr.length <= head + tail + 1 ? addr : `${addr.slice(0, head)}…${addr.slice(-tail)}`;

/**
 * The network the dApp expects the wallet to be on. Reads from
 * `lib/midnight/config.ts` so the entire app shares one source of truth.
 */
export const expectedNetworkLabel = (): string => {
  switch (midnightConfig.network) {
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
