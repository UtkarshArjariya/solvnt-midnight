'use client';

import { ProofPackageSchema, type ProofPackage } from './schemas';

/*
 * Holder-side proof history: every successful proof generation gets a tiny
 * receipt saved to localStorage so the holder can review what they've shared,
 * with whom (by verifier label / requestId) and when. Stored on-device only —
 * the verifier sees nothing of this list. Capped at 50 entries to keep
 * storage reasonable.
 */

const STORAGE_KEY = 'solvnt.history.v1';
const MAX_ENTRIES = 50;

export type HistoryEntry = {
  generatedAt: string;
  requestId: string;
  claimType: ProofPackage['publicInputs']['claimType'];
  threshold: number;
  currency: string;
  issuerLabel: string;
  nullifier: string;
  verifierLabel: string | null;
};

export const loadHistory = (): HistoryEntry[] => {
  if (typeof window === 'undefined') return [];
  const raw = window.localStorage.getItem(STORAGE_KEY);
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(
      (e): e is HistoryEntry =>
        typeof e === 'object' &&
        e !== null &&
        typeof e.generatedAt === 'string' &&
        typeof e.requestId === 'string'
    );
  } catch {
    return [];
  }
};

export const appendHistory = (entry: HistoryEntry) => {
  if (typeof window === 'undefined') return;
  const current = loadHistory();
  // Deduplicate by requestId — re-runs of the same request overwrite.
  const filtered = current.filter((e) => e.requestId !== entry.requestId);
  const next = [entry, ...filtered].slice(0, MAX_ENTRIES);
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
};

export const clearHistory = () => {
  if (typeof window === 'undefined') return;
  window.localStorage.removeItem(STORAGE_KEY);
};

export const fromProof = (
  proof: ProofPackage,
  verifierLabel: string | null
): HistoryEntry | null => {
  const parsed = ProofPackageSchema.safeParse(proof);
  if (!parsed.success) return null;
  return {
    generatedAt: parsed.data.generatedAt,
    requestId: parsed.data.requestId,
    claimType: parsed.data.publicInputs.claimType,
    threshold: parsed.data.publicInputs.threshold,
    currency: parsed.data.publicInputs.currency,
    issuerLabel: parsed.data.issuerLabel,
    nullifier: parsed.data.publicInputs.nullifier,
    verifierLabel,
  };
};
