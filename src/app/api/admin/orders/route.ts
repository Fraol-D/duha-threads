import { NextResponse, NextRequest } from "next/server";
import { verifyAuth } from "@/lib/auth/session";
import { isAdmin } from "@/lib/auth/admin";
import { OrderModel } from "@/lib/db/models/Order";
import { Types } from "mongoose";
import { UserModel } from "@/lib/db/models/User";
// Lenient parsing: avoid 400s from strict schema; coerce/fallback manually.

export async function GET(request: NextRequest) {
  try {
    const authResult = await verifyAuth(request);
    if (!authResult.user || !isAdmin(authResult.user)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const url = new URL(request.url);
    let page = Number(url.searchParams.get("page") || 1);
    let pageSize = Number(url.searchParams.get("pageSize") || 20);
    const status = url.searchParams.get("status") || undefined;
    const q = url.searchParams.get("q") || undefined; // unified search param
    if (!Number.isFinite(page) || page < 1) page = 1;
    if (!Number.isFinite(pageSize) || pageSize < 1 || pageSize > 100) pageSize = 20;

    const filter: any = {};
    if (status) filter.status = status;
    if (q) {
      const rx = { $regex: q, $options: 'i' } as const;
      const ors: any[] = [
        { email: rx },
        { 'deliveryInfo.address': rx },
        { orderNumber: rx },
        { $expr: { $regexMatch: { input: { $toString: '$_id' }, regex: q, options: 'i' } } },
      ];
      if (Types.ObjectId.isValid(q)) {
        ors.unshift({ _id: new Types.ObjectId(q) });
      }
      filter.$or = ors;
    }

    const totalCount = await OrderModel.countDocuments(filter);
    const skip = (page - 1) * pageSize;
    const docs = await OrderModel.find(filter)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(pageSize)
      .lean();

    const pageSlice = docs.map((o: any) => ({
      id: o._id.toString(),
      orderNumber: o.orderNumber || o._id.toString().slice(-6),
      userId: o.userId?.toString() || null,
      customerEmail: o.email || o.deliveryInfo?.address || null,
      customerName: null,
      totalAmount: o.totalAmount ?? o.total ?? 0,
      currency: o.currency || 'USD',
      status: o.status,
      paymentMethod: o.paymentMethod || 'chapa',
      createdAt: o.createdAt,
      updatedAt: o.updatedAt,
      isCustomOrder: !!o.isCustomOrder,
      itemCount: Array.isArray(o.items) ? o.items.reduce((s: number, it: any) => s + (it.quantity || 0), 0) : 0,
    }));
    // Fetch user names for visible slice
    const userIds = [...new Set(pageSlice.filter(r => r.userId).map(r => r.userId))];
    if (userIds.length) {
      const userDocs = await UserModel.find({ _id: { $in: userIds } }, { name: 1, email: 1 }).lean();
      const userMap = new Map(userDocs.map((u: any) => [u._id.toString(), u.name]));
      pageSlice.forEach(r => { if (r.userId && userMap.has(r.userId)) r.customerName = userMap.get(r.userId)!; });
    }

    const effectiveTotal = totalCount;
    return NextResponse.json({
      page,
      pageSize,
      totalCount: effectiveTotal,
      totalPages: Math.ceil(effectiveTotal / pageSize),
      orders: pageSlice,
    });
  } catch (err: any) {
    console.error("[ADMIN_ORDERS_LIST_GET]", err);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
