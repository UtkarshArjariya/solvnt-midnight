# Solvnt — Technical Requirements

**Companion to:** `prd.md`
**Scope:** Hackathon MVP and immediate post-hackathon extensions.

This document specifies the *what* and *how-tested*. The *why* is in the PRD; the *system shape* is in `architecture.html`.

---

## 1. Functional Requirements

Identifiers prefixed `FR-` are MVP-blocking. `FR+` are stretch.

### 1.1 Issuer Registry Contract

- **FR-1.1** A Compact contract `IssuerRegistry` MUST allow registration of an issuer public key with a human-readable label (e.g., `"mock-payroll-v1"`).
- **FR-1.2** The contract MUST expose a `getIssuer(id) → pubkey` view function.
- **FR-1.3** The contract MUST emit an event on registration containing `{issuerId, label, registeredAt}`.
- **FR-1.4** Registration MUST be permissionless for the hackathon (any wallet can register an issuer). Post-hackathon: governance-gated.
- **FR+1.5** The contract MUST support revocation of an issuer (`revokeIssuer(id)`) — stretch.

### 1.2 Attestation Schema

An attestation is a signed JSON object produced off-chain by an issuer. Shape:

```json
{
  "v": 1,
  "issuerId": "0x4a9c…",
  "subject": "0x71fb…",           // holder's Midnight wallet pubkey hash
  "claim": {
    "type": "income.monthly",     // or "balance.snapshot", "income.annual"
    "value": 95000,                // the actual private value (INR for income)
    "currency": "INR",
    "period": {
      "from": "2025-11-01",
      "to": "2026-04-30"
    }
  },
  "nonce": "0xa1b2c3…",
  "issuedAt": "2026-05-18T08:00:00Z",
  "expiresAt": "2026-06-17T08:00:00Z",
  "signature": "0x…"               // issuer's signature over the above
}
```

- **FR-2.1** Attestations MUST be signed by an issuer's registered key.
- **FR-2.2** Attestations MUST include `expiresAt`. Default validity: 30 days.
- **FR-2.3** The `value` field is *private* and never appears in the proof's public inputs.
- **FR-2.4** A nonce field MUST be present to prevent replay across proofs.
- **FR-2.5** Attestations MUST be stored client-side (holder's device). The server stores nothing.

### 1.3 Range-Proof Circuit

- **FR-3.1** A Compact circuit `proveIncomeAtLeast` MUST take:
  - **Private inputs:** `value`, `issuerSignature`, `nonce`
  - **Public inputs:** `threshold`, `issuerPubkey`, `claimType`, `currency`, `expiresAt`
  - **Output:** a proof that `value ≥ threshold` AND `issuerSignature` is valid for `(value, …)` AND `expiresAt > now`.
- **FR-3.2** Proof generation MUST complete in ≤ 4 seconds on commodity hardware (M-series MacBook, modern x86 laptop).
- **FR-3.3** Proof verification MUST complete in ≤ 200 ms.
- **FR-3.4** The circuit MUST NOT leak `value` through public inputs or proof size.
- **FR+3.5** A second circuit `proveBalanceAtLeast` MUST exist for asset holdings — stretch.

### 1.4 Holder application

- **FR-4.1** Single Next.js page at `/`.
- **FR-4.2** MUST support wallet connection via the Midnight wallet (MeshJS integration).
- **FR-4.3** MUST display a list of attestations stored in `localStorage` after connection.
- **FR-4.4** MUST support a "Generate Proof" action that takes a verifier request and a selected attestation, outputs a proof package.
- **FR-4.5** The proof package MUST be shareable as (a) a QR code, (b) a copyable URL of the form `https://verify.solvnt.app/p/<id>`.
- **FR-4.6** MUST work on mobile browsers (iOS Safari, Android Chrome) at least to the level of displaying a QR code.
- **FR-4.7** MUST never display the words "circuit," "witness," "zero-knowledge," or "ZK" in the user-visible UI.

### 1.5 Verifier component

- **FR-5.1** A React component `<SolventVerifier />` MUST be publishable to npm as `@solvnt/verifier`.
- **FR-5.2** Required props: `request: { threshold: number, currency: string, claimType: string }`, `onVerified: (result) => void`.
- **FR-5.3** The component MUST render a QR code containing the verification request.
- **FR-5.4** The component MUST poll (or listen) for proof submission and verify it client-side via a call to the Midnight verifier WASM.
- **FR-5.5** On verification success, the component MUST call `onVerified` with `{ verified: true, claimType, threshold, currency, issuerLabel, attestationExpiresAt }`. No other fields.
- **FR-5.6** On verification failure, the component MUST call `onVerified` with `{ verified: false, reason }`.

### 1.6 Hosted verifier page

- **FR-6.1** A page at `https://verify.solvnt.app/<request-id>` MUST render a verifier widget for non-technical verifiers.
- **FR-6.2** Verifiers MUST be able to create a request via a simple form (threshold + claim type + currency) without an account.
- **FR-6.3** The result MUST be displayed within 1 second of proof submission.

### 1.7 Mock issuer

- **FR-7.1** A CLI tool `solvnt-issuer` MUST exist with subcommands:
  - `register --label <name>` → registers a new issuer key on local Midnight.
  - `issue --to <wallet> --value <n> --type income.monthly` → produces a signed attestation JSON.
- **FR-7.2** The CLI MUST work against the Midnight local-dev network.
- **FR-7.3** Fixture data MUST exist for at least 3 demo attestations spanning low/mid/high income.

### 1.8 Cardano interop (stretch)

- **FR+8.1** A witness function MUST be able to fetch an ADA balance for a given Cardano address.
- **FR+8.2** The balance MUST be includable as a second attestation type (`balance.cardano.ada`).

---

## 2. Non-Functional Requirements

### 2.1 Performance

| Metric                              | Target          | Hard limit                 |
|-------------------------------------|-----------------|----------------------------|
| Proof generation (laptop)           | ≤ 3s            | 5s                         |
| Proof verification                  | ≤ 200ms         | 500ms                      |
| Initial holder app load (cold)      | ≤ 2s            | 4s                         |
| Verifier component first paint      | ≤ 500ms         | 1s                         |
| Wallet connection round-trip        | ≤ 1s            | 2s                         |

### 2.2 Security

- **NFR-S1** Private keys (issuer signing, holder wallet) MUST never be transmitted off the device that holds them.
- **NFR-S2** Attestations stored client-side MUST be encrypted with a key derived from the holder's wallet.
- **NFR-S3** Proof packages MUST include a `nonce` to prevent replay attacks across multiple verifications.
- **NFR-S4** The verifier MUST validate `expiresAt < now` *inside the circuit*, not in JavaScript (so the holder cannot lie about the current time).
- **NFR-S5** No personally identifiable information (PII) is ever transmitted to or stored on Solvnt-controlled servers. The server is verification-only.

### 2.3 Privacy

- **NFR-P1** A verifier MUST learn exactly one bit of information: `value ≥ threshold` (true/false). They MAY additionally learn the *threshold they themselves set*, the *issuer label*, the *claim type*, and the *expiration date*. Nothing else.
- **NFR-P2** Two proofs by the same holder MUST NOT be linkable by the verifier through any field of the proof package.
- **NFR-P3** Proof generation MUST happen on the holder's device. The protocol MUST NOT support delegated proving in MVP.

### 2.4 Reliability

- **NFR-R1** The demo flow MUST be runnable end-to-end on a single laptop with no internet beyond the local Midnight node.
- **NFR-R2** All fixture data MUST be checked into the repo. No external data fetches during the demo.
- **NFR-R3** A pre-recorded video MUST exist as a backup before the demo.

### 2.5 Developer experience

- **NFR-D1** A new dev MUST be able to clone the repo and run `pnpm install && pnpm dev` to a working state in ≤ 5 minutes.
- **NFR-D2** The README MUST contain a "5-minute tour" section.
- **NFR-D3** Verifier integration MUST be ≤ 1 line of JSX for the React path, ≤ 5 lines for the REST path.

### 2.6 Accessibility

- **NFR-A1** All interactive elements MUST be keyboard-navigable.
- **NFR-A2** Color contrast MUST meet WCAG AA on the dark theme (4.5:1 for body, 3:1 for large text). The brand palette is designed to meet this; verify before shipping.
- **NFR-A3** All form fields MUST have visible labels (not placeholder-only).

---

## 3. Tech stack

Locked-in for the hackathon. Do not deviate without team discussion.

| Layer                  | Choice                                                |
|------------------------|-------------------------------------------------------|
| Smart contract language| **Compact** (Midnight)                                |
| SDK                    | **midnight-js**                                       |
| dApp scaffold          | **MeshJS Midnight starter**                           |
| Frontend framework     | **Next.js 14** (App Router) + **TypeScript**          |
| Styling                | CSS variables (per `tokens.css`) + Tailwind utilities |
| Component lib          | None (custom — brand demands it)                       |
| Icons                  | **Lucide React**                                      |
| Animation              | **Motion** (formerly Framer Motion)                   |
| QR generation          | `qrcode` (npm)                                        |
| State                  | Built-in React + minimal Zustand store for wallet     |
| Wallet integration     | Midnight wallet CLI + MeshJS connector                |
| AI pair                | **Midnight MCP server** in Claude Code or Cursor      |
| Package manager        | **pnpm**                                              |
| Testing (post-MVP)     | Vitest + Playwright                                   |
| Deployment             | Vercel for the holder/verifier frontends; local Midnight node only for the hackathon demo |

---

## 4. File / module structure

```
solvnt/
├── apps/
│   ├── holder/                  # Next.js — Priya's app
│   │   ├── app/
│   │   │   ├── page.tsx         # main flow
│   │   │   ├── verify/[id]/     # hosted verifier
│   │   │   └── globals.css      # @import tokens.css
│   │   └── lib/
│   │       ├── wallet.ts        # MeshJS wallet integration
│   │       ├── attestations.ts  # localStorage CRUD
│   │       └── prove.ts         # calls into prover-sdk
│   └── verifier-demo/           # standalone demo "rental application"
│       └── app/page.tsx         # uses <SolventVerifier />
├── packages/
│   ├── contracts/
│   │   ├── issuer-registry.compact
│   │   ├── range-proof.compact
│   │   └── deploy.ts
│   ├── prover-sdk/              # TS wrapper around proof generation
│   │   └── src/
│   │       ├── proveIncome.ts
│   │       └── types.ts
│   ├── verifier/                # @solvnt/verifier npm package
│   │   └── src/
│   │       └── SolventVerifier.tsx
│   ├── issuer-cli/              # `solvnt-issuer` command
│   │   └── src/
│   │       ├── register.ts
│   │       └── issue.ts
│   └── shared/                  # types, schemas, constants
│       └── src/
│           ├── attestation.ts   # zod schemas
│           └── constants.ts
├── fixtures/
│   ├── issuers/
│   │   ├── mock-payroll.json
│   │   └── mock-bank.json
│   └── attestations/
│       ├── priya-low-income.json
│       ├── priya-mid-income.json
│       └── priya-high-income.json
├── docs/
│   ├── prd.md
│   ├── requirements.md
│   ├── architecture.html
│   ├── brand.md
│   ├── tokens.css
│   └── design-prompt.md
├── claude.md                    # for Claude Code
├── README.md
├── pnpm-workspace.yaml
└── package.json
```

---

## 5. Data models (Zod schemas in `packages/shared/src/attestation.ts`)

```typescript
import { z } from 'zod';

export const ClaimTypeSchema = z.enum([
  'income.monthly',
  'income.annual',
  'balance.snapshot',
  'balance.cardano.ada',  // stretch
]);

export const AttestationSchema = z.object({
  v: z.literal(1),
  issuerId: z.string().regex(/^0x[0-9a-f]{64}$/),
  subject: z.string().regex(/^0x[0-9a-f]{64}$/),
  claim: z.object({
    type: ClaimTypeSchema,
    value: z.number().int().positive(),
    currency: z.enum(['INR', 'USD', 'EUR', 'ADA', 'NIGHT']),
    period: z.object({
      from: z.string().date(),
      to: z.string().date(),
    }),
  }),
  nonce: z.string().regex(/^0x[0-9a-f]{32,}$/),
  issuedAt: z.string().datetime(),
  expiresAt: z.string().datetime(),
  signature: z.string().regex(/^0x[0-9a-f]+$/),
});

export type Attestation = z.infer<typeof AttestationSchema>;

export const VerificationRequestSchema = z.object({
  requestId: z.string().uuid(),
  threshold: z.number().int().positive(),
  claimType: ClaimTypeSchema,
  currency: z.enum(['INR', 'USD', 'EUR', 'ADA', 'NIGHT']),
  callbackUrl: z.string().url().optional(),
  expiresAt: z.string().datetime(),
});

export type VerificationRequest = z.infer<typeof VerificationRequestSchema>;

export const ProofPackageSchema = z.object({
  v: z.literal(1),
  requestId: z.string().uuid(),
  proof: z.string(),                   // hex-encoded ZK proof
  publicInputs: z.object({
    threshold: z.number().int(),
    issuerPubkey: z.string(),
    claimType: ClaimTypeSchema,
    currency: z.string(),
    expiresAt: z.string().datetime(),
  }),
  issuerLabel: z.string(),
  generatedAt: z.string().datetime(),
});

export type ProofPackage = z.infer<typeof ProofPackageSchema>;
```

---

## 6. API contracts

### 6.1 Verifier REST API (post-MVP, scaffolded in MVP)

```
POST   /v1/requests              { threshold, claimType, currency } → { requestId, qrUrl }
GET    /v1/requests/:id          → { status: "pending" | "verified" | "failed" }
POST   /v1/verify                { proofPackage }                → { verified: bool, ... }
```

### 6.2 Issuer SDK (TypeScript)

```typescript
import { Issuer } from '@solvnt/issuer';

const issuer = await Issuer.connect({
  privateKey: process.env.ISSUER_KEY,
  network: 'local',
});

const attestation = await issuer.issue({
  subject: '0x71fb…',
  claim: {
    type: 'income.monthly',
    value: 95000,
    currency: 'INR',
    period: { from: '2025-11-01', to: '2026-04-30' },
  },
  validityDays: 30,
});
```

---

## 7. Environment & configuration

Environment variables (`.env.local`):

```
# Midnight network
MIDNIGHT_NODE_URL=http://localhost:8080
MIDNIGHT_NETWORK=local

# Contract addresses (filled by deploy script)
ISSUER_REGISTRY_ADDRESS=
RANGE_PROOF_VERIFIER_ADDRESS=

# Mock issuer keys (CHECKED-IN for the hackathon ONLY; do not reuse)
MOCK_PAYROLL_PRIVATE_KEY=
MOCK_BANK_PRIVATE_KEY=

# Frontend
NEXT_PUBLIC_VERIFIER_BASE_URL=https://verify.solvnt.app
```

---

## 8. Acceptance criteria for the hackathon submission

Submission is **not done** until all of these pass:

- [ ] Local Midnight network starts with one command.
- [ ] `pnpm install && pnpm dev` brings up the holder app and verifier demo.
- [ ] `solvnt-issuer register` registers a new issuer on the local chain.
- [ ] `solvnt-issuer issue` produces a valid signed attestation.
- [ ] The holder app loads on mobile Safari and Chrome.
- [ ] An end-to-end proof completes in ≤ 5 seconds on a MacBook Pro.
- [ ] The verifier component renders a QR and updates to ✅ within 1 second of proof receipt.
- [ ] The Cardano witness function returns a non-zero balance for a fixture address (stretch).
- [ ] The 90-second demo video is shot, edited, captioned, and uploaded.
- [ ] README has: 5-minute tour, architecture diagram link, video link, license.
- [ ] No emoji in the README except section anchors.
- [ ] The submission form on MLH/Dev.to is filled with the long description from `prd.md` §2 + §3 + §10.

---

## 9. Out of scope (explicitly)

- Real bank or payroll integrations
- Mobile native applications
- On-chain attestation storage
- Multi-chain proofs beyond Cardano
- Revocation registry (MVP relies on expiry)
- Issuer Console UI (CLI only)
- Internationalization beyond English copy
- Custom proof schemas beyond the four claim types
- Production deployment to mainnet
