import { NextResponse } from "next/server";
import { verifyAuth } from "@/lib/auth/session";
import { isAdmin } from "@/lib/auth/admin";
import { OrderModel } from "@/lib/db/models/Order";
import { z } from "zod";

const patchSchema = z.object({
  status: z.string().optional(),
  adminNotes: z.string().optional(),
  adminNote: z.string().optional(),
});

export async function GET(
  _request: Request,
  { params }: { params: { orderId: string } }
) {
  try {
    const authResult = await verifyAuth();
    if (!authResult.user || !isAdmin(authResult.user)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const order = await OrderModel.findById(params.orderId).lean();
    if (!order) {
      return NextResponse.json({ error: "Not Found" }, { status: 404 });
    }

    return NextResponse.json({
      order: {
        id: order._id.toString(),
        total: order.total,
        status: order.status,
        notes: order.notes,
        createdAt: order.createdAt,
        updatedAt: order.updatedAt,
      },
    });
  } catch (err: any) {
    console.error("[ADMIN_ORDER_DETAIL_GET]", err);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

export async function PATCH(
  request: Request,
  { params }: { params: { orderId: string } }
) {
  try {
    const authResult = await verifyAuth();
    if (!authResult.user || !isAdmin(authResult.user)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const json = await request.json();
    const parsed = patchSchema.safeParse(json);
    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
    }
    const data = parsed.data;

    const order = await OrderModel.findById(params.orderId);
    if (!order) {
      return NextResponse.json({ error: "Not Found" }, { status: 404 });
    }

    if (data.status) {
      order.status = data.status as any; // Assume enum validated client-side
    }

    const noteToAppend = data.adminNotes || data.adminNote;
    if (noteToAppend) {
      order.notes = order.notes
        ? `${order.notes}\n\nAdmin Note: ${noteToAppend}`
        : `Admin Note: ${noteToAppend}`;
    }

    await order.save();

    return NextResponse.json({
      order: {
        id: order._id.toString(),
        total: order.total,
        status: order.status,
        notes: order.notes,
        createdAt: order.createdAt,
        updatedAt: order.updatedAt,
      },
    });
  } catch (err: any) {
    console.error("[ADMIN_ORDER_DETAIL_PATCH]", err);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
