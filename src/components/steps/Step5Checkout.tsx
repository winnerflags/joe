'use client';

import { useState } from 'react';
import { ChevronLeft, Lock, ShieldCheck, Zap } from 'lucide-react';
import { useOrder } from '@/context/OrderContext';
import { useStepNavigation } from '@/hooks/useStepNavigation';
import { formatEuros } from '@/lib/pricing';
import { getTurnaround } from '@/lib/turnaround';
import StepCard from '@/components/ui/StepCard';
import Button from '@/components/ui/Button';

export default function Step5Checkout() {
  const { state } = useOrder();
  const { goPrev } = useStepNavigation();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handlePay() {
    setError(null);
    setLoading(true);
    try {
      const res = await fetch('/api/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ order: state }),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Could not create checkout session');
      }
      const data = await res.json();
      window.location.href = data.sessionUrl;
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Something went wrong. Please try again.');
      setLoading(false);
    }
  }

  return (
    <div className="flex flex-col gap-5">
      <div>
        <h1 className="text-2xl font-bold text-navy-900">Payment</h1>
        <p className="text-navy-600 mt-1 text-sm">
          You&apos;ll be redirected to Stripe&apos;s secure checkout.
        </p>
      </div>

      {/* Order recap */}
      <StepCard>
        <h2 className="text-xs font-bold text-navy-600 uppercase tracking-widest mb-4">Order summary</h2>
        <div className="flex flex-col gap-2 text-sm">
          <div className="flex justify-between">
            <span className="text-navy-600">{state.quantity} WinnerFlag cards</span>
            <span className="font-medium text-navy-900">{formatEuros(state.cardTotalCents ?? 0)}</span>
          </div>
          {state.artworkExtraFeeCents > 0 && (
            <div className="flex justify-between">
              <span className="text-navy-600">Design fee</span>
              <span className="font-medium text-navy-900">{formatEuros(state.artworkExtraFeeCents)}</span>
            </div>
          )}
          {state.qrLogoAddon && (
            <div className="flex justify-between">
              <span className="text-navy-600">QR + Logo on back</span>
              <span className="font-medium text-navy-900">{formatEuros(state.qrLogoFeeCents)}</span>
            </div>
          )}
          <div className="flex justify-between">
            <span className="text-navy-600">Postage</span>
            <span className="font-medium text-navy-900">{formatEuros(state.postageCents)}</span>
          </div>
          {state.expressService && (
            <div className="flex justify-between">
              <span className="text-navy-600 flex items-center gap-1">
                <Zap className="w-3 h-3" /> Express service
              </span>
              <span className="font-medium text-navy-900">{formatEuros(state.expressFeeCents)}</span>
            </div>
          )}
        </div>

        <div className="mt-4 rounded-xl bg-navy-100 border border-navy-100 px-4 py-3 flex items-center justify-between">
          <span className="text-sm font-semibold text-navy-600">Total</span>
          <span className="text-xl font-bold text-gold-500">{formatEuros(state.totalCents ?? 0)}</span>
        </div>

        <div className="mt-3 flex items-start gap-2 rounded-lg bg-cream border border-cream-dark p-3">
          <ShieldCheck className="w-4 h-4 text-gold-500 flex-shrink-0 mt-0.5" />
          <p className="text-xs text-navy-600 leading-relaxed">
            Estimated turnaround:{' '}
            <strong className="text-navy-900">{getTurnaround(state.artworkType!)}</strong>.
            A proof will be emailed to you for approval before production begins.
          </p>
        </div>
      </StepCard>

      {/* Error */}
      {error && (
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600">
          {error}
        </div>
      )}

      {/* Pay action */}
      <div className="flex flex-col gap-3">
        <div className="flex items-center justify-center gap-2 text-xs text-navy-600">
          <Lock className="w-3.5 h-3.5 text-gold-500" />
          Secured by Stripe · WinnerFlags never stores your card details
        </div>

        <Button
          onClick={handlePay}
          loading={loading}
          className="w-full justify-center py-4 text-base font-bold"
        >
          Pay {formatEuros(state.totalCents ?? 0)} securely
        </Button>

        <Button variant="ghost" onClick={goPrev} className="w-full justify-center">
          <ChevronLeft className="w-4 h-4" /> Back to review
        </Button>
      </div>
    </div>
  );
}
