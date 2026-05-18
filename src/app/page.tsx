import { Suspense } from 'react';
import { TopBar } from '@/components/TopBar';
import { WalletPill } from '@/components/WalletPill';
import { HolderFlow } from '@/components/HolderFlow';
import { Footer } from '@/components/Footer';

export default function HolderPage() {
  return (
    <>
      <TopBar right={<WalletPill />} />
      <Suspense fallback={null}>
        <HolderFlow />
      </Suspense>
      <Footer />
    </>
  );
}
