import type { ArtworkType } from '@/types/order';

export function getTurnaround(artworkType: ArtworkType): string {
  return artworkType === 'upload' ? '5–7 business days' : '14–21 business days';
}

export function getTurnaroundNote(artworkType: ArtworkType): string {
  if (artworkType === 'upload') {
    return 'Your artwork will be reviewed and production begins within 1 business day of approval.';
  }
  return 'Design work begins after order confirmation. You will receive a proof for approval before printing.';
}
