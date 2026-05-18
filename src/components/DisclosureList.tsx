'use client';

import type { VerificationRequest, Attestation } from '@/lib/schemas';
import { claimLabel, currencySymbol } from '@/lib/attestations';

/*
 * Three-zone disclosure of what a verifier learns / doesn't learn.
 *
 *   WILL ASSERT (Vouch Gold)    — the claim being proved (the one bit)
 *   WILL SHARE  (Catalyst Cyan) — scaffolding the verifier sees publicly
 *   WILL HIDE   (muted ink)     — everything that stays on this device
 *
 * Brand reference: Rabby's three-zone transaction simulation + GitHub OAuth's
 * verb-first scope rows. The verb-first framing makes each row scan like a
 * contract clause instead of a checkbox.
 */

type Zone = 'assert' | 'share' | 'hide';
type Row = { verb: string; subject: string; zone: Zone };

const buildRows = (
  request: VerificationRequest,
  attestation: Attestation
): Row[] => [
  // The single bit that's actually being proved
  {
    verb: 'Asserts',
    subject: `${claimLabel(request.claimType).toLowerCase()} ≥ ${currencySymbol(request.currency)}${request.threshold.toLocaleString('en-IN')}`,
    zone: 'assert',
  },
  // Public scaffolding the verifier also gets to see
  { verb: 'Reveals', subject: 'issuer label (one of the registered ones)', zone: 'share' },
  {
    verb: 'Reveals',
    subject: `attestation expiry (${new Date(attestation.expiresAt).toLocaleDateString()})`,
    zone: 'share',
  },
  { verb: 'Reveals', subject: 'a per-verifier nullifier (anti-replay only)', zone: 'share' },
  // Everything that stays private
  {
    verb: 'Conceals',
    subject: `exact value (${currencySymbol(attestation.claim.currency)}${attestation.claim.value.toLocaleString('en-IN')})`,
    zone: 'hide',
  },
  { verb: 'Conceals', subject: 'employer / source', zone: 'hide' },
  { verb: 'Conceals', subject: 'your wallet address', zone: 'hide' },
  { verb: 'Conceals', subject: 'other attestations you hold', zone: 'hide' },
  { verb: 'Conceals', subject: 'the attestation period', zone: 'hide' },
];

export const DisclosureList = ({
  request,
  attestation,
}: {
  request: VerificationRequest;
  attestation: Attestation;
}) => {
  const rows = buildRows(request, attestation);
  const groups: Array<{ key: Zone; label: string; rows: Row[] }> = [
    { key: 'assert', label: 'what the proof asserts', rows: rows.filter((r) => r.zone === 'assert') },
    { key: 'share', label: 'what the verifier also sees', rows: rows.filter((r) => r.zone === 'share') },
    { key: 'hide', label: 'what stays on this device', rows: rows.filter((r) => r.zone === 'hide') },
  ];

  return (
    <section
      aria-label="What the verifier will see"
      className="card-flat"
      style={{ padding: 'var(--s-5)' }}
    >
      {groups.map((g, i) => (
        <div key={g.key} style={{ marginTop: i === 0 ? 0 : 'var(--s-5)' }}>
          <div
            className="mono"
            style={{
              fontSize: 'var(--t-micro)',
              letterSpacing: '0.14em',
              textTransform: 'uppercase',
              color: 'var(--ink-dim)',
              marginBottom: 'var(--s-3)',
            }}
          >
            {g.label}
          </div>
          <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: 6 }}>
            {g.rows.map((r) => (
              <DisclosureRow key={`${r.verb}-${r.subject}`} {...r} />
            ))}
          </ul>
          {i < groups.length - 1 ? (
            <div className="hairline" style={{ marginTop: 'var(--s-5)' }} />
          ) : null}
        </div>
      ))}
    </section>
  );
};

const colorFor = (zone: Zone): string => {
  switch (zone) {
    case 'assert':
      return 'var(--vouch)';
    case 'share':
      return 'var(--catalyst)';
    case 'hide':
      return 'var(--ink-dim)';
  }
};

const DisclosureRow = ({ verb, subject, zone }: Row) => (
  <li
    style={{
      display: 'grid',
      gridTemplateColumns: '88px 1fr',
      gap: 'var(--s-3)',
      alignItems: 'baseline',
      fontSize: 'var(--t-small)',
    }}
  >
    <span
      style={{
        fontFamily: 'var(--font-display)',
        fontStyle: 'italic',
        fontSize: 'var(--t-small)',
        fontVariationSettings: "'SOFT' 100, 'opsz' 36",
        color: colorFor(zone),
      }}
    >
      {verb}
    </span>
    <span
      style={{
        color: zone === 'hide' ? 'var(--ink-soft)' : 'var(--ink)',
      }}
    >
      {subject}
    </span>
  </li>
);
