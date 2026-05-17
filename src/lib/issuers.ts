import type { IssuerInfo } from './schemas';
import { issuerIdFromPubkey, keypairFromSeed } from './crypto';

/*
 * Demo issuer registry. In production these come from the on-chain IssuerRegistry
 * Compact contract. For the web demo we derive stable keypairs from fixed seeds
 * so every browser sees the same issuerIds.
 */

export type DemoIssuer = IssuerInfo & {
  privateKey: `0x${string}`;
};

let cached: DemoIssuer[] | null = null;

export const getDemoIssuers = async (): Promise<DemoIssuer[]> => {
  if (cached) return cached;
  const specs: Array<{ label: string; seed: string; registeredAt: string }> = [
    {
      label: 'Razorpay Payroll (mock)',
      seed: 'solvnt:demo:issuer:razorpay-payroll-v1',
      registeredAt: '2026-04-01T00:00:00.000Z',
    },
    {
      label: 'HDFC Bank (mock)',
      seed: 'solvnt:demo:issuer:hdfc-bank-v1',
      registeredAt: '2026-04-05T00:00:00.000Z',
    },
    {
      label: 'Cardano Snapshot (Blockfrost mock)',
      seed: 'solvnt:demo:issuer:cardano-blockfrost-v1',
      registeredAt: '2026-04-09T00:00:00.000Z',
    },
  ];
  const out: DemoIssuer[] = [];
  for (const s of specs) {
    const { privateKey, publicKey } = await keypairFromSeed(s.seed);
    out.push({
      issuerId: issuerIdFromPubkey(publicKey),
      pubkey: publicKey,
      label: s.label,
      registeredAt: s.registeredAt,
      privateKey,
    });
  }
  cached = out;
  return out;
};

export const issuerById = async (id: string): Promise<DemoIssuer | undefined> => {
  const all = await getDemoIssuers();
  return all.find((i) => i.issuerId === id);
};

export const issuerByLabel = async (label: string): Promise<DemoIssuer | undefined> => {
  const all = await getDemoIssuers();
  return all.find((i) => i.label === label);
};

export const issuerPubkey = async (id: string): Promise<string | null> => {
  const issuer = await issuerById(id);
  return issuer?.pubkey ?? null;
};
