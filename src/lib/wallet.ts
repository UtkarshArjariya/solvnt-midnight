'use client';

import { create } from 'zustand';
import type { ConnectedAPI } from '@midnight-ntwrk/dapp-connector-api';
import { shortenAddress } from './midnight/wallet';

/*
 * Wallet store — real Midnight DApp Connector. Replaces the prior mock that
 * generated a random pubkey in localStorage. The live `walletApi` reference
 * is held in memory only; on a hard refresh the user reconnects via the
 * WalletPicker.
 *
 * The Lace + 1am picker UI lives in `src/components/WalletPicker.tsx`. This
 * store holds the resolved connection and exposes a `disconnect` action.
 */

export type WalletConnection = {
  address: string;
  coinPublicKey: string;
  walletName: string;
  walletApi: ConnectedAPI;
};

export type WalletState = {
  connected: boolean;
  address: string | null;
  coinPublicKey: string | null;
  walletName: string | null;
  shortAddress: string | null;
  walletApi: ConnectedAPI | null;

  setConnection: (conn: WalletConnection) => void;
  disconnect: () => void;

  pickerOpen: boolean;
  openPicker: () => void;
  closePicker: () => void;
};

export const useWallet = create<WalletState>((set) => ({
  connected: false,
  address: null,
  coinPublicKey: null,
  walletName: null,
  shortAddress: null,
  walletApi: null,
  pickerOpen: false,

  setConnection: ({ address, coinPublicKey, walletName, walletApi }) =>
    set({
      connected: true,
      address,
      coinPublicKey,
      walletName,
      shortAddress: shortenAddress(address),
      walletApi,
      pickerOpen: false,
    }),

  disconnect: () =>
    set({
      connected: false,
      address: null,
      coinPublicKey: null,
      walletName: null,
      shortAddress: null,
      walletApi: null,
    }),

  openPicker: () => set({ pickerOpen: true }),
  closePicker: () => set({ pickerOpen: false }),
}));
