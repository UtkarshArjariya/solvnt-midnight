'use client';

import { useEffect, useMemo, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { ArrowUpRight, Check, X, AlertTriangle } from 'lucide-react';
import {
  brandedNameFor,
  connectWallet,
  discoverWallets,
  expectedNetworkLabel,
  KNOWN_WALLETS,
  type DiscoveredWallet,
  type KnownWallet,
} from '@/lib/midnight/wallet';
import type { WalletConnection } from '@/lib/wallet';

/*
 * Wallet picker modal. Renders the two curated Midnight wallets (Lace + 1am)
 * with explicit install paths if they aren't detected, and lists any other
 * compatible wallets that announce themselves via `window.midnight[...]`.
 *
 * Nocturnal-lab aesthetic: monochrome card surfaces, mono labels, Fraunces
 * italic for the headline, Catalyst hairlines for emphasis. No gradients.
 */

export type WalletPickerProps = {
  open: boolean;
  onDismiss: () => void;
  onConnected: (info: WalletConnection) => void;
};

type Row =
  | { kind: 'detected-known'; known: KnownWallet; wallet: DiscoveredWallet }
  | { kind: 'detected-unknown'; wallet: DiscoveredWallet }
  | { kind: 'missing-known'; known: KnownWallet };

export const WalletPicker = ({ open, onDismiss, onConnected }: WalletPickerProps) => {
  const [wallets, setWallets] = useState<DiscoveredWallet[]>([]);
  const [connecting, setConnecting] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    setError(null);
    setWallets(discoverWallets());
    const id = setInterval(() => setWallets(discoverWallets()), 600);
    return () => clearInterval(id);
  }, [open]);

  const rows: Row[] = useMemo(() => {
    const detected = wallets.map<Row>((w) => {
      const { known } = brandedNameFor(w);
      return known
        ? { kind: 'detected-known', known, wallet: w }
        : { kind: 'detected-unknown', wallet: w };
    });
    const haveIds = new Set(
      detected.flatMap((r) => (r.kind === 'detected-known' ? [r.known.id] : []))
    );
    const missing = KNOWN_WALLETS.filter((k) => !haveIds.has(k.id)).map<Row>((k) => ({
      kind: 'missing-known',
      known: k,
    }));
    return [...detected, ...missing];
  }, [wallets]);

  const connect = async (key: string) => {
    setConnecting(key);
    setError(null);
    try {
      const { walletApi, walletName } = await connectWallet(key);
      const addrs = await walletApi.getShieldedAddresses();
      onConnected({
        address: addrs.shieldedAddress,
        coinPublicKey: addrs.shieldedCoinPublicKey,
        walletName,
        walletApi,
      });
    } catch (e) {
      const message =
        e instanceof Error ? e.message : typeof e === 'string' ? e : 'unknown_error';
      setError(message);
    } finally {
      setConnecting(null);
    }
  };

  return (
    <AnimatePresence>
      {open ? (
        <motion.div
          key="scrim"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.18 }}
          role="dialog"
          aria-modal="true"
          aria-label="Connect a Midnight wallet"
          onClick={onDismiss}
          style={{
            position: 'fixed',
            inset: 0,
            background: 'var(--scrim)',
            zIndex: 100,
            display: 'grid',
            placeItems: 'center',
            padding: 'var(--s-4)',
          }}
        >
          <motion.div
            initial={{ opacity: 0, y: 14, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 10, scale: 0.98 }}
            transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
            onClick={(e) => e.stopPropagation()}
            style={{
              width: '100%',
              maxWidth: 480,
              background: 'var(--mid-raise)',
              border: '1px solid var(--mid-line-soft)',
              borderRadius: 'var(--r-lg)',
              padding: 'var(--s-6)',
              position: 'relative',
              boxShadow: 'var(--shadow-3)',
            }}
          >
            <button
              aria-label="Dismiss"
              onClick={onDismiss}
              className="btn btn-ghost"
              style={{
                position: 'absolute',
                top: 'var(--s-3)',
                right: 'var(--s-3)',
                height: 32,
                width: 32,
                padding: 0,
                borderRadius: 'var(--r-pill)',
              }}
            >
              <X size={14} strokeWidth={1.5} />
            </button>

            <div
              className="mono"
              style={{
                fontSize: 'var(--t-micro)',
                letterSpacing: '0.18em',
                textTransform: 'uppercase',
                color: 'var(--ink-dim)',
                marginBottom: 'var(--s-2)',
              }}
            >
              connect to midnight · {expectedNetworkLabel()}
            </div>
            <h2
              style={{
                fontFamily: 'var(--font-display)',
                fontStyle: 'italic',
                fontWeight: 500,
                fontSize: 'var(--t-h1)',
                letterSpacing: '-0.02em',
                fontVariationSettings: "'SOFT' 100, 'opsz' 144",
                margin: 0,
                marginBottom: 'var(--s-5)',
                color: 'var(--ink)',
              }}
            >
              Pick a wallet.
            </h2>

            <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: 'var(--s-3)' }}>
              {rows.map((r, i) => (
                <li key={`${r.kind}:${r.kind === 'missing-known' ? r.known.id : r.wallet.key}:${i}`}>
                  <RowCard row={r} connecting={connecting} onConnect={connect} />
                </li>
              ))}
            </ul>

            {error ? (
              <div
                role="alert"
                style={{
                  marginTop: 'var(--s-4)',
                  padding: 'var(--s-3) var(--s-4)',
                  border: '1px solid var(--alert-soft)',
                  borderRadius: 'var(--r-md)',
                  display: 'flex',
                  gap: 'var(--s-3)',
                  alignItems: 'flex-start',
                  background: 'var(--mid-base)',
                }}
              >
                <AlertTriangle size={16} strokeWidth={1.5} color="var(--alert)" />
                <div>
                  <div style={{ color: 'var(--alert)', fontSize: 'var(--t-small)', fontWeight: 600 }}>
                    Couldn't connect
                  </div>
                  <div className="mono text-dim" style={{ fontSize: 'var(--t-micro)', marginTop: 2 }}>
                    {error}
                  </div>
                </div>
              </div>
            ) : null}

            <div
              className="hairline"
              style={{ margin: 'var(--s-5) 0 var(--s-4)' }}
            />
            <p className="text-dim" style={{ fontSize: 'var(--t-small)', margin: 0 }}>
              Your proof is generated on your device. The wallet signs the transaction
              that submits the proof; it never sees the underlying value.
            </p>
          </motion.div>
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
};

const RowCard = ({
  row,
  connecting,
  onConnect,
}: {
  row: Row;
  connecting: string | null;
  onConnect: (key: string) => void;
}) => {
  if (row.kind === 'missing-known') {
    return (
      <a
        href={row.known.installUrl}
        target="_blank"
        rel="noreferrer"
        className="card-flat"
        style={{
          display: 'grid',
          gridTemplateColumns: '40px 1fr auto',
          alignItems: 'center',
          gap: 'var(--s-4)',
          padding: 'var(--s-4)',
          textDecoration: 'none',
          color: 'var(--ink)',
          transition: 'border-color var(--dur-fast) var(--ease-out)',
        }}
      >
        <LetterMark name={row.known.name} muted />
        <div style={{ minWidth: 0 }}>
          <div style={{ fontWeight: 600 }}>{row.known.name}</div>
          <div
            className="text-dim"
            style={{ fontSize: 'var(--t-small)', overflow: 'hidden', textOverflow: 'ellipsis' }}
          >
            Not installed · {row.known.tagline}
          </div>
        </div>
        <span
          className="mono"
          style={{
            fontSize: 'var(--t-micro)',
            color: 'var(--catalyst)',
            letterSpacing: '0.08em',
            textTransform: 'uppercase',
            display: 'inline-flex',
            alignItems: 'center',
            gap: 6,
          }}
        >
          install <ArrowUpRight size={11} strokeWidth={1.6} />
        </span>
      </a>
    );
  }

  if (row.kind === 'detected-unknown') {
    const w = row.wallet;
    return (
      <button
        type="button"
        onClick={() => onConnect(w.key)}
        disabled={connecting !== null || !w.compatible}
        className="card-flat"
        style={{
          width: '100%',
          display: 'grid',
          gridTemplateColumns: '40px 1fr auto',
          alignItems: 'center',
          gap: 'var(--s-4)',
          padding: 'var(--s-4)',
          textAlign: 'left',
          cursor: connecting !== null || !w.compatible ? 'not-allowed' : 'pointer',
          opacity: !w.compatible ? 0.5 : 1,
          background: 'var(--mid-base)',
        }}
      >
        {w.icon ? (
          <img
            src={w.icon}
            alt=""
            width={40}
            height={40}
            style={{ borderRadius: 'var(--r-sm)', objectFit: 'cover' }}
          />
        ) : (
          <LetterMark name={w.name} />
        )}
        <div style={{ minWidth: 0 }}>
          <div style={{ fontWeight: 600 }}>{w.name}</div>
          <div className="mono text-dim" style={{ fontSize: 'var(--t-micro)' }}>
            api v{w.apiVersion}
          </div>
        </div>
        <ConnectStatus state={connecting === w.key ? 'connecting' : w.compatible ? 'ready' : 'incompatible'} />
      </button>
    );
  }

  const w = row.wallet;
  const known = row.known;
  return (
    <button
      type="button"
      onClick={() => onConnect(w.key)}
      disabled={connecting !== null || !w.compatible}
      className="card-flat"
      style={{
        width: '100%',
        display: 'grid',
        gridTemplateColumns: '40px 1fr auto',
        alignItems: 'center',
        gap: 'var(--s-4)',
        padding: 'var(--s-4)',
        textAlign: 'left',
        cursor: connecting !== null || !w.compatible ? 'not-allowed' : 'pointer',
        background: 'var(--mid-base)',
        border: '1px solid var(--catalyst)',
      }}
    >
      {w.icon ? (
        <img
          src={w.icon}
          alt=""
          width={40}
          height={40}
          style={{ borderRadius: 'var(--r-sm)', objectFit: 'cover' }}
        />
      ) : (
        <LetterMark name={known.name} highlighted />
      )}
      <div style={{ minWidth: 0 }}>
        <div style={{ fontWeight: 600 }}>{known.name}</div>
        <div className="text-dim" style={{ fontSize: 'var(--t-small)' }}>
          {known.tagline}
        </div>
      </div>
      <ConnectStatus state={connecting === w.key ? 'connecting' : w.compatible ? 'ready' : 'incompatible'} />
    </button>
  );
};

const LetterMark = ({
  name,
  muted,
  highlighted,
}: {
  name: string;
  muted?: boolean;
  highlighted?: boolean;
}) => (
  <span
    aria-hidden
    style={{
      width: 40,
      height: 40,
      borderRadius: 'var(--r-sm)',
      display: 'grid',
      placeItems: 'center',
      fontFamily: 'var(--font-display)',
      fontWeight: 600,
      fontSize: 18,
      letterSpacing: '-0.04em',
      fontVariationSettings: "'SOFT' 100, 'opsz' 36",
      color: muted ? 'var(--ink-dim)' : highlighted ? 'var(--catalyst)' : 'var(--ink)',
      background: muted ? 'var(--mid-raise-2)' : 'var(--mid-void)',
      border: highlighted ? '1px solid var(--catalyst)' : '1px solid var(--mid-line-soft)',
    }}
  >
    {name.charAt(0).toLowerCase()}
  </span>
);

const ConnectStatus = ({
  state,
}: {
  state: 'connecting' | 'ready' | 'incompatible';
}) => {
  if (state === 'connecting') {
    return (
      <span
        className="mono"
        style={{
          fontSize: 'var(--t-micro)',
          color: 'var(--catalyst)',
          letterSpacing: '0.08em',
          textTransform: 'uppercase',
        }}
      >
        connecting…
      </span>
    );
  }
  if (state === 'incompatible') {
    return (
      <span
        className="mono"
        style={{
          fontSize: 'var(--t-micro)',
          color: 'var(--alert)',
          letterSpacing: '0.08em',
          textTransform: 'uppercase',
        }}
      >
        version mismatch
      </span>
    );
  }
  return (
    <span
      className="mono"
      style={{
        fontSize: 'var(--t-micro)',
        color: 'var(--ink-soft)',
        letterSpacing: '0.08em',
        textTransform: 'uppercase',
        display: 'inline-flex',
        alignItems: 'center',
        gap: 6,
      }}
    >
      <Check size={11} strokeWidth={2} color="var(--catalyst)" /> connect
    </span>
  );
};
