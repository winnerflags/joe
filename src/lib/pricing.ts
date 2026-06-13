import type { ArtworkType, QuantityOption } from '@/types/order';

export interface PricingTier {
  quantity: QuantityOption;
  totalCents: number;
  savingPercent: number | null;
}

export const PRICING_TIERS: PricingTier[] = [
  { quantity: 20,  totalCents: 2900,  savingPercent: null },
  { quantity: 40,  totalCents: 4900,  savingPercent: 15 },
  { quantity: 60,  totalCents: 6500,  savingPercent: 25 },
  { quantity: 80,  totalCents: 7900,  savingPercent: 32 },
  { quantity: 100, totalCents: 8900,  savingPercent: 39 },
  { quantity: 150, totalCents: 11900, savingPercent: 45 },
];

export const ARTWORK_EXTRAS: Record<Exclude<ArtworkType, 'upload'>, { feeCents: number; label: string }> = {
  verified_artist: {
    feeCents: 15000,
    label: 'Verified Illustrator Commission',
  },
  winnerflags_original: {
    feeCents: 25000,
    label: 'WinnerFlags Original Design',
  },
};

export const POSTAGE_CENTS = 1000;
export const EXPRESS_FEE_CENTS = 2500;
export const QR_LOGO_FEE_CENTS = 5000;
export const SAMPLE_PACK_CENTS = 1000;

export function getCardTotal(qty: QuantityOption): number {
  return PRICING_TIERS.find((t) => t.quantity === qty)!.totalCents;
}

export function getArtworkExtra(type: ArtworkType): number {
  if (type === 'upload') return 0;
  return ARTWORK_EXTRAS[type].feeCents;
}

export function formatEuros(cents: number): string {
  return `€${(cents / 100).toFixed(2).replace(/\.00$/, '')}`;
}
