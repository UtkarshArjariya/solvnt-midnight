import Link from 'next/link';
import { Wordmark } from './Wordmark';

export const TopBar = ({ right }: { right?: React.ReactNode }) => (
  <header className="w-full" style={{ borderBottom: '1px solid var(--mid-line-soft)' }}>
    <div className="container flex items-center justify-between" style={{ height: 64 }}>
      <Link href="/" className="inline-flex items-center" style={{ textDecoration: 'none' }}>
        <Wordmark size={24} />
      </Link>
      <div className="flex items-center" style={{ gap: 'var(--s-3)' }}>
        {right}
      </div>
    </div>
  </header>
);
