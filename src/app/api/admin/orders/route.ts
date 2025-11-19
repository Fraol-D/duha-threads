import { NextResponse } from "next/server";
import { verifyAuth } from "@/lib/auth/session";
import { isAdmin } from "@/lib/auth/admin";
import { OrderModel } from "@/lib/db/models/Order";
import { z } from "zod";

const querySchema = z.object({
  page: z.coerce.number().min(1).default(1),
  pageSize: z.coerce.number().min(1).max(100).default(20),
  status: z.string().optional(),
  userEmail: z.string().email().optional(),
});

export async function GET(request: Request) {
  try {
    const authResult = await verifyAuth();
    if (!authResult.user || !isAdmin(authResult.user)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const url = new URL(request.url);
    const parsedQuery = querySchema.safeParse({
      page: url.searchParams.get("page"),
      pageSize: url.searchParams.get("pageSize"),
      status: url.searchParams.get("status"),
      userEmail: url.searchParams.get("userEmail"),
    });
    if (!parsedQuery.success) {
      return NextResponse.json({ error: "Invalid query parameters" }, { status: 400 });
    }
    const { page, pageSize, status, userEmail } = parsedQuery.data;

    const filter: any = {};
    if (status) filter.status = status;
    // userEmail filtering would require a join; omitted unless we store email on order.

    const skip = (page - 1) * pageSize;
    const [orders, total] = await Promise.all([
      OrderModel.find(filter, {
        total: 1,
        status: 1,
        createdAt: 1,
        updatedAt: 1,
      })
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(pageSize)
        .lean(),
      OrderModel.countDocuments(filter),
    ]);

    return NextResponse.json({
      page,
      pageSize,
      total,
      totalPages: Math.ceil(total / pageSize),
      orders: orders.map((o: any) => ({
        id: o._id.toString(),
        total: o.total,
        status: o.status,
        createdAt: o.createdAt,
        updatedAt: o.updatedAt,
      })),
    });
  } catch (err: any) {
    console.error("[ADMIN_ORDERS_LIST_GET]", err);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
