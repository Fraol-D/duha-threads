import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';
import { env } from '@/config/env';

if (!env.STRIPE_SECRET_KEY) {
  throw new Error('STRIPE_SECRET_KEY is not set');
}

const stripe = new Stripe(env.STRIPE_SECRET_KEY, {});

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { amount, currency = 'usd', customerEmail, orderId } = body;

    if (!amount || amount <= 0) {
      return NextResponse.json({ error: 'Invalid amount' }, { status: 400 });
    }

    console.log('[Stripe Create Session] Order ID:', orderId, 'Amount:', amount);

    // Create a checkout session
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      line_items: [
        {
          price_data: {
            currency,
            product_data: {
              name: 'Duha Threads Order',
              description: `Order ID: ${orderId}`,
            },
            unit_amount: Math.round(amount * 100), // Stripe expects amount in cents
          },
          quantity: 1,
        },
      ],
      mode: 'payment',
      success_url: `${process.env.APP_BASE_URL || 'http://localhost:3000'}/checkout/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${process.env.APP_BASE_URL || 'http://localhost:3000'}/checkout`,
      customer_email: customerEmail,
      metadata: {
        orderId,
      },
    });

    return NextResponse.json({ sessionId: session.id, url: session.url }, { status: 200 });
  } catch (error: unknown) {
    console.error('Stripe error:', error);
    const message = error instanceof Error ? error.message : 'Failed to create checkout session';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
