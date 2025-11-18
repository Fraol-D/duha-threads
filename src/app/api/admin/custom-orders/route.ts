import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db/connection";
import { CustomOrderModel } from "@/lib/db/models/CustomOrder";
import { verifyAuth } from "@/lib/auth/session";
import { env } from "@/config/env";

function isAdmin(email: string): boolean {
  const adminEmails = env.ADMIN_EMAILS?.split(",").map((e) => e.trim().toLowerCase()) || [];
  return adminEmails.includes(email.toLowerCase());
}

export async function GET(req: NextRequest) {
  try {
    const authResult = await verifyAuth(req);
    if (!authResult.user || !isAdmin(authResult.user.email)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    await getDb();

    const { searchParams } = new URL(req.url);
    const status = searchParams.get("status");
    const page = parseInt(searchParams.get("page") || "1", 10);
    const pageSize = parseInt(searchParams.get("pageSize") || "20", 10);

    const filter: Record<string, unknown> = {};
    if (status) {
      filter.status = status;
    }

    const skip = (page - 1) * pageSize;
    const [customOrders, total] = await Promise.all([
      CustomOrderModel.find(filter)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(pageSize)
        .lean(),
      CustomOrderModel.countDocuments(filter),
    ]);

    const orders = customOrders.map((order) => ({
      id: order._id.toString(),
      userId: order.userId?.toString() || null,
      status: order.status,
      baseShirt: order.baseShirt,
      placements: order.placements,
      estimatedTotal: order.pricing.estimatedTotal,
      finalTotal: order.pricing.finalTotal,
      createdAt: order.createdAt,
      delivery: order.delivery,
    }));

    return NextResponse.json({
      orders,
      total,
      page,
      pageSize,
      totalPages: Math.ceil(total / pageSize),
    });
  } catch (error) {
    console.error("Admin fetch custom orders error:", error);
    return NextResponse.json(
      { error: "Failed to fetch custom orders" },
      { status: 500 }
    );
  }
}
