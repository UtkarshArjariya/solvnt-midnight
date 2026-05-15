# Solvnt — Product Requirements Document

**Status:** Draft v1.0 · Hackathon edition
**Owner:** Founding team
**Last updated:** Pre-hackathon kickoff
**Submission tracks:** DeFi · Build Club · Overall (Top 2)

---

## 1. Vision

> **A user should be able to prove any financial fact about themselves — income, net worth, asset holdings, transaction history — to any third party, without ever revealing the underlying data.**

Solvnt is the verification primitive that makes that possible. It is *not* a wallet, *not* a bank aggregator, *not* a KYC product. It is the cryptographic layer that turns financial data into selectively-disclosable proofs, and it ships as an SDK that any application can integrate in under a day.

Three-year vision: every "upload your bank statement" form on the internet is replaced with a Solvnt verifier widget.

---

## 2. The problem, in concrete terms

Income and wealth verification is the most-repeated, least-improved workflow in modern financial life. The following are real, current workflows in 2026:

- **Renters** in Mumbai, Bangalore, NYC, London upload PDF tax returns to landlord email inboxes. The data sits in those inboxes indefinitely.
- **Founders** prove accredited-investor status by mailing brokerage screenshots to a fund's compliance officer.
- **Visa applicants** ship notarized six-figure-balance bank letters across borders, sometimes multiple times per year.
- **Freelancers and gig workers** get rejected by traditional lenders because their income is "lumpy" — there is no standard product to prove a 12-month aggregate without exposing every transaction.
- **Crypto holders** have *no* way to prove they hold ≥ X tokens without doxxing wallet addresses publicly.

The incumbents:

- **Plaid** ($13B valuation) charges $1–5 per verification, requires users to hand over read access to every transaction, and centralizes the data.
- **Truework** ($200M+) does employment verification by literally calling the employer's HR department.
- **Persona, Alloy, Onfido** focus on identity, not income; they each lean on document scraping that the user must opt into wholesale.

**The pull for a privacy-first replacement is overwhelming.** Lenders themselves want to *stop* holding this data — it's pure GDPR/CCPA/DPDP liability. Users hate the workflow. Regulators are sympathetic. No privacy-native alternative ships today.

---

## 3. Vision pillars (in priority order)

1. **Privacy is load-bearing.** Without ZK range proofs, Solvnt collapses into "Plaid with extra steps." Every feature is judged against the question *does this preserve privacy by construction?*
2. **One-line integration for verifiers.** A fintech engineer should add a Solvnt verifier in under 10 minutes. If integration is hard, adoption stops at hackathon judges.
3. **Issuers do not need to know what Midnight is.** A bank or payroll provider should be able to publish an issuer key with a single API call and never touch a blockchain again.
4. **Users don't see proofs.** They see "Generate" and "Verified." The cryptography is invisible in the UI.
5. **Demos on a phone.** The hackathon demo must work on a single laptop with no network dependencies beyond the local Midnight node.

---

## 4. Target users (three actors)

### 4.1 Holders (end users)

The person proving a fact about themselves.

| Segment                             | Pain                                                 | Why Solvnt wins them                                     |
|-------------------------------------|------------------------------------------------------|----------------------------------------------------------|
| **Renters in tight housing markets** | Email tax returns to strangers                      | One-tap proof of ≥ ₹X monthly income; no PDF leaves device |
| **Crypto-native users**             | Doxx wallets to prove accreditation                 | Prove ≥ N BTC / ADA / NIGHT held; addresses stay private  |
| **Freelancers / gig workers**       | Rejected because income looks lumpy                 | Prove 12-month aggregate from multiple sources            |
| **Founders raising capital**        | Mailing brokerage screenshots to fund compliance    | One attestation reused across every LP intro              |
| **Visa applicants**                 | Notarized bank letters, repeatedly                  | Reusable expiring attestation                             |

**Primary persona for the MVP demo:** *Priya, a 28-year-old senior engineer in Bangalore, applying for an apartment.* The whole product must serve Priya in under 30 seconds.

### 4.2 Issuers

The source of truth for the financial fact. They sign attestations off-chain; their public key is registered on-chain.

- Banks (via open-banking APIs in mature markets, Account Aggregator in India)
- Payroll providers (ADP, Gusto, Razorpay Payroll, Zoho Payroll)
- Centralized exchanges (Binance, Coinbase, WazirX)
- Crypto custodians (Fireblocks, BitGo)
- Brokerages (Robinhood, Zerodha, Charles Schwab)
- (Long tail) employers issuing their own income attestations

**Issuer-side product:** an Issuer Console (dashboard + REST API) for registering a key, defining schemas, and issuing attestations.

### 4.3 Verifiers

The third party who needs to check a fact. They never see the underlying data.

- Property managers and landlords
- Hard-money lenders, mortgage originators
- Accredited-investor gates (every Reg D 506(c) fund)
- Fintech onramps (Coinbase Prime, OTC desks)
- Dating apps verifying income/age claims
- Visa officers, immigration legal services

**Verifier-side product:** a one-line SDK and a hosted verifier URL for non-technical verifiers (landlords).

---

## 5. Product principles

These are the tie-breakers when feature scope conflicts.

1. **Privacy by construction, not by promise.** If we can leak data and just promise we won't, we've failed.
2. **The verifier path is sacred.** Every choice that adds friction to a verifier's integration is a tax on adoption. Push complexity onto holders and issuers before verifiers.
3. **Boring beats clever.** Range proofs are well-understood. Don't invent new circuits during a 48-hour hackathon.
4. **One attestation, many uses.** A proof generated today should be reusable until it expires. Re-prove only on revocation or threshold change.
5. **Demoable beats general.** If a feature can't be shown in a 60-second pitch, defer it.

---

## 6. Success metrics

### 6.1 Hackathon judging metrics (the only ones that matter for the next 72 hours)

| Metric                              | Target                                        | How we measure                          |
|-------------------------------------|-----------------------------------------------|-----------------------------------------|
| End-to-end demo works               | 100% reliable on stage                        | Run the full flow 5× without a network call|
| Time-to-verify (judge stopwatch)    | < 8 seconds from QR scan to ✅              | Time the demo                            |
| Verifier integration LOC            | ≤ 1 line of JSX, ≤ 5 lines of REST           | Count it, show it                       |
| Distinct privacy claim              | Stated in 1 sentence in the README           | "Without ZK range proofs, you're Plaid" |
| Cardano interop visible             | At least one fixture pulls a Cardano balance | Demo includes one ADA holdings proof    |

### 6.2 Post-hackathon metrics (for Build Club application)

| Metric                              | 30-day target | 90-day target |
|-------------------------------------|---------------|---------------|
| Verifier integrations live          | 3             | 15            |
| Distinct issuer keys registered     | 5             | 25            |
| Attestations generated              | 500           | 5,000         |
| Per-attestation fee revenue (USD)   | $50           | $500          |

---

## 7. MVP feature scope (the 48–72 hour list)

The bright line: **everything below the line is cut without discussion if we run short on time.**

### 7.1 Must ship (above the line)

1. **Compact contract** — issuer registry + range-proof verifier.
2. **Range-proof circuit** — proves `committed_value ≥ public_threshold` where `committed_value` is signed by a registered issuer.
3. **Mock issuer backend** — CLI script that produces signed attestations from a fixture JSON file (mimics a payroll/bank API).
4. **Holder app (web)** — single Next.js page; connect wallet, select attestation, set threshold, generate proof, output QR + URL.
5. **`<SolventVerifier />` React component** — one-line embed; takes a threshold, returns a verified callback.
6. **Hosted verifier page** — `verify.solvnt.app/<request-id>` for non-technical verifiers (landlords scan a QR; the page loads).
7. **Demo scenario** — Priya proves ≥ ₹80,000 monthly income to a mock rental application.
8. **README + 90-second demo video.**

### 7.2 Above-the-line stretch (only if 7.1 ships by H32)

9. **Cardano witness function** — read an ADA balance and include it in the attestation as a second factor. *This is the Midnight-specific feature that wins the ecosystem-fit judging axis. Push hard to include it.*
10. **Attestation expiry** — 30-day expiry encoded into the proof, checked by the verifier.

### 7.3 Below the line (post-hackathon)

11. Real Plaid / Account Aggregator integration.
12. Multi-chain proofs (BTC, ETH).
13. Revocation list contract.
14. Issuer Console UI (use a CLI for the MVP).
15. Mobile app (the web app must work on mobile browsers, but no native shell).
16. Custom proof schemas (only income-threshold is supported in MVP).
17. Stripe-style "test mode" with sandbox issuers.
18. Analytics dashboard for verifiers.

---

## 8. User stories

### 8.1 Holder

- **H1.** As Priya, I open Solvnt, connect my Midnight wallet, and see a list of my issued attestations.
- **H2.** As Priya, I scan a landlord's QR code; the app shows me the request ("Prove income ≥ ₹80,000") and asks me to confirm.
- **H3.** As Priya, I tap "Generate"; within 3 seconds I see a "Proof ready" state and can share via QR or link.
- **H4.** As Priya, I can revoke my own attestation if my circumstances change (post-MVP).
- **H5.** As Priya, I never see the words "zero-knowledge proof," "circuit," or "witness." Just "Generate" and "Verified."

### 8.2 Issuer

- **I1.** As a payroll provider, I run a CLI command to register an issuer key on Midnight; I get a registered issuer ID back.
- **I2.** As a payroll provider, I run another CLI command to issue an attestation for one of my employees; the employee receives a signed JSON object.
- **I3.** As a payroll provider, I never deploy a contract, never write Compact, and never run a node.

### 8.3 Verifier

- **V1.** As a landlord, I open `verify.solvnt.app`, enter my requirement ("monthly income ≥ ₹80,000"), and get a QR code I can show the renter.
- **V2.** As a landlord, when the renter completes the proof, my page updates within a second to ✅ Verified.
- **V3.** As a fintech engineer, I install `@solvnt/verifier`, add `<SolventVerifier minIncome={X} onVerified={cb} />` to my page, and my flow works.
- **V4.** As a fintech engineer, I can verify a proof from my backend with `POST https://api.solvnt.app/verify` — one HTTP call.

---

## 9. Non-goals

These are deliberately *not* part of Solvnt, and the team should redirect when asked.

- **Solvnt is not a wallet.** Use Midnight's wallet.
- **Solvnt is not a credit score.** It is a verification primitive; scoring lives in the verifier's product.
- **Solvnt does not aggregate financial data.** Issuers do.
- **Solvnt is not KYC.** No identity is required to use it (though issuers may attest to KYC-passed status, that's their product).
- **Solvnt does not bridge funds.** It bridges *facts about funds*.
- **Solvnt does not store proofs server-side.** Holders hold their own attestations.

---

## 10. Business model (for Build Club)

**Per-verification fee, paid by verifiers.**

- Free tier: 100 verifications/month for verifier accounts.
- Paid: $0.30 per verification at the cheap end (vs Plaid's $1–5). High-volume enterprise rates negotiated.
- Issuer side: free. Issuers are *supply*; they don't get charged.
- Holder side: free. Holders are *demand*; charging them kills adoption.

**Why this works:** verifiers already pay Plaid/Truework an order of magnitude more. The same buyer, half the price, better outcome (no PII liability). The wedge.

---

## 11. Competitive landscape

| Competitor   | Mechanism                  | Why Solvnt wins                                                                  |
|--------------|----------------------------|----------------------------------------------------------------------------------|
| Plaid        | OAuth + read-only API      | Plaid sees and stores the data. Solvnt's verifier sees nothing but `value ≥ X`. |
| Truework     | Calls the employer's HR    | Truework takes days. Solvnt takes seconds.                                       |
| Persona/Alloy| Document scraping          | These verify *identity*, not *income*. Adjacent, not competing.                  |
| Worldcoin    | Iris-based proof-of-human  | Different primitive (uniqueness, not finance).                                   |
| Sismo/Polygon ID | EVM-side credentials   | EVM-side; no Cardano interop, no privacy-native execution layer.                 |

**The defensible moat is the issuer network.** Once payroll providers and banks are integrated, switching costs become real. Build Club pitch should lead with this.

---

## 12. Risks and mitigations

| Risk                                                             | Likelihood | Impact | Mitigation                                                                     |
|------------------------------------------------------------------|------------|--------|--------------------------------------------------------------------------------|
| Compact range-proof circuit takes longer than 12 hours           | Med        | High   | Use the simplest possible circuit (`value ≥ threshold` on a committed integer); reference Midnight examples directly |
| Local Midnight network unstable during demo                      | Med        | High   | Pre-record a backup video; run two laptops on stage; rehearse offline fallback |
| Judges don't understand the privacy claim                        | Low        | High   | Lead the pitch with "Without ZK range proofs, this is just Plaid." One sentence. |
| Cardano witness function doesn't work in time                    | High       | Med    | Mock it. The judge cares about the *story*, not the live integration.          |
| Verifier component too complex to embed in 1 line                | Low        | Med    | Hand-craft the API. Mock the proof verification inside the component for the demo. |
| Brand looks generic                                              | Low        | Med    | Follow `brand.md` exactly. The wordmark and Catalyst Cyan accent carry the identity. |

---

## 13. Open questions (post-hackathon)

1. Should attestations be transferable, or strictly bound to the holder's wallet? (MVP: bound.)
2. What's the right expiry default? 7 days? 30? Configurable per-verifier? (MVP: 30 days, hard-coded.)
3. Do we need a discovery layer for verifiers to find issuers? (Probably yes, but not in MVP.)
4. How do we handle revocation race conditions during proof generation? (Out of scope for MVP.)
5. Threshold privacy: should the *threshold itself* be private? (No — the verifier sets it; it's their public requirement.)

---

## 14. Appendix: the demo script (verbatim)

> "This is Priya. She's applying for an apartment in Bangalore. The landlord wants proof she earns at least ₹80,000 a month. Watch.
>
> *[Priya clicks 'Generate Proof.' A QR code appears in 4 seconds.]*
>
> The landlord scans the QR. He sees one thing: **✅ Verified income ≥ ₹80,000.** That's it. He doesn't see her salary, her employer, her bank, or her wallet. Nothing was uploaded, nothing was emailed, nothing is sitting in his inbox forever.
>
> Under the hood: a zero-knowledge range proof over a signed payslip, generated on Midnight, verifiable by anyone in one line of code.
>
> Plaid is a 13-billion-dollar company doing the same job by collecting and re-selling your bank credentials. Solvnt does it without the data ever leaving your device."

**If the team can't shoot this exact video in the final hour, the project isn't done. Build backwards from the script.**
