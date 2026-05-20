'use client';

/*
 * /admin — one-shot browser deploy for both Solvnt contracts via the connected
 * Lace wallet. Writes the resulting addresses to localStorage and renders a
 * .env snippet for the user to paste into solvnt-contracts.json.
 *
 * This page is the browser counterpart to `scripts/deploy.mts`. Pick one path
 * per environment — see `src/lib/midnight/addresses.ts` for the precedence
 * rules.
 */

import { useEffect, useMemo, useState } from 'react';
import { useWallet } from '../../lib/wallet';
import {
  loadAddressesBrowser,
  saveAddressesBrowser,
  clearAddressesBrowser,
  type ContractAddresses,
} from '../../lib/midnight/addresses';
import { midnightConfig, networkLabel } from '../../lib/midnight/config';
import { WalletPicker } from '../../components/WalletPicker';

// Browser deploy is gated behind a runtime-eval indirection because webpack
// 5 chokes on @midnight-ntwrk/ledger-v8's package.json `exports` field
// ("Default condition should be last one") when it tries to trace it through
// static imports. The eval'd dynamic-import is opaque to webpack's analyzer
// so the heavy module graph isn't evaluated at build time. CLI deploy via
// `scripts/deploy.mts` is the well-trodden path; this is the browser
// counterpart for in-demo deploys.
const loadDeployModule = (): Promise<{
  buildBrowserProviders: typeof import('../../lib/midnight/providers').buildBrowserProviders;
  deployAll: typeof import('../../lib/midnight/deploy').deployAll;
  BROWSER_ASSET_PATHS: typeof import('../../lib/midnight/contracts-runtime').BROWSER_ASSET_PATHS;
}> => {
  // eslint-disable-next-line no-new-func
  const dynImport = new Function('p', 'return import(p)') as (p: string) => Promise<unknown>;
  return Promise.all([
    dynImport('../../lib/midnight/providers') as Promise<typeof import('../../lib/midnight/providers')>,
    dynImport('../../lib/midnight/deploy') as Promise<typeof import('../../lib/midnight/deploy')>,
    dynImport('../../lib/midnight/contracts-runtime') as Promise<
      typeof import('../../lib/midnight/contracts-runtime')
    >,
  ]).then(([prov, dep, rt]) => ({
    buildBrowserProviders: prov.buildBrowserProviders,
    deployAll: dep.deployAll,
    BROWSER_ASSET_PATHS: rt.BROWSER_ASSET_PATHS,
  }));
};

type Status =
  | { kind: 'idle' }
  | { kind: 'building' }
  | { kind: 'deploying'; step: 'issuer' | 'range-proof' }
  | { kind: 'done'; addresses: ContractAddresses }
  | { kind: 'error'; message: string };

export default function AdminPage() {
  const wallet = useWallet();
  const [status, setStatus] = useState<Status>({ kind: 'idle' });
  const existing = useMemo(() => loadAddressesBrowser(), []);
  const [showExisting, setShowExisting] = useState<ContractAddresses | null>(existing);

  // Render-only effect: reflect localStorage changes from other tabs.
  useEffect(() => {
    const onStorage = () => setShowExisting(loadAddressesBrowser());
    window.addEventListener('storage', onStorage);
    return () => window.removeEventListener('storage', onStorage);
  }, []);

  const runDeploy = async () => {
    if (!wallet.walletApi) {
      wallet.openPicker();
      return;
    }
    try {
      setStatus({ kind: 'building' });
      const { buildBrowserProviders, deployAll, BROWSER_ASSET_PATHS } =
        await loadDeployModule();
      const providers = await buildBrowserProviders(wallet.walletApi);
      setStatus({ kind: 'deploying', step: 'issuer' });
      // deployAll runs both deploys sequentially; we don't get an intermediate
      // signal between them, so the "step" indicator stays on "issuer" until
      // both complete. Future: split deployAll into per-contract calls.
      const { addresses } = await deployAll(providers, BROWSER_ASSET_PATHS);
      saveAddressesBrowser(addresses);
      setShowExisting(addresses);
      setStatus({ kind: 'done', addresses });
    } catch (e: unknown) {
      setStatus({
        kind: 'error',
        message: e instanceof Error ? e.message : String(e),
      });
    }
  };

  const clear = () => {
    clearAddressesBrowser();
    setShowExisting(null);
    setStatus({ kind: 'idle' });
  };

  return (
    <main className="mx-auto max-w-2xl px-6 py-16 text-[var(--mid-fg)]">
      <WalletPicker
        open={wallet.pickerOpen}
        onDismiss={() => wallet.closePicker()}
        onConnected={(c) => wallet.setConnection(c)}
      />
      <h1 className="text-3xl font-display tracking-tight">Deploy Solvnt contracts</h1>
      <p className="mt-2 text-sm text-[var(--mid-fg-dim)]">
        Network: <span className="text-[var(--mid-fg)]">{networkLabel(midnightConfig.network)}</span> ·
        Lace handles signing; addresses save to this browser.
      </p>

      {showExisting && (
        <section className="mt-10 rounded-lg border border-[var(--mid-line-soft)] bg-[var(--mid-elev-1)] p-5">
          <h2 className="text-sm uppercase tracking-wider text-[var(--mid-fg-dim)]">
            Currently deployed ({showExisting.network})
          </h2>
          <dl className="mt-4 space-y-3 font-mono text-sm">
            <Row label="IssuerRegistry" value={showExisting.issuerRegistry} />
            <Row label="RangeProofVerifier" value={showExisting.rangeProof} />
            <Row label="Deployed" value={new Date(showExisting.deployedAt).toLocaleString()} />
          </dl>
          <button
            onClick={clear}
            className="mt-5 text-xs text-[var(--mid-fg-dim)] underline hover:text-[var(--mid-fg)]"
          >
            Forget these addresses
          </button>
        </section>
      )}

      <section className="mt-10">
        <button
          onClick={runDeploy}
          disabled={status.kind === 'building' || status.kind === 'deploying'}
          className="rounded-md bg-[var(--catalyst)] px-5 py-3 text-sm font-medium text-[var(--mid-void)] transition hover:opacity-90 disabled:opacity-50"
        >
          {wallet.walletApi ? 'Deploy both contracts' : 'Connect wallet first'}
        </button>
        {status.kind === 'building' && (
          <p className="mt-3 text-sm text-[var(--mid-fg-dim)]">Building providers from wallet…</p>
        )}
        {status.kind === 'deploying' && (
          <p className="mt-3 text-sm text-[var(--mid-fg-dim)]">
            Deploying… expect two Lace prompts (one per contract). Don't close the tab.
          </p>
        )}
        {status.kind === 'done' && (
          <p className="mt-3 text-sm text-[var(--vouch)]">
            Deployed. Addresses saved to localStorage.
          </p>
        )}
        {status.kind === 'error' && (
          <p className="mt-3 text-sm text-[var(--mid-warn,#ff7a7a)]">Error: {status.message}</p>
        )}
      </section>

      <section className="mt-12">
        <h2 className="text-sm uppercase tracking-wider text-[var(--mid-fg-dim)]">Prereqs</h2>
        <ol className="mt-4 list-decimal space-y-1 pl-6 text-sm text-[var(--mid-fg-dim)]">
          <li>Local proof server running (Docker on :6300) — or set NEXT_PUBLIC_MIDNIGHT_PROOF_SERVER.</li>
          <li>Wallet has tDUST (convert from tNIGHT at dust.preprod.midnight.network).</li>
          <li>
            Build assets synced to public/ via{' '}
            <code className="rounded bg-[var(--mid-elev-1)] px-1.5 py-0.5">pnpm zk:sync</code>.
          </li>
        </ol>
      </section>
    </main>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-baseline gap-3">
      <dt className="w-44 shrink-0 text-[var(--mid-fg-dim)]">{label}</dt>
      <dd className="break-all">{value}</dd>
    </div>
  );
}
