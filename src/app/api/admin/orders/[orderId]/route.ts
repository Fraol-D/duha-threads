import { NextResponse, NextRequest } from "next/server";
import { verifyAuth } from "@/lib/auth/session";
import { isAdmin } from "@/lib/auth/admin";
import { OrderModel } from "@/lib/db/models/Order";
import { ProductModel } from "@/lib/db/models/Product";
import { z } from "zod";

const patchSchema = z.object({
  status: z.string().optional(),
  adminNotes: z.string().optional(),
  adminNote: z.string().optional(),
});

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ orderId: string }> }
) {
  try {
    const authResult = await verifyAuth(_request);
    if (!authResult.user || !isAdmin(authResult.user)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const resolvedParams = await params;
    const lookupId = resolvedParams.orderId;
    const order: any = await OrderModel.findById(lookupId).lean();
    if (!order) {
      console.warn('[ADMIN_ORDER_DETAIL_NOT_FOUND]', { lookupId });
      return NextResponse.json({ error: 'Not Found' }, { status: 404 });
    }

    // Build line items (imageUrl already stored if created via new pipeline; fallback compute if missing)
    const productIds = [...new Set(order.items.map((it: any) => it.productId?.toString()).filter(Boolean))];
    let imageMap = new Map<string, string | null>();
    if (productIds.length) {
      const productDocs = await ProductModel.find({ _id: { $in: productIds } }, { images: 1 }).lean();
      imageMap = new Map(productDocs.map((p: any) => [p._id.toString(), (p as any).images?.[0]?.url || null]));
    }
    const lineItems = order.items.map((it: any) => ({
      productId: it.productId?.toString(),
      name: it.name,
      quantity: it.quantity,
      unitPrice: it.unitPrice || it.price,
      subtotal: it.subtotal || ( (it.unitPrice || it.price) * it.quantity ),
      imageUrl: it.imageUrl || imageMap.get(it.productId?.toString()) || null,
    }));
    return NextResponse.json({
      order: {
        id: order._id.toString(),
        isCustomOrder: !!order.isCustomOrder,
        orderNumber: order.orderNumber || order._id.toString().slice(-6),
        status: order.status,
        totalAmount: order.totalAmount ?? order.total ?? 0,
        subtotal: order.subtotal,
        currency: order.currency || 'USD',
        email: order.email,
        phone: order.phone || order.deliveryInfo?.phone,
        deliveryAddress: order.deliveryAddress || order.deliveryInfo?.address,
        createdAt: order.createdAt,
        updatedAt: order.updatedAt,
        lineItems,
      }
    });
  } catch (err: any) {
    console.error("[ADMIN_ORDER_DETAIL_GET]", err);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ orderId: string }> }
) {
  try {
    const authResult = await verifyAuth(request);
    if (!authResult.user || !isAdmin(authResult.user)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const json = await request.json();
    const parsed = patchSchema.safeParse(json);
    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
    }
    const data = parsed.data;

    const resolvedParams = await params;
    const order: any = await OrderModel.findById(resolvedParams.orderId);
    if (!order) {
      return NextResponse.json({ error: 'Not Found' }, { status: 404 });
    }

    if (data.status) order.status = data.status as any;
    const noteToAppend = data.adminNotes || data.adminNote;
    if (noteToAppend) {
      // Persist notes inside deliveryInfo.notes for standard orders (simple approach)
      order.deliveryInfo = order.deliveryInfo || {};
      order.deliveryInfo.notes = (order.deliveryInfo.notes ? `${order.deliveryInfo.notes}\n\nAdmin Note: ${noteToAppend}` : `Admin Note: ${noteToAppend}`);
    }
    await order.save();
    return NextResponse.json({
      order: {
        id: order._id.toString(),
        isCustomOrder: !!order.isCustomOrder,
        status: order.status,
        updatedAt: order.updatedAt,
      }
    });
  } catch (err: any) {
    console.error("[ADMIN_ORDER_DETAIL_PATCH]", err);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
