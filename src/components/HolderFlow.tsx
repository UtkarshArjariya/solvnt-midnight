'use client';

import { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { motion, AnimatePresence } from 'motion/react';
import { ArrowRight, Copy, ExternalLink, ShieldCheck } from 'lucide-react';
import QRCode from 'qrcode';

import { useWallet } from '@/lib/wallet';
import { loadAttestations, claimLabel } from '@/lib/attestations';
import { decodeRequest } from '@/lib/encode';
import { proveIncomeAtLeast } from '@/lib/prove';
import { getDemoIssuers, type DemoIssuer } from '@/lib/issuers';
import { appendHistory, fromProof } from '@/lib/history';
import type { Attestation, ProofPackage, VerificationRequest } from '@/lib/schemas';
import { AttestationCard } from './AttestationCard';
import { RequestSummary } from './RequestSummary';
import { ProofGenerating } from './ProofGenerating';
import { DisclosureList } from './DisclosureList';
import { CommitmentReceipt } from './CommitmentReceipt';
import { HistoryList } from './HistoryList';

type Phase =
  | { kind: 'idle' }
  | { kind: 'proving' }
  | { kind: 'sent'; package: ProofPackage }
  | { kind: 'failed'; reason: string };

type RequestState =
  | { kind: 'none' }
  | { kind: 'bad' }
  | { kind: 'expired'; request: VerificationRequest }
  | { kind: 'ok'; request: VerificationRequest };

export const HolderFlow = () => {
  const wallet = useWallet();
  const search = useSearchParams();
  const [attestations, setAttestations] = useState<Attestation[]>([]);
  const [issuers, setIssuers] = useState<DemoIssuer[]>([]);
  const [requestState, setRequestState] = useState<RequestState>({ kind: 'none' });
  const [phase, setPhase] = useState<Phase>({ kind: 'idle' });
  const [selectedIndex, setSelectedIndex] = useState(0);

  const request = requestState.kind === 'ok' ? requestState.request : null;

  useEffect(() => {
    void getDemoIssuers().then(setIssuers);
  }, []);

  useEffect(() => {
    const encoded = search.get('req');
    if (!encoded) {
      setRequestState({ kind: 'none' });
      return;
    }
    const r = decodeRequest(encoded);
    if (!r) {
      setRequestState({ kind: 'bad' });
      return;
    }
    if (Date.parse(r.expiresAt) <= Date.now()) {
      setRequestState({ kind: 'expired', request: r });
      return;
    }
    setRequestState({ kind: 'ok', request: r });
  }, [search]);

  useEffect(() => {
    if (!wallet.address) {
      setAttestations([]);
      return;
    }
    // Real attestations come from on-chain `issuedCommitments` via the
    // indexer once contracts are deployed. Until then, fall through to
    // any locally-cached attestations the holder has been issued.
    // TODO: replace with `indexer.queryContractState(...)` + decryption
    // of the holder's private state via the prover SDK.
    setAttestations(loadAttestations());
  }, [wallet.address]);

  const matchingAttestations = useMemo(() => {
    if (!request) return [];
    return attestations.filter(
      (a) =>
        a.claim.type === request.claimType &&
        a.claim.currency === request.currency &&
        a.claim.value >= request.threshold &&
        Date.parse(a.expiresAt) > Date.now()
    );
  }, [attestations, request]);

  const selected = matchingAttestations[selectedIndex] ?? matchingAttestations[0];

  const generate = async () => {
    if (!request || !selected) return;
    setPhase({ kind: 'proving' });
    const startedAt = Date.now();
    const issuer = issuers.find((i) => i.issuerId === selected.issuerId);
    const result = await proveIncomeAtLeast({
      attestation: selected,
      request,
      issuerLabel: issuer?.label ?? 'unknown issuer',
    });

    const elapsed = Date.now() - startedAt;
    const minDuration = 1800;
    if (elapsed < minDuration) {
      await new Promise((r) => setTimeout(r, minDuration - elapsed));
    }

    if (!result.ok) {
      setPhase({ kind: 'failed', reason: result.error });
      return;
    }

    try {
      const res = await fetch(`/api/proofs/${request.requestId}`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(result.package),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        setPhase({ kind: 'failed', reason: body.error ?? `submit_${res.status}` });
        return;
      }
      const entry = fromProof(result.package, request.verifierLabel ?? null);
      if (entry) appendHistory(entry);
      setPhase({ kind: 'sent', package: result.package });
    } catch (e) {
      setPhase({ kind: 'failed', reason: 'network_error' });
    }
  };

  if (!wallet.connected) {
    return <ConnectHero hasRequest={!!request} request={request} />;
  }

  return (
    <main className="container-narrow" style={{ padding: 'var(--s-7) var(--s-5)' }}>
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
        style={{ display: 'flex', flexDirection: 'column', gap: 'var(--s-6)' }}
      >
        {requestState.kind === 'bad' ? (
          <BadRequestCard />
        ) : requestState.kind === 'expired' ? (
          <ExpiredRequestCard request={requestState.request} />
        ) : request ? (
          <>
            <RequestSummary request={request} />

            <AnimatePresence mode="wait">
              {phase.kind === 'idle' && (
                <motion.section
                  key="idle"
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -8 }}
                  transition={{ duration: 0.22 }}
                  style={{ display: 'flex', flexDirection: 'column', gap: 'var(--s-5)' }}
                >
                  {matchingAttestations.length === 0 ? (
                    <NoMatchCard />
                  ) : (
                    <>
                      <div className="text-soft" style={{ fontSize: 'var(--t-small)' }}>
                        Using this attestation:
                      </div>
                      <AttestationCard
                        attestation={selected!}
                        issuer={issuers.find((i) => i.issuerId === selected!.issuerId)}
                        emphasize
                      />
                      {matchingAttestations.length > 1 ? (
                        <button
                          className="btn btn-ghost"
                          onClick={() =>
                            setSelectedIndex(
                              (i) => (i + 1) % matchingAttestations.length
                            )
                          }
                          style={{ alignSelf: 'flex-start' }}
                        >
                          Use a different attestation
                        </button>
                      ) : null}
                      <DisclosureList request={request} attestation={selected!} />
                      <button className="btn btn-primary" onClick={() => void generate()}>
                        Generate proof
                        <ArrowRight size={16} strokeWidth={2} />
                      </button>
                    </>
                  )}
                </motion.section>
              )}

              {phase.kind === 'proving' && (
                <motion.section
                  key="proving"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.22 }}
                >
                  <ProofGenerating />
                </motion.section>
              )}

              {phase.kind === 'sent' && (
                <ProofSent
                  proof={phase.package}
                  request={request}
                  onAgain={() => setPhase({ kind: 'idle' })}
                />
              )}

              {phase.kind === 'failed' && (
                <motion.section
                  key="failed"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="card"
                  style={{ borderColor: 'var(--alert-soft)' }}
                >
                  <div style={{ color: 'var(--alert)', fontWeight: 600 }}>
                    Couldn't generate proof
                  </div>
                  <div className="mono text-dim" style={{ fontSize: 'var(--t-small)', marginTop: 'var(--s-2)' }}>
                    {phase.reason}
                  </div>
                  <button className="btn btn-ghost" style={{ marginTop: 'var(--s-4)' }} onClick={() => setPhase({ kind: 'idle' })}>
                    Try again
                  </button>
                </motion.section>
              )}
            </AnimatePresence>
          </>
        ) : (
          <NoRequestState attestations={attestations} issuers={issuers} />
        )}
      </motion.div>
    </main>
  );
};

const NoMatchCard = () => (
  <div className="card" style={{ borderColor: 'var(--alert-soft)' }}>
    <div style={{ color: 'var(--alert)', fontWeight: 600 }}>No matching attestation</div>
    <p className="text-soft" style={{ marginTop: 'var(--s-2)', fontSize: 'var(--t-small)' }}>
      None of your attestations meet this verifier's request. Ask an issuer to issue a
      new one, or use a different identity.
    </p>
  </div>
);

const BadRequestCard = () => (
  <div className="card" role="alert" style={{ borderColor: 'var(--alert-soft)' }}>
    <div style={{ color: 'var(--alert)', fontWeight: 600 }}>Couldn't read this request</div>
    <p className="text-soft" style={{ marginTop: 'var(--s-2)', fontSize: 'var(--t-small)' }}>
      The verifier link looks malformed. Ask the verifier for a fresh request, or open the
      Solvnt verifier yourself.
    </p>
    <Link href="/verify" className="btn btn-ghost" style={{ marginTop: 'var(--s-4)', alignSelf: 'flex-start' }}>
      Open verifier
    </Link>
  </div>
);

const ExpiredRequestCard = ({ request }: { request: VerificationRequest }) => (
  <div className="card" role="alert" style={{ borderColor: 'var(--alert-soft)' }}>
    <div style={{ color: 'var(--alert)', fontWeight: 600 }}>Request expired</div>
    <p className="text-soft" style={{ marginTop: 'var(--s-2)', fontSize: 'var(--t-small)' }}>
      This verifier request expired at{' '}
      <span className="mono">{new Date(request.expiresAt).toLocaleString()}</span>. Ask the
      verifier to issue a new one.
    </p>
  </div>
);

const NoRequestState = ({
  attestations,
  issuers,
}: {
  attestations: Attestation[];
  issuers: DemoIssuer[];
}) => {
  if (attestations.length === 0) {
    return (
      <div className="card" style={{ textAlign: 'center' }}>
        <ShieldCheck size={28} strokeWidth={1.5} color="var(--catalyst)" />
        <h2 style={{ marginTop: 'var(--s-3)', fontSize: 'var(--t-h1)' }}>
          You're connected.
        </h2>
        <p className="text-soft" style={{ marginTop: 'var(--s-2)' }}>
          Seeding three demo attestations from mock issuers…
        </p>
      </div>
    );
  }

  return (
    <>
      <div>
        <div
          style={{
            fontFamily: 'var(--font-display)',
            fontSize: 'var(--t-display)',
            lineHeight: 'var(--lh-tight)',
            letterSpacing: '-0.02em',
            fontVariationSettings: "'SOFT' 100, 'opsz' 144",
          }}
        >
          Your attestations
        </div>
        <p className="text-soft" style={{ marginTop: 'var(--s-2)' }}>
          Signed by registered issuers. Generate a proof when a verifier asks for one.
        </p>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--s-4)' }}>
        {attestations.map((a) => (
          <AttestationCard
            key={a.nonce}
            attestation={a}
            issuer={issuers.find((i) => i.issuerId === a.issuerId)}
          />
        ))}
      </div>
      <HistoryList />
      <div
        className="card-flat"
        style={{
          textAlign: 'center',
          padding: 'var(--s-5)',
        }}
      >
        <div className="text-soft" style={{ fontSize: 'var(--t-small)' }}>
          Looking to verify someone's income?
        </div>
        <Link
          href="/verify"
          className="btn btn-ghost"
          style={{ marginTop: 'var(--s-3)' }}
        >
          Open the verifier
          <ArrowRight size={16} strokeWidth={2} />
        </Link>
      </div>
    </>
  );
};

const ProofSent = ({
  proof,
  request,
  onAgain,
}: {
  proof: ProofPackage;
  request: VerificationRequest;
  onAgain: () => void;
}) => {
  const [qr, setQr] = useState<string | null>(null);
  const shareUrl =
    typeof window !== 'undefined'
      ? `${window.location.origin}/verify/${request.requestId}`
      : `/verify/${request.requestId}`;

  useEffect(() => {
    QRCode.toDataURL(shareUrl, {
      margin: 1,
      width: 220,
      color: { dark: '#ECEEFD', light: '#0D112900' },
    })
      .then(setQr)
      .catch(() => {});
  }, [shareUrl]);

  return (
    <motion.section
      key="sent"
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.28 }}
      style={{ display: 'flex', flexDirection: 'column', gap: 'var(--s-6)' }}
    >
      <CommitmentReceipt proof={proof} request={request} />
      <section
        aria-label="Share with verifier"
        className="card-flat"
        style={{
          display: 'flex',
          gap: 'var(--s-4)',
          alignItems: 'flex-start',
          flexWrap: 'wrap',
        }}
      >
        <div
          style={{
            padding: 'var(--s-3)',
            background: 'var(--mid-void)',
            borderRadius: 'var(--r-md)',
            border: '1px solid var(--mid-line-soft)',
            flexShrink: 0,
          }}
        >
          {qr ? (
            <img src={qr} alt="Verifier link QR" width={130} height={130} />
          ) : (
            <div style={{ width: 130, height: 130, background: 'var(--mid-base)' }} />
          )}
        </div>
        <div
          style={{
            flex: '1 1 220px',
            minWidth: 0,
            display: 'flex',
            flexDirection: 'column',
            gap: 'var(--s-2)',
          }}
        >
          <span
            className="mono"
            style={{
              fontSize: 'var(--t-micro)',
              textTransform: 'uppercase',
              letterSpacing: '0.08em',
              color: 'var(--ink-dim)',
            }}
          >
            share with the verifier
          </span>
          <div className="mono" style={{ wordBreak: 'break-all', fontSize: 'var(--t-small)' }}>
            {shareUrl}
          </div>
          <div style={{ display: 'flex', gap: 'var(--s-2)', flexWrap: 'wrap' }}>
            <button
              className="btn btn-ghost"
              style={{ height: 36, fontSize: 'var(--t-small)', padding: '0 12px' }}
              onClick={() => void navigator.clipboard.writeText(shareUrl)}
            >
              <Copy size={14} strokeWidth={1.5} /> Copy link
            </button>
            <a
              className="btn btn-ghost"
              style={{ height: 36, fontSize: 'var(--t-small)', padding: '0 12px' }}
              href={shareUrl}
              target="_blank"
              rel="noreferrer"
            >
              <ExternalLink size={14} strokeWidth={1.5} /> Open seal
            </a>
          </div>
        </div>
      </section>
      <div style={{ alignSelf: 'center' }}>
        <button className="btn btn-ghost" onClick={onAgain}>
          Generate another
        </button>
      </div>
    </motion.section>
  );
};

const ConnectHero = ({
  hasRequest,
  request,
}: {
  hasRequest: boolean;
  request: VerificationRequest | null;
}) => {
  const wallet = useWallet();
  return (
    <main className="container-narrow" style={{ padding: 'var(--s-9) var(--s-5)' }}>
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
        style={{ display: 'flex', flexDirection: 'column', gap: 'var(--s-5)' }}
      >
        <span className="chip">A privacy-native verification protocol</span>
        <h1 style={{ fontSize: 'var(--t-hero)', lineHeight: 'var(--lh-tight)', margin: 0 }}>
          Your income,<br />
          <em style={{ color: 'var(--catalyst)', fontStyle: 'italic', fontVariationSettings: "'SOFT' 100, 'opsz' 144" }}>
            proven.
          </em>{' '}
          Not shared.
        </h1>
        <p className="text-soft" style={{ fontSize: 'var(--t-h3)', maxWidth: 460 }}>
          Generate a proof that you meet a financial threshold. The verifier learns one
          bit. Nothing else leaves your device.
        </p>
        {hasRequest && request ? (
          <div className="card-flat" style={{ borderColor: 'rgba(124, 245, 201, 0.2)' }}>
            <span className="chip chip-catalyst" style={{ marginBottom: 'var(--s-3)' }}>
              A verifier is waiting
            </span>
            <p className="text-soft">Connect to review and sign their request.</p>
          </div>
        ) : null}
        <button
          className="btn btn-primary"
          onClick={() => wallet.openPicker()}
          style={{ alignSelf: 'flex-start', height: 52, padding: '0 28px', fontSize: 'var(--t-body)' }}
        >
          Connect Midnight wallet
          <ArrowRight size={18} strokeWidth={2} />
        </button>
        <div className="text-dim mono" style={{ fontSize: 'var(--t-micro)' }}>
          Lace or 1am · Midnight DApp Connector required
        </div>

        <HowItWorksRibbon />
      </motion.div>
    </main>
  );
};

const HowItWorksRibbon = () => (
  <section
    aria-label="How it works"
    style={{
      marginTop: 'var(--s-7)',
      paddingTop: 'var(--s-6)',
      borderTop: '1px solid var(--mid-line-soft)',
    }}
  >
    <div
      className="mono"
      style={{
        fontSize: 'var(--t-micro)',
        letterSpacing: '0.16em',
        textTransform: 'uppercase',
        color: 'var(--ink-dim)',
        marginBottom: 'var(--s-6)',
      }}
    >
      how it works
    </div>
    <ol
      style={{
        listStyle: 'none',
        padding: 0,
        margin: 0,
        display: 'flex',
        flexDirection: 'column',
        gap: 'var(--s-5)',
      }}
    >
      {[
        {
          n: '01/',
          title: 'Issuer signs',
          detail:
            'A bank, payroll provider, or exchange signs a claim about you and publishes only its commitment hash on-chain.',
        },
        {
          n: '02/',
          title: 'You prove',
          detail:
            'On your device, a zero-knowledge proof of "≥ threshold" is generated locally. The underlying value never leaves.',
        },
        {
          n: '03/',
          title: 'Verifier checks',
          detail:
            'They learn one bit and a scope-bound nullifier. No value, no employer, no wallet history.',
        },
      ].map((step) => (
        <li
          key={step.n}
          style={{
            display: 'grid',
            gridTemplateColumns: '52px 1fr',
            columnGap: 'var(--s-4)',
            alignItems: 'baseline',
          }}
        >
          <span
            className="mono"
            style={{
              fontSize: 12,
              color: 'var(--catalyst)',
              letterSpacing: '0.04em',
              alignSelf: 'baseline',
              opacity: 0.9,
            }}
          >
            {step.n}
          </span>
          <div>
            <div
              style={{
                fontFamily: 'var(--font-display)',
                fontSize: 'var(--t-h3)',
                fontWeight: 500,
                letterSpacing: '-0.01em',
                fontVariationSettings: "'SOFT' 80, 'opsz' 36",
                marginBottom: 'var(--s-2)',
              }}
            >
              {step.title}
            </div>
            <p
              className="text-soft"
              style={{ fontSize: 'var(--t-small)', margin: 0, maxWidth: 460 }}
            >
              {step.detail}
            </p>
          </div>
        </li>
      ))}
    </ol>
  </section>
);
