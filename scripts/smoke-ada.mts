/*
 * ADA-flavoured smoke: creates a `balance.cardano.ada` request, signs an
 * attestation as the demo Cardano issuer, proves, submits, reads back.
 * Confirms the Cardano stretch path works end-to-end.
 */

import { proveIncomeAtLeast } from '../src/lib/prove.js';
import { getDemoIssuers, issuerByLabel } from '../src/lib/issuers.js';
import { sign, attestationMessage, hashHex, generateKeypair } from '../src/lib/crypto.js';
import { ATTESTATION_VERSION } from '../src/lib/constants.js';
import type { Attestation } from '../src/lib/schemas.js';

const BASE = process.env.BASE_URL ?? 'http://localhost:3000';

const die = (m: string): never => {
  console.error(`[smoke-ada] FAIL: ${m}`);
  process.exit(1);
};

const main = async () => {
  const createRes = await fetch(`${BASE}/api/requests`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({
      threshold: 1000,
      claimType: 'balance.cardano.ada',
      currency: 'ADA',
      verifierLabel: 'smoke-test ada gate',
    }),
  });
  if (!createRes.ok) die(`create request ${createRes.status}`);
  const request = await createRes.json();
  console.log(`[smoke-ada] created request ${request.requestId}`);

  const { publicKey: subject } = await generateKeypair();
  const cardanoIssuer = await issuerByLabel('Cardano Snapshot (Blockfrost mock)');
  if (!cardanoIssuer) {
    void (await getDemoIssuers());
    die('no Cardano demo issuer');
  }

  const now = new Date();
  const monthAhead = new Date(now.getTime() + 30 * 86400 * 1000);
  const unsigned: Omit<Attestation, 'signature'> = {
    v: ATTESTATION_VERSION,
    issuerId: cardanoIssuer!.issuerId,
    subject,
    claim: {
      type: 'balance.cardano.ada',
      value: 1500,
      currency: 'ADA',
      period: {
        from: now.toISOString().slice(0, 10),
        to: now.toISOString().slice(0, 10),
      },
    },
    nonce: hashHex(`${subject}:smoke-ada:${Date.now()}`),
    issuedAt: now.toISOString(),
    expiresAt: monthAhead.toISOString(),
  };
  const signature = await sign(attestationMessage(unsigned), cardanoIssuer!.privateKey);
  const attestation: Attestation = { ...unsigned, signature };

  const result = await proveIncomeAtLeast({
    attestation,
    request,
    issuerLabel: cardanoIssuer!.label,
  });
  if (!result.ok) die(`prove: ${result.error}`);
  console.log(`[smoke-ada] proof generated (proof=${result.package.proof.slice(0, 16)}…)`);

  const submitRes = await fetch(`${BASE}/api/proofs/${request.requestId}`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(result.package),
  });
  if (!submitRes.ok) {
    const body = await submitRes.text();
    die(`submit ${submitRes.status}: ${body}`);
  }
  console.log('[smoke-ada] proof accepted');

  const readRes = await fetch(`${BASE}/api/proofs/${request.requestId}`);
  const slot = await readRes.json();
  if (slot.status !== 'received') die(`expected received, got ${slot.status}`);
  console.log('[smoke-ada] PASS — Cardano flow end-to-end');
};

main().catch((e) => die(String(e)));
