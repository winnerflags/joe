import { z } from 'zod';

export const step1Schema = z.object({
  quantity: z.number(),
  artworkType: z.enum(['upload', 'winnerflags_original', 'verified_artist']),
});

export const step2Schema = z.object({
  uploadPath: z.string().min(1),
  artistName: z.string().trim().min(1),
  artistEmail: z.string().email(),
  termsConfirmed: z.literal(true),
});

// ─── Card text character rules ───
export const TITLE_MIN = 16;
export const TITLE_MAX = 35;
export const DESC_MIN = 40;
export const DESC_MAX = 170;

export type Fit = 'perfect' | 'good' | 'tight' | 'overflow';

export interface CardTextValidation {
  valid: boolean;
  confidence: number; // 0–100
  fit: Fit;
  errors: string[];
  warnings: string[];
}

function scoreField(
  length: number,
  min: number,
  max: number,
  errors: string[],
  warnings: string[],
  label: string,
): number {
  const sweetSpotMin = min + Math.round((max - min) * 0.2);
  const sweetSpotMax = max - Math.round((max - min) * 0.1);

  if (length < min) {
    errors.push(`${label} too short: ${length} chars (min ${min})`);
    return Math.max(0, 50 - (min - length) * 5);
  }
  if (length > max) {
    errors.push(`${label} too long: ${length} chars (max ${max})`);
    return Math.max(0, 50 - (length - max) * 5);
  }
  if (length >= sweetSpotMin && length <= sweetSpotMax) {
    return 100;
  }
  if (length < sweetSpotMin) {
    warnings.push(`${label} is a little short: ${length}/${max}`);
    return Math.round(70 + ((length - min) / (sweetSpotMin - min)) * 30);
  }
  warnings.push(`${label} is close to the limit: ${length}/${max}`);
  return Math.round(100 - ((length - sweetSpotMax) / (max - sweetSpotMax)) * 30);
}

function getFitLabel(confidence: number): Fit {
  if (confidence >= 90) return 'perfect';
  if (confidence >= 70) return 'good';
  if (confidence >= 50) return 'tight';
  return 'overflow';
}

export function validateCardText(title: string, description: string): CardTextValidation {
  const errors: string[] = [];
  const warnings: string[] = [];

  const titleScore = scoreField(title.length, TITLE_MIN, TITLE_MAX, errors, warnings, 'Title');
  const descScore = scoreField(description.length, DESC_MIN, DESC_MAX, errors, warnings, 'Description');

  const confidence = Math.round(titleScore * 0.4 + descScore * 0.6);
  const fit = getFitLabel(confidence);

  return { valid: errors.length === 0, confidence, fit, errors, warnings };
}

const commissionedExtraSchema = z.object({
  eventDescription: z.string().trim().min(1),
});

export function validateStep3(data: {
  cardBottomText: string;
  artworkDescription: string;
  eventDescription: string;
  artworkType: string;
}): boolean {
  const cardText = validateCardText(data.cardBottomText.trim(), data.artworkDescription.trim());
  if (!cardText.valid) return false;
  if (data.artworkType !== 'upload') {
    return commissionedExtraSchema.safeParse({ eventDescription: data.eventDescription }).success;
  }
  return true;
}
