'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'motion/react';
import { ArrowRight, ShieldCheck } from 'lucide-react';
import { CLAIM_TYPES, CURRENCIES, type ClaimType, type Currency } from '@/lib/constants';
import { claimLabel } from '@/lib/attestations';

export const VerifierForm = () => {
  const router = useRouter();
  const [threshold, setThreshold] = useState<string>('80000');
  const [claimType, setClaimType] = useState<ClaimType>('income.monthly');
  const [currency, setCurrency] = useState<Currency>('INR');
  const [verifierLabel, setVerifierLabel] = useState<string>('Bandra apartment listing');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErr(null);
    const n = parseInt(threshold.replace(/[,\s]/g, ''), 10);
    if (!Number.isFinite(n) || n <= 0) {
      setErr('threshold must be a positive integer');
      return;
    }
    setBusy(true);
    try {
      const res = await fetch('/api/requests', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          threshold: n,
          claimType,
          currency,
          verifierLabel: verifierLabel.trim() || undefined,
        }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        setErr(body.error ?? `failed_${res.status}`);
        return;
      }
      const data = await res.json();
      router.push(`/verify/${data.requestId}`);
    } finally {
      setBusy(false);
    }
  };

  return (
    <main className="container-narrow" style={{ padding: 'var(--s-7) var(--s-5)' }}>
      <motion.form
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
        onSubmit={submit}
        className="card"
        style={{ display: 'flex', flexDirection: 'column', gap: 'var(--s-5)' }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--s-3)' }}>
          <ShieldCheck size={20} strokeWidth={1.5} color="var(--catalyst)" />
          <span className="chip chip-catalyst">Verifier</span>
        </div>
        <div>
          <h1 style={{ fontSize: 'var(--t-h1)', margin: 0 }}>Create a request</h1>
          <p className="text-soft" style={{ marginTop: 'var(--s-2)' }}>
            The applicant proves a threshold. You learn one bit. Nothing more.
          </p>
        </div>

        <div className="field">
          <label htmlFor="threshold" className="field-label">Threshold</label>
          <input
            id="threshold"
            type="text"
            inputMode="numeric"
            className="input mono"
            value={threshold}
            onChange={(e) => setThreshold(e.target.value)}
            placeholder="80000"
          />
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--s-4)' }}>
          <div className="field">
            <label htmlFor="claim" className="field-label">Claim type</label>
            <select
              id="claim"
              className="select"
              value={claimType}
              onChange={(e) => setClaimType(e.target.value as ClaimType)}
            >
              {CLAIM_TYPES.map((t) => (
                <option key={t} value={t}>{claimLabel(t)}</option>
              ))}
            </select>
          </div>
          <div className="field">
            <label htmlFor="currency" className="field-label">Currency</label>
            <select
              id="currency"
              className="select"
              value={currency}
              onChange={(e) => setCurrency(e.target.value as Currency)}
            >
              {CURRENCIES.map((c) => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
          </div>
        </div>

        <div className="field">
          <label htmlFor="label" className="field-label">Verifier label (optional)</label>
          <input
            id="label"
            type="text"
            className="input"
            value={verifierLabel}
            onChange={(e) => setVerifierLabel(e.target.value)}
            placeholder="Bandra apartment listing"
          />
        </div>

        {err ? (
          <div className="mono" role="alert" style={{ color: 'var(--alert)', fontSize: 'var(--t-small)' }}>
            {err}
          </div>
        ) : null}

        <RequestJsonPreview
          threshold={threshold}
          claimType={claimType}
          currency={currency}
          verifierLabel={verifierLabel}
        />

        <button className="btn btn-primary" type="submit" disabled={busy}>
          {busy ? 'Creating…' : (<>Create request <ArrowRight size={16} strokeWidth={2} /></>)}
        </button>

        <div className="text-dim" style={{ fontSize: 'var(--t-small)', textAlign: 'center' }}>
          You'll get a QR code the applicant can scan with the Solvnt holder app.
        </div>
      </motion.form>
    </main>
  );
};

/*
 * Live preview of the JSON payload that will hit POST /api/requests. Steals
 * Cursor's "show the real code, not a mockup" pattern — the verifier engineer
 * sees the exact API shape; the non-engineer feels the precision.
 */
const RequestJsonPreview = ({
  threshold,
  claimType,
  currency,
  verifierLabel,
}: {
  threshold: string;
  claimType: ClaimType;
  currency: Currency;
  verifierLabel: string;
}) => {
  const n = parseInt(threshold.replace(/[,\s]/g, ''), 10);
  const body = {
    threshold: Number.isFinite(n) && n > 0 ? n : 0,
    claimType,
    currency,
    ...(verifierLabel.trim() ? { verifierLabel: verifierLabel.trim() } : {}),
  };
  const json = JSON.stringify(body, null, 2);
  return (
    <details
      style={{
        background: 'var(--mid-void)',
        border: '1px solid var(--mid-line-soft)',
        borderRadius: 'var(--r-md)',
        padding: 'var(--s-3) var(--s-4)',
      }}
    >
      <summary
        className="mono"
        style={{
          cursor: 'pointer',
          fontSize: 'var(--t-micro)',
          letterSpacing: '0.08em',
          textTransform: 'uppercase',
          color: 'var(--ink-dim)',
          listStyle: 'none',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
        }}
      >
        <span>POST /v1/requests</span>
        <span style={{ color: 'var(--catalyst)' }}>preview ↓</span>
      </summary>
      <pre
        className="mono"
        style={{
          margin: 'var(--s-3) 0 0',
          padding: 0,
          fontSize: 11,
          lineHeight: 1.6,
          color: 'var(--ink-soft)',
          whiteSpace: 'pre',
          overflowX: 'auto',
        }}
      >
        {json}
      </pre>
    </details>
  );
};
