'use client';

import { AttestationSchema, type Attestation } from './schemas';

const STORAGE_KEY = 'solvnt.attestations.v2';

export const loadAttestations = (): Attestation[] => {
  if (typeof window === 'undefined') return [];
  const raw = window.localStorage.getItem(STORAGE_KEY);
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed
      .map((x) => AttestationSchema.safeParse(x))
      .filter((r): r is { success: true; data: Attestation } => r.success)
      .map((r) => r.data);
  } catch {
    return [];
  }
};

export const saveAttestations = (atts: Attestation[]) => {
  if (typeof window === 'undefined') return;
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(atts));
};

export const clearAttestations = () => {
  if (typeof window === 'undefined') return;
  window.localStorage.removeItem(STORAGE_KEY);
};

export const claimLabel = (type: Attestation['claim']['type']): string => {
  switch (type) {
    case 'income.monthly':
      return 'Monthly income';
    case 'income.annual':
      return 'Annual income';
    case 'balance.snapshot':
      return 'Balance snapshot';
    case 'balance.cardano.ada':
      return 'ADA holdings';
  }
};

export const currencySymbol = (
  currency: Attestation['claim']['currency']
): string => {
  switch (currency) {
    case 'INR':
      return '₹';
    case 'USD':
      return '$';
    case 'EUR':
      return '€';
    case 'ADA':
      return '₳';
    case 'NIGHT':
      return '◐';
  }
};

export const formatAmount = (
  value: number,
  currency: Attestation['claim']['currency']
) => `${currencySymbol(currency)}${value.toLocaleString('en-IN')}`;
