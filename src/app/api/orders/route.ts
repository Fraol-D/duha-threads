import { NextResponse } from "next/server";
import crypto from 'crypto';
import { getCurrentUser } from "@/lib/auth/session";
import { getDb } from "@/lib/db/connection";
import { OrderModel } from "@/lib/db/models/Order";
import { CartItemModel } from '@/lib/db/models/CartItem';
import { ProductModel } from '@/lib/db/models/Product';
import { z } from 'zod';
import { env } from "@/config/env";

export async function GET() {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!env.MONGODB_URI || !env.MONGODB_URI.startsWith("mongodb")) {
    return NextResponse.json({ orders: [] });
  }
  await getDb();
  const orders = await OrderModel.find({ userId: user.id }).sort({ createdAt: -1 }).lean();
  return NextResponse.json({ orders });
}

// Shared delivery payload schema
const createSchema = z.object({
  name: z.string().min(2),
  phone: z.string().min(5),
  address: z.string().min(5),
  notes: z.string().max(200).optional(),
  customOrderId: z.string().optional(),
});

function generateOrderNumber(): string {
  return 'ORD-' + crypto.randomBytes(4).toString('hex').toUpperCase();
}

export async function POST(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const json = await req.json().catch(() => null);
  const parsed = createSchema.safeParse(json);
  if (!parsed.success) return NextResponse.json({ error: 'Invalid input' }, { status: 400 });
  const { name, phone, address, notes, customOrderId } = parsed.data;

  await getDb();
  const cartItems = await CartItemModel.find({ userId: user.id }).lean();
  if (!cartItems.length) return NextResponse.json({ error: 'Cart is empty' }, { status: 409 });

  const productIds = cartItems.map(i => i.productId);
  const products = await ProductModel.find({ _id: { $in: productIds }, isActive: true }).lean();
  const productMap = new Map(products.map(p => [p._id.toString(), p]));
  for (const c of cartItems) {
    if (!productMap.get(c.productId.toString())) {
      return NextResponse.json({ error: 'Some items are unavailable' }, { status: 409 });
    }
  }

  const items = cartItems.map(c => {
    const p: any = productMap.get(c.productId.toString());
    const unitPrice = p.basePrice;
    const quantity = c.quantity || 1;
    const subtotal = unitPrice * quantity;
    return {
      productId: c.productId,
      name: p.name,
      imageUrl: p.images?.[0]?.url || null,
      unitPrice,
      quantity,
      subtotal,
      // legacy fields for compatibility
      size: c.size,
      color: c.color,
      price: unitPrice,
    };
  });

  const subtotal = items.reduce((s, it) => s + it.subtotal, 0);
  const currency = 'USD';
  const status: string = 'PENDING';
  const isCustomOrder = !!customOrderId;

  let order;
  try {
    const orderNumber = generateOrderNumber();
    order = await OrderModel.create({
      userId: user.id,
      items,
      deliveryInfo: { name, phone, address, notes },
      subtotal,
      totalAmount: subtotal,
      currency,
      status,
      isCustomOrder,
      customOrderId: isCustomOrder ? customOrderId : null,
      orderNumber,
      // legacy fields (optional)
      deliveryAddress: address,
      phone,
      email: user.email,
    });
  } catch (err) {
    console.error('[ORDER_CREATE_ERROR]', err);
    return NextResponse.json({ error: 'Failed to create order' }, { status: 500 });
  }

  // Attempt to clear cart; non-fatal on failure
  try {
    await CartItemModel.deleteMany({ userId: user.id });
  } catch (err) {
    console.error('[ORDER_CART_CLEAR_FAILED]', err);
  }

  return NextResponse.json({
    id: order._id.toString(),
    orderNumber: order.orderNumber,
    status: order.status,
    totalAmount: order.totalAmount,
    createdAt: order.createdAt,
  }, { status: 201 });
}
