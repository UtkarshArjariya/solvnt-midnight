'use client';

import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Trash2 } from 'lucide-react';
import { clearHistory, loadHistory, type HistoryEntry } from '@/lib/history';
import { claimLabel, currencySymbol } from '@/lib/attestations';

/*
 * Holder-side proof history. Each row is a one-line audit entry: when,
 * which claim, who asked, and the nullifier (truncated). Lives on the
 * connected holder's device only. The verifier sees none of this.
 */

const fmtShort = (iso: string) => {
  const d = new Date(iso);
  const pad = (n: number) => n.toString().padStart(2, '0');
  return `${d.getUTCFullYear()}-${pad(d.getUTCMonth() + 1)}-${pad(d.getUTCDate())} ${pad(d.getUTCHours())}:${pad(d.getUTCMinutes())}`;
};

export const HistoryList = () => {
  const [entries, setEntries] = useState<HistoryEntry[]>([]);
  const [confirming, setConfirming] = useState(false);

  useEffect(() => {
    setEntries(loadHistory());
    const onStorage = () => setEntries(loadHistory());
    window.addEventListener('storage', onStorage);
    return () => window.removeEventListener('storage', onStorage);
  }, []);

  if (entries.length === 0) return null;

  return (
    <section
      aria-label="Past proofs"
      style={{ display: 'flex', flexDirection: 'column', gap: 'var(--s-4)' }}
    >
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'baseline',
          gap: 'var(--s-3)',
          flexWrap: 'wrap',
        }}
      >
        <h2
          style={{
            fontFamily: 'var(--font-display)',
            fontSize: 'var(--t-h2)',
            margin: 0,
            letterSpacing: '-0.02em',
            fontVariationSettings: "'SOFT' 100, 'opsz' 144",
          }}
        >
          Past proofs
        </h2>
        <div
          className="mono"
          style={{
            fontSize: 'var(--t-micro)',
            textTransform: 'uppercase',
            letterSpacing: '0.08em',
            color: 'var(--ink-dim)',
            display: 'flex',
            alignItems: 'center',
            gap: 'var(--s-3)',
          }}
        >
          <span>{entries.length} on this device</span>
          {confirming ? (
            <>
              <span style={{ color: 'var(--alert)' }}>clear all?</span>
              <button
                className="btn btn-ghost"
                style={{ height: 26, padding: '0 8px', fontSize: 'var(--t-micro)' }}
                onClick={() => {
                  clearHistory();
                  setEntries([]);
                  setConfirming(false);
                }}
              >
                yes
              </button>
              <button
                className="btn btn-ghost"
                style={{ height: 26, padding: '0 8px', fontSize: 'var(--t-micro)' }}
                onClick={() => setConfirming(false)}
              >
                no
              </button>
            </>
          ) : (
            <button
              className="btn btn-ghost"
              style={{ height: 26, padding: '0 8px', fontSize: 'var(--t-micro)' }}
              onClick={() => setConfirming(true)}
              aria-label="Clear proof history"
            >
              <Trash2 size={11} strokeWidth={1.5} /> clear
            </button>
          )}
        </div>
      </div>
      <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: 6 }}>
        <AnimatePresence initial={false}>
          {entries.map((e) => (
            <motion.li
              key={e.requestId}
              initial={{ opacity: 0, y: 4 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.22 }}
              className="card-flat"
              style={{
                padding: 'var(--s-3) var(--s-4)',
                display: 'grid',
                gridTemplateColumns: 'minmax(0, auto) 1fr auto',
                gap: 'var(--s-4)',
                alignItems: 'baseline',
              }}
            >
              <span
                className="mono"
                style={{
                  fontSize: 'var(--t-micro)',
                  color: 'var(--ink-dim)',
                  letterSpacing: '0.04em',
                }}
              >
                {fmtShort(e.generatedAt)}
              </span>
              <span
                style={{
                  fontSize: 'var(--t-small)',
                  minWidth: 0,
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap',
                }}
              >
                {claimLabel(e.claimType).toLowerCase()} ≥{' '}
                <span style={{ color: 'var(--ink)' }}>
                  {currencySymbol(e.currency as never)}
                  {e.threshold.toLocaleString('en-IN')}
                </span>
                {e.verifierLabel ? (
                  <span className="text-dim" style={{ marginLeft: 'var(--s-2)' }}>
                    · {e.verifierLabel}
                  </span>
                ) : null}
              </span>
              <span
                className="mono"
                style={{ fontSize: 'var(--t-micro)', color: 'var(--ink-dim)' }}
              >
                {e.nullifier.slice(0, 10)}…
              </span>
            </motion.li>
          ))}
        </AnimatePresence>
      </ul>
    </section>
  );
};
