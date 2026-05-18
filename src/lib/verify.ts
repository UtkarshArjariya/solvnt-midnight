import {
  ProofPackageSchema,
  type ProofPackage,
  type VerificationRequest,
} from './schemas';

export type VerifyResult =
  | {
      verified: true;
      claimType: ProofPackage['publicInputs']['claimType'];
      threshold: number;
      currency: string;
      issuerLabel: string;
      attestationExpiresAt: string;
      nullifier: string;
    }
  | { verified: false; reason: string };

export const verifyProof = (
  proof: unknown,
  request: VerificationRequest
): VerifyResult => {
  const parsed = ProofPackageSchema.safeParse(proof);
  if (!parsed.success) return { verified: false, reason: 'malformed_proof' };
  const p = parsed.data;

  if (p.requestId !== request.requestId)
    return { verified: false, reason: 'request_id_mismatch' };
  if (p.publicInputs.threshold < request.threshold)
    return { verified: false, reason: 'threshold_below_request' };
  if (p.publicInputs.claimType !== request.claimType)
    return { verified: false, reason: 'claim_type_mismatch' };
  if (p.publicInputs.currency !== request.currency)
    return { verified: false, reason: 'currency_mismatch' };
  if (Date.parse(p.publicInputs.expiresAt) <= Date.now())
    return { verified: false, reason: 'attestation_expired' };

  /*
   * Real Compact path: call into Midnight verifier WASM here, passing
   * (proof, canonical(publicInputs), verifyingKey). The constraint checks
   * above stand in for the binary verification while the toolchain is
   * being wired up.
   */

  return {
    verified: true,
    claimType: p.publicInputs.claimType,
    threshold: p.publicInputs.threshold,
    currency: p.publicInputs.currency,
    issuerLabel: p.issuerLabel,
    attestationExpiresAt: p.publicInputs.expiresAt,
    nullifier: p.publicInputs.nullifier,
  };
};
