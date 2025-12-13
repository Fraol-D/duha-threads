import { NextRequest, NextResponse } from 'next/server';
import { verifyAuth } from '@/lib/auth/session';
import { isAdmin } from '@/lib/auth/admin';
import { getDb } from '@/lib/db/connection';
import { OrderModel } from '@/lib/db/models/Order';
import { CustomOrderModel } from '@/lib/db/models/CustomOrder';
import { ProductModel } from '@/lib/db/models/Product';
import { logger } from '@/lib/logger';

type SalesDay = { date: string; totalRevenue: number; totalOrders: number };
type AnalyticsResponse = {
  salesByDay: SalesDay[];
  topProducts: { productId: string; name: string; totalQuantitySold: number; totalRevenue: number }[];
  orderStatusBreakdown: { status: string; count: number }[];
  totals: {
    totalRevenueAllTime: number;
    totalRevenueLast30Days: number;
    totalOrdersAllTime: number;
    totalOrdersLast30Days: number;
    totalCustomOrders: number;
    totalCustomOrdersLast30Days: number;
  };
};

const DAY_MS = 24 * 60 * 60 * 1000;

const toNumber = (value: unknown): number => {
  return typeof value === 'number' && Number.isFinite(value) ? value : 0;
};

const buildEmptyResponse = (startDate: Date): AnalyticsResponse => {
  const salesByDay: SalesDay[] = Array.from({ length: 30 }, (_, idx) => {
    const d = new Date(startDate.getTime() + idx * DAY_MS);
    const key = d.toISOString().slice(0, 10);
    return { date: key, totalRevenue: 0, totalOrders: 0 };
  });
  return {
    salesByDay,
    topProducts: [],
    orderStatusBreakdown: [],
    totals: {
      totalRevenueAllTime: 0,
      totalRevenueLast30Days: 0,
      totalOrdersAllTime: 0,
      totalOrdersLast30Days: 0,
      totalCustomOrders: 0,
      totalCustomOrdersLast30Days: 0,
    },
  };
};

export async function GET(req: NextRequest) {
  const auth = await verifyAuth(req);
  if (!isAdmin(auth.user)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const now = new Date();
  const start30 = new Date(now.getTime() - 29 * DAY_MS);
  start30.setHours(0, 0, 0, 0);
  const fallback = buildEmptyResponse(start30);

  try {
    await getDb();

    const salesAgg = await OrderModel.aggregate([
      { $match: { createdAt: { $gte: start30 } } },
      { $group: { _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } }, revenue: { $sum: '$totalAmount' }, orders: { $sum: 1 } } },
      { $sort: { _id: 1 } }
    ]);

    const salesByDay: SalesDay[] = fallback.salesByDay.map((entry) => {
      const found = salesAgg.find(r => r._id === entry.date);
      return {
        date: entry.date,
        totalRevenue: toNumber(found?.revenue),
        totalOrders: toNumber(found?.orders),
      };
    });

    const topAgg = await OrderModel.aggregate([
      { $match: { createdAt: { $gte: start30 } } },
      { $unwind: '$items' },
      { $group: { _id: '$items.productId', quantity: { $sum: '$items.quantity' }, revenue: { $sum: '$items.subtotal' } } },
      { $sort: { quantity: -1 } },
      { $limit: 10 }
    ]);
    const productIds = topAgg.map(t => t?._id).filter(Boolean);
    const productDocs = await ProductModel.find({ _id: { $in: productIds } }, { name: 1 }).lean();
    const nameMap = new Map(productDocs.map((p: any) => [p._id.toString(), p.name]));
    const topProducts = topAgg.map(t => {
      const productId = t?._id ? t._id.toString() : `unknown-${Math.random().toString(36).slice(2, 8)}`;
      return {
        productId,
        name: nameMap.get(productId) || 'Unknown',
        totalQuantitySold: toNumber(t?.quantity),
        totalRevenue: toNumber(t?.revenue),
      };
    });

    const statusAgg = await OrderModel.aggregate([
      { $group: { _id: '$status', count: { $sum: 1 } } }
    ]);
    const orderStatusBreakdown = statusAgg.map(s => ({
      status: typeof s._id === 'string' ? s._id : 'UNKNOWN',
      count: toNumber(s?.count),
    }));

    const [totalRevenueAllTimeAgg, last30Agg, totalOrdersAllTime, last30OrdersCount, customOrdersLast30, totalCustomOrders] = await Promise.all([
      OrderModel.aggregate([{ $group: { _id: null, rev: { $sum: '$totalAmount' } } }]),
      OrderModel.aggregate([{ $match: { createdAt: { $gte: start30 } } }, { $group: { _id: null, rev: { $sum: '$totalAmount' } } }]),
      OrderModel.countDocuments({}),
      OrderModel.countDocuments({ createdAt: { $gte: start30 } }),
      CustomOrderModel.countDocuments({ createdAt: { $gte: start30 } }),
      CustomOrderModel.countDocuments({})
    ]);

    const totals = {
      totalRevenueAllTime: toNumber(totalRevenueAllTimeAgg[0]?.rev),
      totalRevenueLast30Days: toNumber(last30Agg[0]?.rev),
      totalOrdersAllTime: typeof totalOrdersAllTime === 'number' ? totalOrdersAllTime : 0,
      totalOrdersLast30Days: typeof last30OrdersCount === 'number' ? last30OrdersCount : 0,
      totalCustomOrders: typeof totalCustomOrders === 'number' ? totalCustomOrders : 0,
      totalCustomOrdersLast30Days: typeof customOrdersLast30 === 'number' ? customOrdersLast30 : 0,
    };

    return NextResponse.json({
      salesByDay,
      topProducts,
      orderStatusBreakdown,
      totals,
    });
  } catch (err) {
    logger.error('[AdminAnalytics] Failed to load analytics data', err);
    return NextResponse.json(fallback);
  }
}