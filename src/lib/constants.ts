export const ATTESTATION_VERSION = 1 as const;
export const PROOF_PACKAGE_VERSION = 1 as const;
export const DEFAULT_VALIDITY_DAYS = 30;

export const CURRENCIES = ['INR', 'USD', 'EUR', 'ADA', 'NIGHT'] as const;
export const CLAIM_TYPES = [
  'income.monthly',
  'income.annual',
  'balance.snapshot',
  'balance.cardano.ada',
] as const;

export type Currency = (typeof CURRENCIES)[number];
export type ClaimType = (typeof CLAIM_TYPES)[number];
