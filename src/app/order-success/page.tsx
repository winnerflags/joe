import { CheckCircle, Clock, Package } from 'lucide-react';
import Link from 'next/link';
import { getStripe } from '@/lib/stripe';
import { getTurnaround } from '@/lib/turnaround';
import Logo from '@/components/ui/Logo';
import type { ArtworkType } from '@/types/order';

interface Props {
  searchParams: Promise<{ session_id?: string; sample?: string }>;
}

const ARTWORK_LABELS: Record<string, string> = {
  upload: 'Your uploaded artwork',
  winnerflags_original: 'WinnerFlags Original Design (commissioned)',
  verified_artist: 'Verified Illustrator (commissioned)',
};

const STATUS_STEPS = [
  { id: 'pending', label: 'Proof Pending', sub: '4–12 hours', active: true },
  { id: 'approved', label: 'Approved', sub: 'Goes to print', active: false },
  { id: 'production', label: 'In Production', sub: 'Being printed', active: false },
  { id: 'dispatched', label: 'Dispatched', sub: 'On the way', active: false },
];

export default async function OrderSuccessPage({ searchParams }: Props) {
  const { session_id, sample } = await searchParams;
  const isSample = sample === 'true';

  let orderRef = 'N/A';
  let quantity = '';
  let artworkType = '';
  let cardBottomText = '';
  let turnaround = '';
  let totalCents = 0;
  let artistName = '';

  if (session_id) {
    try {
      const session = await getStripe().checkout.sessions.retrieve(session_id);
      const meta = session.metadata ?? {};
      orderRef = session_id.slice(-8).toUpperCase();
      quantity = meta.quantity ?? '';
      artworkType = meta.artwork_type ?? '';
      cardBottomText = meta.card_bottom_text ?? '';
      totalCents = Number(meta.total_cents ?? 0);
      turnaround = getTurnaround(artworkType as ArtworkType);
      artistName = meta.artist_name ?? '';
    } catch {
      // If retrieval fails, show generic confirmation
    }
  }

  return (
    <div className="min-h-screen bg-cream flex flex-col">
      <header className="bg-cream border-b border-cream-dark px-4 py-3">
        <div className="max-w-3xl mx-auto">
          <Logo variant="full" className="h-8 w-auto text-gold-500" />
        </div>
      </header>

      <main className="flex-1 flex flex-col items-center justify-center px-4 py-12">
        <div className="max-w-lg w-full flex flex-col gap-6">
          {/* Success icon */}
          <div className="flex flex-col items-center gap-3 text-center">
            <div className="w-16 h-16 rounded-full bg-gold-100 flex items-center justify-center">
              <CheckCircle className="w-9 h-9 text-gold-500" />
            </div>
            <h1 className="text-2xl font-bold text-navy-900">
              {isSample ? 'Sample Pack Confirmed!' : 'Order Confirmed!'}
            </h1>
            <p className="text-navy-600 text-sm">
              {isSample
                ? 'Your sample pack will be dispatched today. Expect delivery within 2–4 working days.'
                : 'Thank you for your order. We\'ve received your payment and will be in touch shortly.'}
            </p>
            {orderRef !== 'N/A' && (
              <p className="text-xs font-mono bg-navy-100 text-navy-900 px-3 py-1.5 rounded-full">
                Order ref: WF-{orderRef}
              </p>
            )}
          </div>

          {isSample ? (
            <>
              {/* Sample dispatch info */}
              <div className="flex items-start gap-3 rounded-xl bg-gold-50 border border-gold-300 p-4">
                <Clock className="w-5 h-5 text-gold-500 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm font-semibold text-navy-900">Same-day dispatch</p>
                  <p className="text-xs text-navy-600 mt-0.5">
                    Your sample is being packed now. Delivery typically 2–4 working days.
                  </p>
                </div>
              </div>

              {/* What's in the pack */}
              <div className="bg-white rounded-2xl shadow-sm border border-cream-dark p-6 flex flex-col gap-3">
                <h2 className="text-sm font-semibold text-navy-900 uppercase tracking-wide">What to expect</h2>
                <ol className="flex flex-col gap-2">
                  {[
                    'A set of sample winner flag cards showing our print quality and finishes.',
                    'Cards printed on 350gsm stock with a holographic or matte finish sample.',
                    'Once you\'ve seen the quality, order your custom run from the homepage.',
                  ].map((step, i) => (
                    <li key={i} className="flex items-start gap-3 text-sm text-navy-600">
                      <span className="flex-shrink-0 w-5 h-5 rounded-full bg-navy-100 text-navy-900 text-xs font-semibold flex items-center justify-center mt-0.5">
                        {i + 1}
                      </span>
                      {step}
                    </li>
                  ))}
                </ol>
              </div>

              <Link
                href="/order"
                className="w-full text-center bg-gold-500 hover:bg-gold-400 active:scale-[.98] text-navy-900 font-bold py-4 rounded-xl transition-all duration-150"
              >
                Ready to order your run? →
              </Link>
            </>
          ) : (
            <>
              {/* Proof status tracker */}
              <div className="bg-white rounded-2xl shadow-sm border border-cream-dark p-6">
                <h2 className="text-xs font-bold text-navy-600 uppercase tracking-widest mb-5">Proof status</h2>
                <div className="relative">
                  <div className="absolute top-[11px] left-[1rem] right-[1rem] h-0.5 bg-navy-100" />
                  <div className="absolute top-[11px] left-[1rem] h-0.5 bg-gold-500" style={{ width: '0%' }} />
                  <div className="relative flex justify-between">
                    {STATUS_STEPS.map((step) => (
                      <div key={step.id} className="flex flex-col items-center gap-1.5">
                        <div
                          className={`w-6 h-6 rounded-full border-2 flex-shrink-0 ${
                            step.active ? 'bg-gold-500 border-gold-500' : 'bg-white border-navy-100'
                          }`}
                        />
                        <p className={`text-[10px] font-semibold text-center leading-tight ${step.active ? 'text-navy-900' : 'text-navy-600/50'}`}>
                          {step.label}
                        </p>
                        <p className={`text-[9px] text-center ${step.active ? 'text-navy-600' : 'text-navy-600/40'}`}>{step.sub}</p>
                      </div>
                    ))}
                  </div>
                </div>
                <div className="mt-5 pt-4 border-t border-cream-dark">
                  <p className="text-xs text-navy-600">
                    <strong className="text-navy-900">Your proof is being prepared.</strong> If approved, your order moves to print. If rejected or if you dispute the proof, an automatic refund will be issued — no questions asked.
                  </p>
                </div>
              </div>

              {turnaround && (
                <div className="flex items-start gap-3 rounded-xl bg-gold-50 border border-gold-300 p-4">
                  <Clock className="w-5 h-5 text-gold-500 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="text-sm font-semibold text-navy-900">Estimated turnaround: {turnaround}</p>
                    <p className="text-xs text-navy-600 mt-0.5">
                      You&apos;ll receive a proof by email for approval before we go to print.
                    </p>
                  </div>
                </div>
              )}

              {quantity && (
                <div className="bg-white rounded-2xl shadow-sm border border-cream-dark p-6 flex flex-col gap-4">
                  <h2 className="text-sm font-semibold text-navy-900 uppercase tracking-wide">Your Order</h2>
                  <div className="flex flex-col gap-2 divide-y divide-cream-dark text-sm">
                    <div className="flex justify-between py-2">
                      <span className="text-navy-600">Cards</span>
                      <span className="font-medium text-navy-900">{quantity} cards</span>
                    </div>
                    {artworkType && (
                      <div className="flex justify-between py-2">
                        <span className="text-navy-600">Artwork</span>
                        <span className="font-medium text-navy-900 text-right max-w-[200px]">
                          {ARTWORK_LABELS[artworkType] ?? artworkType}
                        </span>
                      </div>
                    )}
                    {artistName && (
                      <div className="flex justify-between py-2">
                        <span className="text-navy-600">Artist</span>
                        <span className="font-medium text-navy-900">{artistName}</span>
                      </div>
                    )}
                    {cardBottomText && (
                      <div className="flex justify-between py-2">
                        <span className="text-navy-600">Card text</span>
                        <span className="font-medium text-navy-900">&ldquo;{cardBottomText}&rdquo;</span>
                      </div>
                    )}
                    {totalCents > 0 && (
                      <div className="flex justify-between py-2 font-bold">
                        <span className="text-navy-900">Total paid</span>
                        <span className="text-navy-900">€{(totalCents / 100).toFixed(2)}</span>
                      </div>
                    )}
                  </div>
                </div>
              )}

              <div className="bg-white rounded-2xl shadow-sm border border-cream-dark p-6 flex flex-col gap-3">
                <h2 className="text-sm font-semibold text-navy-900 uppercase tracking-wide">What happens next?</h2>
                <ol className="flex flex-col gap-2">
                  {[
                    'You\'ll receive an email confirmation shortly.',
                    'Our team will review your submission and send a digital proof within 4–12 hours.',
                    'Approve your proof by email — or dispute it for a full refund.',
                    'Cards are printed and dispatched once approved.',
                  ].map((step, i) => (
                    <li key={i} className="flex items-start gap-3 text-sm text-navy-600">
                      <span className="flex-shrink-0 w-5 h-5 rounded-full bg-navy-100 text-navy-900 text-xs font-semibold flex items-center justify-center mt-0.5">
                        {i + 1}
                      </span>
                      {step}
                    </li>
                  ))}
                </ol>
              </div>

              <Link
                href="/order"
                className="text-center text-sm text-navy-600 hover:text-navy-900 underline transition-colors"
              >
                Back to WinnerFlags
              </Link>
            </>
          )}

          <div className="flex items-center justify-center gap-4">
            <Package className="w-4 h-4 text-navy-600" />
            <p className="text-xs text-navy-600">Questions? Contact us at <strong>hello@winnerflags.com</strong></p>
          </div>
        </div>
      </main>
    </div>
  );
}
