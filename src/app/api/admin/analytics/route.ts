import { NextRequest, NextResponse } from 'next/server';
import { verifyAuth } from '@/lib/auth/session';
import { isAdminEmail } from '@/config/admin-public';
import { getDb } from '@/lib/db/connection';
import { OrderModel } from '@/lib/db/models/Order';
import { CustomOrderModel } from '@/lib/db/models/CustomOrder';
import { ProductModel } from '@/lib/db/models/Product';

export async function GET(req: NextRequest) {
  const auth = await verifyAuth(req);
  if (!auth.user || !isAdminEmail(auth.user.email)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }
  await getDb();
  const now = new Date();
  const dayMs = 24 * 60 * 60 * 1000;
  const start30 = new Date(now.getTime() - 29 * dayMs); // inclusive range last 30 days
  start30.setHours(0,0,0,0);

  // salesByDay from orders
  const salesAgg = await OrderModel.aggregate([
    { $match: { createdAt: { $gte: start30 } } },
    { $group: { _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } }, revenue: { $sum: '$total' }, orders: { $sum: 1 } } },
    { $sort: { _id: 1 } }
  ]);

  // Ensure continuous days
  const salesByDay: { date: string; totalRevenue: number; totalOrders: number }[] = [];
  for (let i = 0; i < 30; i++) {
    const d = new Date(start30.getTime() + i * dayMs);
    const key = d.toISOString().slice(0,10);
    const found = salesAgg.find(r => r._id === key);
    salesByDay.push({ date: key, totalRevenue: found?.revenue || 0, totalOrders: found?.orders || 0 });
  }

  // topProducts over last 30 days
  const topAgg = await OrderModel.aggregate([
    { $match: { createdAt: { $gte: start30 } } },
    { $unwind: '$items' },
    { $group: { _id: '$items.productId', quantity: { $sum: '$items.quantity' }, revenue: { $sum: { $multiply: ['$items.price', '$items.quantity'] } } } },
    { $sort: { quantity: -1 } },
    { $limit: 10 }
  ]);
  const productDocs = await ProductModel.find({ _id: { $in: topAgg.map(t => t._id) } }, { name: 1 }).lean();
  const nameMap = new Map(productDocs.map(p => [p._id.toString(), p.name]));
  const topProducts = topAgg.map(t => ({ productId: t._id.toString(), name: nameMap.get(t._id.toString()) || 'Unknown', totalQuantitySold: t.quantity, totalRevenue: t.revenue }));

  // Order status breakdown (all time)
  const statusAgg = await OrderModel.aggregate([
    { $group: { _id: '$status', count: { $sum: 1 } } }
  ]);
  const orderStatusBreakdown = statusAgg.map(s => ({ status: s._id, count: s.count }));

  // Basic totals
  const [totalRevenueAllTimeAgg, last30Agg, totalOrdersAllTime, last30OrdersCount, customOrdersLast30, totalCustomOrders] = await Promise.all([
    OrderModel.aggregate([{ $group: { _id: null, rev: { $sum: '$total' } } }]),
    OrderModel.aggregate([{ $match: { createdAt: { $gte: start30 } } }, { $group: { _id: null, rev: { $sum: '$total' } } }]),
    OrderModel.countDocuments({}),
    OrderModel.countDocuments({ createdAt: { $gte: start30 } }),
    CustomOrderModel.countDocuments({ createdAt: { $gte: start30 } }),
    CustomOrderModel.countDocuments({})
  ]);
  const totalRevenueAllTime = totalRevenueAllTimeAgg[0]?.rev || 0;
  const totalRevenueLast30Days = last30Agg[0]?.rev || 0;

  return NextResponse.json({
    salesByDay,
    topProducts,
    orderStatusBreakdown,
    totals: {
      totalRevenueAllTime,
      totalRevenueLast30Days,
      totalOrdersAllTime,
      totalOrdersLast30Days: last30OrdersCount,
      totalCustomOrders,
      totalCustomOrdersLast30Days: customOrdersLast30
    }
  });
}