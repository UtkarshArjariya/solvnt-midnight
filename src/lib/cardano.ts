/*
 * Blockfrost-backed ADA snapshot client. Zero-dependency — uses fetch directly.
 *
 * Inert without `BLOCKFROST_PROJECT_ID_*` env vars. When the team is ready to
 * wire real `balance.cardano.ada` attestations, fill in the env var, call
 * `snapshotAda(network, addressOrStakeAddress)` from a server route, and pass
 * the result to a Cardano-issuer signer.
 *
 * Background: Midnight is a Cardano partner-chain, but Compact contracts
 * can't read Cardano state directly — cross-chain reads happen via witness
 * functions whose values are issued + signed by an attestation issuer. The
 * "Cardano Snapshot Issuer" in this demo plays that role.
 *
 * See `docs/research` (or PROGRESS.md "Agent C") for the full design rationale.
 */

export type CardanoNetwork = 'mainnet' | 'preprod' | 'preview';

export type AdaSnapshot = {
  network: CardanoNetwork;
  stakeAddress: string;
  lovelace: bigint;
  slot: number;
  blockHash: string;
  takenAtIso: string;
};

const baseFor = (net: CardanoNetwork): string => {
  switch (net) {
    case 'mainnet':
      return 'https://cardano-mainnet.blockfrost.io/api/v0';
    case 'preprod':
      return 'https://cardano-preprod.blockfrost.io/api/v0';
    case 'preview':
      return 'https://cardano-preview.blockfrost.io/api/v0';
  }
};

const projectIdFor = (net: CardanoNetwork): string | null => {
  const key =
    net === 'mainnet'
      ? 'BLOCKFROST_PROJECT_ID_MAINNET'
      : net === 'preprod'
        ? 'BLOCKFROST_PROJECT_ID_PREPROD'
        : 'BLOCKFROST_PROJECT_ID_PREVIEW';
  // Empty-string env vars are common when .env declares the slot with no
  // value; treat both unset and empty as not-configured.
  const value = process.env[key]?.trim();
  return value ? value : null;
};

const get = async <T>(net: CardanoNetwork, path: string): Promise<T> => {
  const projectId = projectIdFor(net);
  if (!projectId) {
    throw new Error(`blockfrost_project_id_missing:${net}`);
  }
  const res = await fetch(`${baseFor(net)}${path}`, {
    headers: { project_id: projectId },
    cache: 'no-store',
  });
  if (!res.ok) {
    throw new Error(`blockfrost_${res.status}:${path}`);
  }
  return (await res.json()) as T;
};

type AddressInfo = {
  stake_address: string | null;
};
type AccountInfo = {
  controlled_amount: string;
};
type LatestBlock = {
  slot: number | null;
  hash: string;
};

const STAKE_PREFIXES = ['stake1', 'stake_test1'];
const isStakeAddress = (a: string) => STAKE_PREFIXES.some((p) => a.startsWith(p));

/*
 * Snapshot the controlled ADA balance for a Cardano address (`addr1...`) or
 * stake address (`stake1...`). If a payment address is given, the function
 * resolves the stake address via Blockfrost first, then sums via
 * `/accounts/{stake}.controlled_amount`. Enterprise addresses (no stake key)
 * fail explicitly — the caller should handle and fall back to
 * `/addresses/{addr}.amount[lovelace]` if needed.
 */
export const snapshotAda = async (
  network: CardanoNetwork,
  addressOrStake: string
): Promise<AdaSnapshot> => {
  let stake = addressOrStake;
  if (!isStakeAddress(addressOrStake)) {
    const info = await get<AddressInfo>(network, `/addresses/${addressOrStake}`);
    if (!info.stake_address) {
      throw new Error('enterprise_address_unsupported');
    }
    stake = info.stake_address;
  }
  const [account, tip] = await Promise.all([
    get<AccountInfo>(network, `/accounts/${stake}`),
    get<LatestBlock>(network, '/blocks/latest'),
  ]);
  return {
    network,
    stakeAddress: stake,
    lovelace: BigInt(account.controlled_amount),
    slot: tip.slot ?? 0,
    blockHash: tip.hash,
    takenAtIso: new Date().toISOString(),
  };
};

/*
 * Lovelace → ADA, integer. 1 ADA = 1_000_000 lovelace. Rounds down so the
 * proof "value >= threshold" stays sound (you never overstate the holder's
 * balance).
 */
export const lovelaceToAdaFloor = (lovelace: bigint): number =>
  Number(lovelace / 1_000_000n);

export const isCardanoConfigured = (network: CardanoNetwork): boolean =>
  projectIdFor(network) !== null;
