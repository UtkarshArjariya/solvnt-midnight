'use client';

import { useEffect, useMemo, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import QRCode from 'qrcode';
import { Smartphone, Copy } from 'lucide-react';

import { encodeRequest } from '@/lib/encode';
import { claimLabel, currencySymbol } from '@/lib/attestations';
import { verifyProof, type VerifyResult } from '@/lib/verify';
import type { VerificationRequest } from '@/lib/schemas';
import { LiveStatusPill } from './LiveStatusPill';
import { TypographicSeal } from './TypographicSeal';

type State =
  | { status: 'pending' }
  | {
      status: 'verified';
      result: Extract<VerifyResult, { verified: true }>;
      verifiedAt: string;
    }
  | { status: 'failed'; reason: string };

export const VerifierWaiting = ({ request }: { request: VerificationRequest }) => {
  const [qrDataUrl, setQrDataUrl] = useState<string | null>(null);
  const [state, setState] = useState<State>({ status: 'pending' });
  const [lastPoll, setLastPoll] = useState<number>(() => Date.now());

  const holderUrl = useMemo(() => {
    const encoded = encodeRequest(request);
    const base =
      typeof window === 'undefined'
        ? 'http://localhost:3000'
        : window.location.origin;
    const url = new URL('/', base);
    url.searchParams.set('req', encoded);
    return url.toString();
  }, [request]);

  useEffect(() => {
    QRCode.toDataURL(holderUrl, {
      margin: 1,
      width: 280,
      color: { dark: '#ECEEFD', light: '#0D112900' },
    })
      .then(setQrDataUrl)
      .catch(() => {});
  }, [holderUrl]);

  useEffect(() => {
    if (state.status !== 'pending') return;
    let cancelled = false;

    const tick = async () => {
      setLastPoll(Date.now());
      try {
        const res = await fetch(`/api/proofs/${request.requestId}`, { cache: 'no-store' });
        if (!res.ok || cancelled) return;
        const data = await res.json();
        if (!data || data.status !== 'received') return;
        const result = verifyProof(data.proof, request);
        if (cancelled) return;
        if (result.verified) {
          setState({ status: 'verified', result, verifiedAt: new Date().toISOString() });
        } else {
          setState({ status: 'failed', reason: result.reason });
        }
      } catch {}
    };

    const id = setInterval(tick, 700);
    void tick();
    return () => {
      cancelled = true;
      clearInterval(id);
    };
  }, [request, state.status]);

  return (
    <main className="container-narrow" style={{ padding: 'var(--s-7) var(--s-5)' }}>
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
        style={{ display: 'flex', flexDirection: 'column', gap: 'var(--s-5)' }}
      >
        <div>
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 'var(--s-3)',
              marginBottom: 'var(--s-3)',
              flexWrap: 'wrap',
            }}
          >
            <span
              className="mono"
              style={{
                fontSize: 'var(--t-micro)',
                letterSpacing: '0.08em',
                textTransform: 'uppercase',
                color: 'var(--ink-dim)',
              }}
            >
              verifier request
            </span>
            {state.status === 'pending' ? (
              <LiveStatusPill pollTick={lastPoll} expiresAtIso={request.expiresAt} />
            ) : null}
          </div>
          <h1 style={{ fontSize: 'var(--t-h1)', margin: 0 }}>
            Prove {claimLabel(request.claimType).toLowerCase()} ≥{' '}
            <span style={{ color: 'var(--catalyst)' }}>
              {currencySymbol(request.currency)}
              {request.threshold.toLocaleString('en-IN')}
            </span>
          </h1>
          {request.verifierLabel ? (
            <p className="text-soft" style={{ marginTop: 'var(--s-2)' }}>
              {request.verifierLabel}
            </p>
          ) : null}
        </div>

        <AnimatePresence mode="wait">
          {state.status === 'pending' && (
            <motion.div
              key="pending"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.22 }}
              className="card"
              style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: 'var(--s-4)',
              }}
            >
              <div
                style={{
                  padding: 'var(--s-4)',
                  background: 'var(--mid-void)',
                  borderRadius: 'var(--r-md)',
                  border: '1px solid var(--mid-line-soft)',
                }}
              >
                {qrDataUrl ? (
                  <img src={qrDataUrl} alt="Scan with the Solvnt holder app" width={260} height={260} />
                ) : (
                  <div style={{ width: 260, height: 260, background: 'var(--mid-base)' }} />
                )}
              </div>
              <div
                className="mono"
                style={{
                  color: 'var(--ink-soft)',
                  fontSize: 'var(--t-small)',
                  letterSpacing: '0.04em',
                }}
              >
                waiting for proof…
              </div>
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 'var(--s-2)',
                  fontSize: 'var(--t-small)',
                  flexWrap: 'wrap',
                  justifyContent: 'center',
                }}
              >
                <Smartphone size={14} strokeWidth={1.5} color="var(--ink-dim)" />
                <a
                  href={holderUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="mono"
                  style={{ color: 'var(--ink-dim)', textDecoration: 'underline' }}
                >
                  Open on this device
                </a>
                <button
                  className="btn btn-ghost"
                  onClick={() => void navigator.clipboard.writeText(holderUrl)}
                  aria-label="Copy holder URL"
                  style={{ height: 28, padding: '0 10px', fontSize: 'var(--t-micro)' }}
                >
                  <Copy size={12} strokeWidth={1.5} /> Copy
                </button>
              </div>
            </motion.div>
          )}

          {state.status === 'verified' && (
            <TypographicSeal result={state.result} verifiedAtIso={state.verifiedAt} />
          )}

          {state.status === 'failed' && (
            <motion.div
              key="failed"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="card"
              role="alert"
              style={{ borderColor: 'var(--alert-soft)' }}
            >
              <div style={{ color: 'var(--alert)', fontWeight: 600 }}>Not verified</div>
              <div className="mono text-dim" style={{ fontSize: 'var(--t-small)', marginTop: 'var(--s-2)' }}>
                {state.reason}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    </main>
  );
};

