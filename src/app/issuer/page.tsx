'use client';

/*
 * /issuer — issuer admin flow.
 *
 * Two operations:
 *   1. Register each demo issuer in IssuerRegistry (one-time per contract deploy).
 *   2. Publish a sample attestation commitment for the connected wallet's
 *      derived subjectCommitment, so the holder can later prove against it.
 *
 * Both are gated on having a deployed IssuerRegistry + RangeProofVerifier
 * (read from localStorage via `loadAddressesBrowser`). If contracts aren't
 * deployed yet the page tells the user to visit /admin first.
 *
 * In production these flows would live on the issuer's own backend. The
 * browser page exists so the hackathon demo can run end-to-end from a single
 * laptop with a single Lace wallet.
 */

import { useEffect, useMemo, useState } from 'react';
import { useWallet } from '../../lib/wallet';
import { loadAddressesBrowser, type ContractAddresses } from '../../lib/midnight/addresses';
import { midnightConfig, networkLabel } from '../../lib/midnight/config';
import { WalletPicker } from '../../components/WalletPicker';
import { fromHex, hash as sha256, randomHex, toHex } from '../../lib/crypto';

// Same indirection trick as /admin — keep midnight-js out of webpack's static
// import graph so the page can be SSR'd without exploding on ledger-v8's
// exports field. See project_midnight_sdk_webpack_interop memory.
const loadCircuitModule = (): Promise<{
  buildBrowserProviders: typeof import('../../lib/midnight/providers').buildBrowserProviders;
  callRegisterIssuer: typeof import('../../lib/midnight/circuit').callRegisterIssuer;
  callIssueAttestation: typeof import('../../lib/midnight/circuit').callIssueAttestation;
  attestationCommitment: typeof import('../../lib/commitments').attestationCommitment;
  subjectCommitmentFromSecret: typeof import('../../lib/commitments').subjectCommitmentFromSecret;
  getDemoIssuers: typeof import('../../lib/issuers').getDemoIssuers;
}> => {
  // eslint-disable-next-line no-new-func
  const dynImport = new Function('p', 'return import(p)') as (p: string) => Promise<unknown>;
  return Promise.all([
    dynImport('../../lib/midnight/providers') as Promise<typeof import('../../lib/midnight/providers')>,
    dynImport('../../lib/midnight/circuit') as Promise<typeof import('../../lib/midnight/circuit')>,
    dynImport('../../lib/commitments') as Promise<typeof import('../../lib/commitments')>,
    dynImport('../../lib/issuers') as Promise<typeof import('../../lib/issuers')>,
  ]).then(([prov, circ, cmt, iss]) => ({
    buildBrowserProviders: prov.buildBrowserProviders,
    callRegisterIssuer: circ.callRegisterIssuer,
    callIssueAttestation: circ.callIssueAttestation,
    attestationCommitment: cmt.attestationCommitment,
    subjectCommitmentFromSecret: cmt.subjectCommitmentFromSecret,
    getDemoIssuers: iss.getDemoIssuers,
  }));
};

type Step =
  | { kind: 'idle' }
  | { kind: 'registering'; issuerLabel: string }
  | { kind: 'issuing'; issuerLabel: string }
  | { kind: 'done'; summary: string }
  | { kind: 'error'; message: string };

export default function IssuerPage() {
  const wallet = useWallet();
  const [step, setStep] = useState<Step>({ kind: 'idle' });
  const [addresses, setAddresses] = useState<ContractAddresses | null>(null);

  useEffect(() => {
    setAddresses(loadAddressesBrowser());
    const onStorage = () => setAddresses(loadAddressesBrowser());
    window.addEventListener('storage', onStorage);
    return () => window.removeEventListener('storage', onStorage);
  }, []);

  const ready = useMemo(() => !!addresses && !!wallet.walletApi, [addresses, wallet.walletApi]);

  const runRegister = async () => {
    if (!addresses || !wallet.walletApi) return;
    try {
      const { buildBrowserProviders, callRegisterIssuer, getDemoIssuers } =
        await loadCircuitModule();
      const providers = await buildBrowserProviders(wallet.walletApi);
      const issuers = await getDemoIssuers();
      for (const iss of issuers) {
        setStep({ kind: 'registering', issuerLabel: iss.label });
        await callRegisterIssuer(providers, addresses, {
          issuerId: fromHex(iss.issuerId),
          pubkey: fromHex(iss.pubkey),
          label: iss.label,
        });
      }
      setStep({ kind: 'done', summary: `Registered ${issuers.length} issuers.` });
    } catch (e: unknown) {
      setStep({
        kind: 'error',
        message: e instanceof Error ? e.message : String(e),
      });
    }
  };

  const runPublishSample = async () => {
    if (!addresses || !wallet.walletApi) return;
    try {
      const {
        buildBrowserProviders,
        callIssueAttestation,
        attestationCommitment,
        subjectCommitmentFromSecret,
        getDemoIssuers,
      } = await loadCircuitModule();
      const providers = await buildBrowserProviders(wallet.walletApi);
      const issuers = await getDemoIssuers();
      // Use the first issuer (Razorpay Payroll mock) — most relevant to the
      // demo path. Holder secret is derived from a stable per-browser nonce
      // stored in localStorage so subjectCommitment is stable across runs.
      const issuer = issuers[0]!;
      const secret = ensureHolderSecret();
      const subjectCommitment = subjectCommitmentFromSecret(secret);
      const nonce = fromHex(randomHex(32));
      const claimTypeHash = sha256('income.monthly');
      const value = 95000n;
      const ttlMs = 30 * 86400_000;
      const expiresAt = BigInt(Math.floor((Date.now() + ttlMs) / 1000));

      const commitment = attestationCommitment({
        value,
        nonce,
        subjectCommitment,
        expiresAt,
        claimType: claimTypeHash,
      });

      setStep({ kind: 'issuing', issuerLabel: issuer.label });
      await callIssueAttestation(providers, addresses, {
        issuerId: fromHex(issuer.issuerId),
        commitment,
      });
      setStep({
        kind: 'done',
        summary: `Published commitment ${toHex(commitment).slice(0, 18)}… for ${issuer.label}.`,
      });
    } catch (e: unknown) {
      setStep({
        kind: 'error',
        message: e instanceof Error ? e.message : String(e),
      });
    }
  };

  return (
    <main className="mx-auto max-w-2xl px-6 py-16 text-[var(--mid-fg)]">
      <WalletPicker
        open={wallet.pickerOpen}
        onDismiss={() => wallet.closePicker()}
        onConnected={(c) => wallet.setConnection(c)}
      />
      <h1 className="text-3xl font-display tracking-tight">Issuer console</h1>
      <p className="mt-2 text-sm text-[var(--mid-fg-dim)]">
        Network: <span className="text-[var(--mid-fg)]">{networkLabel(midnightConfig.network)}</span>
      </p>

      {!addresses && (
        <section className="mt-10 rounded-lg border border-[var(--mid-warn,#ff7a7a)] bg-[var(--mid-elev-1)] p-5">
          <p className="text-sm">
            No deployed contracts found. Visit <a href="/admin" className="text-[var(--catalyst)] underline">/admin</a> to deploy first.
          </p>
        </section>
      )}

      {addresses && (
        <section className="mt-10 rounded-lg border border-[var(--mid-line-soft)] bg-[var(--mid-elev-1)] p-5">
          <h2 className="text-sm uppercase tracking-wider text-[var(--mid-fg-dim)]">Targets</h2>
          <dl className="mt-4 space-y-3 font-mono text-xs">
            <Row label="IssuerRegistry" value={addresses.issuerRegistry} />
            <Row label="RangeProofVerifier" value={addresses.rangeProof} />
          </dl>
        </section>
      )}

      <section className="mt-10 flex flex-col gap-3">
        <button
          onClick={runRegister}
          disabled={!ready || step.kind !== 'idle'}
          className="rounded-md bg-[var(--catalyst)] px-5 py-3 text-sm font-medium text-[var(--mid-void)] transition hover:opacity-90 disabled:opacity-50"
        >
          {wallet.walletApi ? 'Register demo issuers' : 'Connect wallet'}
        </button>
        <button
          onClick={runPublishSample}
          disabled={!ready || step.kind !== 'idle'}
          className="rounded-md border border-[var(--mid-line-soft)] px-5 py-3 text-sm text-[var(--mid-fg)] transition hover:bg-[var(--mid-elev-1)] disabled:opacity-50"
        >
          Publish sample attestation commitment
        </button>

        <StepRow step={step} />
      </section>

      <section className="mt-12">
        <h2 className="text-sm uppercase tracking-wider text-[var(--mid-fg-dim)]">Flow</h2>
        <ol className="mt-4 list-decimal space-y-1 pl-6 text-sm text-[var(--mid-fg-dim)]">
          <li>Deploy via <code className="rounded bg-[var(--mid-elev-1)] px-1.5 py-0.5">/admin</code> first.</li>
          <li>Click "Register demo issuers" — calls <code>registerIssuer</code> for each of 3 mock issuers.</li>
          <li>Click "Publish sample attestation" — computes the subjectCommitment from this browser's holder secret and publishes a commitment for the Razorpay mock issuer.</li>
          <li>Return to <code className="rounded bg-[var(--mid-elev-1)] px-1.5 py-0.5">/</code> as the holder, generate a proof.</li>
        </ol>
      </section>
    </main>
  );
}

function StepRow({ step }: { step: Step }) {
  if (step.kind === 'idle') return null;
  if (step.kind === 'registering')
    return <p className="text-sm text-[var(--mid-fg-dim)]">Registering {step.issuerLabel}…</p>;
  if (step.kind === 'issuing')
    return <p className="text-sm text-[var(--mid-fg-dim)]">Publishing commitment for {step.issuerLabel}…</p>;
  if (step.kind === 'done')
    return <p className="text-sm text-[var(--vouch)]">{step.summary}</p>;
  return <p className="text-sm text-[var(--mid-warn,#ff7a7a)]">Error: {step.message}</p>;
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-baseline gap-3">
      <dt className="w-44 shrink-0 text-[var(--mid-fg-dim)]">{label}</dt>
      <dd className="break-all">{value}</dd>
    </div>
  );
}

/**
 * Holder secret — a stable 32-byte value per browser, used to derive the
 * subjectCommitment. Generated once and persisted to localStorage so repeat
 * visits produce the same subjectCommitment (and therefore the same
 * attestation commitment for a given (value, nonce, claimType) tuple).
 *
 * In a real product this lives in the private state provider; for the demo
 * localStorage is sufficient.
 */
const HOLDER_SECRET_KEY = 'solvnt:holder:secret';
function ensureHolderSecret(): Uint8Array {
  const existing = window.localStorage.getItem(HOLDER_SECRET_KEY);
  if (existing) return fromHex(existing);
  const fresh = fromHex(randomHex(32));
  window.localStorage.setItem(HOLDER_SECRET_KEY, toHex(fresh));
  return fresh;
}
