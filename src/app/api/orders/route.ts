import { NextRequest, NextResponse } from "next/server";
import { Types, type LeanDocument } from "mongoose";
import { getCurrentUser } from "@/lib/auth/session";
import { getDb } from "@/lib/db/connection";
import { OrderModel, type OrderDocument } from "@/lib/db/models/Order";
import { CartItemModel } from '@/lib/db/models/CartItem';
import { ProductModel } from '@/lib/db/models/Product';
import { ProductRatingModel } from '@/lib/db/models/ProductRating';
import { z } from 'zod';
import { env } from "@/config/env";
import { generateOrderNumber, isOrderNumberDuplicateError } from '@/lib/orders/orderNumber';
import { isDeliveredStatus } from '@/lib/orders/status';

type OrderLean = LeanDocument<OrderDocument>;
type CartProduct = {
  _id: Types.ObjectId;
  name: string;
  basePrice: number;
  images?: Array<{ url?: string | null }>;
};

export async function GET() {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!env.MONGODB_URI || !env.MONGODB_URI.startsWith("mongodb")) {
    return NextResponse.json({ orders: [] });
  }
  await getDb();
  const orders = await OrderModel.find({ userId: user.id }).sort({ createdAt: -1 }).lean<OrderLean[]>();

  const productIdStrings = Array.from(
    new Set(
      orders.flatMap((order) =>
        (order.items ?? [])
          .map((item) => {
            const rawId = item.productId;
            return rawId ? rawId.toString() : null;
          })
          .filter((id): id is string => Boolean(id))
      )
    )
  );

  let reviewedProductIds = new Set<string>();
  let productSlugMap = new Map<string, string>();
  if (productIdStrings.length > 0) {
    const validObjectIds = productIdStrings.filter((id) => Types.ObjectId.isValid(id)).map((id) => new Types.ObjectId(id));
    if (validObjectIds.length > 0) {
      const [ratings, products] = await Promise.all([
        ProductRatingModel.find({ userId: user.id, productId: { $in: validObjectIds } }).select("productId").lean(),
        ProductModel.find({ _id: { $in: validObjectIds } }).select("_id slug").lean(),
      ]);
      reviewedProductIds = new Set(ratings.map((doc) => doc.productId.toString()));
      productSlugMap = new Map(products.map((doc) => [doc._id.toString(), doc.slug]));
    }
  }

  const ordersWithReviewMeta = orders.map((order) => {
    const delivered = isDeliveredStatus(order.status);
    const itemsWithMeta = (order.items ?? []).map((item) => {
      const productIdString = item.productId ? item.productId.toString() : "";
      const needsReview = delivered && productIdString ? !reviewedProductIds.has(productIdString) : false;
      return {
        ...item,
        productSlug: productIdString ? productSlugMap.get(productIdString) || null : null,
        needsReview,
      };
    });
    return { ...order, items: itemsWithMeta };
  });

  return NextResponse.json({ orders: ordersWithReviewMeta });
}

// Shared delivery payload schema
const createSchema = z.object({
  name: z.string().min(2),
  phone: z.string().min(5),
  address: z.string().min(5),
  notes: z.string().max(200).optional(),
  customOrderId: z.string().optional(),
});

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
  const products = await ProductModel.find({ _id: { $in: productIds }, isActive: true }).lean<CartProduct[]>();
  const productMap = new Map(products.map((p) => [p._id.toString(), p]));
  for (const c of cartItems) {
    if (!productMap.get(c.productId.toString())) {
      return NextResponse.json({ error: 'Some items are unavailable' }, { status: 409 });
    }
  }

  const items = cartItems.map(c => {
    const productDoc = productMap.get(c.productId.toString());
    if (!productDoc) {
      throw new Error("Product missing during order build");
    }
    const unitPrice = productDoc.basePrice;
    const quantity = c.quantity || 1;
    const subtotal = unitPrice * quantity;
    return {
      productId: c.productId,
      name: productDoc.name,
      imageUrl: productDoc.images?.[0]?.url || null,
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

  const basePayload = {
    userId: user.id,
    items,
    deliveryInfo: { name, phone, address, notes },
    subtotal,
    totalAmount: subtotal,
    currency,
    status,
    isCustomOrder,
    customOrderId: isCustomOrder ? customOrderId : null,
    // legacy fields (optional)
    deliveryAddress: address,
    phone,
    email: user.email,
  };

  const today = new Date();
  let order = null;
  for (let seq = 0; seq < 10; seq++) {
    try {
      const candidate = generateOrderNumber(today, seq);
      order = await OrderModel.create({ ...basePayload, orderNumber: candidate });
      break;
    } catch (err) {
      if (isOrderNumberDuplicateError(err)) {
        continue;
      }
      console.error('[ORDER_CREATE_ERROR]', err);
      return NextResponse.json({ error: 'Failed to create order' }, { status: 500 });
    }
  }

  if (!order) {
    return NextResponse.json({ error: 'Unable to generate unique order number' }, { status: 500 });
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
