export type ArtworkType = 'upload' | 'winnerflags_original' | 'verified_artist';

export type QuantityOption = 20 | 40 | 60 | 80 | 100 | 150;

export interface UploadedFile {
  name: string;
  size: number;
  mimeType: string;
  previewUrl: string | null;
}

export interface CardLink {
  label: string;
  url: string;
}

export interface OrderState {
  // Step 1
  quantity: QuantityOption | null;
  artworkType: ArtworkType | null;
  expressService: boolean;
  qrLogoAddon: boolean;

  // Step 2 (upload only)
  uploadedFile: UploadedFile | null;
  uploadPath: string | null;
  artistName: string;
  artistEmail: string;
  artistPhone: string;
  termsConfirmed: boolean;

  // Card design
  cardBorderColor: string;
  cardFinish: 'holographic' | 'matte';

  // Step 3
  cardBottomText: string;
  artworkDescription: string;
  eventDescription: string;
  eventDate: string;
  eventDateNA: boolean;
  links: CardLink[];
  cuiggSurvey: boolean;

  // Derived prices (cents)
  cardTotalCents: number | null;
  artworkExtraFeeCents: number;
  qrLogoFeeCents: number;
  postageCents: number;
  expressFeeCents: number;
  totalCents: number | null;

  // Navigation
  currentStep: 1 | 2 | 3 | 4 | 5;
}

export type OrderAction =
  | { type: 'SET_QUANTITY'; payload: QuantityOption }
  | { type: 'SET_ARTWORK_TYPE'; payload: ArtworkType }
  | { type: 'SET_EXPRESS'; payload: boolean }
  | { type: 'SET_QR_LOGO'; payload: boolean }
  | { type: 'SET_UPLOADED_FILE'; payload: UploadedFile | null }
  | { type: 'SET_UPLOAD_PATH'; payload: string }
  | { type: 'SET_ARTIST_NAME'; payload: string }
  | { type: 'SET_ARTIST_EMAIL'; payload: string }
  | { type: 'SET_ARTIST_PHONE'; payload: string }
  | { type: 'SET_CARD_BORDER_COLOR'; payload: string }
  | { type: 'SET_CARD_FINISH'; payload: 'holographic' | 'matte' }
  | { type: 'SET_TERMS_CONFIRMED'; payload: boolean }
  | { type: 'SET_CARD_BOTTOM_TEXT'; payload: string }
  | { type: 'SET_ARTWORK_DESCRIPTION'; payload: string }
  | { type: 'SET_EVENT_DESCRIPTION'; payload: string }
  | { type: 'SET_EVENT_DATE'; payload: string }
  | { type: 'SET_EVENT_DATE_NA'; payload: boolean }
  | { type: 'SET_LINKS'; payload: CardLink[] }
  | { type: 'SET_CUIGG_SURVEY'; payload: boolean }
  | { type: 'NAVIGATE_TO_STEP'; payload: 1 | 2 | 3 | 4 | 5 }
  | { type: 'INIT_FROM_LANDING'; payload: Pick<OrderState, 'quantity' | 'artworkType' | 'expressService' | 'qrLogoAddon'> }
  | { type: 'RESET' };

export interface UploadApiResponse {
  uploadPath: string;
  fileName: string;
}

export interface CheckoutApiRequest {
  order: OrderState;
}

export interface CheckoutApiResponse {
  sessionUrl: string;
}
