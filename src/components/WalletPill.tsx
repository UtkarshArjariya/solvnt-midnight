'use client';

import { LogOut, Wallet } from 'lucide-react';
import { useWallet } from '@/lib/wallet';
import { WalletPicker } from './WalletPicker';
import { expectedNetworkLabel } from '@/lib/midnight/wallet';

/*
 * TopBar wallet pill — opens the WalletPicker modal on click. Shows the
 * target network label + truncated address when connected.
 */

export const WalletPill = () => {
  const {
    connected,
    shortAddress,
    walletName,
    pickerOpen,
    openPicker,
    closePicker,
    setConnection,
    disconnect,
  } = useWallet();

  if (!connected) {
    return (
      <>
        <button className="btn btn-ghost" onClick={() => openPicker()}>
          <Wallet size={16} strokeWidth={1.5} />
          Connect wallet
        </button>
        <WalletPicker
          open={pickerOpen}
          onDismiss={() => closePicker()}
          onConnected={(c) => setConnection(c)}
        />
      </>
    );
  }

  return (
    <div className="flex items-center" style={{ gap: 'var(--s-2)' }}>
      <span
        className="mono"
        style={{
          fontSize: 11,
          color: 'var(--ink-dim)',
          letterSpacing: '0.08em',
          textTransform: 'uppercase',
          paddingRight: 6,
        }}
      >
        {expectedNetworkLabel()}
      </span>
      <span
        className="chip chip-catalyst mono"
        title={walletName ? `${walletName} — ${shortAddress}` : shortAddress ?? ''}
      >
        {shortAddress}
      </span>
      <button
        className="btn btn-ghost"
        onClick={() => disconnect()}
        title="Disconnect"
        aria-label="Disconnect wallet"
        style={{ padding: '0 12px' }}
      >
        <LogOut size={16} strokeWidth={1.5} />
      </button>
    </div>
  );
};
