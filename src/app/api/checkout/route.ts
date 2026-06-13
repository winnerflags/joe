import { NextRequest, NextResponse } from 'next/server';
import { getStripe } from '@/lib/stripe';
import { ARTWORK_EXTRAS } from '@/lib/pricing';
import type { OrderState, ArtworkType } from '@/types/order';

const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL ?? 'http://localhost:3000';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const order: OrderState = body.order;

    if (!order.quantity || !order.artworkType || !order.totalCents) {
      return NextResponse.json({ error: 'Invalid order data' }, { status: 400 });
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const lineItems: any[] = [
      {
        price_data: {
          currency: 'eur',
          product_data: {
            name: `WinnerFlag Cards × ${order.quantity}`,
            description: `Custom winner flag cards — ${order.quantity} units`,
          },
          unit_amount: order.cardTotalCents ?? 0,
        },
        quantity: 1,
      },
      {
        price_data: {
          currency: 'eur',
          product_data: {
            name: 'Standard Postage',
          },
          unit_amount: order.postageCents,
        },
        quantity: 1,
      },
    ];

    if (order.artworkExtraFeeCents > 0 && order.artworkType !== 'upload') {
      const artworkLabel = ARTWORK_EXTRAS[order.artworkType as Exclude<ArtworkType, 'upload'>].label;
      lineItems.push({
        price_data: {
          currency: 'eur',
          product_data: { name: artworkLabel },
          unit_amount: order.artworkExtraFeeCents,
        },
        quantity: 1,
      });
    }

    if (order.qrLogoAddon && order.qrLogoFeeCents > 0) {
      lineItems.push({
        price_data: {
          currency: 'eur',
          product_data: { name: 'Custom QR + Logo on Back', description: 'Printed QR code + club crest on reverse of card' },
          unit_amount: order.qrLogoFeeCents,
        },
        quantity: 1,
      });
    }

    if (order.expressService && order.expressFeeCents > 0) {
      lineItems.push({
        price_data: {
          currency: 'eur',
          product_data: { name: 'Express Service' },
          unit_amount: order.expressFeeCents,
        },
        quantity: 1,
      });
    }

    const session = await getStripe().checkout.sessions.create({
      mode: 'payment',
      line_items: lineItems,
      metadata: {
        quantity: String(order.quantity),
        artwork_type: order.artworkType,
        qr_logo_addon: String(order.qrLogoAddon),
        express_service: String(order.expressService),
        card_border_color: order.cardBorderColor,
        card_finish: order.cardFinish,
        card_bottom_text: order.cardBottomText.slice(0, 500),
        artwork_description: order.artworkDescription.slice(0, 500),
        event_description: order.eventDescription.slice(0, 500),
        upload_path: order.uploadPath ?? '',
        artist_name: order.artistName.slice(0, 200),
        artist_email: order.artistEmail.slice(0, 200),
        artist_phone: order.artistPhone.slice(0, 100),
        event_date: order.eventDateNA ? 'N/A' : order.eventDate.slice(0, 100),
        total_cents: String(order.totalCents),
      },
      success_url: `${BASE_URL}/order-success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${BASE_URL}/order/step/4`,
      payment_method_types: ['card'],
    });

    return NextResponse.json({ sessionUrl: session.url });
  } catch (e) {
    console.error('Checkout error:', e);
    return NextResponse.json({ error: 'Could not create checkout session' }, { status: 500 });
  }
}
