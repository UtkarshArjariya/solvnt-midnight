import type { VerificationRequest, ProofPackage } from './schemas';

/*
 * In-memory server store. Resets on dev reload. Pinned to globalThis so route
 * handlers and server components see the same Map instance (Next.js dev mode
 * can otherwise compile the module twice).
 */

type ProofSlot =
  | { status: 'pending' }
  | { status: 'received'; proof: ProofPackage; receivedAt: string };

type StoreShape = {
  requests: Map<string, VerificationRequest>;
  proofs: Map<string, ProofSlot>;
};

const g = globalThis as unknown as { __solvntStore?: StoreShape };
const store: StoreShape = g.__solvntStore ?? {
  requests: new Map(),
  proofs: new Map(),
};
g.__solvntStore = store;

const { requests, proofs } = store;

export const putRequest = (req: VerificationRequest) => {
  requests.set(req.requestId, req);
  if (!proofs.has(req.requestId)) proofs.set(req.requestId, { status: 'pending' });
};

export const getRequest = (id: string): VerificationRequest | null =>
  requests.get(id) ?? null;

export const submitProof = (id: string, proof: ProofPackage): boolean => {
  if (!requests.has(id)) return false;
  proofs.set(id, { status: 'received', proof, receivedAt: new Date().toISOString() });
  return true;
};

export const readProof = (id: string): ProofSlot =>
  proofs.get(id) ?? { status: 'pending' };
