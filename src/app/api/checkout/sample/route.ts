import { NextRequest, NextResponse } from 'next/server';
import { getStripe } from '@/lib/stripe';
import { SAMPLE_PACK_CENTS } from '@/lib/pricing';

const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL ?? 'http://localhost:3000';

export async function POST(req: NextRequest) {
  try {
    const { useCase, sponsorAccepted } = await req.json() as { useCase?: string; sponsorAccepted?: boolean };
    const session = await getStripe().checkout.sessions.create({
      mode: 'payment',
      line_items: [
        {
          price_data: {
            currency: 'eur',
            product_data: {
              name: 'WinnerFlags Sample Pack',
              description: 'A sample set of winner flag cards — same-day dispatch, shipping included.',
            },
            unit_amount: SAMPLE_PACK_CENTS,
          },
          quantity: 1,
        },
      ],
      shipping_address_collection: {
        allowed_countries: ['IE', 'GB'],
      },
      metadata: {
        type: 'sample_pack',
        use_case: useCase ?? '',
        sponsor_accepted: String(sponsorAccepted ?? ''),
      },
      success_url: `${BASE_URL}/order-success?sample=true`,
      cancel_url: `${BASE_URL}/sample`,
      payment_method_types: ['card'],
    });
    return NextResponse.json({ sessionUrl: session.url });
  } catch (e) {
    console.error('Sample checkout error:', e);
    return NextResponse.json({ error: 'Could not create checkout session' }, { status: 500 });
  }
}
