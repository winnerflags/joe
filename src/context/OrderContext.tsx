'use client';

import React, { createContext, useContext, useReducer } from 'react';
import type { OrderState, OrderAction, QuantityOption, ArtworkType } from '@/types/order';
import {
  getCardTotal,
  getArtworkExtra,
  POSTAGE_CENTS,
  EXPRESS_FEE_CENTS,
  QR_LOGO_FEE_CENTS,
} from '@/lib/pricing';

const initialState: OrderState = {
  quantity: null,
  artworkType: null,
  expressService: false,
  qrLogoAddon: false,
  uploadedFile: null,
  uploadPath: null,
  artistName: '',
  artistEmail: '',
  artistPhone: '',
  termsConfirmed: false,
  cardBorderColor: '#F5C35D',
  cardFinish: 'holographic',
  cardBottomText: '',
  artworkDescription: '',
  eventDescription: '',
  eventDate: '',
  eventDateNA: false,
  links: [],
  cuiggSurvey: false,
  cardTotalCents: null,
  artworkExtraFeeCents: 0,
  qrLogoFeeCents: 0,
  postageCents: POSTAGE_CENTS,
  expressFeeCents: 0,
  totalCents: null,
  currentStep: 1,
};

function derivePrice(
  quantity: QuantityOption | null,
  artworkType: ArtworkType | null,
  express: boolean,
  qrLogo: boolean,
): Pick<OrderState, 'cardTotalCents' | 'artworkExtraFeeCents' | 'qrLogoFeeCents' | 'postageCents' | 'expressFeeCents' | 'totalCents'> {
  const cardTotalCents = quantity ? getCardTotal(quantity) : null;
  const artworkExtraFeeCents = artworkType ? getArtworkExtra(artworkType) : 0;
  const qrLogoFeeCents = qrLogo ? QR_LOGO_FEE_CENTS : 0;
  const expressFeeCents = express ? EXPRESS_FEE_CENTS : 0;
  const totalCents =
    cardTotalCents !== null && artworkType !== null
      ? cardTotalCents + artworkExtraFeeCents + qrLogoFeeCents + POSTAGE_CENTS + expressFeeCents
      : null;
  return { cardTotalCents, artworkExtraFeeCents, qrLogoFeeCents, postageCents: POSTAGE_CENTS, expressFeeCents, totalCents };
}

function orderReducer(state: OrderState, action: OrderAction): OrderState {
  switch (action.type) {
    case 'SET_QUANTITY': {
      const prices = derivePrice(action.payload, state.artworkType, state.expressService, state.qrLogoAddon);
      return { ...state, quantity: action.payload, ...prices };
    }
    case 'SET_ARTWORK_TYPE': {
      const prices = derivePrice(state.quantity, action.payload, state.expressService, state.qrLogoAddon);
      const uploadReset = action.payload !== 'upload' ? { uploadedFile: null, uploadPath: null } : {};
      return { ...state, artworkType: action.payload, ...prices, ...uploadReset };
    }
    case 'SET_EXPRESS': {
      const prices = derivePrice(state.quantity, state.artworkType, action.payload, state.qrLogoAddon);
      return { ...state, expressService: action.payload, ...prices };
    }
    case 'SET_QR_LOGO': {
      const prices = derivePrice(state.quantity, state.artworkType, state.expressService, action.payload);
      return { ...state, qrLogoAddon: action.payload, ...prices };
    }
    case 'INIT_FROM_LANDING': {
      const { quantity, artworkType, expressService, qrLogoAddon } = action.payload;
      const prices = derivePrice(quantity, artworkType, expressService, qrLogoAddon);
      return { ...state, quantity, artworkType, expressService, qrLogoAddon, ...prices, currentStep: 1 };
    }
    case 'SET_UPLOADED_FILE':
      return { ...state, uploadedFile: action.payload };
    case 'SET_UPLOAD_PATH':
      return { ...state, uploadPath: action.payload };
    case 'SET_ARTIST_NAME':
      return { ...state, artistName: action.payload };
    case 'SET_ARTIST_EMAIL':
      return { ...state, artistEmail: action.payload };
    case 'SET_ARTIST_PHONE':
      return { ...state, artistPhone: action.payload };
    case 'SET_TERMS_CONFIRMED':
      return { ...state, termsConfirmed: action.payload };
    case 'SET_CARD_BORDER_COLOR':
      return { ...state, cardBorderColor: action.payload };
    case 'SET_CARD_FINISH':
      return { ...state, cardFinish: action.payload };
    case 'SET_CARD_BOTTOM_TEXT':
      return { ...state, cardBottomText: action.payload };
    case 'SET_ARTWORK_DESCRIPTION':
      return { ...state, artworkDescription: action.payload };
    case 'SET_EVENT_DESCRIPTION':
      return { ...state, eventDescription: action.payload };
    case 'SET_EVENT_DATE':
      return { ...state, eventDate: action.payload };
    case 'SET_EVENT_DATE_NA':
      return { ...state, eventDateNA: action.payload, eventDate: action.payload ? '' : state.eventDate };
    case 'SET_LINKS':
      return { ...state, links: action.payload };
    case 'SET_CUIGG_SURVEY':
      return { ...state, cuiggSurvey: action.payload };
    case 'NAVIGATE_TO_STEP':
      return { ...state, currentStep: action.payload };
    case 'RESET':
      return initialState;
    default:
      return state;
  }
}

interface OrderContextValue {
  state: OrderState;
  dispatch: React.Dispatch<OrderAction>;
}

const OrderContext = createContext<OrderContextValue | null>(null);

export function OrderProvider({ children }: { children: React.ReactNode }) {
  const [state, dispatch] = useReducer(orderReducer, initialState);
  return (
    <OrderContext.Provider value={{ state, dispatch }}>
      {children}
    </OrderContext.Provider>
  );
}

export function useOrder(): OrderContextValue {
  const ctx = useContext(OrderContext);
  if (!ctx) throw new Error('useOrder must be used within OrderProvider');
  return ctx;
}
