/*
 * End-to-end smoke: creates a verifier request, signs a Priya-style
 * attestation under a demo issuer, runs the prover, and submits to the API.
 * Exits non-zero if any step fails. Run with: pnpm tsx scripts/smoke.mts
 */

import { proveIncomeAtLeast } from '../src/lib/prove.js';
import { getDemoIssuers } from '../src/lib/issuers.js';
import { sign, attestationMessage, hashHex, generateKeypair } from '../src/lib/crypto.js';
import { ATTESTATION_VERSION } from '../src/lib/constants.js';
import type { Attestation } from '../src/lib/schemas.js';

const BASE = process.env.BASE_URL ?? 'http://localhost:3000';

const die = (m: string): never => {
  console.error(`[smoke] FAIL: ${m}`);
  process.exit(1);
};

const main = async () => {
  // 1. Create request
  const createRes = await fetch(`${BASE}/api/requests`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({
      threshold: 80000,
      claimType: 'income.monthly',
      currency: 'INR',
      verifierLabel: 'smoke-test landlord',
    }),
  });
  if (!createRes.ok) die(`create request ${createRes.status}`);
  const request = await createRes.json();
  console.log(`[smoke] created request ${request.requestId}`);

  // 2. Mock holder wallet
  const { publicKey: subject } = await generateKeypair();

  // 3. Sign Priya's monthly income attestation as the demo payroll issuer
  const issuers = await getDemoIssuers();
  const payroll = issuers[0];
  if (!payroll) die('no demo issuer');
  const now = new Date();
  const monthAgo = new Date(now.getTime() - 30 * 86400 * 1000);
  const monthAhead = new Date(now.getTime() + 30 * 86400 * 1000);
  const unsigned: Omit<Attestation, 'signature'> = {
    v: ATTESTATION_VERSION,
    issuerId: payroll!.issuerId,
    subject,
    claim: {
      type: 'income.monthly',
      value: 95000,
      currency: 'INR',
      period: {
        from: monthAgo.toISOString().slice(0, 10),
        to: now.toISOString().slice(0, 10),
      },
    },
    nonce: hashHex(`${subject}:smoke:${Date.now()}`),
    issuedAt: now.toISOString(),
    expiresAt: monthAhead.toISOString(),
  };
  const signature = await sign(attestationMessage(unsigned), payroll!.privateKey);
  const attestation: Attestation = { ...unsigned, signature };

  // 4. Prove
  const result = await proveIncomeAtLeast({
    attestation,
    request,
    issuerLabel: payroll!.label,
  });
  if (!result.ok) die(`prove: ${result.error}`);
  console.log(`[smoke] proof generated (proof=${result.package.proof.slice(0, 16)}…)`);

  // 5. Submit
  const submitRes = await fetch(`${BASE}/api/proofs/${request.requestId}`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(result.package),
  });
  if (!submitRes.ok) {
    const body = await submitRes.text();
    die(`submit ${submitRes.status}: ${body}`);
  }
  console.log(`[smoke] proof accepted`);

  // 6. Read back
  const readRes = await fetch(`${BASE}/api/proofs/${request.requestId}`);
  const slot = await readRes.json();
  if (slot.status !== 'received') die(`expected received, got ${slot.status}`);
  console.log(`[smoke] PASS — slot shows status=received`);
};

main().catch((e) => die(String(e)));
