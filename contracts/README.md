# Solvnt — Compact contracts

Two contracts implementing the on-chain portion of the Solvnt protocol on Midnight.

| File | Purpose |
|------|---------|
| `issuer-registry.compact` | Registers issuer public keys. Implements `FR-1.1 … FR-1.4`. |
| `range-proof.compact` | Range-proof verifier + nullifier ledger. Implements `FR-3.1 … FR-3.4`. |
| `witnesses.ts` | TypeScript implementations of the `witness` declarations. |

## How the design follows from the research

The web demo and the Compact contracts differ in **one critical place**: the demo uses `ed25519` for issuer signatures, but the **Compact circuit can't verify ed25519 cheaply** (~2M constraints — hostile to in-browser proving). The stdlib also exposes only ECC primitives (`ecAdd`, `ecMul`, `ecMulGenerator`, `hashToCurve`, `NativePoint`); there is no first-class `verifySignature` circuit.

So we use the pattern from `example-bboard` and OpenZeppelin's `ShieldedAccessControl`:

- The issuer publishes an **attestation commitment** `c = persistentHash(value, nonce, subjectCommitment, expiresAt, claimType)` to a per-issuer ledger Set when they "issue" an attestation. Anyone can read these commitments.
- The holder proves to a verifier:
  1. They know a preimage `(value, nonce, secret, expiresAt, claimType)` whose hash equals some `c` in an issuer's set.
  2. `value ≥ threshold`.
  3. `blockTimeLt(expiresAt)` — not expired.
  4. `subjectCommitment = persistentHash(secret)` — binds the proof to their identity.
  5. They publish a `nullifier = persistentHash(secret, verifierId, claimType)` — scope-bound for unlinkability across verifiers, but consistent within a verifier-claim pair.
- The ledger asserts the nullifier hasn't been spent, then inserts it.

In effect we **anchor trust on the registry update instead of an in-circuit signature**. The off-chain ed25519 signature still exists for the holder's UX (so they know which JSON came from which issuer), but the circuit's anchor is the public commitment.

When/if a SNARK-friendly signature scheme lands in the Compact stdlib (Schnorr over `NativePoint`), this gets simpler — the issuer can sign the commitment directly and the circuit verifies that signature instead of doing a Merkle lookup. The public-input shape doesn't change.

## ⚠️ UNVERIFIED-against-stdlib markers

I wrote these contracts from the language reference + bboard example, but the standard-library method names for `Map`, `Set`, and `persistentHash` weren't fully visible in the public docs I could access. Every line marked `// UNVERIFIED:` should be checked against the **Midnight MCP server** before deploy:

```sh
claude mcp add midnight -- npx -y midnight-mcp@latest
```

Then in this session:

```
> Use the midnight-search-compact tool to find the canonical Map.insert and Set.member signatures, and run midnight-compile-contract on contracts/issuer-registry.compact and contracts/range-proof.compact.
```

The MCP will hit the real `compactc` and tell you exactly what's wrong.

## Toolchain

```sh
# install compact compiler (drops binary at ~/.compact/bin/compact)
curl --proto '=https' --tlsv1.2 -LsSf https://github.com/midnightntwrk/compact/releases/latest/download/compact-installer.sh | sh
export PATH="$HOME/.compact/bin:$PATH"
compact --version
compact update

# proof server
docker run -p 6300:6300 midnightntwrk/proof-server:8.0.3 midnight-proof-server -v

# local devnet (clone the template and `npm start`)
# https://docs.midnight.network/guides/midnight-local-network

# compile from this dir
compact compile issuer-registry.compact
compact compile range-proof.compact
```

## Docs to keep open

- Language reference: https://docs.midnight.network/develop/reference/compact/lang-ref
- Standard library exports: https://docs.midnight.network/compact/standard-library/exports
- Bboard tutorial (closest pattern): https://docs.midnight.network/tutorials/bboard/smart-contract
- OpenZeppelin Compact (ShieldedAccessControl is the registry pattern): https://github.com/OpenZeppelin/compact-contracts
