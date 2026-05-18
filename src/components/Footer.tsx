import Link from 'next/link';

/*
 * Quiet bottom rule — wordmark + concrete privacy claim + version. Avoids the
 * "© 2026 Company / Terms / Privacy" footer cliché. Sits at the bottom of
 * every long page; absent on QR-flip moments where the seal should be the
 * last thing seen.
 */

export const Footer = () => (
  <footer
    role="contentinfo"
    style={{
      borderTop: '1px solid var(--mid-line-soft)',
      padding: 'var(--s-7) var(--s-5) var(--s-6)',
      marginTop: 'var(--s-9)',
    }}
  >
    <div
      className="container"
      style={{
        display: 'flex',
        flexWrap: 'wrap',
        gap: 'var(--s-5)',
        justifyContent: 'space-between',
        alignItems: 'baseline',
      }}
    >
      <div
        style={{
          fontFamily: 'var(--font-display)',
          fontWeight: 500,
          fontSize: 'var(--t-h3)',
          letterSpacing: '-0.02em',
          fontVariationSettings: "'SOFT' 100, 'opsz' 144",
          maxWidth: 360,
        }}
      >
        A privacy-native verification primitive built on Midnight.
      </div>
      <ul
        className="mono"
        style={{
          listStyle: 'none',
          padding: 0,
          margin: 0,
          display: 'flex',
          gap: 'var(--s-5)',
          flexWrap: 'wrap',
          fontSize: 'var(--t-micro)',
          letterSpacing: '0.12em',
          textTransform: 'uppercase',
          color: 'var(--ink-dim)',
        }}
      >
        <li>
          <Link href="/" style={{ textDecoration: 'none' }}>
            holder
          </Link>
        </li>
        <li>
          <Link href="/verify" style={{ textDecoration: 'none' }}>
            verifier
          </Link>
        </li>
        <li>
          <a
            href="https://docs.midnight.network"
            target="_blank"
            rel="noreferrer"
            style={{ textDecoration: 'none' }}
          >
            midnight ↗
          </a>
        </li>
        <li>solvnt v0.1.0 · hackathon build</li>
      </ul>
    </div>
  </footer>
);
