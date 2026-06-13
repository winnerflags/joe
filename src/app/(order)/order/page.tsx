'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { ChevronRight, Package, Quote, Star, Sparkles, BadgeCheck, Zap, Gem } from 'lucide-react';
import { useOrder } from '@/context/OrderContext';
import { PRICING_TIERS, formatEuros } from '@/lib/pricing';
import { cn } from '@/lib/cn';
import Logo from '@/components/ui/Logo';
import type { QuantityOption } from '@/types/order';

interface GalleryCard {
  edition: number;
  event: string;
  subtitle: string;
  date: string;
  venue: string;
  bg: string;
  fg: string;
  accent: string;
  eventType: string;
  story: string;
}

const GALLERY: GalleryCard[] = [
  {
    edition: 347,
    event: 'Trad Folkin Raps',
    subtitle: 'Hazey Haze · Strangeboy · Dyrt',
    date: 'Apr 25',
    venue: 'Record Room, The Commercial',
    bg: '#121212',
    fg: '#FEF9ED',
    accent: '#F5C35D',
    eventType: 'Live music',
    story: 'Handed out to the 80 people in the crowd. Collectors\' items by last call — a memento of a one-off night nobody wanted to end.',
  },
  {
    edition: 346,
    event: 'County Final',
    subtitle: 'Player of the Match',
    date: 'Mar 18',
    venue: 'Gaelic Grounds',
    bg: '#F5C35D',
    fg: '#121212',
    accent: '#121212',
    eventType: 'GAA presentation',
    story: 'Given to every starting player post-whistle. Framed behind three bars before the week was out.',
  },
  {
    edition: 345,
    event: 'Schools Cup Final',
    subtitle: 'MVP Award',
    date: 'Feb 11',
    venue: 'Thomond Park',
    bg: '#FEF9ED',
    fg: '#121212',
    accent: '#F5C35D',
    eventType: 'Schools rugby',
    story: 'Signed by the whole squad and auctioned for the parents\' fund. Raised €2,400 in one evening.',
  },
  {
    edition: 344,
    event: 'Club Awards',
    subtitle: 'Top Scorer · 2026 Season',
    date: 'Jan 30',
    venue: 'Clubhouse Bar',
    bg: '#1A1A1A',
    fg: '#F5C35D',
    accent: '#FEF9ED',
    eventType: 'End-of-season awards',
    story: 'Replaced the usual envelope handshake. Players actually got up for the photo this time.',
  },
  {
    edition: 343,
    event: 'Finals Night',
    subtitle: 'Ye Vagabonds · Lankum',
    date: 'Jan 12',
    venue: 'Olympia Theatre',
    bg: '#F5C35D',
    fg: '#121212',
    accent: '#FFFFFF',
    eventType: 'Live music',
    story: 'Bundled into the ticket envelope. Went home with every single attendee — a proper keepsake of the tour close.',
  },
  {
    edition: 342,
    event: 'Rowing Regatta',
    subtitle: 'Crew of the Year',
    date: 'Dec 18',
    venue: 'Castleconnell',
    bg: '#121212',
    fg: '#FFFFFF',
    accent: '#F5C35D',
    eventType: 'Club regatta',
    story: 'Presented at the breakfast the morning after. Every clubhouse wall now has one pinned behind the bar.',
  },
];

const REVIEWS = [
  {
    name: 'Aoife M.',
    role: 'Gig promoter · Limerick',
    quote: 'Punters still talk about the cards months later. The proof flow made it stupid-easy to nail the artwork first try.',
  },
  {
    name: 'Ciarán B.',
    role: 'GAA club secretary',
    quote: 'Framed ones hang in half the houses in the parish now. Best €89 the club spent all season.',
  },
  {
    name: 'Róisín O.',
    role: 'Event producer',
    quote: 'Beautifully printed, properly numbered, delivered on time. We ordered more for the next run before the first lot arrived.',
  },
];

function SamplePackButton() {
  const router = useRouter();

  return (
    <div className="rounded-xl border border-gold-300 bg-gold-50 p-4 flex items-center justify-between gap-3 mb-5">
      <div className="flex items-start gap-3 min-w-0">
        <Package className="w-4 h-4 text-gold-500 flex-shrink-0 mt-0.5" />
        <div className="min-w-0">
          <p className="text-[10px] font-bold uppercase tracking-widest text-navy-600">Try before you commit</p>
          <p className="text-sm font-black text-navy-900 mt-0.5">Sample Pack — €10</p>
          <p className="text-[11px] text-navy-600 mt-0.5">Incl. shipping · same-day dispatch</p>
        </div>
      </div>
      <button
        onClick={() => router.push('/sample')}
        className="flex-shrink-0 flex items-center gap-1.5 rounded-lg border-2 border-gold-500 bg-white hover:bg-gold-50 active:scale-[.97] px-3 py-2 text-xs font-bold text-navy-900 transition-all duration-150 select-none"
      >
        Order sample <ChevronRight className="w-3 h-3" />
      </button>
    </div>
  );
}

export default function LandingPage() {
  const router = useRouter();
  const { dispatch } = useOrder();
  const [selected, setSelected] = useState<QuantityOption | null>(null);
  const [flipped, setFlipped] = useState<number | null>(null);

  function handleContinue() {
    if (!selected) return;
    dispatch({ type: 'SET_QUANTITY', payload: selected });
    router.push('/order/step/1');
  }

  return (
    <div className="min-h-screen bg-cream flex flex-col">
      {/* Nav */}
      <nav className="bg-cream border-b border-cream-dark px-4 md:px-8 py-3 sticky top-0 z-40">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <Logo variant="full" className="h-9 w-auto text-gold-500" />
          <button
            onClick={() => {
              document.getElementById('order')?.scrollIntoView({ behavior: 'smooth' });
            }}
            className="text-xs md:text-sm font-bold uppercase tracking-widest text-navy-700 hover:text-gold-500 transition-colors"
          >
            Order
          </button>
        </div>
      </nav>

      {/* Order hero */}
      <section id="order" className="px-4 pt-10 md:pt-14 pb-16">
        <div className="max-w-5xl mx-auto grid md:grid-cols-[1.1fr_1fr] gap-10 md:gap-14 items-start">
          {/* Left — intro */}
          <div className="flex flex-col gap-5">
            <div className="inline-flex self-start items-center gap-2 bg-gold-500 text-navy-900 text-[11px] font-bold px-3 py-1 rounded-full tracking-widest uppercase">
              <Sparkles className="w-3 h-3" /> 2026 · 33rd Edition
            </div>
            <h1 className="text-5xl md:text-6xl font-black leading-[0.95] tracking-tight text-navy-900">
              Give your attendees<br />
              <span className="text-gold-500">something they&apos;ll</span><br />
              actually keep.
            </h1>
            <div className="flex items-center gap-2">
              <div className="flex">
                {[...Array(5)].map((_, i) => (
                  <Star key={i} className="w-4 h-4 fill-gold-500 text-gold-500" />
                ))}
              </div>
              <span className="text-xs font-semibold text-navy-600">Proven to work &amp; loved by organisers</span>
            </div>
            <p className="text-navy-600 text-base md:text-lg leading-relaxed max-w-md">
              Illustrated, numbered cards — proof-approved before we print,
              dispatched same day. Pick a run size to get started.
            </p>

            <div className="hidden md:flex flex-wrap gap-3 mt-1">
              {[
                { icon: <BadgeCheck className="w-4 h-4" />, label: 'Free Digital Proof' },
                { icon: <Zap className="w-4 h-4" />,        label: 'Fastest Turnarounds' },
                { icon: <Gem className="w-4 h-4" />,         label: 'Premium Stock' },
              ].map(({ icon, label }) => (
                <span key={label} className="inline-flex items-center gap-1.5 bg-gold-500/10 text-navy-900 border border-gold-300 rounded-full px-3 py-1 text-[11px] font-bold uppercase tracking-wider">
                  <span className="text-gold-500">{icon}</span>{label}
                </span>
              ))}
            </div>
          </div>

          {/* Right — order panel */}
          <div className="bg-white rounded-2xl border border-cream-dark shadow-lg shadow-navy-900/5 p-5 md:p-6">
            <SamplePackButton />
            <div className="h-px bg-cream-dark mb-5" />
            <p className="text-[11px] font-bold uppercase tracking-widest text-navy-600 mb-4">Choose run size</p>

            <div className="flex flex-col gap-2 mb-5">
              {PRICING_TIERS.map((tier) => {
                const isSelected = selected === tier.quantity;
                const perCard = Math.round(tier.totalCents / tier.quantity);
                return (
                  <button
                    key={tier.quantity}
                    onClick={() => setSelected(tier.quantity)}
                    className={cn(
                      'flex items-center rounded-xl border-2 p-3 text-left transition-all duration-150 active:scale-[.99] select-none',
                      isSelected
                        ? 'border-gold-500 bg-gold-50 shadow-sm shadow-gold-300/30'
                        : 'border-navy-100 bg-white hover:border-navy-600',
                    )}
                  >
                    <div
                      className={cn(
                        'w-4 h-4 rounded-full border-2 flex-shrink-0 mr-3 flex items-center justify-center transition-colors',
                        isSelected ? 'border-gold-500 bg-gold-500' : 'border-navy-100',
                      )}
                    >
                      {isSelected && <div className="w-1.5 h-1.5 rounded-full bg-white" />}
                    </div>
                    <span className="text-base font-bold text-navy-900 w-10 flex-shrink-0">{tier.quantity}</span>
                    <span className="text-xs text-navy-600 flex-1">cards · {formatEuros(perCard)} ea</span>
                    <span className="text-sm font-bold text-navy-900 mr-2">{formatEuros(tier.totalCents)}</span>
                    {tier.savingPercent && (
                      <span className="text-[9px] font-bold bg-gold-500 text-navy-900 px-1.5 py-0.5 rounded-full whitespace-nowrap">
                        −{tier.savingPercent}%
                      </span>
                    )}
                  </button>
                );
              })}

              <button
                onClick={() => router.push('/enquiry')}
                className="flex items-center rounded-xl border-2 border-dashed border-navy-100 bg-white hover:border-gold-500 hover:bg-gold-50 p-3 text-left transition-all duration-150 active:scale-[.99] select-none"
              >
                <div className="w-4 h-4 rounded-full border-2 border-navy-100 flex-shrink-0 mr-3" />
                <span className="text-base font-bold text-navy-900 w-10 flex-shrink-0">150+</span>
                <span className="text-xs text-navy-600 flex-1">bulk · custom quote</span>
                <ChevronRight className="w-4 h-4 text-navy-600" />
              </button>
            </div>

            <button
              onClick={handleContinue}
              disabled={!selected}
              className={cn(
                'w-full flex items-center justify-center gap-2 rounded-xl py-4 font-bold text-base transition-all duration-150 select-none',
                selected
                  ? 'bg-gold-500 hover:bg-gold-400 active:scale-[.98] text-navy-900 shadow-md shadow-gold-500/30'
                  : 'bg-cream-dark text-navy-600 cursor-not-allowed',
              )}
            >
              Continue <ChevronRight className="w-4 h-4" />
            </button>

            <p className="text-center text-[11px] text-navy-600 mt-3">
              {selected ? 'Next: choose artwork & add-ons' : 'Postage included · proof before print'}
            </p>
          </div>
        </div>
      </section>

      {/* What are WinnerFlags */}
      <section className="bg-navy-100 px-4 py-14 md:py-20">
        <div className="max-w-3xl mx-auto text-center">
          <p className="text-[11px] font-bold uppercase tracking-[0.3em] text-gold-500 mb-4">What are winnerflags?</p>
          <h2 className="text-3xl md:text-4xl font-black leading-tight mb-5 text-navy-900">
            Moments, made into something you can hold.
          </h2>
          <p className="text-base md:text-lg leading-relaxed text-navy-600">
            A WinnerFlag is a numbered, illustrated card — part ticket stub, part trading card, part trophy.
            We make them for gigs, GAA presentations, schools cups, awards nights, and any evening that deserves
            to outlast the bar tab. Every run is printed on 350gsm stock, numbered by hand, and limited
            to the edition you order.
          </p>
        </div>
      </section>

      {/* Gallery */}
      <section className="px-4 py-14 md:py-20">
        <div className="max-w-6xl mx-auto">
          <div className="flex items-end justify-between mb-6 md:mb-8 px-1">
            <div>
              <p className="text-[11px] font-bold uppercase tracking-[0.3em] text-navy-600 mb-1">Recent editions</p>
              <h2 className="text-2xl md:text-3xl font-black text-navy-900">Flip a card to see the story.</h2>
            </div>
            <p className="hidden sm:block text-xs text-navy-600 max-w-xs text-right">
              Scroll →
            </p>
          </div>

          <div className="relative">
            <div className="overflow-x-auto pb-4 -mx-4 px-4 scroll-smooth [scrollbar-width:thin]">
              <div className="flex gap-4 md:gap-5">
                {GALLERY.map((card) => {
                  const isFlipped = flipped === card.edition;
                  return (
                    <button
                      key={card.edition}
                      type="button"
                      onClick={() => setFlipped(isFlipped ? null : card.edition)}
                      className="group flex-shrink-0 w-[240px] md:w-[260px] aspect-[3/4] [perspective:1200px] select-none"
                    >
                      <div
                        className="relative w-full h-full transition-transform duration-700 [transform-style:preserve-3d]"
                        style={{ transform: isFlipped ? 'rotateY(180deg)' : 'rotateY(0deg)' }}
                      >
                        {/* Front */}
                        <div
                          className="absolute inset-0 rounded-2xl border border-navy-900/10 shadow-md [backface-visibility:hidden] flex flex-col p-5 overflow-hidden"
                          style={{ background: card.bg, color: card.fg }}
                        >
                          <div className="flex items-start justify-between text-[10px] font-mono font-bold opacity-60">
                            <span>No. {card.edition}</span>
                            <span>2026</span>
                          </div>
                          <div className="flex-1 flex flex-col items-center justify-center text-center gap-2">
                            <span className="text-[9px] font-bold uppercase tracking-[0.25em] opacity-60">{card.venue}</span>
                            <span className="text-2xl font-black leading-none">{card.event}</span>
                            <span className="text-[10px] font-semibold opacity-80">{card.subtitle}</span>
                          </div>
                          <div className="flex items-center justify-between">
                            <span className="text-[9px] font-bold uppercase tracking-widest opacity-60">Winner Flag</span>
                            <span
                              className="text-[10px] font-bold uppercase tracking-wide px-2 py-0.5 rounded"
                              style={{ background: card.accent, color: card.accent === '#F5C35D' || card.accent === '#FEF9ED' || card.accent === '#FFFFFF' ? '#121212' : '#FEF9ED' }}
                            >
                              {card.date}
                            </span>
                          </div>
                          <span className="absolute bottom-2 right-3 text-[9px] font-semibold uppercase tracking-wider opacity-40 group-hover:opacity-100 transition-opacity">
                            Tap →
                          </span>
                        </div>

                        {/* Back */}
                        <div
                          className="absolute inset-0 rounded-2xl border border-navy-900/10 bg-cream shadow-md [backface-visibility:hidden] flex flex-col p-5 text-left"
                          style={{ transform: 'rotateY(180deg)' }}
                        >
                          <span className="text-[10px] font-bold uppercase tracking-[0.25em] text-gold-500">
                            {card.eventType}
                          </span>
                          <h3 className="text-xl font-black text-navy-900 mt-1 leading-tight">{card.event}</h3>
                          <p className="text-[11px] text-navy-600 mt-0.5">{card.venue} · {card.date}</p>
                          <div className="h-px bg-cream-dark my-3" />
                          <p className="text-sm text-navy-900 leading-relaxed flex-1">{card.story}</p>
                          <span className="text-[9px] font-semibold uppercase tracking-wider text-navy-600 self-end mt-2">
                            ← Tap to flip
                          </span>
                        </div>
                      </div>
                    </button>
                  );
                })}
                <div className="flex-shrink-0 w-1" />
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Reviews */}
      <section className="bg-cream border-y border-cream-dark px-4 py-14 md:py-20">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-10">
            <div className="inline-flex items-center gap-1 mb-3">
              {[0, 1, 2, 3, 4].map((i) => (
                <Star key={i} className="w-4 h-4 text-gold-500 fill-gold-500" />
              ))}
            </div>
            <h2 className="text-2xl md:text-3xl font-black text-navy-900 mb-2">
              Trusted by clubs, promoters, and people who hate forgetting good nights.
            </h2>
          </div>

          <div className="grid md:grid-cols-3 gap-4 md:gap-5">
            {REVIEWS.map((r) => (
              <figure
                key={r.name}
                className="bg-white rounded-2xl border border-cream-dark p-6 flex flex-col gap-4"
              >
                <Quote className="w-6 h-6 text-gold-500" />
                <blockquote className="text-sm text-navy-900 leading-relaxed flex-1">
                  &ldquo;{r.quote}&rdquo;
                </blockquote>
                <figcaption>
                  <p className="text-sm font-bold text-navy-900">{r.name}</p>
                  <p className="text-xs text-navy-600">{r.role}</p>
                </figcaption>
              </figure>
            ))}
          </div>
        </div>
      </section>

      {/* World of memories */}
      <section className="px-4 py-16 md:py-24">
        <div className="max-w-3xl mx-auto text-center">
          <h2 className="text-4xl md:text-5xl font-black leading-[1.05] tracking-tight text-navy-900 mb-5">
            Building a world of memories <span className="text-gold-500">worth sharing.</span>
          </h2>
          <p className="text-base md:text-lg text-navy-600 leading-relaxed max-w-xl mx-auto mb-8">
            Every card we print ends up pinned, framed, or passed around. That&rsquo;s the point —
            a small, physical thing that turns a night into a story you can hand to someone else.
          </p>
          <button
            onClick={() => document.getElementById('order')?.scrollIntoView({ behavior: 'smooth' })}
            className="inline-flex items-center gap-2 bg-gold-500 hover:bg-gold-400 active:scale-[.98] text-navy-900 font-bold px-7 py-3.5 rounded-xl text-base transition-all duration-150 shadow-md shadow-gold-500/30 select-none"
          >
            Start your edition <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-cream-dark border-t border-navy-100 px-4 py-8">
        <div className="max-w-6xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
          <Logo variant="full" className="h-7 w-auto text-gold-500" />
          <p className="text-[11px] text-navy-600 uppercase tracking-widest">
            © 2026 WinnerFlags · Limerick · Ireland
          </p>
        </div>
      </footer>
    </div>
  );
}
