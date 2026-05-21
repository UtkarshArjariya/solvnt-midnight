import { NextResponse } from 'next/server';
import { z } from 'zod';
import {
  isCardanoConfigured,
  snapshotAda,
  lovelaceToAdaFloor,
  type CardanoNetwork,
} from '@/lib/cardano';
import { attestationMessage, randomHex, sign } from '@/lib/crypto';
import { issuerByLabel } from '@/lib/issuers';
import { AttestationSchema, type Attestation } from '@/lib/schemas';
import { ATTESTATION_VERSION } from '@/lib/constants';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/*
 * POST /api/issuers/cardano-snapshot
 *
 * Body: { network, stakeAddressOrPaymentAddress, subjectPubkey, ttlDays? }
 *
 * Calls Blockfrost via lib/cardano, floors lovelace → ADA, then signs an
 * Attestation under the "Cardano Snapshot (Blockfrost mock)" issuer's seed.
 *
 * The holder app stores the returned attestation in localStorage and can use
 * it to prove balance ≥ N ADA via the standard prove flow.
 *
 * Auth: the issuer's privateKey lives server-side (derived from a stable seed
 * in src/lib/issuers.ts). Production would gate this behind real auth.
 */

const Body = z.object({
  network: z.enum(['mainnet', 'preprod', 'preview']),
  address: z.string().min(10),
  subjectPubkey: z.string().regex(/^0x[0-9a-fA-F]{64}$/),
  ttlDays: z.number().int().positive().max(365).default(30),
});

export async function POST(req: Request) {
  const parsed = Body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json(
      { error: 'invalid_body', detail: parsed.error.flatten() },
      { status: 400 }
    );
  }
  const { network, address, subjectPubkey, ttlDays } = parsed.data;

  if (!isCardanoConfigured(network as CardanoNetwork)) {
    return NextResponse.json(
      { error: 'blockfrost_not_configured', detail: { network } },
      { status: 503 }
    );
  }

  let snapshot;
  try {
    snapshot = await snapshotAda(network as CardanoNetwork, address);
  } catch (e) {
    return NextResponse.json(
      {
        error: 'snapshot_failed',
        detail: e instanceof Error ? e.message : String(e),
      },
      { status: 502 }
    );
  }

  const issuer = await issuerByLabel('Cardano Snapshot (Blockfrost mock)');
  if (!issuer) {
    return NextResponse.json({ error: 'issuer_missing' }, { status: 500 });
  }

  const now = new Date();
  const expires = new Date(now.getTime() + ttlDays * 86400_000);
  const today = now.toISOString().slice(0, 10);

  const baseAttestation: Omit<Attestation, 'signature'> = {
    v: ATTESTATION_VERSION,
    issuerId: issuer.issuerId,
    subject: subjectPubkey,
    claim: {
      type: 'balance.cardano.ada',
      // Floor lovelace to ADA — never overstate the holder's balance.
      value: lovelaceToAdaFloor(snapshot.lovelace),
      currency: 'ADA',
      period: { from: today, to: today },
    },
    nonce: randomHex(16),
    issuedAt: now.toISOString(),
    expiresAt: expires.toISOString(),
  };

  const signature = await sign(attestationMessage(baseAttestation), issuer.privateKey);
  const attestation: Attestation = { ...baseAttestation, signature };

  // Final sanity check against the schema before returning.
  const result = AttestationSchema.safeParse(attestation);
  if (!result.success) {
    return NextResponse.json(
      { error: 'attestation_invalid', detail: result.error.flatten() },
      { status: 500 }
    );
  }

  return NextResponse.json(
    {
      attestation: result.data,
      meta: {
        stakeAddress: snapshot.stakeAddress,
        lovelace: snapshot.lovelace.toString(),
        ada: lovelaceToAdaFloor(snapshot.lovelace),
        slot: snapshot.slot,
        blockHash: snapshot.blockHash,
        takenAtIso: snapshot.takenAtIso,
      },
    },
    { status: 201 }
  );
}
