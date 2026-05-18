import { TopBar } from '@/components/TopBar';
import { VerifierForm } from '@/components/VerifierForm';
import { Footer } from '@/components/Footer';

export default function VerifyHome() {
  return (
    <>
      <TopBar
        right={
          <span className="chip" style={{ fontSize: 'var(--t-micro)' }}>
            Verifier demo
          </span>
        }
      />
      <VerifierForm />
      <Footer />
    </>
  );
}
