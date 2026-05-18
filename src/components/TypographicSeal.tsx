'use client';

import { motion } from 'motion/react';
import { Download } from 'lucide-react';
import type { VerifyResult } from '@/lib/verify';
import { claimLabel, currencySymbol } from '@/lib/attestations';

/*
 * The "reveal" seal — replaces the icon-and-pill ✅ pattern with a typographic
 * receipt-style seal: Fraunces "Verified" headline, double-rule Vouch-Gold
 * bezel, monospaced timestamp / proof hash / issuer / nullifier rows. Reads
 * like a wire confirmation, not a sticker.
 *
 * Brand reference: Stripe's text-based credentials, passport stamp depth via
 * inset double rule, no padlock icons. See design research notes.
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

export type TypographicSealProps = {
  result: Extract<VerifyResult, { verified: true }>;
  verifiedAtIso?: string;
};

export const TypographicSeal = ({ result, verifiedAtIso }: TypographicSealProps) => {
  const verifiedAt = verifiedAtIso ?? new Date().toISOString();

  const downloadOutcome = () => {
    const payload = {
      verifiedAt,
      claimType: result.claimType,
      threshold: result.threshold,
      currency: result.currency,
      issuerLabel: result.issuerLabel,
      attestationExpiresAt: result.attestationExpiresAt,
      nullifier: result.nullifier,
      note: 'Verified locally via solvnt. The verifier learns only this single bit.',
    };
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `solvnt-verified-${result.nullifier.slice(2, 10)}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <motion.section
      initial={{ opacity: 0, scale: 0.96, y: 6 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
      aria-label="Verified result"
      style={{
        position: 'relative',
        padding: 'var(--s-6) var(--s-5)',
        background: 'var(--mid-raise)',
        borderRadius: 'var(--r-md)',
        boxShadow:
          'inset 0 0 0 1px var(--vouch), inset 0 0 0 2px transparent, inset 0 0 0 3px rgba(233, 196, 106, 0.35), 0 12px 32px rgba(0, 0, 0, 0.35)',
        textAlign: 'center',
        overflow: 'hidden',
      }}
    >
      <Guilloche seed={result.nullifier} />
      <div style={{ position: 'relative', zIndex: 1 }}>
        <div
          className="mono"
          style={{
            color: 'var(--vouch)',
            fontSize: 'var(--t-micro)',
            letterSpacing: '0.16em',
            textTransform: 'uppercase',
            marginBottom: 'var(--s-3)',
          }}
        >
          · verified ·
        </div>
        <h2
          style={{
            fontFamily: 'var(--font-display)',
            fontWeight: 500,
            fontSize: 'clamp(2rem, 6vw, 2.75rem)',
            lineHeight: 1.05,
            letterSpacing: '-0.02em',
            margin: 0,
            fontVariationSettings: "'SOFT' 100, 'opsz' 144",
          }}
        >
          {claimLabel(result.claimType)} ≥{' '}
          <span style={{ color: 'var(--catalyst)' }}>
            {currencySymbol(result.currency as never)}
            {result.threshold.toLocaleString('en-IN')}
          </span>
        </h2>
        <div
          style={{
            height: 1,
            background: 'var(--vouch)',
            opacity: 0.6,
            margin: 'var(--s-5) auto',
            maxWidth: 320,
          }}
        />
        <dl
          className="mono"
          style={{
            display: 'grid',
            gridTemplateColumns: 'auto 1fr',
            columnGap: 'var(--s-4)',
            rowGap: 6,
            margin: 0,
            fontSize: 'var(--t-small)',
            maxWidth: 420,
            marginLeft: 'auto',
            marginRight: 'auto',
            textAlign: 'left',
          }}
        >
          <Row label="verified" value={fmtUtc(verifiedAt)} />
          <Row label="issuer" value={result.issuerLabel} />
          <Row label="expires" value={fmtUtc(result.attestationExpiresAt)} />
          <Row label="nullifier" value={truncate(result.nullifier, 14, 8)} />
        </dl>
        <p
          className="text-dim"
          style={{ fontSize: 'var(--t-small)', marginTop: 'var(--s-5)' }}
        >
          That's everything the verifier sees.
        </p>
        <button
          type="button"
          onClick={downloadOutcome}
          className="btn btn-ghost"
          style={{
            marginTop: 'var(--s-5)',
            height: 36,
            padding: '0 14px',
            fontSize: 'var(--t-small)',
          }}
        >
          <Download size={14} strokeWidth={1.5} /> Save outcome (JSON)
        </button>
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
        letterSpacing: '0.08em',
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

/*
 * Hash-derived guilloché-inspired rosette. Generates 4 concentric Lissajous
 * curves whose phase + radius are seeded by characters of the nullifier hex,
 * giving each verified result a unique low-opacity background fingerprint.
 * Reads as document-security typography rather than decoration.
 */
const Guilloche = ({ seed }: { seed: string }) => {
  const clean = seed.replace(/^0x/, '');
  const codeAt = (i: number) => parseInt(clean[i % clean.length] ?? '0', 16);
  const lines: React.ReactElement[] = [];
  for (let layer = 0; layer < 4; layer++) {
    const points: string[] = [];
    const a = 3 + (codeAt(layer * 4) % 4);
    const b = 2 + (codeAt(layer * 4 + 1) % 4);
    const phase = (codeAt(layer * 4 + 2) / 15) * Math.PI * 2;
    const radius = 88 + layer * 8;
    for (let t = 0; t <= 360; t += 4) {
      const r = radius + Math.sin((t * Math.PI) / 180 * a) * 6;
      const angle = (t * Math.PI) / 180;
      const x = 200 + Math.cos(angle * b + phase) * r;
      const y = 80 + Math.sin(angle + phase) * (r * 0.55);
      points.push(`${x.toFixed(1)},${y.toFixed(1)}`);
    }
    lines.push(
      <polyline
        key={layer}
        points={points.join(' ')}
        fill="none"
        stroke="var(--catalyst)"
        strokeWidth={0.6}
        opacity={0.18 - layer * 0.025}
      />
    );
  }
  return (
    <svg
      aria-hidden
      viewBox="0 0 400 160"
      preserveAspectRatio="xMidYMid slice"
      style={{
        position: 'absolute',
        inset: 0,
        width: '100%',
        height: '100%',
        pointerEvents: 'none',
        mixBlendMode: 'screen',
      }}
    >
      {lines}
    </svg>
  );
};
