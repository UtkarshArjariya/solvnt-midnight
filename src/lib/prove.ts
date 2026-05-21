import { sha256 } from '@noble/hashes/sha256';
import { utf8ToBytes } from '@noble/hashes/utils';
import {
  AttestationSchema,
  ProofPackageSchema,
  VerificationRequestSchema,
  type Attestation,
  type ProofPackage,
  type VerificationRequest,
} from './schemas';
import { PROOF_PACKAGE_VERSION } from './constants';
import {
  attestationDigest,
  attestationMessage,
  fromHex,
  hash as sha256Bytes,
  hashHex,
  nullifierOf,
  subjectCommitment,
  toHex,
  verifySignature,
} from './crypto';
import { issuerPubkey } from './issuers';
import type { ContractAddresses } from './midnight/addresses';

export type ProveInput = {
  attestation: Attestation;
  request: VerificationRequest;
  issuerLabel: string;
  /**
   * Optional on-chain mode. When `walletApi` AND `addresses` are both
   * provided, the prove call invokes the real `proveIncomeAtLeast` circuit
   * on the deployed RangeProofVerifier. The returned `ProofPackage.proof`
   * field is then `tx:${txHash}` and `publicInputs.nullifier` is the
   * on-chain nullifier emitted by the circuit.
   *
   * When either is missing, the mock path runs — same constraint set, but
   * the proof field is a sha256 digest. Verifier-side code is identical in
   * either mode.
   */
  walletApi?: unknown;
  addresses?: ContractAddresses;
  verifierId?: Uint8Array;
};

export type ProveResult =
  | { ok: true; package: ProofPackage; onChainTxHash?: string }
  | { ok: false; error: string };

/*
 * Proof generator. Performs the same constraint set the Compact
 * `proveIncomeAtLeast` circuit enforces — issuer signature validity,
 * value >= threshold, currency/claim match, non-expiration — and either:
 *
 *   - submits the circuit on-chain (if walletApi + addresses provided)
 *   - emits a digest-based stand-in (mock fallback)
 *
 * Verifier-side code is unchanged between modes; the difference is what
 * goes into `package.proof`.
 */

export const proveIncomeAtLeast = async ({
  attestation,
  request,
  issuerLabel,
  walletApi,
  addresses,
  verifierId,
}: ProveInput): Promise<ProveResult> => {
  const parsedAtt = AttestationSchema.safeParse(attestation);
  if (!parsedAtt.success) return { ok: false, error: 'invalid_attestation' };
  const parsedReq = VerificationRequestSchema.safeParse(request);
  if (!parsedReq.success) return { ok: false, error: 'invalid_request' };

  const a = parsedAtt.data;
  const r = parsedReq.data;

  if (a.claim.type !== r.claimType) return { ok: false, error: 'claim_type_mismatch' };
  if (a.claim.currency !== r.currency) return { ok: false, error: 'currency_mismatch' };
  if (Date.parse(a.expiresAt) <= Date.now())
    return { ok: false, error: 'attestation_expired' };
  if (a.claim.value < r.threshold) return { ok: false, error: 'threshold_not_met' };

  const pub = await issuerPubkey(a.issuerId);
  if (!pub) return { ok: false, error: 'issuer_pubkey_unresolved' };

  const { signature, ...withoutSig } = a;
  const sigOk = await verifySignature(signature, attestationMessage(withoutSig), pub);
  if (!sigOk) return { ok: false, error: 'invalid_issuer_signature' };

  const subjectComm = subjectCommitment(a.subject, a.nonce);
  const sha256Nullifier = nullifierOf(a.nonce, pub);

  let proofField: `0x${string}`;
  let nullifier: `0x${string}` = sha256Nullifier;
  let onChainTxHash: string | undefined;

  if (walletApi && addresses) {
    // On-chain mode. Submits the circuit via `submitCallTx`. Heavy SDK
    // chain is hidden behind `new Function('p','return import(p)')` to
    // dodge webpack's static analyzer (see midnight-sdk-webpack-interop
    // memory). Errors here surface as a `proof_failed` ProveResult so the
    // UI can show what went wrong without crashing.
    try {
      const claimTypeHash = sha256Bytes(r.claimType);
      const vid = verifierId ?? sha256Bytes(r.requestId);
      // eslint-disable-next-line no-new-func
      const dynImport = new Function('p', 'return import(p)') as (
        p: string
      ) => Promise<unknown>;
      const [provModule, circModule, addrModule] = await Promise.all([
        dynImport('./midnight/providers') as Promise<
          typeof import('./midnight/providers')
        >,
        dynImport('./midnight/circuit') as Promise<typeof import('./midnight/circuit')>,
        dynImport('./midnight/addresses') as Promise<
          typeof import('./midnight/addresses')
        >,
      ]);
      // Validate the addresses object via the same schema used for storage.
      const parsedAddr = addrModule.ContractAddressesSchema.safeParse(addresses);
      if (!parsedAddr.success) return { ok: false, error: 'invalid_addresses' };
      const providers = await provModule.buildBrowserProviders(walletApi as never);
      const { txHash, nullifier: nullifierBytes } = await circModule.callProveIncomeAtLeast(
        providers,
        parsedAddr.data,
        {
          issuerId: fromHex(a.issuerId),
          threshold: BigInt(r.threshold),
          claimType: claimTypeHash,
          verifierId: vid,
        }
      );
      onChainTxHash = txHash;
      nullifier = (toHex(nullifierBytes) as `0x${string}`);
      proofField = (`0x${'00'.repeat(31)}${txHash ? '01' : '00'}` as `0x${string}`);
      // The proof field is opaque to the verifier; encode "on-chain" with
      // a sentinel byte. Verifier code dispatches on length/prefix rather
      // than parsing the bytes. The tx hash is returned separately so the
      // UI can link to the explorer.
    } catch (e) {
      return {
        ok: false,
        error: `on_chain_prove_failed:${e instanceof Error ? e.message : String(e)}`,
      };
    }
  } else {
    // Mock path — sha256 of the payload. Identical public-input shape.
    const payload = {
      digest: toHex(attestationDigest(withoutSig)),
      signature,
      valueCommitment: hashHex(`${a.claim.value}|${a.nonce}`),
    };
    proofField = toHex(sha256(utf8ToBytes(JSON.stringify(payload))));
  }

  const proofPackage: ProofPackage = {
    v: PROOF_PACKAGE_VERSION,
    requestId: r.requestId,
    proof: proofField,
    publicInputs: {
      threshold: r.threshold,
      issuerPubkey: pub as `0x${string}`,
      claimType: r.claimType,
      currency: r.currency,
      expiresAt: a.expiresAt,
      subjectCommitment: subjectComm,
      nullifier,
    },
    issuerLabel,
    generatedAt: new Date().toISOString(),
  };

  const validated = ProofPackageSchema.safeParse(proofPackage);
  if (!validated.success) return { ok: false, error: 'package_schema_failed' };
  return onChainTxHash
    ? { ok: true, package: validated.data, onChainTxHash }
    : { ok: true, package: validated.data };
};
