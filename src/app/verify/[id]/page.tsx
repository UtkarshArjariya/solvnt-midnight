import { notFound } from 'next/navigation';
import { TopBar } from '@/components/TopBar';
import { VerifierWaiting } from '@/components/VerifierWaiting';
import { getRequest } from '@/lib/store';

export const dynamic = 'force-dynamic';

export default function HostedVerifier({ params }: { params: { id: string } }) {
  const request = getRequest(params.id);
  if (!request) notFound();

  return (
    <>
      <TopBar
        right={
          <span className="chip" style={{ fontSize: 'var(--t-micro)' }}>
            Verifier demo
          </span>
        }
      />
      <VerifierWaiting request={request} />
    </>
  );
}
