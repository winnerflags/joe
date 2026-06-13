import Header from '@/components/layout/Header';
import ProgressIndicator from '@/components/layout/ProgressIndicator';

export default function OrderLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen flex flex-col bg-cream">
      <Header />
      <ProgressIndicator />
      <main className="flex-1 flex flex-col py-8 px-4">
        <div className="max-w-3xl mx-auto w-full">
          {children}
        </div>
      </main>
    </div>
  );
}
