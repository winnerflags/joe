'use client';

import { Check } from 'lucide-react';
import { cn } from '@/lib/cn';
import { useOrder } from '@/context/OrderContext';

const STEPS = [
  { n: 1, label: 'Add-ons' },
  { n: 2, label: 'Artwork' },
  { n: 3, label: 'Details' },
  { n: 4, label: 'Review' },
  { n: 5, label: 'Payment' },
] as const;

export default function ProgressIndicator() {
  const { state } = useOrder();
  const { currentStep, artworkType } = state;

  const progressFraction = (currentStep - 1) / (STEPS.length - 1);

  return (
    <div className="bg-white border-b border-cream-dark px-4 py-4">
      <div className="max-w-3xl mx-auto">
        <div className="relative">
          {/* Full track */}
          <div className="absolute top-[15px] left-[1rem] right-[1rem] h-0.5 bg-navy-100" />
          {/* Gold progress fill */}
          <div
            className="absolute top-[15px] left-[1rem] h-0.5 bg-gold-500 transition-[width] duration-500 ease-out"
            style={{ width: `calc((100% - 2rem) * ${progressFraction})` }}
          />

          <ol className="relative flex justify-between">
            {STEPS.map(({ n, label }) => {
              const isSkipped = n === 2 && artworkType !== null && artworkType !== 'upload';
              const isDone = currentStep > n || isSkipped;
              const isCurrent = currentStep === n && !isSkipped;
              const isFuture = currentStep < n && !isDone;

              return (
                <li key={n} className="flex flex-col items-center gap-1">
                  <div
                    className={cn(
                      'w-8 h-8 rounded-full flex items-center justify-center text-sm font-semibold transition-all border-2',
                      isDone && 'bg-gold-500 border-gold-500 text-navy-900',
                      isCurrent && 'bg-navy-900 border-navy-900 text-white ring-2 ring-offset-2 ring-gold-300',
                      isFuture && 'bg-white border-navy-100 text-navy-600',
                      isSkipped && 'bg-cream border-cream-dark text-navy-600 opacity-40',
                    )}
                  >
                    {isDone && !isSkipped ? <Check className="w-4 h-4" strokeWidth={3} /> : n}
                  </div>
                  <span
                    className={cn(
                      'text-[10px] font-semibold tracking-wide hidden sm:block',
                      isCurrent && 'text-navy-900',
                      isDone && 'text-gold-500',
                      isFuture && 'text-navy-600/50',
                      isSkipped && 'text-navy-600/40 line-through',
                    )}
                  >
                    {label}
                  </span>
                </li>
              );
            })}
          </ol>
        </div>
      </div>
    </div>
  );
}
