import { NextRequest, NextResponse } from 'next/server';
import mongoose from 'mongoose';
import { getDb } from '@/lib/db/connection';
import { OrderModel } from '@/lib/db/models/Order';
import { env } from '@/config/env';

// Minimal GET: pure retrieval by id (no ownership yet)
export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id: rawId } = await params;
    console.log('ORDERS DETAIL raw id:', rawId);
    if (!env.MONGODB_URI) return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    await getDb();
    let order = null;
    if (mongoose.Types.ObjectId.isValid(rawId)) {
      order = await OrderModel.findById(rawId).lean();
    }
    if (!order) {
      order = await OrderModel.findOne({ orderNumber: rawId }).lean();
    }
    if (!order) return NextResponse.json({ error: 'Order not found' }, { status: 404 });
    return NextResponse.json({ id: order._id.toString(), orderNumber: order.orderNumber, ...order }, { status: 200 });
  } catch (err) {
    console.error('ORDERS DETAIL GET error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id: rawId } = await params;
    if (!env.MONGODB_URI) return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    await getDb();
    const body = await req.json().catch(() => ({}));
    const update: Record<string, unknown> = {};
    if (typeof body.status === 'string') update.status = body.status;
    if (Object.keys(update).length === 0) return NextResponse.json({ error: 'No updatable fields provided' }, { status: 400 });
    let order = null;
    if (mongoose.Types.ObjectId.isValid(rawId)) {
      order = await OrderModel.findByIdAndUpdate(rawId, { $set: update }, { new: true }).lean();
    }
    if (!order) {
      order = await OrderModel.findOneAndUpdate({ orderNumber: rawId }, { $set: update }, { new: true }).lean();
    }
    if (!order) return NextResponse.json({ error: 'Order not found' }, { status: 404 });
    return NextResponse.json({ id: order._id.toString(), orderNumber: order.orderNumber, ...order }, { status: 200 });
  } catch (err) {
    console.error('ORDERS DETAIL PATCH error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id: rawId } = await params;
    if (!env.MONGODB_URI) return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    await getDb();
    let order = null;
    if (mongoose.Types.ObjectId.isValid(rawId)) {
      order = await OrderModel.findByIdAndDelete(rawId).lean();
    }
    if (!order) {
      order = await OrderModel.findOneAndDelete({ orderNumber: rawId }).lean();
    }
    if (!order) return NextResponse.json({ error: 'Order not found' }, { status: 404 });
    return NextResponse.json({ id: order._id.toString(), orderNumber: order.orderNumber }, { status: 200 });
  } catch (err) {
    console.error('ORDERS DETAIL DELETE error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
