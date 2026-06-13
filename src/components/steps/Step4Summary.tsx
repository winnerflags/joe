'use client';

import { ChevronLeft, ChevronRight, Clock, Edit2, FileText, ImageIcon, Package, Palette, QrCode, Star, Upload, Zap } from 'lucide-react';
import { useOrder } from '@/context/OrderContext';
import { useStepNavigation } from '@/hooks/useStepNavigation';
import { ARTWORK_EXTRAS, formatEuros, POSTAGE_CENTS, EXPRESS_FEE_CENTS, QR_LOGO_FEE_CENTS } from '@/lib/pricing';
import { getTurnaround, getTurnaroundNote } from '@/lib/turnaround';
import StepCard from '@/components/ui/StepCard';
import SummaryRow from '@/components/ui/SummaryRow';
import Button from '@/components/ui/Button';

const ARTWORK_LABELS: Record<string, { label: string; icon: React.ReactNode }> = {
  upload: { label: 'Upload Your Artwork', icon: <Upload className="w-4 h-4" /> },
  winnerflags_original: { label: 'WinnerFlags Original Design', icon: <Palette className="w-4 h-4" /> },
  verified_artist: { label: 'Verified Illustrator', icon: <Star className="w-4 h-4" /> },
};

export default function Step4Summary() {
  const { state } = useOrder();
  const { goNext, goPrev, goToStep } = useStepNavigation();

  const artworkType = state.artworkType!;
  const quantity = state.quantity!;
  const artworkInfo = ARTWORK_LABELS[artworkType];
  const turnaround = getTurnaround(artworkType);
  const turnaroundNote = getTurnaroundNote(artworkType);

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-bold text-navy-900">Review Your Order</h1>
        <p className="text-navy-600 mt-1 text-sm">Check everything looks right before payment.</p>
      </div>

      {/* Turnaround banner */}
      <div className="flex items-start gap-3 rounded-xl bg-gold-50 border border-gold-300 p-4">
        <Clock className="w-5 h-5 text-gold-500 flex-shrink-0 mt-0.5" />
        <div>
          <p className="text-sm font-semibold text-navy-900">Estimated turnaround: {turnaround}</p>
          <p className="text-xs text-navy-600 mt-0.5">{turnaroundNote}</p>
          {state.expressService && (
            <p className="text-xs font-semibold text-gold-500 mt-1 flex items-center gap-1">
              <Zap className="w-3 h-3" /> Express service applied
            </p>
          )}
        </div>
      </div>

      {/* Configuration section */}
      <StepCard>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-sm font-semibold text-navy-900 uppercase tracking-wide">Cards</h2>
          <button onClick={() => goToStep(1)} className="flex items-center gap-1 text-xs text-navy-600 hover:text-navy-900 transition-colors">
            <Edit2 className="w-3 h-3" /> Edit
          </button>
        </div>
        <div className="divide-y divide-cream-dark">
          <SummaryRow label="Quantity" value={`${quantity} cards`} />
          <SummaryRow
            label="Artwork"
            value={
              <span className="flex items-center gap-1.5">
                {artworkInfo.icon} {artworkInfo.label}
              </span>
            }
          />
          {state.qrLogoAddon && (
            <SummaryRow label="QR + Logo on back" value={<span className="flex items-center gap-1"><QrCode className="w-3 h-3" /> Yes</span>} />
          )}
          {state.expressService && (
            <SummaryRow label="Express Service" value="Yes" />
          )}
        </div>
      </StepCard>

      {/* Artwork / file */}
      <StepCard>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-sm font-semibold text-navy-900 uppercase tracking-wide">Artwork File</h2>
          {artworkType === 'upload' && (
            <button onClick={() => goToStep(2)} className="flex items-center gap-1 text-xs text-navy-600 hover:text-navy-900 transition-colors">
              <Edit2 className="w-3 h-3" /> Edit
            </button>
          )}
        </div>
        {artworkType === 'upload' && state.uploadedFile ? (
          <div className="flex items-center gap-3 rounded-lg bg-cream p-3 border border-cream-dark">
            {state.uploadedFile.previewUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={state.uploadedFile.previewUrl} alt="preview" className="w-10 h-10 rounded object-cover border border-navy-100" />
            ) : state.uploadedFile.mimeType === 'application/pdf' ? (
              <FileText className="w-8 h-8 text-navy-600" />
            ) : (
              <ImageIcon className="w-8 h-8 text-navy-600" />
            )}
            <div>
              <p className="text-sm font-medium text-navy-900">{state.uploadedFile.name}</p>
            </div>
          </div>
        ) : (
          <p className="text-sm text-navy-600">
            {ARTWORK_EXTRAS[artworkType as 'winnerflags_original' | 'verified_artist']?.label} — commissioned after payment.
          </p>
        )}
      </StepCard>

      {/* Details section */}
      <StepCard>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-sm font-semibold text-navy-900 uppercase tracking-wide">Card Details</h2>
          <button onClick={() => goToStep(3)} className="flex items-center gap-1 text-xs text-navy-600 hover:text-navy-900 transition-colors">
            <Edit2 className="w-3 h-3" /> Edit
          </button>
        </div>
        <div className="divide-y divide-cream-dark">
          <SummaryRow label="Bottom text" value={`"${state.cardBottomText}"`} />
          {state.artworkDescription && (
            <SummaryRow
              label="Artwork description"
              value={<span className="max-w-xs line-clamp-2 text-right">{state.artworkDescription}</span>}
            />
          )}
          {state.eventDescription && (
            <SummaryRow
              label="Event / occasion"
              value={<span className="max-w-xs line-clamp-2 text-right">{state.eventDescription}</span>}
            />
          )}
          <SummaryRow
            label="Finish"
            value={state.cardFinish === 'holographic' ? 'Holographic' : 'Strong Tactile'}
          />
        </div>
      </StepCard>

      {/* Pricing breakdown */}
      <StepCard>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-sm font-semibold text-navy-900 uppercase tracking-wide">Pricing</h2>
        </div>
        <div className="divide-y divide-cream-dark">
          <SummaryRow label={`${quantity} cards`} value={formatEuros(state.cardTotalCents ?? 0)} />
          {state.artworkExtraFeeCents > 0 && (
            <SummaryRow label={artworkInfo.label} value={`+${formatEuros(state.artworkExtraFeeCents)}`} />
          )}
          {state.qrLogoAddon && (
            <SummaryRow label="QR + Logo on back" value={`+${formatEuros(QR_LOGO_FEE_CENTS)}`} />
          )}
          <SummaryRow label="Standard Postage" value={<span className="flex items-center gap-1"><Package className="w-3 h-3" /> {formatEuros(POSTAGE_CENTS)}</span>} />
          {state.expressService && (
            <SummaryRow label="Express Service" value={`+${formatEuros(EXPRESS_FEE_CENTS)}`} />
          )}
        </div>
        <div className="mt-3 rounded-xl bg-navy-900 text-white px-4 py-3 flex items-center justify-between">
          <span className="text-sm font-semibold opacity-80">Total (incl. VAT)</span>
          <span className="text-xl font-bold text-gold-500">{formatEuros(state.totalCents ?? 0)}</span>
        </div>
      </StepCard>

      <div className="flex items-center justify-between">
        <Button variant="ghost" onClick={goPrev}>
          <ChevronLeft className="w-4 h-4" /> Back
        </Button>
        <Button onClick={goNext}>
          Proceed to Payment <ChevronRight className="w-4 h-4" />
        </Button>
      </div>
    </div>
  );
}
