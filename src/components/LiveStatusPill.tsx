'use client';

import { useEffect, useState } from 'react';

/*
 * `· LIVE · last polled Ns ago ·` micro-status pill in JetBrains Mono. The dot
 * pulses on each poll tick rather than continuously — the user feels the
 * system is alive without resorting to a spinner. Reference: Vercel's
 * dashboard "last deploy 3m ago" pill.
 */

export const LiveStatusPill = ({
  pollTick,
  expiresAtIso,
  label = 'live',
}: {
  pollTick: number;
  expiresAtIso?: string;
  label?: string;
}) => {
  const [now, setNow] = useState(() => Date.now());
  const [pulse, setPulse] = useState(false);

  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);

  useEffect(() => {
    setPulse(true);
    const t = setTimeout(() => setPulse(false), 400);
    return () => clearTimeout(t);
  }, [pollTick]);

  const secondsSincePoll = Math.max(0, Math.floor((now - pollTick) / 1000));
  const expiresIn = expiresAtIso
    ? Math.max(0, Math.floor((Date.parse(expiresAtIso) - now) / 1000))
    : null;

  return (
    <span
      role="status"
      aria-live="off"
      className="mono"
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 8,
        fontSize: 11,
        color: 'var(--ink-dim)',
        letterSpacing: '0.08em',
        textTransform: 'uppercase',
        padding: '4px 10px',
        borderRadius: 'var(--r-pill)',
        border: '1px solid var(--mid-line-soft)',
        background: 'var(--mid-raise-2)',
      }}
    >
      <span
        aria-hidden
        style={{
          width: 6,
          height: 6,
          borderRadius: '50%',
          background: 'var(--catalyst)',
          boxShadow: pulse
            ? '0 0 0 4px var(--catalyst-faint), 0 0 12px var(--catalyst-glow)'
            : '0 0 6px var(--catalyst-glow)',
          transition: 'box-shadow 360ms var(--ease-out)',
        }}
      />
      <span>· {label} ·</span>
      <span style={{ opacity: 0.7 }}>polled {secondsSincePoll}s ago</span>
      {expiresIn != null ? (
        <span style={{ opacity: 0.7 }}>
          · expires {expiresIn >= 60 ? `${Math.floor(expiresIn / 60)}m` : `${expiresIn}s`}
        </span>
      ) : null}
    </span>
  );
};
