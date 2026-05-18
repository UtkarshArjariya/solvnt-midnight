import Link from 'next/link';
import { TopBar } from '@/components/TopBar';
import { Footer } from '@/components/Footer';

export default function NotFound() {
  return (
    <>
      <TopBar />
      <main className="container-narrow" style={{ padding: 'var(--s-9) var(--s-5)' }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--s-5)' }}>
          <span
            className="mono"
            style={{
              fontSize: 'var(--t-micro)',
              letterSpacing: '0.16em',
              textTransform: 'uppercase',
              color: 'var(--ink-dim)',
            }}
          >
            404 · not found
          </span>
          <h1
            style={{
              fontSize: 'var(--t-hero)',
              lineHeight: 'var(--lh-tight)',
              margin: 0,
              letterSpacing: '-0.02em',
              fontVariationSettings: "'SOFT' 100, 'opsz' 144",
            }}
          >
            <em
              style={{
                fontStyle: 'italic',
                color: 'var(--catalyst)',
                fontVariationSettings: "'SOFT' 100, 'opsz' 144",
              }}
            >
              Nothing
            </em>{' '}
            here.
          </h1>
          <p className="text-soft" style={{ fontSize: 'var(--t-h3)', maxWidth: 420 }}>
            The page didn't exist — or the request id has expired. Either way, the
            seal you were looking for isn't on this device.
          </p>
          <div style={{ display: 'flex', gap: 'var(--s-3)', flexWrap: 'wrap', marginTop: 'var(--s-3)' }}>
            <Link href="/" className="btn btn-primary" style={{ height: 48, padding: '0 22px' }}>
              Back to holder
            </Link>
            <Link href="/verify" className="btn btn-ghost" style={{ height: 48, padding: '0 22px' }}>
              Create a verifier request
            </Link>
          </div>
        </div>
      </main>
      <Footer />
    </>
  );
}
