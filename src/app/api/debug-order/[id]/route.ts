import { NextRequest, NextResponse } from 'next/server';
import mongoose from 'mongoose';
import { getDb } from '@/lib/db/connection';
import { OrderModel } from '@/lib/db/models/Order';
import { env } from '@/config/env';

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id?: string }> }) {
  try {
    const resolvedParams = await params;
    console.log('DEBUG /api/debug-order raw params:', resolvedParams);
    const id = resolvedParams.id || '';
    if (!id) {
      return NextResponse.json({ error: 'Missing id param' }, { status: 400 });
    }
    const isValid = mongoose.Types.ObjectId.isValid(id);
    console.log('DEBUG isValidObjectId:', id, isValid);
    if (!isValid) {
      return NextResponse.json({ error: 'Invalid ObjectId format', id }, { status: 400 });
    }
    if (!env.MONGODB_URI) return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    await getDb();
    const order = await OrderModel.findById(id).lean();
    console.log('DEBUG findById result exists:', !!order);
    if (!order) {
      return NextResponse.json({ error: 'No order found for this id', id }, { status: 404 });
    }
    return NextResponse.json({ id: order._id.toString(), ...order }, { status: 200 });
  } catch (err) {
    console.error('DEBUG /api/debug-order error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
