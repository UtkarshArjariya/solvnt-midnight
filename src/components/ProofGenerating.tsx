'use client';

import { motion, AnimatePresence } from 'motion/react';
import { useEffect, useState } from 'react';

/*
 * Narrated proof-generation moment. Replaces the spinner pattern with a
 * typographic progression — a single Fraunces "proving." italic at the top
 * and four JetBrains Mono lines that appear sequentially below, then dim.
 *
 * Brand reference: Linear / Cursor narrate work in plain typographic strings
 * rather than spinners. The user feels they are watching the math, not
 * waiting on it. See `docs/research/2026-05-18-design-notes.md`.
 */

const PHASES = [
  'building witness',
  'committing inputs',
  'generating constraints',
  'constructing proof',
] as const;

const STEP_MS = 360;
const COMPLETE_AFTER_MS = STEP_MS * PHASES.length + 100;

export const ProofGenerating = ({
  durationMs = 1800,
  onComplete,
}: {
  durationMs?: number;
  onComplete?: () => void;
}) => {
  const [stepsShown, setStepsShown] = useState(0);
  const [sealed, setSealed] = useState(false);

  useEffect(() => {
    const timers: ReturnType<typeof setTimeout>[] = [];
    PHASES.forEach((_, i) => {
      timers.push(setTimeout(() => setStepsShown(i + 1), STEP_MS * i));
    });
    timers.push(
      setTimeout(() => {
        setStepsShown(PHASES.length);
        setSealed(true);
        onComplete?.();
      }, Math.max(COMPLETE_AFTER_MS, durationMs))
    );
    return () => timers.forEach(clearTimeout);
  }, [durationMs, onComplete]);

  return (
    <section
      role="status"
      aria-live="polite"
      aria-label={sealed ? 'Proof complete' : 'Generating proof'}
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: 'var(--s-5)',
        padding: 'var(--s-7) 0 var(--s-6)',
      }}
    >
      <div
        style={{
          fontFamily: 'var(--font-display)',
          fontStyle: 'italic',
          fontWeight: 500,
          fontSize: 'clamp(2.5rem, 8vw, 4rem)',
          lineHeight: 1,
          letterSpacing: '-0.03em',
          fontVariationSettings: "'SOFT' 100, 'opsz' 144",
          color: 'var(--ink)',
          position: 'relative',
        }}
      >
        <AnimatePresence mode="wait">
          <motion.span
            key={sealed ? 'sealed' : 'proving'}
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
            style={{ display: 'inline-block' }}
          >
            {sealed ? 'proved.' : 'proving.'}
          </motion.span>
        </AnimatePresence>
        <motion.span
          aria-hidden
          animate={{
            opacity: sealed ? 1 : [0.4, 1, 0.4],
            background: sealed ? 'var(--vouch)' : 'var(--catalyst)',
            boxShadow: sealed
              ? '0 0 16px rgba(233, 196, 106, 0.35)'
              : '0 0 18px var(--catalyst-glow)',
          }}
          transition={{
            opacity: sealed ? { duration: 0.2 } : { duration: 1.4, repeat: Infinity },
            background: { duration: 0.4 },
            boxShadow: { duration: 0.4 },
          }}
          style={{
            display: 'inline-block',
            width: 10,
            height: 10,
            borderRadius: '50%',
            marginLeft: 6,
            verticalAlign: 'baseline',
            transform: 'translateY(-2px)',
          }}
        />
      </div>

      <ul
        className="mono"
        style={{
          listStyle: 'none',
          padding: 0,
          margin: 0,
          display: 'flex',
          flexDirection: 'column',
          gap: 4,
          textAlign: 'center',
          minWidth: 220,
          fontSize: 12,
          letterSpacing: '0.04em',
          textTransform: 'uppercase',
        }}
      >
        {PHASES.map((phase, i) => {
          const visible = stepsShown > i;
          const isCurrent = stepsShown === i + 1 && !sealed;
          return (
            <li
              key={phase}
              style={{
                opacity: !visible ? 0 : isCurrent ? 1 : 0.32,
                color: isCurrent && !sealed ? 'var(--catalyst)' : 'var(--ink-dim)',
                transition: 'opacity 220ms var(--ease-out), color 220ms var(--ease-out)',
                display: 'flex',
                justifyContent: 'center',
                gap: 10,
              }}
            >
              <span style={{ width: '1ch', textAlign: 'left' }}>
                {sealed ? '✓' : isCurrent ? '·' : visible ? '·' : ' '}
              </span>
              <span>{phase}{isCurrent ? '…' : ''}</span>
            </li>
          );
        })}
      </ul>

      <p
        className="text-dim"
        style={{
          fontSize: 'var(--t-small)',
          marginTop: 'var(--s-2)',
          maxWidth: 320,
          textAlign: 'center',
        }}
      >
        Nothing leaves this device. The proof is computed locally and only the
        result is shared.
      </p>
    </section>
  );
};
