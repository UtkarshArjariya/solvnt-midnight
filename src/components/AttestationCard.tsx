'use client';

import type { Attestation, IssuerInfo } from '@/lib/schemas';
import { claimLabel, formatAmount } from '@/lib/attestations';

export const AttestationCard = ({
  attestation,
  issuer,
  emphasize,
}: {
  attestation: Attestation;
  issuer?: Pick<IssuerInfo, 'label'>;
  emphasize?: boolean;
}) => {
  const expires = new Date(attestation.expiresAt);
  const daysLeft = Math.max(
    0,
    Math.ceil((expires.getTime() - Date.now()) / (1000 * 60 * 60 * 24))
  );

  return (
    <div
      className="card-flat"
      style={{
        borderColor: emphasize ? 'var(--catalyst)' : 'var(--mid-line-soft)',
        background: emphasize ? 'var(--catalyst-faint)' : undefined,
      }}
    >
      <div className="flex items-center justify-between" style={{ marginBottom: 'var(--s-3)' }}>
        <span className="chip">{claimLabel(attestation.claim.type)}</span>
        <span className="text-dim" style={{ fontSize: 'var(--t-micro)' }}>
          {daysLeft}d left
        </span>
      </div>
      <div
        style={{
          fontFamily: 'var(--font-display)',
          fontSize: 'var(--t-h1)',
          fontWeight: 500,
          letterSpacing: '-0.02em',
          fontVariationSettings: "'SOFT' 80, 'opsz' 144",
          lineHeight: 'var(--lh-snug)',
        }}
      >
        {formatAmount(attestation.claim.value, attestation.claim.currency)}
      </div>
      <div className="text-soft" style={{ fontSize: 'var(--t-small)', marginTop: 'var(--s-1)' }}>
        Issued by {issuer?.label ?? 'unknown issuer'}
      </div>
      <div className="hairline" style={{ margin: 'var(--s-4) 0' }} />
      <div className="flex items-center justify-between text-dim" style={{ fontSize: 'var(--t-micro)' }}>
        <span className="mono">{attestation.nonce.slice(0, 14)}…</span>
        <span>{attestation.claim.period.from} → {attestation.claim.period.to}</span>
      </div>
    </div>
  );
};
