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
import { ProductRatingModel } from "@/lib/db/models/ProductRating";

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
  reviews: {
    total: number;
    featured: number;
    latest: { id: string; rating: number; comment: string; productName: string } | null;
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
  reviews: {
    total: 0,
    featured: 0,
    latest: null,
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
      totalReviewsCount,
      featuredReviewsCount,
      latestReviewDoc,
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
      ProductRatingModel.countDocuments({}),
      ProductRatingModel.countDocuments({ featured: true }),
      ProductRatingModel.findOne({})
        .sort({ updatedAt: -1 })
        .populate([{ path: "productId", select: "name" }])
        .lean(),
    ]);

    // Define types for the data we're working with to avoid 'any'
    type OrderDoc = { _id?: { toString(): string } | string; total?: number; status?: string; createdAt?: Date | string | number };
    type CustomOrderDoc = { _id?: { toString(): string } | string; pricing?: { finalTotal?: number; estimatedTotal?: number }; status?: string; createdAt?: Date | string | number };
    type ReviewDoc = {
      _id?: { toString(): string } | string;
      rating?: number;
      comment?: string | null;
      productId?: { name?: string | null } | string | null;
    };

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

    const typedLatestReview = (latestReviewDoc ?? null) as ReviewDoc | null;

    safeData.reviews = {
      total: typeof totalReviewsCount === "number" ? totalReviewsCount : 0,
      featured: typeof featuredReviewsCount === "number" ? featuredReviewsCount : 0,
      latest: typedLatestReview
        ? {
            id: typedLatestReview._id?.toString?.() ?? generateTempId(),
            rating: toNumber(typedLatestReview.rating) || 0,
            comment: typedLatestReview.comment ?? "",
            productName:
              typeof typedLatestReview.productId === "object" && typedLatestReview.productId !== null
                ? ((typedLatestReview.productId as { name?: string | null })?.name ?? "Product")
                : "Product",
          }
        : null,
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
  const { kpis, recent, reviews } = await fetchDashboardData();
  const formatCurrency = (value?: number) => currencyFormatter.format(toNumber(value));
  const latestReviewSnippet = reviews.latest?.comment
    ? `${reviews.latest.comment.slice(0, 120)}${reviews.latest.comment.length > 120 ? "..." : ""}`
    : null;

  return (
    <div className="max-w-7xl mx-auto px-4 pb-12 space-y-8 sm:px-6 lg:px-8">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold tracking-tight">Dashboard</h1>
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
              <h2 className="text-xs uppercase tracking-wider text-muted-foreground mb-2 font-medium">Customer Voice</h2>
              <p className="text-3xl font-bold">{reviews.total}</p>
              <p className="text-xs text-muted-foreground">{reviews.featured} featured on homepage</p>
            </div>
            <div className="p-2 bg-pink-500/10 rounded-lg">
              <svg className="w-5 h-5 text-pink-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.364 1.118l1.519 4.674c.3.921-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.519-4.674a1 1 0 00-.364-1.118L2.077 10.1c-.783-.57-.38-1.81.588-1.81h4.915a1 1 0 00.95-.69l1.519-4.674z" />
              </svg>
            </div>
          </div>
          {reviews.latest ? (
            <div className="mt-3 rounded-lg border border-muted/40 bg-[--surface] p-3">
              <div className="flex items-center justify-between text-[11px] text-muted-foreground mb-2">
                <span className="font-semibold text-foreground">{reviews.latest.productName}</span>
                <span className="text-amber-600 font-medium">{reviews.latest.rating.toFixed(1)} / 5</span>
              </div>
              {latestReviewSnippet ? (
                <p className="text-xs text-muted-foreground line-clamp-2">&quot;{latestReviewSnippet}&quot;</p>
              ) : (
                <p className="text-xs text-muted-foreground">No comment provided.</p>
              )}
            </div>
          ) : (
            <p className="text-xs text-muted-foreground mt-3">No reviews yet</p>
          )}
          <Link
            href="/admin/reviews"
            className="mt-4 inline-flex items-center text-xs font-semibold text-primary hover:underline"
          >
            Manage reviews →
          </Link>
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
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <h2 className="text-xl font-bold tracking-tight">Analytics</h2>
        </div>
        <AnalyticsClient />
      </div>
    </div>
  );
}
