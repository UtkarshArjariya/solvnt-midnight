# Solvnt Brand

> The product that dissolves financial data into mathematical certainty.

---

## Brand position

Solvnt is a **privacy-native financial infrastructure protocol**. The brand has to feel three things at once, in this order:

1. **Trustworthy** — handling income and net-worth data. Closer to Stripe than to a meme-coin launchpad.
2. **Technical** — the product *is* cryptography. The brand should feel like instruments, not marketing.
3. **Distinctive** — fintech is a sea of Inter + blue gradients. Solvnt has to look unlike its competitors at a glance.

**Reference brands that get the tone right:** Linear, Vercel, Arc, Stripe Press, Cursor, the Bloomberg Terminal redesign concepts. **Not** OpenSea, Trust Wallet, any L2 chain landing page.

**One-word aesthetic:** *Nocturnal laboratory.* Like cryptographic apparatus under low light. Confident. Precise. Quiet.

---

## Color system

The palette is built on a **deep midnight base** (paying tribute to the underlying chain), a **single signature accent — Catalyst Cyan** — used sparingly for proof-state moments, and a **verification gold** for trust signals. Everything else recedes.

**Rules:**

- 80% of any screen is the midnight base layers (void, base, raise). The accents earn their presence by being scarce.
- Catalyst Cyan is reserved for proof-active states: "generating proof," "proof valid," signature CTAs. Never use it for chrome, decoration, or large fills.
- Verification Gold is used only on attestation seals and "verified" badges. Never on buttons or text links.
- Light mode exists but is **secondary**. Default the product to dark. The brand is nocturnal.

### Dark mode (primary)

| Token              | Hex                       | Use                                                          |
|--------------------|---------------------------|--------------------------------------------------------------|
| `--mid-void`       | `#07091A`                 | Page background, the deepest layer                           |
| `--mid-base`       | `#0D1129`                 | App background, default surface                              |
| `--mid-raise`      | `#161B3A`                 | Cards, modals, raised panels                                 |
| `--mid-raise-2`   | `#1F2550`                 | Hover state on raised surfaces, secondary panels             |
| `--mid-line`       | `#232856`                 | Strong borders, active dividers                              |
| `--mid-line-soft`  | `rgba(255,255,255,0.06)`  | Hairlines, subtle separators                                 |
| `--ink`            | `#ECEEFD`                 | Primary text on dark                                         |
| `--ink-soft`       | `#A8AED4`                 | Secondary text, labels                                       |
| `--ink-dim`        | `#5C638C`                 | Tertiary text, captions, placeholders                        |
| `--catalyst`       | `#7CF5C9`                 | **Signature accent.** Proof states, primary CTA              |
| `--catalyst-deep`  | `#2EBB91`                 | Hover/pressed state of catalyst                              |
| `--catalyst-glow`  | `rgba(124,245,201,0.20)`  | Halos, focus rings, glow effects around catalyst elements    |
| `--vouch`          | `#E9C46A`                 | Verification gold. Attestation seals, "verified" badges      |
| `--vouch-soft`     | `rgba(233,196,106,0.16)`  | Background tint behind verified badges                       |
| `--alert`          | `#FF6B8A`                 | Errors, expired proofs, revoked attestations                 |
| `--pending`        | `#B79CFF`                 | In-progress, computing proof, witness being generated        |
| `--scrim`          | `rgba(7,9,26,0.72)`       | Modal scrim                                                  |

### Light mode (secondary)

| Token             | Hex                       |
|-------------------|---------------------------|
| `--mid-void`      | `#FAFAF7`                 |
| `--mid-base`      | `#F4F4ED`                 |
| `--mid-raise`     | `#FFFFFF`                 |
| `--mid-line`      | `#E5E3D8`                 |
| `--ink`           | `#0D1129`                 |
| `--ink-soft`      | `#4A4F6E`                 |
| `--ink-dim`       | `#8A8FA8`                 |
| `--catalyst`      | `#1E9A75`                 |
| `--catalyst-deep` | `#0E6F52`                 |
| `--vouch`         | `#8B6914`                 |

---

## Typography

Three families. The pairing is deliberately uncommon for fintech to ensure visual signature.

### Display — **Fraunces**

A variable serif with personality axes (OPSZ, WGHT, SOFT, ITAL). Used at large sizes for hero moments, page titles, marquee numbers (income thresholds, proof counts). Crank `--fraunces-SOFT: 100` and italics for character. Free, Google Fonts.

```css
font-family: 'Fraunces', 'Times New Roman', serif;
font-variation-settings: 'SOFT' 50, 'WONK' 0;
```

**Use for:** Hero h1, marketing pages, large numerals, the wordmark itself.

### Body — **Switzer**

A grotesque from Indian Type Foundry, free via Fontshare. Quiet, legible, characterful where Inter is anonymous. Pairs with Fraunces by contrast (sans + serif) rather than competition.

```css
font-family: 'Switzer', -apple-system, system-ui, sans-serif;
```

**Use for:** All body copy, UI labels, buttons, navigation, form fields.

### Mono — **JetBrains Mono**

For everything that *is* code or that *represents* code: hashes, wallet addresses, attestation IDs, contract names, proof previews. Use with `font-feature-settings: 'liga' 0` to keep characters distinct.

```css
font-family: 'JetBrains Mono', 'SF Mono', monospace;
```

### Type scale (rem)

| Token         | Size      | Line height | Family   | Used for                       |
|---------------|-----------|-------------|----------|--------------------------------|
| `--t-hero`    | 4.5rem    | 1.05        | Fraunces | Landing-page heroes only       |
| `--t-display` | 3rem      | 1.1         | Fraunces | Page titles                    |
| `--t-h1`      | 2rem      | 1.2         | Fraunces | Section headers                |
| `--t-h2`      | 1.5rem    | 1.25        | Switzer  | Subsection headers             |
| `--t-h3`      | 1.125rem  | 1.4         | Switzer  | Card titles                    |
| `--t-body`    | 1rem      | 1.55        | Switzer  | Default body                   |
| `--t-small`   | 0.875rem  | 1.5         | Switzer  | Captions, helper text          |
| `--t-micro`   | 0.75rem   | 1.4         | Switzer  | Labels, table headers (UPPER)  |
| `--t-mono`    | 0.9375rem | 1.5         | JBM      | Hashes, addresses              |

---

## Spacing, radius, motion

### Spacing (8pt with a 4pt half-step)

`--s-1: 4px` · `--s-2: 8px` · `--s-3: 12px` · `--s-4: 16px` · `--s-5: 24px` · `--s-6: 32px` · `--s-7: 48px` · `--s-8: 64px` · `--s-9: 96px`

### Radius

`--r-sm: 6px` · `--r-md: 10px` · `--r-lg: 16px` · `--r-xl: 24px` · `--r-pill: 999px`

Default to `--r-md` for buttons and cards. The brand is precise, not pillowy.

### Motion

- `--ease-out: cubic-bezier(0.22, 1, 0.36, 1)`
- `--ease-in-out: cubic-bezier(0.65, 0, 0.35, 1)`
- `--dur-fast: 120ms`
- `--dur-base: 220ms`
- `--dur-slow: 480ms`
- `--dur-proof: 1800ms` (use for the proof-generation animation — long enough to feel real, short enough to not annoy)

---

## Iconography & illustration

- **Icon set:** Lucide (stroke 1.5px, never filled by default).
- **Custom icons** for the three core actors — Issuer, Holder, Verifier — drawn as small geometric glyphs. Treat these as the brand's mnemonic.
- **No 3D renders, no isometric illustrations, no crypto-bro neon characters.** If you want depth, use grain noise overlay at 4% opacity over solid blocks.

---

## Wordmark

`solvnt` — always lowercase, set in Fraunces with `WGHT 600`, `OPSZ 144`, `SOFT 100`, slight negative letter-spacing (`-0.02em`). The dot of the "i" (which doesn't exist in "solvnt") is replaced conceptually by the **single catalyst-cyan circle** that follows the wordmark as a punctuation mark. Like this: `solvnt●`. That circle is the logomark. Use the circle alone as the app icon at small sizes.

---

## Voice

Short sentences. Specific numbers. No emoji in product copy. No "🚀" anywhere ever. Avoid the word "seamless." Avoid the word "revolutionary." The product is **technical infrastructure**; the voice should sound like someone competent who respects the reader's time.

**Yes:** "Your income, proven. Not shared."
**No:** "🚀 Revolutionizing income verification with seamless ZK magic!"

---

## Quick CSS variable export

See `tokens.css` (sibling file) for the ready-to-paste variable definitions.
