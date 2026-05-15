# solvnt

> Your income, proven. Not shared.

A privacy-native verification primitive: prove a financial threshold without revealing the underlying value. Web demo of the holder + verifier flows, plus Compact smart contracts for the on-chain anchor.

## 5-minute tour

```bash
pnpm install
pnpm dev
```

Open [http://localhost:3000/verify](http://localhost:3000/verify). Create a request — the default ("monthly income ≥ ₹80,000, INR, Bandra apartment listing") matches the demo persona. You get a `/verify/<id>` page with a QR code, polling, and a live status pill.

Open the QR target (or click "Open on this device") — that drops you into the holder app with the request pre-loaded.

Connect the (mock) wallet. Four signed attestations seed on first connect: monthly income, annual income, balance snapshot, and a Cardano ADA holdings attestation. Review the **DISCLOSED / PRIVATE** redaction list — explicit about what the proof will reveal vs hold back. Tap **Generate proof**.

A four-line typographic narration plays for ~1.8s (`building witness · committing inputs · generating constraints · constructing proof`) under a Fraunces *proving.* italic, which transitions to *proved.* when finished. You receive a **commitment receipt** — your personal artifact of the proof. The verifier's page simultaneously flips to a typographic seal with a hash-derived guilloché rosette behind it, showing only `monthly income ≥ ₹80,000`, the issuer label, the nullifier, and the expiry.

That's the whole pitch.

```bash
pnpm smoke         # end-to-end: create → prove → submit → read (INR income)
pnpm smoke:ada     # same flow with the Cardano ADA attestation
pnpm smoke:all     # both
pnpm typecheck
pnpm build
```

## What's in here

```
src/
├── app/
│   ├── page.tsx                      # holder flow
│   ├── verify/page.tsx               # landlord — create a request
│   ├── verify/[id]/page.tsx          # hosted verifier — waits for proof
│   └── api/
│       ├── requests/route.ts         # POST create
│       ├── requests/[id]/route.ts    # GET fetch
│       └── proofs/[id]/route.ts      # POST submit, GET poll
├── components/
│   ├── HolderFlow.tsx                # the priya flow
│   ├── VerifierForm.tsx              # landlord — with live JSON preview
│   ├── VerifierWaiting.tsx           # QR + LiveStatusPill + TypographicSeal
│   ├── ProofGenerating.tsx           # narrated proving moment (proving → proved.)
│   ├── CommitmentReceipt.tsx         # holder's typographic artifact
│   ├── TypographicSeal.tsx           # verifier's reveal with guilloché rosette
│   ├── LiveStatusPill.tsx            # · live · polled Ns ago · expires Nm ·
│   ├── DisclosureList.tsx            # three-zone Asserts/Reveals/Conceals
│   ├── HistoryList.tsx               # past proofs (holder-only audit log)
│   ├── AttestationCard.tsx
│   ├── RequestSummary.tsx
│   ├── Wordmark.tsx                  # solvnt●
│   ├── TopBar.tsx
│   ├── WalletPill.tsx
│   └── Footer.tsx
└── lib/
    ├── schemas.ts                    # Zod: Attestation, VerificationRequest, ProofPackage
    ├── crypto.ts                     # ed25519 sign/verify, hash, commitments, nullifiers
    ├── prove.ts                      # the prover (mocks the Compact circuit constraints)
    ├── verify.ts                     # the verifier-side check
    ├── encode.ts                     # request encode/decode for QR payloads
    ├── issuers.ts                    # demo issuer registry (deterministic keys)
    ├── cardano.ts                    # zero-dep Blockfrost client (inert without env)
    ├── seed.ts                       # signs the demo attestations on first connect
    ├── history.ts                    # holder-side localStorage audit log
    ├── wallet.ts                     # zustand store, mock wallet
    ├── attestations.ts               # localStorage CRUD + display helpers
    └── store.ts                      # in-memory server store for requests + proofs
contracts/
├── issuer-registry.compact           # FR-1: issuer pubkey registry
├── range-proof.compact               # FR-3: commitment publishing + range circuit
├── witnesses.ts                      # TS implementations of the Compact witnesses
└── README.md                         # toolchain + UNVERIFIED-line verification flow
scripts/
├── smoke.mts                         # INR income end-to-end check
└── smoke-ada.mts                     # ADA holdings end-to-end check
notes/
└── 2026-05-18-research-round-1.md       # condensed agent research outputs
docs/
├── prd.md, requirements.md
└── brand.md, tokens.css
public/favicon.svg
PROGRESS.md                           # running log of the 8-hour build stretch
claude.md
```

## How the demo flow maps to the real protocol

| Demo (today)                                              | Real (when Compact toolchain is wired up)                                                |
|-----------------------------------------------------------|------------------------------------------------------------------------------------------|
| Issuer keys derived from fixed seeds in `lib/issuers.ts`  | Pubkeys registered on the `IssuerRegistry` Compact contract                              |
| ed25519 signature over a stable JSON encoding             | Issuer publishes attestation commitment to the `RangeProofVerifier`'s per-issuer map     |
| `proof` field is `sha256(payload)` placeholder            | Real Halo2/KZG proof bytes from the Midnight prover (~5KB)                               |
| Verifier checks public inputs in JS                       | Verifier calls Midnight verifier WASM on the proof bytes (~6ms)                          |
| In-memory server `lib/store.ts`                           | Off-chain coordination service (Solvnt API)                                              |
| Cardano `balance.cardano.ada` is a seeded mock            | `lib/cardano.ts` wired to Blockfrost via `BLOCKFROST_PROJECT_ID_*` env                   |

The **public-input shape is the same** in both modes. `lib/verify.ts` won't change when the real prover is dropped in.

## Compact contracts

Two contracts in `contracts/`. Every line of stdlib API surface was audited against `OpenZeppelin/compact-contracts` and `midnightntwrk/example-bboard` for the right shape, but the final word goes to the Midnight MCP server:

```bash
claude mcp add midnight -- npx -y midnight-mcp@latest
# then in this session:
#   midnight-search-compact "Map.insert" "persistentHash" "blockTimeLt"
#   midnight-compile-contract contracts/issuer-registry.compact
#   midnight-compile-contract contracts/range-proof.compact
```

The `blockTimeLt` primitive is the one piece we couldn't independently verify from open-source examples — confirm before deploy.

## Privacy posture (NFR-P1)

The verifier learns exactly:

- `value ≥ threshold` (true/false — this is the proof)
- `threshold` (they set it)
- `claimType`, `currency`, `expiresAt` (request scaffolding)
- `issuerLabel` (which registered issuer signed it)
- `nullifier` (verifier+claim+issuer-scoped; unlinkable across verifiers)

The verifier never sees: the `value`, the holder's wallet, the issuer's signature, the attestation period, the holder's other attestations, or anything else.

`proof package → publicInputs` in `lib/schemas.ts` is the contract.

## Brand discipline

- All colors come from `--mid-*` / `--catalyst*` / `--vouch*` CSS variables (`src/app/globals.css`, mirrored from `docs/tokens.css`). No hex in JSX.
- Fonts: **Fraunces** display, **Switzer** body, **JetBrains Mono** for hashes/addresses.
- Catalyst cyan only on proof-active states and primary CTAs. Vouch gold only on verified seals + holder receipts.
- Voice: short sentences, specific numbers, no "seamless," no "revolutionary," no emoji in product copy.

See `docs/brand.md` for the full guide; `notes/2026-05-18-research-round-1.md` for the design-reference teardown that drove the latest components.

## Cardano (stretch)

The 4th seeded attestation is a `balance.cardano.ada` for 1500 ADA, signed by a mock Cardano Snapshot Issuer. To wire real Blockfrost data, set `BLOCKFROST_PROJECT_ID_PREPROD` (or mainnet) in `.env.local` — `lib/cardano.ts` is a zero-dep client ready to call.

## What's deferred

- Live Blockfrost wiring + holder UI for snapshotting their own address.
- `solvnt-issuer` CLI for real issuer-side flows (current demo signs attestations inline).
- Real Compact compilation + deploy (write `notes/` and `contracts/README.md` once MCP is connected).
- Issuer rotation / governance for the `IssuerRegistry`.

## License

Hackathon code. Treat the checked-in keys as throwaway.
