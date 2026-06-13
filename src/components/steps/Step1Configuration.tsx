'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { ChevronLeft, ChevronRight, Palette, Upload, Star, Zap, QrCode, Check } from 'lucide-react';
import { useOrder } from '@/context/OrderContext';
import { useStepNavigation } from '@/hooks/useStepNavigation';
import { ARTWORK_EXTRAS, POSTAGE_CENTS, EXPRESS_FEE_CENTS, QR_LOGO_FEE_CENTS, formatEuros, getCardTotal } from '@/lib/pricing';
import { cn } from '@/lib/cn';
import StepCard from '@/components/ui/StepCard';
import Button from '@/components/ui/Button';
import type { ArtworkType } from '@/types/order';

const ARTWORK_OPTIONS: Array<{
  type: ArtworkType;
  label: string;
  description: string;
  badge: string;
  icon: React.ReactNode;
}> = [
  {
    type: 'upload',
    label: 'Upload Your Artwork',
    description: 'Provide your own print-ready design file (PNG, PDF, or AI).',
    badge: 'Included',
    icon: <Upload className="w-6 h-6" />,
  },
  {
    type: 'verified_artist',
    label: 'Verified Illustrator',
    description: 'Commission a verified independent illustrator for a unique piece.',
    badge: `+${formatEuros(ARTWORK_EXTRAS.verified_artist.feeCents)}`,
    icon: <Star className="w-6 h-6" />,
  },
  {
    type: 'winnerflags_original',
    label: 'WinnerFlags Original',
    description: 'Our in-house designer creates a custom illustration for your event.',
    badge: `+${formatEuros(ARTWORK_EXTRAS.winnerflags_original.feeCents)}`,
    icon: <Palette className="w-6 h-6" />,
  },
];

export default function Step1Configuration() {
  const router = useRouter();
  const { state, dispatch } = useOrder();
  const { goNext, canProceed } = useStepNavigation();

  useEffect(() => {
    if (state.quantity === null) {
      router.replace('/order');
    }
  }, [state.quantity, router]);

  return (
    <div className="flex flex-col gap-6">
      <div>
        <div className="flex items-center gap-2 mb-3">
          <span className="inline-flex items-center gap-2 bg-cream border border-cream-dark rounded-full px-3 py-1 text-xs">
            <span className="font-bold text-navy-900">{state.quantity} cards</span>
            <span className="text-navy-600">·</span>
            <span className="text-navy-600">{formatEuros(getCardTotal(state.quantity!))}</span>
            <span className="text-navy-100 select-none">·</span>
            <button
              onClick={() => router.push('/order')}
              className="text-navy-600 hover:text-navy-900 underline transition-colors"
            >
              Change
            </button>
          </span>
        </div>
        <h1 className="text-2xl font-bold text-navy-900">Add-ons &amp; Delivery</h1>
        <p className="text-navy-600 mt-1 text-sm">Choose your artwork option and any extras.</p>
      </div>

      {/* Artwork type */}
      <StepCard>
        <h2 className="text-base font-semibold text-navy-900 mb-4">Artwork option</h2>
        <div className="flex flex-col gap-3">
          {ARTWORK_OPTIONS.map((opt) => {
            const isSelected = state.artworkType === opt.type;
            return (
              <button
                key={opt.type}
                onClick={() => dispatch({ type: 'SET_ARTWORK_TYPE', payload: opt.type })}
                className={cn(
                  'flex items-start gap-4 rounded-xl border-2 p-4 text-left transition-all duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold-500 active:scale-[.98] select-none',
                  isSelected
                    ? 'border-gold-500 bg-gold-50 shadow-sm shadow-gold-300/50'
                    : 'border-navy-100 bg-white hover:border-navy-600 hover:shadow-sm',
                )}
              >
                <div className={cn('mt-0.5 flex-shrink-0', isSelected ? 'text-gold-500' : 'text-navy-600')}>
                  {opt.icon}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-sm font-semibold text-navy-900">{opt.label}</span>
                    <span
                      className={cn(
                        'text-xs font-semibold px-2 py-0.5 rounded-full',
                        opt.type === 'upload'
                          ? 'bg-navy-100 text-navy-600'
                          : 'bg-gold-100 text-navy-900',
                      )}
                    >
                      {opt.badge}
                    </span>
                  </div>
                  <p className="text-xs text-navy-600 mt-0.5 leading-relaxed">{opt.description}</p>
                </div>
                <div className={cn('w-5 h-5 rounded-full border-2 flex-shrink-0 mt-0.5 transition-colors', isSelected ? 'border-gold-500 bg-gold-500' : 'border-navy-100')}>
                  {isSelected && <div className="w-full h-full rounded-full flex items-center justify-center"><div className="w-2 h-2 rounded-full bg-white" /></div>}
                </div>
              </button>
            );
          })}
        </div>
      </StepCard>

      {/* Add-ons */}
      <StepCard>
        <h2 className="text-base font-semibold text-navy-900 mb-4">Extras &amp; delivery</h2>
        <div className="flex flex-col gap-3">
          {/* QR + Logo */}
          <button
            onClick={() => dispatch({ type: 'SET_QR_LOGO', payload: !state.qrLogoAddon })}
            className={cn(
              'flex items-start gap-4 rounded-xl border-2 p-4 text-left transition-all duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold-500 active:scale-[.98] select-none',
              state.qrLogoAddon ? 'border-gold-500 bg-gold-50 shadow-sm shadow-gold-300/50' : 'border-navy-100 bg-white hover:border-navy-600 hover:shadow-sm',
            )}
          >
            <QrCode className={cn('w-5 h-5 flex-shrink-0 mt-0.5', state.qrLogoAddon ? 'text-gold-500' : 'text-navy-600')} />
            <div className="flex-1">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-sm font-semibold text-navy-900">Custom QR + Logo on back</span>
                <span className={cn('text-xs font-semibold px-2 py-0.5 rounded-full', state.qrLogoAddon ? 'bg-gold-500 text-navy-900' : 'bg-gold-100 text-navy-900')}>
                  +{formatEuros(QR_LOGO_FEE_CENTS)}
                </span>
              </div>
              <p className="text-xs text-navy-600 mt-0.5">Printed QR code linking to your club or event page, plus your club crest or logo.</p>
            </div>
            <div className={cn('w-5 h-5 rounded border-2 flex-shrink-0 mt-0.5 flex items-center justify-center transition-all', state.qrLogoAddon ? 'border-gold-500 bg-gold-500' : 'border-navy-100')}>
              {state.qrLogoAddon && <Check className="w-3 h-3 text-white" strokeWidth={3} />}
            </div>
          </button>

          <p className="text-xs text-navy-600 px-1">
            Standard tracked postage ({formatEuros(POSTAGE_CENTS)}) is included with every order. Upgrade to express below.
          </p>

          {/* Express toggle */}
          <button
            onClick={() => dispatch({ type: 'SET_EXPRESS', payload: !state.expressService })}
            className={cn(
              'flex items-center gap-4 rounded-xl border-2 p-4 text-left transition-all duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold-500 active:scale-[.98] select-none',
              state.expressService ? 'border-gold-500 bg-gold-50 shadow-sm shadow-gold-300/50' : 'border-navy-100 bg-white hover:border-navy-600 hover:shadow-sm',
            )}
          >
            <Zap className={cn('w-5 h-5 flex-shrink-0', state.expressService ? 'text-gold-500' : 'text-navy-600')} />
            <div className="flex-1">
              <span className="text-sm font-semibold text-navy-900">Express Service</span>
              <p className="text-xs text-navy-600">Priority production. Moved to the front of the queue.</p>
            </div>
            <div className="flex items-center gap-3">
              <span className="text-sm font-semibold text-navy-900">+{formatEuros(EXPRESS_FEE_CENTS)}</span>
              <div className={cn('w-5 h-5 rounded-full border-2 flex-shrink-0 transition-colors', state.expressService ? 'border-gold-500 bg-gold-500' : 'border-navy-100')}>
                {state.expressService && <div className="w-full h-full rounded-full flex items-center justify-center"><div className="w-2 h-2 rounded-full bg-white" /></div>}
              </div>
            </div>
          </button>
        </div>
      </StepCard>

      {/* Total */}
      {state.totalCents !== null && (
        <div className="flex items-center justify-between rounded-xl bg-navy-900 text-white px-6 py-4">
          <span className="text-sm font-medium opacity-80">Order total</span>
          <span className="text-2xl font-bold">{formatEuros(state.totalCents)}</span>
        </div>
      )}

      <div className="flex items-center justify-between">
        <Button variant="ghost" onClick={() => router.push('/order')}>
          <ChevronLeft className="w-4 h-4" /> Back
        </Button>
        <div className="flex flex-col items-end gap-1">
          <Button onClick={goNext} disabled={!canProceed()}>
            Continue <ChevronRight className="w-4 h-4" />
          </Button>
          {!canProceed() && (
            <p className="text-[11px] text-navy-600 animate-fade-up">
              Select an artwork option above
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
