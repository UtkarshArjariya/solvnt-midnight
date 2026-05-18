'use client';

import type { VerificationRequest } from '@/lib/schemas';
import { claimLabel, currencySymbol } from '@/lib/attestations';

export const RequestSummary = ({ request }: { request: VerificationRequest }) => {
  return (
    <div
      className="card"
      style={{
        borderColor: 'rgba(124, 245, 201, 0.25)',
        background: 'var(--mid-raise)',
        position: 'relative',
      }}
    >
      {/* Catalyst hairline as the accent — replaces the gradient with a single
          deliberate rule. */}
      <span
        aria-hidden
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          width: 48,
          height: 2,
          background: 'var(--catalyst)',
          borderTopLeftRadius: 'var(--r-lg)',
        }}
      />
      <div className="flex items-center" style={{ gap: 'var(--s-2)', marginBottom: 'var(--s-3)' }}>
        <span className="chip chip-catalyst">Verifier request</span>
        {request.verifierLabel ? (
          <span className="text-soft" style={{ fontSize: 'var(--t-small)' }}>
            from {request.verifierLabel}
          </span>
        ) : null}
      </div>
      <div
        style={{
          fontFamily: 'var(--font-display)',
          fontWeight: 500,
          fontSize: 'var(--t-h1)',
          lineHeight: 'var(--lh-snug)',
          letterSpacing: '-0.02em',
          fontVariationSettings: "'SOFT' 100, 'opsz' 144",
        }}
      >
        Prove {claimLabel(request.claimType).toLowerCase()} is at least{' '}
        <span style={{ color: 'var(--catalyst)' }}>
          {currencySymbol(request.currency)}
          {request.threshold.toLocaleString('en-IN')}
        </span>
      </div>
      <div className="hairline" style={{ margin: 'var(--s-5) 0' }} />
      <div className="flex items-center justify-between text-dim" style={{ fontSize: 'var(--t-micro)' }}>
        <span className="mono">{request.requestId.slice(0, 8)}…</span>
        <span>Request expires {new Date(request.expiresAt).toLocaleTimeString()}</span>
      </div>
    </div>
  );
};
