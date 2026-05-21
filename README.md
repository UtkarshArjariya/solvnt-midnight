# solvnt●

**Prove the number. Keep the value.**

A privacy-native verification primitive for income, balance, and asset holdings. The holder generates a zero-knowledge attestation on-device. The verifier learns exactly one bit: *threshold met.* Nothing else crosses the wire.

Built on **Midnight**. Compact circuits, Halo2 + KZG proofs, ed25519-signed issuer attestations. The web demo runs the holder and verifier flows end-to-end in under four seconds.

```
   ┌──────────────┐    1. attest       ┌──────────┐
   │   Issuer     │ ─────────────────▶ │          │     ┌───────────────────────┐
   │   payroll    │   ed25519 sig      │    on    │ ──▶ │ IssuerRegistry        │
   │   bank       │                    │   chain  │     │   pubkey ↦ label      │
   │   exchange   │                    │          │ ◀── │ RangeProofVerifier    │
   └──────┬───────┘                    └──────────┘     │   {commitments}       │
          │                                  ▲          │   {nullifiers}        │
          │ 2. attestation                   │          └───────────────────────┘
          ▼                                  │
   ┌──────────────┐    3. prove        ┌─────┴────┐
   │   Holder     │ ─────────────────▶ │ Verifier │
   │  on-device   │     value ≥ T      │  one bit │
   └──────────────┘                    └──────────┘
```

---

## Quickstart

```bash
pnpm install
pnpm dev
```

Open `http://localhost:3000/verify`. Create a request — the default *(monthly income ≥ ₹80,000, INR)* matches the demo persona. Use **Open on this device** to drop into the holder app with the request pre-loaded.

Connect the mock wallet. Four signed attestations seed on first connect: monthly income, annual income, balance snapshot, Cardano ADA holdings. Review the **disclosed / private** redaction panel — explicit about what the proof reveals and what it withholds. Tap **Generate proof**.

A ~1.8 s narrated moment plays (`building witness · committing inputs · generating constraints · constructing proof`). The verifier's tab flips to a typographic seal showing only `monthly income ≥ ₹80,000`, the issuer label, the nullifier, and the expiry.

```bash
pnpm smoke           # INR income end-to-end
pnpm smoke:ada       # Cardano ADA holdings end-to-end
pnpm smoke:all
pnpm typecheck
pnpm build
```

---

## Deploy

Two paths. Pick one per environment.

### Browser — `/admin`

```text
funded Lace wallet (preprod tDUST)
  → pnpm dev
  → http://localhost:3000/admin
  → Connect wallet
  → Deploy both contracts        (approve two Lace prompts)
  → addresses saved to localStorage
  → /issuer  register demo issuers + publish sample commitment
  → /        generate proof
```

### CLI — `pnpm deploy`

```bash
# generate a fresh 32-byte seed (keep it; fund the derived wallet with tDUST)
DEPLOY_SEED=$(node -e "console.log(require('crypto').randomBytes(32).toString('hex'))") \
pnpm deploy
```

Writes `solvnt-contracts.json` with both contract addresses. The app reads the file server-side; browser `localStorage` wins client-side if both exist.

Either path needs a reachable proof server. Default is local Docker on `:6300`. Override with `NEXT_PUBLIC_MIDNIGHT_PROOF_SERVER` for a hosted endpoint.

---

## What the verifier learns

The public-input shape is the contract. Anything not listed here is private by construction.

| Field                | Source                  | Verifier sees |
| -------------------- | ----------------------- | ------------- |
| `value ≥ threshold`  | the proof               | yes           |
| `threshold`          | verifier-set            | yes           |
| `claimType`          | request                 | yes           |
| `currency`           | request                 | yes           |
| `expiresAt`          | attestation             | yes           |
| `issuerLabel`        | registered issuer       | yes           |
| `nullifier`          | scoped derivation       | yes (scoped)  |
| `value`              | attestation             | **no**        |
| holder wallet        | session                 | **no**        |
| issuer signature     | attestation             | **no**        |
| other attestations   | holder storage          | **no**        |

The nullifier is `hash(holderSecret, verifierId, claimType, issuerId, domain)` — unlinkable across verifiers. Replay within the same verifier is detectable; cross-verifier linkage is not possible without colluding with the holder.

`ProofPackage.publicInputs` in `src/lib/schemas.ts` is the on-the-wire schema.

---

## Architecture

```
src/
├── app/
│   ├── page.tsx                        holder flow
│   ├── verify/                         verifier — create + wait
│   ├── admin/                          browser deploy
│   ├── issuer/                         register + publish commitments
│   └── api/                            requests · proofs · cardano-snapshot
├── components/
│   ├── HolderFlow.tsx                  wallet, attestations, generation
│   ├── ProofGenerating.tsx             narrated proving moment
│   ├── TypographicSeal.tsx             verifier reveal · guilloché rosette
│   ├── CommitmentReceipt.tsx           holder's typographic artifact
│   └── …                               disclosure list, status pill, top bar
└── lib/
    ├── schemas.ts                      zod — Attestation, Request, ProofPackage
    ├── crypto.ts                       ed25519 · persistentHash · nullifiers
    ├── commitments.ts                  off-chain mirror of in-circuit hashes
    ├── prove.ts                        on-chain branch + mock fallback
    ├── verify.ts                       verifier check — mode-independent
    ├── cardano.ts                      blockfrost client, inert without env
    └── midnight/
        ├── addresses.ts                { issuerRegistry, rangeProof, network }
        ├── circuit.ts                  callRegisterIssuer · Issue · Prove
        ├── providers.ts                browser providers from Lace
        ├── deploy.ts                   deployAll for /admin
        └── contracts-runtime.ts        CompiledContract.make + withWitnesses

contracts/
├── issuer-registry.compact             FR-1 — pubkey ↦ label registry
├── range-proof.compact                 FR-3 — commitments + range circuit
└── witnesses.ts                        TS witness implementations

scripts/
├── deploy.mts                          CLI deploy (seed wallet)
├── smoke.mts · smoke-ada.mts           end-to-end checks
└── copy-zk-assets.mts                  sync ZK assets into /public
```

---

## Contracts

```text
issuer-registry.compact
  registerIssuer(issuerId, pubkey, label)         ledger-public, set-once
  isRegistered(issuerId) → bool                   read-only

range-proof.compact
  issueAttestation(issuerId, commitment)          gated to registered issuer
  proveIncomeAtLeast(issuerId, threshold,         private value witness;
                     claimType, verifierId)         emits a scoped nullifier
```

Off-chain commitment derivation lives in `src/lib/commitments.ts` and must match the in-circuit `persistentHash<Vector<N, Bytes<32>>>` byte-for-byte. Change one, change the other.

```bash
pnpm contracts:compile     # compact compile +0.31.0 contracts/*.compact → build/contracts/
pnpm zk:sync               # mirror ZK assets into public/
```

---

## Demo ↔ real

Both modes emit identical public inputs. `lib/verify.ts` is unchanged between them.

| Demo today                                 | Real on-chain                                              |
| ------------------------------------------ | ---------------------------------------------------------- |
| Issuer keys from fixed seeds               | Pubkeys registered in `IssuerRegistry`                     |
| Attestation = ed25519 over stable JSON     | Issuer publishes commitment to `RangeProofVerifier`        |
| Proof = `sha256(payload)` placeholder      | Halo2 / KZG proof (~5 KB)                                  |
| Verifier checks public inputs in JS        | Verifier reads chain state + nullifier set                 |
| In-memory `lib/store.ts`                   | Off-chain coordination service                             |
| Cardano balance is a seeded fixture        | `lib/cardano.ts` against Blockfrost via env                |

Set `BLOCKFROST_PROJECT_ID_PREPROD` in `.env.local` to wire real ADA snapshots.

---

## Stack

- **Compact 0.23** — Midnight circuits + ledger contracts, compiled via `compactc 0.31.0`.
- **midnight-js 4.0.4** — proof generation glue; Lace DApp Connector v4.
- **Next.js 14 App Router** — holder and verifier are routes, not separate apps.
- **TypeScript strict** — no `any`, no `@ts-ignore` without a one-line reason.
- **Zod** — every untrusted boundary.
- **Zustand** — wallet + addresses store.
- **Motion** — used only on the proving moment.

Webpack interop note: `@midnight-ntwrk/ledger-v8` ships an `exports` field that defeats Next's static analyzer. Heavy SDK modules are loaded through `new Function('p', 'return import(p)')` from `/admin`, `/issuer`, and `prove.ts`.

---

## Privacy posture (NFR-P1)

The verifier learns exactly: `value ≥ threshold`, the threshold itself, the request scaffolding (`claimType`, `currency`, `expiresAt`), the `issuerLabel`, and a verifier-scoped `nullifier`.

The verifier never sees: the `value`, the holder's wallet, the issuer's signature, the attestation period, the holder's other attestations, or anything outside the public-input schema.

The privacy thesis is load-bearing. If a change would simplify the protocol by exposing the underlying value, stop and re-read `requirements.md` §2.3 before continuing.

---

## Brand

*Nocturnal laboratory.* Linear, Vercel, Stripe Press — not OpenSea.

- **Fraunces** display · **Switzer** body · **JetBrains Mono** for hashes.
- Catalyst Cyan only on proof-active states. Vouch Gold only on verified seals.
- All color from `--mid-*` / `--catalyst*` / `--vouch*` variables in `docs/tokens.css`. No hex in JSX.
- No emoji in product copy. The product is fintech, not a game.
- The wordmark is `solvnt●`. The dot is the only consistently-cyan element on most screens.

Full guide: `docs/brand.md`.

---

## Deferred

- Issuer rotation + governance for the registry.
- Holder-side Cardano address picker (real snapshot UI).
- `solvnt-issuer` CLI for production issuer flows.
- Light-mode parity (dark is primary; light is a stretch).

---

## License

Hackathon code. Treat checked-in keys as throwaway.
