import { BentoGrid, BentoTile } from "@/components/ui/BentoGrid";
import AnalyticsClient from "./AnalyticsClient";
import { getCurrentUser } from "@/lib/auth/session";
import { isAdmin } from "@/lib/auth/admin";
import Link from "next/link";
import { getDb } from "@/lib/db/connection";
import { UserModel } from "@/lib/db/models/User";
import { OrderModel } from "@/lib/db/models/Order";
import { CustomOrderModel } from "@/lib/db/models/CustomOrder";
import { logger } from "@/lib/logger";

interface DashboardData {
  kpis: {
    todaySales: number;
    todayOrdersCount: number;
    todayCustomOrdersCount: number;
    newUsersToday: number;
    pendingCustomJobsCount: number;
    totals: { users: number; orders: number; customOrders: number };
  };
  recent: {
    orders: { id: string; total: number; status: string; createdAt: Date }[];
    customOrders: { id: string; total: number; status: string; createdAt: Date }[];
  };
}

const currencyFormatter = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  minimumFractionDigits: 2,
});

const toNumber = (value: unknown): number => {
  return typeof value === "number" && Number.isFinite(value) ? value : 0;
};

const cloneDefaultData = (): DashboardData => ({
  kpis: {
    todaySales: 0,
    todayOrdersCount: 0,
    todayCustomOrdersCount: 0,
    newUsersToday: 0,
    pendingCustomJobsCount: 0,
    totals: { users: 0, orders: 0, customOrders: 0 },
  },
  recent: {
    orders: [],
    customOrders: [],
  },
});

const generateTempId = () => `temp-${Math.random().toString(36).slice(2, 10)}`;

async function fetchDashboardData(): Promise<DashboardData> {
  const safeData = cloneDefaultData();
  try {
    await getDb();
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);
    const tomorrowStart = new Date(todayStart.getTime() + 24 * 60 * 60 * 1000);

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
      OrderModel.find({}, { total: 1, status: 1, createdAt: 1 })
        .sort({ createdAt: -1 })
        .limit(5)
        .lean(),
      CustomOrderModel.find({}, { status: 1, createdAt: 1, "pricing.finalTotal": 1, "pricing.estimatedTotal": 1 })
        .sort({ createdAt: -1 })
        .limit(5)
        .lean(),
      CustomOrderModel.countDocuments({ status: { $in: ["PENDING_REVIEW", "ACCEPTED"] } }),
      UserModel.countDocuments({}),
      OrderModel.countDocuments({}),
      CustomOrderModel.countDocuments({}),
    ]);

    // Define types for the data we're working with to avoid 'any'
    type OrderDoc = { _id?: { toString(): string } | string; total?: number; status?: string; createdAt?: Date | string | number };
    type CustomOrderDoc = { _id?: { toString(): string } | string; pricing?: { finalTotal?: number; estimatedTotal?: number }; status?: string; createdAt?: Date | string | number };

    const safeTodayOrders = (Array.isArray(todayOrders) ? todayOrders : []) as unknown as OrderDoc[];
    const safeTodayCustomOrders = (Array.isArray(todayCustomOrders) ? todayCustomOrders : []) as unknown as CustomOrderDoc[];
    const safeRecentOrders = (Array.isArray(recentOrders) ? recentOrders : []) as unknown as OrderDoc[];
    const safeRecentCustomOrders = (Array.isArray(recentCustomOrders) ? recentCustomOrders : []) as unknown as CustomOrderDoc[];

    const todaySalesFromOrders = safeTodayOrders.reduce((sum: number, o: OrderDoc) => sum + toNumber(o.total), 0);
    const todaySalesFromCustom = safeTodayCustomOrders.reduce(
      (sum: number, co: CustomOrderDoc) => sum + toNumber(co.pricing?.finalTotal ?? co.pricing?.estimatedTotal),
      0
    );

    safeData.kpis = {
      todaySales: todaySalesFromOrders + todaySalesFromCustom,
      todayOrdersCount: safeTodayOrders.length,
      todayCustomOrdersCount: safeTodayCustomOrders.length,
      newUsersToday: typeof todayUsersCount === "number" ? todayUsersCount : 0,
      pendingCustomJobsCount: typeof pendingCustomJobsCount === "number" ? pendingCustomJobsCount : 0,
      totals: {
        users: typeof totalUsersCount === "number" ? totalUsersCount : 0,
        orders: typeof totalOrdersCount === "number" ? totalOrdersCount : 0,
        customOrders: typeof totalCustomOrdersCount === "number" ? totalCustomOrdersCount : 0,
      },
    };

    safeData.recent = {
      orders: safeRecentOrders.map((o: OrderDoc) => ({
        id: o?._id?.toString?.() ?? generateTempId(),
        total: toNumber(o?.total),
        status: o?.status ?? "UNKNOWN",
        createdAt: o?.createdAt instanceof Date ? o.createdAt : new Date(o?.createdAt ?? Date.now()),
      })),
      customOrders: safeRecentCustomOrders.map((co: CustomOrderDoc) => ({
        id: co?._id?.toString?.() ?? generateTempId(),
        total: toNumber(co?.pricing?.finalTotal ?? co?.pricing?.estimatedTotal),
        status: co?.status ?? "UNKNOWN",
        createdAt: co?.createdAt instanceof Date ? co.createdAt : new Date(co?.createdAt ?? Date.now()),
      })),
    };

    return safeData;
  } catch (err) {
    logger.error("[AdminDashboard] Failed to load dashboard data", err);
    return safeData;
  }
}

export default async function AdminDashboardPage() {
  const user = await getCurrentUser();
  if (!user || !isAdmin(user)) {
    return (
      <div className="max-w-5xl mx-auto p-8">
        <h1 className="text-2xl font-semibold mb-4">Forbidden</h1>
        <p>You do not have access to this area.</p>
      </div>
    );
  }
  const { kpis, recent } = await fetchDashboardData();
  const formatCurrency = (value?: number) => currencyFormatter.format(toNumber(value));

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
          <p className="text-sm text-muted-foreground mt-1">Overview of your store performance</p>
        </div>
      </div>

      {/* KPI Grid */}
      <BentoGrid>
        <BentoTile variant="glass" className="group hover:shadow-lg transition-shadow duration-300">
          <div className="flex items-start justify-between">
            <div>
              <h2 className="text-xs uppercase tracking-wider text-muted-foreground mb-2 font-medium">Sales Today</h2>
              <p className="text-3xl font-bold bg-linear-to-r from-green-600 to-emerald-600 bg-clip-text text-transparent">{formatCurrency(kpis.todaySales)}</p>
            </div>
            <div className="p-2 bg-green-500/10 rounded-lg">
              <svg className="w-5 h-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
          </div>
        </BentoTile>
        
        <BentoTile variant="glass" className="group hover:shadow-lg transition-shadow duration-300">
          <div className="flex items-start justify-between">
            <div>
              <h2 className="text-xs uppercase tracking-wider text-muted-foreground mb-2 font-medium">Orders Today</h2>
              <p className="text-3xl font-bold">{kpis.todayOrdersCount}</p>
            </div>
            <div className="p-2 bg-blue-500/10 rounded-lg">
              <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
              </svg>
            </div>
          </div>
        </BentoTile>
        
        <BentoTile variant="glass" className="group hover:shadow-lg transition-shadow duration-300">
          <div className="flex items-start justify-between">
            <div>
              <h2 className="text-xs uppercase tracking-wider text-muted-foreground mb-2 font-medium">Custom Orders</h2>
              <p className="text-3xl font-bold">{kpis.todayCustomOrdersCount}</p>
            </div>
            <div className="p-2 bg-purple-500/10 rounded-lg">
              <svg className="w-5 h-5 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21a4 4 0 01-4-4V5a2 2 0 012-2h4a2 2 0 012 2v12a4 4 0 01-4 4zm0 0h12a2 2 0 002-2v-4a2 2 0 00-2-2h-2.343M11 7.343l1.657-1.657a2 2 0 012.828 0l2.829 2.829a2 2 0 010 2.828l-8.486 8.485M7 17h.01" />
              </svg>
            </div>
          </div>
        </BentoTile>
        
        <BentoTile variant="glass" className="group hover:shadow-lg transition-shadow duration-300">
          <div className="flex items-start justify-between">
            <div>
              <h2 className="text-xs uppercase tracking-wider text-muted-foreground mb-2 font-medium">New Users</h2>
              <p className="text-3xl font-bold">{kpis.newUsersToday}</p>
            </div>
            <div className="p-2 bg-amber-500/10 rounded-lg">
              <svg className="w-5 h-5 text-amber-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
              </svg>
            </div>
          </div>
        </BentoTile>
        
        <BentoTile variant="glass" className="group hover:shadow-lg transition-shadow duration-300">
          <div className="flex items-start justify-between">
            <div>
              <h2 className="text-xs uppercase tracking-wider text-muted-foreground mb-2 font-medium">Pending Jobs</h2>
              <p className="text-3xl font-bold text-orange-600">{kpis.pendingCustomJobsCount}</p>
            </div>
            <div className="p-2 bg-orange-500/10 rounded-lg">
              <svg className="w-5 h-5 text-orange-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
          </div>
        </BentoTile>
        
        <BentoTile variant="soft3D" className="group hover:shadow-lg transition-shadow duration-300">
          <h2 className="text-xs uppercase tracking-wider text-muted-foreground mb-3 font-medium">Overview</h2>
          <div className="space-y-2 text-sm">
            <div className="flex items-center justify-between p-2 rounded-lg bg-[--bg]/50 hover:bg-[--bg] transition-colors">
              <span className="text-muted-foreground">Total Users</span>
              <span className="font-semibold">{kpis.totals.users}</span>
            </div>
            <div className="flex items-center justify-between p-2 rounded-lg bg-[--bg]/50 hover:bg-[--bg] transition-colors">
              <span className="text-muted-foreground">Total Orders</span>
              <span className="font-semibold">{kpis.totals.orders}</span>
            </div>
            <div className="flex items-center justify-between p-2 rounded-lg bg-[--bg]/50 hover:bg-[--bg] transition-colors">
              <span className="text-muted-foreground">Custom Orders</span>
              <span className="font-semibold">{kpis.totals.customOrders}</span>
            </div>
          </div>
        </BentoTile>
        
        <BentoTile span="2" rowSpan="2" variant="soft3D" className="border-none shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-semibold">Recent Orders</h2>
            <Link href="/admin/orders" className="text-xs text-primary hover:underline font-medium">View all →</Link>
          </div>
          <div className="space-y-2 max-h-80 overflow-auto custom-scrollbar">
            {recent.orders.length === 0 && <p className="text-sm text-muted-foreground py-8 text-center">No recent orders.</p>}
            {recent.orders.map((o) => (
              <div key={o.id} className="flex items-center justify-between p-3 rounded-lg hover:bg-[--bg] transition-colors border border-transparent hover:border-muted/20">
                <div className="flex-1">
                  <p className="font-semibold text-sm">{formatCurrency(o.total)}</p>
                  <p className="text-xs text-muted-foreground">{new Date(o.createdAt).toLocaleString()}</p>
                </div>
                <span className="text-xs px-2.5 py-1 rounded-full bg-blue-500/10 text-blue-700 dark:text-blue-400 font-medium">{o.status}</span>
              </div>
            ))}
          </div>
        </BentoTile>
        
        <BentoTile span="1" rowSpan="2" variant="soft3D" className="border-none shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-semibold">Custom Orders</h2>
            <Link href="/admin/custom-orders" className="text-xs text-primary hover:underline font-medium">All →</Link>
          </div>
          <div className="space-y-2 max-h-80 overflow-auto custom-scrollbar">
            {recent.customOrders.length === 0 && <p className="text-sm text-muted-foreground py-8 text-center">No orders.</p>}
            {recent.customOrders.map((co) => (
              <div key={co.id} className="p-3 rounded-lg hover:bg-[--bg] transition-colors border border-transparent hover:border-muted/20">
                <p className="font-semibold text-sm">{formatCurrency(co.total || 0)}</p>
                <p className="text-xs text-muted-foreground mt-1">{new Date(co.createdAt).toLocaleString()}</p>
                <span className="inline-block mt-2 text-xs px-2.5 py-1 rounded-full bg-purple-500/10 text-purple-700 dark:text-purple-400 font-medium">{co.status}</span>
              </div>
            ))}
          </div>
        </BentoTile>
      </BentoGrid>
      
      <div className="space-y-6 pt-4">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-bold tracking-tight">Analytics</h2>
        </div>
        <AnalyticsClient />
      </div>
    </div>
  );
}
