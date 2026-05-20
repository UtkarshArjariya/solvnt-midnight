/*
 * Storage for deployed-contract addresses.
 *
 * Two backends share the same shape:
 *   - server: read `solvnt-contracts.json` at the repo root (written by the CLI
 *     deploy script). Used by Node tooling and Next.js Server Components.
 *   - browser: read `localStorage['solvnt:contracts']`. Used by the holder /
 *     verifier flows after a one-shot /admin deploy.
 *
 * The two never sync automatically — pick one path per environment. For the
 * hackathon demo, the CLI script is the canonical source; /admin is a fallback
 * when no CLI deploy has been run.
 */

import { z } from 'zod';
import { midnightConfig } from './config';

export const ContractAddressesSchema = z.object({
  network: z.string(),
  issuerRegistry: z.string().min(1),
  rangeProof: z.string().min(1),
  deployedAt: z.string(),
  signingKeys: z
    .object({
      issuerRegistry: z.string().optional(),
      rangeProof: z.string().optional(),
    })
    .optional(),
});

export type ContractAddresses = z.infer<typeof ContractAddressesSchema>;

const BROWSER_KEY = 'solvnt:contracts';

export const loadAddressesBrowser = (): ContractAddresses | null => {
  if (typeof window === 'undefined') return null;
  try {
    const raw = window.localStorage.getItem(BROWSER_KEY);
    if (!raw) return null;
    const parsed = ContractAddressesSchema.safeParse(JSON.parse(raw));
    if (!parsed.success) return null;
    if (parsed.data.network !== midnightConfig.network) return null;
    return parsed.data;
  } catch {
    return null;
  }
};

export const saveAddressesBrowser = (addrs: ContractAddresses): void => {
  if (typeof window === 'undefined') return;
  window.localStorage.setItem(BROWSER_KEY, JSON.stringify(addrs));
};

export const clearAddressesBrowser = (): void => {
  if (typeof window === 'undefined') return;
  window.localStorage.removeItem(BROWSER_KEY);
};
