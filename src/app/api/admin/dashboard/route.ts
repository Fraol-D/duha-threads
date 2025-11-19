import { NextRequest, NextResponse } from "next/server";
import { verifyAuth } from "@/lib/auth/session";
import { isAdmin } from "@/lib/auth/admin";
import { UserModel } from "@/lib/db/models/User";
import { OrderModel } from "@/lib/db/models/Order";
import { CustomOrderModel } from "@/lib/db/models/CustomOrder";

// GET /api/admin/dashboard
export async function GET(req: NextRequest) {
  try {
    const authResult = await verifyAuth(req);
    if (!authResult.user || !isAdmin(authResult.user)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);
    const tomorrowStart = new Date(todayStart.getTime() + 24 * 60 * 60 * 1000);

    // Parallel queries for efficiency
    const [
      todayOrders,
      todayCustomOrders,
      todayUsersCount,
      recentOrders,
      recentCustomOrders,
      pendingCustomJobsCount,
      totalUsersCount,
      totalOrdersCount,
      totalCustomOrdersCount,
    ] = await Promise.all([
      OrderModel.find({ createdAt: { $gte: todayStart, $lt: tomorrowStart } }, { total: 1 }).lean(),
      CustomOrderModel.find(
        { createdAt: { $gte: todayStart, $lt: tomorrowStart } },
        { "pricing.finalTotal": 1, "pricing.estimatedTotal": 1 }
      ).lean(),
      UserModel.countDocuments({ createdAt: { $gte: todayStart, $lt: tomorrowStart } }),
      OrderModel.find({}, { userId: 1, total: 1, status: 1, createdAt: 1 })
        .sort({ createdAt: -1 })
        .limit(5)
        .lean(),
      CustomOrderModel.find({}, { userId: 1, status: 1, createdAt: 1, "pricing.finalTotal": 1, "pricing.estimatedTotal": 1 })
        .sort({ createdAt: -1 })
        .limit(5)
        .lean(),
      CustomOrderModel.countDocuments({ status: { $in: ["PENDING_REVIEW", "ACCEPTED"] } }),
      UserModel.countDocuments({}),
      OrderModel.countDocuments({}),
      CustomOrderModel.countDocuments({}),
    ]);

    const todaySalesFromOrders = todayOrders.reduce((sum, o: any) => sum + (o.total || 0), 0);
    const todaySalesFromCustom = todayCustomOrders.reduce(
      (sum, co: any) => sum + (co.pricing?.finalTotal ?? co.pricing?.estimatedTotal ?? 0),
      0
    );
    const todaySales = todaySalesFromOrders + todaySalesFromCustom;

    // Simple structure for recent items
    const recentOrdersData = recentOrders.map((o: any) => ({
      id: o._id.toString(),
      total: o.total,
      status: o.status,
      createdAt: o.createdAt,
    }));
    const recentCustomOrdersData = recentCustomOrders.map((co: any) => ({
      id: co._id.toString(),
      total: co.pricing?.finalTotal ?? co.pricing?.estimatedTotal ?? 0,
      status: co.status,
      createdAt: co.createdAt,
    }));

    return NextResponse.json({
      kpis: {
        todaySales,
        todayOrdersCount: todayOrders.length,
        todayCustomOrdersCount: todayCustomOrders.length,
        newUsersToday: todayUsersCount,
        pendingCustomJobsCount,
        totals: {
          users: totalUsersCount,
          orders: totalOrdersCount,
          customOrders: totalCustomOrdersCount,
        },
      },
      recent: {
        orders: recentOrdersData,
        customOrders: recentCustomOrdersData,
      },
    });
  } catch (err: any) {
    console.error("[ADMIN_DASHBOARD_GET]", err);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
