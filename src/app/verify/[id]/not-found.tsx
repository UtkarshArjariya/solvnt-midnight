import Link from 'next/link';
import { TopBar } from '@/components/TopBar';

export default function NotFound() {
  return (
    <>
      <TopBar />
      <main className="container-narrow" style={{ padding: 'var(--s-7) var(--s-5)' }}>
        <div className="card">
          <h1 style={{ fontSize: 'var(--t-h1)', margin: 0 }}>Request not found</h1>
          <p className="text-soft" style={{ marginTop: 'var(--s-2)' }}>
            That request id isn't in this server's memory. The store is in-memory and
            resets on every dev reload — create a new request to continue.
          </p>
          <Link
            href="/verify"
            className="btn btn-ghost"
            style={{ marginTop: 'var(--s-5)', alignSelf: 'flex-start' }}
          >
            Create a request
          </Link>
        </div>
      </main>
    </>
  );
}
