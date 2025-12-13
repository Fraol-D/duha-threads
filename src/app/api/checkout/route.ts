import { NextResponse } from "next/server";
import { z } from "zod";
import { getCurrentUser } from "@/lib/auth/session";
import { getDb } from "@/lib/db/connection";
import { CartItemModel } from "@/lib/db/models/CartItem";
import { ProductModel } from "@/lib/db/models/Product";
import { OrderModel } from "@/lib/db/models/Order";
import type { OrderDocument } from "@/lib/db/models/Order";
import { ConsoleEmailService, buildOrderEmail } from "@/lib/email/EmailService";
import { env } from "@/config/env";
import { generateOrderNumber, isOrderNumberDuplicateError } from '@/lib/orders/orderNumber';

const bodySchema = z.object({
  deliveryName: z.string().min(2).optional(),
  deliveryAddress: z.string().min(5),
  phone: z.string().min(5),
  email: z.string().email().optional(),
  notes: z.string().optional(),
  paymentMethod: z.enum(['chapa', 'stripe', 'pay_on_delivery']).default('stripe'),
});

export async function POST(req: Request) {
  const user = await getCurrentUser();
  // Allow guest checkout - but for now require auth for simplicity
  // TODO: Implement guest checkout if needed
  if (!user) return NextResponse.json({ error: "Please log in to checkout" }, { status: 401 });
  if (!env.MONGODB_URI || !env.MONGODB_URI.startsWith("mongodb")) {
    return NextResponse.json({ error: "Database not configured" }, { status: 500 });
  }
  const json = await req.json().catch(() => null);
  const parsed = bodySchema.safeParse(json);
  if (!parsed.success) return NextResponse.json({ error: "Invalid input" }, { status: 400 });
  const { deliveryAddress, phone, email: emailInput, deliveryName, notes, paymentMethod } = parsed.data;
  const email = emailInput || user.email;

  await getDb();
  const cartItems = await CartItemModel.find({ userId: user.id }).lean();
  if (!cartItems.length) return NextResponse.json({ error: "Cart is empty" }, { status: 409 });

  const productIds = cartItems.map((i) => i.productId);
  const products = await ProductModel.find({ _id: { $in: productIds }, isActive: true }).lean();
  type WithId = { _id: string | { toString(): string } };
  type ProductLean = WithId & { name: string; basePrice: number };
  const toIdString = (id: string | { toString(): string }) => (typeof id === "string" ? id : id.toString());
  const productMap = new Map<string, ProductLean>(
    products.map((p) => [toIdString((p as unknown as WithId)._id), p as unknown as ProductLean])
  );

  // Validate all items exist
  for (const i of cartItems) {
    const p = productMap.get(i.productId.toString());
    if (!p) return NextResponse.json({ error: "Some items are unavailable" }, { status: 409 });
  }

  // Build order items with snapshots
  const items = cartItems.map((i) => {
    const p = productMap.get(i.productId.toString())!;
    const unitPrice = p.basePrice;
    const subtotal = unitPrice * i.quantity;
    return {
      productId: i.productId,
      name: p.name,
      unitPrice,
      subtotal,
      size: i.size,
      color: i.color,
      quantity: i.quantity,
    };
  });

  const subtotal = items.reduce((sum, it) => sum + it.subtotal, 0);
  const total = subtotal; // placeholder for taxes/discounts

  const orderBase = {
    userId: user.id,
    items,
    deliveryAddress,
    phone,
    email,
    subtotal,
    total,
    totalAmount: total,
    currency: 'USD',
    paymentMethod,
    status: paymentMethod === 'pay_on_delivery' ? 'CONFIRMED' : 'PENDING',
  };

  let order: OrderDocument | null = null;
  const today = new Date();
  for (let seq = 0; seq < 10; seq++) {
    try {
      const candidate = generateOrderNumber(today, seq);
      order = await OrderModel.create({ ...orderBase, orderNumber: candidate }) as OrderDocument;
      break;
    } catch (err) {
      if (isOrderNumberDuplicateError(err)) continue;
      throw err;
    }
  }

  if (!order) {
    return NextResponse.json({ error: 'Unable to generate order number' }, { status: 500 });
  }

  // Clear cart
  await CartItemModel.deleteMany({ userId: user.id });

  // Send transactional email (bypasses marketing prefs by design)
  const mailer = new ConsoleEmailService();
  const mail = buildOrderEmail("order_placed", {
    email,
    customer_name: user.name || user.email,
    order_id: order.orderNumber || order._id.toString(),
    total: total.toFixed(2),
  });
  await mailer.send(mail);

  return NextResponse.json({ orderId: order._id.toString(), orderNumber: order.orderNumber }, { status: 201 });
}
