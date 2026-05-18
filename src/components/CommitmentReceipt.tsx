'use client';

import { motion } from 'motion/react';
import type { ProofPackage, VerificationRequest } from '@/lib/schemas';
import { claimLabel, currencySymbol } from '@/lib/attestations';

/*
 * Typographic "proof receipt" — the artifact the holder keeps after a proof
 * is generated, before the share UI. No icons, no decoration; pure type
 * composition over a hairline-bordered card with a single Vouch-Gold accent
 * line. Borrows the Stripe Atlas "credibility-by-typography" pattern.
 *
 * The receipt is the *holder's* memento — the verifier's seal lives at
 * /verify/[id]. Both are typographic, but the receipt foregrounds the
 * *commitment* (yours forever) where the seal foregrounds the *verdict*.
 */

const fmtUtc = (iso: string) => {
  const d = new Date(iso);
  const pad = (n: number) => n.toString().padStart(2, '0');
  return (
    `${d.getUTCFullYear()}-${pad(d.getUTCMonth() + 1)}-${pad(d.getUTCDate())}` +
    ` ${pad(d.getUTCHours())}:${pad(d.getUTCMinutes())}:${pad(d.getUTCSeconds())} UTC`
  );
};

const truncate = (s: string, head = 10, tail = 6) =>
  s.length <= head + tail + 1 ? s : `${s.slice(0, head)}…${s.slice(-tail)}`;

export const CommitmentReceipt = ({
  proof,
  request,
}: {
  proof: ProofPackage;
  request: VerificationRequest;
}) => {
  const rows: Array<{ label: string; value: string }> = [
    { label: 'issued', value: fmtUtc(proof.generatedAt) },
    { label: 'subject', value: truncate(proof.publicInputs.subjectCommitment, 10, 6) },
    {
      label: 'claim',
      value: `${claimLabel(request.claimType).toLowerCase()} ≥ ${currencySymbol(request.currency)}${request.threshold.toLocaleString('en-IN')}`,
    },
    { label: 'issuer', value: proof.issuerLabel },
    { label: 'expires', value: fmtUtc(proof.publicInputs.expiresAt) },
    { label: 'commitment', value: truncate(proof.proof, 10, 8) },
    { label: 'nullifier', value: truncate(proof.publicInputs.nullifier, 10, 8) },
  ];

  return (
    <motion.section
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
      aria-label="Proof receipt"
      style={{
        maxWidth: 460,
        margin: '0 auto',
        padding: 'var(--s-7) var(--s-6) var(--s-6)',
        background: 'var(--mid-raise)',
        border: '1px solid var(--mid-line-soft)',
        borderRadius: 'var(--r-md)',
        textAlign: 'center',
      }}
    >
      <div
        className="mono"
        style={{
          fontSize: 'var(--t-micro)',
          letterSpacing: '0.32em',
          textTransform: 'uppercase',
          color: 'var(--ink-soft)',
          marginBottom: 'var(--s-2)',
        }}
      >
        solvnt · proof receipt
      </div>
      <div
        style={{
          fontFamily: 'var(--font-display)',
          fontWeight: 500,
          fontSize: 'var(--t-h2)',
          letterSpacing: '-0.02em',
          fontVariationSettings: "'SOFT' 100, 'opsz' 144",
          color: 'var(--ink)',
        }}
      >
        proved.
      </div>
      <div
        aria-hidden
        style={{
          margin: 'var(--s-5) auto',
          height: 1,
          maxWidth: 280,
          background: 'var(--mid-line-soft)',
        }}
      />
      <dl
        className="mono"
        style={{
          display: 'grid',
          gridTemplateColumns: 'auto 1fr',
          columnGap: 'var(--s-5)',
          rowGap: 7,
          margin: 0,
          fontSize: 'var(--t-small)',
          textAlign: 'left',
        }}
      >
        {rows.map((r) => (
          <Row key={r.label} label={r.label} value={r.value} />
        ))}
      </dl>
      <div
        aria-hidden
        style={{
          margin: 'var(--s-5) auto var(--s-4)',
          height: 1,
          maxWidth: 280,
          background: 'var(--mid-line-soft)',
        }}
      />
      <p
        className="text-soft"
        style={{ fontSize: 'var(--t-small)', margin: 0 }}
      >
        This receipt is yours. The verifier holds only the seal.
      </p>
      <div
        className="mono"
        style={{
          marginTop: 'var(--s-4)',
          fontSize: 'var(--t-micro)',
          letterSpacing: '0.14em',
          textTransform: 'uppercase',
          color: 'var(--vouch)',
        }}
      >
        verified locally · never uploaded
      </div>
    </motion.section>
  );
};

const Row = ({ label, value }: { label: string; value: string }) => (
  <>
    <dt
      style={{
        color: 'var(--ink-dim)',
        textTransform: 'uppercase',
        letterSpacing: '0.1em',
        fontSize: 'var(--t-micro)',
        alignSelf: 'baseline',
      }}
    >
      {label}
    </dt>
    <dd
      style={{
        margin: 0,
        color: 'var(--ink)',
        wordBreak: 'break-all',
      }}
    >
      {value}
    </dd>
  </>
);
