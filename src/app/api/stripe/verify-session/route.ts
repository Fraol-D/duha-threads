import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';
import { env } from '@/config/env';
import { getDb } from '@/lib/db/connection';
import { OrderModel } from '@/lib/db/models/Order';

if (!env.STRIPE_SECRET_KEY) {
  throw new Error('STRIPE_SECRET_KEY is not set');
}

const stripe = new Stripe(env.STRIPE_SECRET_KEY, {});

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { sessionId } = body;

    if (!sessionId) {
      return NextResponse.json({ error: 'Missing sessionId' }, { status: 400 });
    }

    // Retrieve the session from Stripe
    const session = await stripe.checkout.sessions.retrieve(sessionId);

    if (!session) {
      return NextResponse.json({ error: 'Session not found' }, { status: 404 });
    }

    console.log('[Stripe Verify] Session metadata:', session.metadata);
    // Check if payment was successful
    const isPaymentSuccessful = session.payment_status === 'paid';

    if (isPaymentSuccessful && session.metadata?.orderId) {
      // Update order status to CONFIRMED if payment was successful
      await getDb();
      const orderId = session.metadata.orderId;
      console.log('[Stripe Verify] Found payment for order:', orderId);
      
      // Try to find and update order by Stripe order ID
      const result = await OrderModel.findOneAndUpdate(
        { $or: [{ _id: orderId }, { orderNumber: orderId }] },
        { status: 'CONFIRMED', paymentVerified: true, paymentMethod: 'stripe' },
        { new: true }
      );

      if (result) {
        console.log('[Stripe Verify] Updated order:', result._id, 'payment method:', result.paymentMethod);
        return NextResponse.json({
          success: true,
          paid: true,
          orderId: result._id.toString(),
          orderNumber: result.orderNumber,
          status: result.status,
          paymentMethod: result.paymentMethod,
        });
      } else {
        console.log('[Stripe Verify] Order not found:', orderId);
      }
    }

    return NextResponse.json({
      success: isPaymentSuccessful,
      paid: isPaymentSuccessful,
      status: session.payment_status,
    });
  } catch (error: unknown) {
    console.error('Stripe verification error:', error);
    const message = error instanceof Error ? error.message : 'Failed to verify payment';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
