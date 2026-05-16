import { z } from 'zod';
import { CLAIM_TYPES, CURRENCIES } from './constants';

const HEX_64 = /^0x[0-9a-f]{64}$/;
const HEX_VAR = /^0x[0-9a-f]+$/;
const HEX_NONCE = /^0x[0-9a-f]{32,}$/;

export const ClaimTypeSchema = z.enum(CLAIM_TYPES);
export const CurrencySchema = z.enum(CURRENCIES);

export const AttestationSchema = z.object({
  v: z.literal(1),
  issuerId: z.string().regex(HEX_64),
  subject: z.string().regex(HEX_64),
  claim: z.object({
    type: ClaimTypeSchema,
    value: z.number().int().positive(),
    currency: CurrencySchema,
    period: z.object({
      from: z.string().date(),
      to: z.string().date(),
    }),
  }),
  nonce: z.string().regex(HEX_NONCE),
  issuedAt: z.string().datetime(),
  expiresAt: z.string().datetime(),
  signature: z.string().regex(HEX_VAR),
});

export type Attestation = z.infer<typeof AttestationSchema>;
export type Claim = Attestation['claim'];

export const VerificationRequestSchema = z.object({
  requestId: z.string().uuid(),
  threshold: z.number().int().positive(),
  claimType: ClaimTypeSchema,
  currency: CurrencySchema,
  callbackUrl: z.string().url().optional(),
  expiresAt: z.string().datetime(),
  verifierLabel: z.string().min(1).max(64).optional(),
});

export type VerificationRequest = z.infer<typeof VerificationRequestSchema>;

export const ProofPackageSchema = z.object({
  v: z.literal(1),
  requestId: z.string().uuid(),
  proof: z.string(),
  publicInputs: z.object({
    threshold: z.number().int(),
    issuerPubkey: z.string().regex(HEX_64),
    claimType: ClaimTypeSchema,
    currency: CurrencySchema,
    expiresAt: z.string().datetime(),
    subjectCommitment: z.string().regex(HEX_64),
    nullifier: z.string().regex(HEX_64),
  }),
  issuerLabel: z.string(),
  generatedAt: z.string().datetime(),
});

export type ProofPackage = z.infer<typeof ProofPackageSchema>;

export const IssuerInfoSchema = z.object({
  issuerId: z.string().regex(HEX_64),
  pubkey: z.string().regex(HEX_64),
  label: z.string().min(1).max(64),
  registeredAt: z.string().datetime(),
});

export type IssuerInfo = z.infer<typeof IssuerInfoSchema>;
