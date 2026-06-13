'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  Calendar, Music, Star, Cake, User, Disc3,
  Package, ShoppingBag, HelpCircle, ChevronRight, Loader2, ChevronLeft,
  BadgeCheck, X,
} from 'lucide-react';
import Logo from '@/components/ui/Logo';
import { cn } from '@/lib/cn';

interface UseCase {
  id: string;
  label: string;
  icon: React.ReactNode;
}

const USE_CASES: UseCase[] = [
  { id: 'personal_event',    label: 'Personal Event',          icon: <Calendar className="w-5 h-5" /> },
  { id: 'entertainment',     label: 'Entertainment Event',     icon: <Star className="w-5 h-5" /> },
  { id: 'music_event',       label: 'Music Event',             icon: <Music className="w-5 h-5" /> },
  { id: 'formal_event',      label: 'Formal Event',            icon: <Disc3 className="w-5 h-5" /> },
  { id: 'birthday',          label: 'Birthday',                icon: <Cake className="w-5 h-5" /> },
  { id: 'artist_cards',      label: 'Personal / Artist Cards', icon: <User className="w-5 h-5" /> },
  { id: 'new_release',       label: 'New Release Card',        icon: <Disc3 className="w-5 h-5" /> },
  { id: 'product_service',   label: 'Product / Service Card',  icon: <ShoppingBag className="w-5 h-5" /> },
  { id: 'other',             label: 'Other',                   icon: <HelpCircle className="w-5 h-5" /> },
];

export default function SamplePage() {
  const router = useRouter();
  const [selected, setSelected] = useState<string | null>(null);
  const [sponsorAccepted, setSponsorAccepted] = useState<boolean | null>(null);
  const [loading, setLoading] = useState(false);

  const canProceed = selected !== null && sponsorAccepted !== null;

  async function handleContinue() {
    if (!canProceed) return;
    setLoading(true);
    try {
      const res = await fetch('/api/checkout/sample', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ useCase: selected, sponsorAccepted }),
      });
      const { sessionUrl } = await res.json();
      window.location.href = sessionUrl;
    } catch {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-cream flex flex-col">
      <header className="bg-cream border-b border-cream-dark px-4 py-3">
        <div className="max-w-3xl mx-auto flex items-center justify-between">
          <Logo variant="full" className="h-8 w-auto text-gold-500" />
          <button
            onClick={() => router.push('/order')}
            className="flex items-center gap-1 text-xs text-navy-600 hover:text-navy-900 transition-colors"
          >
            <ChevronLeft className="w-3.5 h-3.5" /> Back
          </button>
        </div>
      </header>

      <main className="flex-1 flex flex-col items-center px-4 py-12">
        <div className="w-full max-w-lg flex flex-col gap-8">
          {/* Badge */}
          <div className="text-center">
            <div className="inline-flex items-center gap-2 bg-gold-500 text-navy-900 text-[11px] font-bold px-3 py-1 rounded-full tracking-widest uppercase mb-4">
              <Package className="w-3 h-3" /> Sample Pack — €10
            </div>
          </div>

          {/* Q1 — Use case */}
          <section className="flex flex-col gap-4">
            <div>
              <h2 className="text-lg font-black text-navy-900">What are you ordering cards for?</h2>
              <p className="text-navy-600 text-sm mt-1">Helps us include the most relevant samples in your pack.</p>
            </div>
            <div className="grid grid-cols-2 gap-3">
              {USE_CASES.map((uc) => (
                <button
                  key={uc.id}
                  type="button"
                  onClick={() => setSelected(uc.id)}
                  className={cn(
                    'flex items-center gap-3 rounded-xl border-2 p-4 text-left transition-all duration-150 active:scale-[.98] select-none',
                    selected === uc.id
                      ? 'border-gold-500 bg-gold-50'
                      : 'border-navy-100 bg-white hover:border-navy-600',
                    uc.id === 'other' && 'col-span-2',
                  )}
                >
                  <span className={cn('flex-shrink-0 transition-colors', selected === uc.id ? 'text-gold-500' : 'text-navy-600')}>
                    {uc.icon}
                  </span>
                  <span className="text-sm font-semibold text-navy-900 leading-tight">{uc.label}</span>
                </button>
              ))}
            </div>
          </section>

          {/* Divider */}
          <div className="h-px bg-cream-dark" />

          {/* Q2 — Sponsorship */}
          <section className="flex flex-col gap-4">
            <div>
              <h2 className="text-lg font-black text-navy-900">Would you like a sponsor?</h2>
              <p className="text-navy-600 text-sm mt-1">
                We can match your order with a sponsor who partially covers your costs — credited back to your account for future orders. No obligation, no branding changes without your approval.
              </p>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => setSponsorAccepted(true)}
                className={cn(
                  'flex flex-col items-start gap-2 rounded-xl border-2 p-4 text-left transition-all duration-150 active:scale-[.98] select-none',
                  sponsorAccepted === true
                    ? 'border-gold-500 bg-gold-50'
                    : 'border-navy-100 bg-white hover:border-navy-600',
                )}
              >
                <BadgeCheck className={cn('w-5 h-5 transition-colors', sponsorAccepted === true ? 'text-gold-500' : 'text-navy-600')} />
                <div>
                  <p className="text-sm font-bold text-navy-900">Yes, I&apos;m interested</p>
                  <p className="text-[11px] text-navy-600 mt-0.5 leading-snug">Earn store credits via a matched sponsor</p>
                </div>
              </button>

              <button
                type="button"
                onClick={() => setSponsorAccepted(false)}
                className={cn(
                  'flex flex-col items-start gap-2 rounded-xl border-2 p-4 text-left transition-all duration-150 active:scale-[.98] select-none',
                  sponsorAccepted === false
                    ? 'border-navy-600 bg-navy-50'
                    : 'border-navy-100 bg-white hover:border-navy-600',
                )}
              >
                <X className={cn('w-5 h-5 transition-colors', sponsorAccepted === false ? 'text-navy-900' : 'text-navy-600')} />
                <div>
                  <p className="text-sm font-bold text-navy-900">No thanks</p>
                  <p className="text-[11px] text-navy-600 mt-0.5 leading-snug">I&apos;ll order without a sponsor</p>
                </div>
              </button>
            </div>
          </section>

          {/* CTA */}
          <button
            onClick={handleContinue}
            disabled={!canProceed || loading}
            className={cn(
              'w-full flex items-center justify-center gap-2 rounded-xl py-4 font-bold text-base transition-all duration-150 select-none',
              canProceed
                ? 'bg-gold-500 hover:bg-gold-400 active:scale-[.98] text-navy-900 shadow-md shadow-gold-500/30'
                : 'bg-cream-dark text-navy-600 cursor-not-allowed',
            )}
          >
            {loading
              ? <Loader2 className="w-4 h-4 animate-spin" />
              : <>Order Sample Pack <ChevronRight className="w-4 h-4" /></>}
          </button>

          <p className="text-center text-[11px] text-navy-600">
            €10 incl. shipping · same-day dispatch · IE &amp; GB
          </p>
        </div>
      </main>
    </div>
  );
}
