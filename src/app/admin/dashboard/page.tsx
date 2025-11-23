import { BentoGrid, BentoTile } from "@/components/ui/BentoGrid";
import { Button } from "@/components/ui/Button";
import { getCurrentUser } from "@/lib/auth/session";
import { isAdmin } from "@/lib/auth/admin";
import Link from "next/link";
import { getDb } from "@/lib/db/connection";
import { UserModel } from "@/lib/db/models/User";
import { OrderModel } from "@/lib/db/models/Order";
import { CustomOrderModel } from "@/lib/db/models/CustomOrder";

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

  const todaySalesFromOrders = todayOrders.reduce((sum: number, o: any) => sum + (o.total || 0), 0);
  const todaySalesFromCustom = todayCustomOrders.reduce(
    (sum: number, co: any) => sum + (co.pricing?.finalTotal ?? co.pricing?.estimatedTotal ?? 0),
    0
  );
  const kpis = {
    todaySales: todaySalesFromOrders + todaySalesFromCustom,
    todayOrdersCount: todayOrders.length,
    todayCustomOrdersCount: todayCustomOrders.length,
    newUsersToday: todayUsersCount,
    pendingCustomJobsCount,
    totals: {
      users: totalUsersCount,
      orders: totalOrdersCount,
      customOrders: totalCustomOrdersCount,
    },
  };

  const recent = {
    orders: recentOrders.map((o: any) => ({ id: o._id.toString(), total: o.total, status: o.status, createdAt: o.createdAt })),
    customOrders: recentCustomOrders.map((co: any) => ({
      id: co._id.toString(),
      total: co.pricing?.finalTotal ?? co.pricing?.estimatedTotal ?? 0,
      status: co.status,
      createdAt: co.createdAt,
    })),
  } satisfies DashboardData["recent"];

  const formatCurrency = (n: number) => `$${n.toFixed(2)}`;

  return (
    <div className="max-w-7xl mx-auto p-6 md:p-10 space-y-8">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-semibold tracking-tight">Admin Dashboard</h1>
      </div>
      <BentoGrid>
        <BentoTile variant="glass">
          <h2 className="text-sm text-muted-foreground mb-2">Sales Today</h2>
          <p className="text-3xl font-semibold">{formatCurrency(kpis.todaySales)}</p>
        </BentoTile>
        <BentoTile variant="glass">
          <h2 className="text-sm text-muted-foreground mb-2">Orders Today</h2>
          <p className="text-3xl font-semibold">{kpis.todayOrdersCount}</p>
        </BentoTile>
        <BentoTile variant="glass">
          <h2 className="text-sm text-muted-foreground mb-2">Custom Orders Today</h2>
          <p className="text-3xl font-semibold">{kpis.todayCustomOrdersCount}</p>
        </BentoTile>
        <BentoTile variant="glass">
          <h2 className="text-sm text-muted-foreground mb-2">New Users Today</h2>
          <p className="text-3xl font-semibold">{kpis.newUsersToday}</p>
        </BentoTile>
        <BentoTile variant="glass">
          <h2 className="text-sm text-muted-foreground mb-2">Pending Custom Jobs</h2>
          <p className="text-3xl font-semibold">{kpis.pendingCustomJobsCount}</p>
        </BentoTile>
        <BentoTile variant="glass">
          <h2 className="text-sm text-muted-foreground mb-2">Totals</h2>
          <div className="space-y-1 text-sm">
            <p><span className="text-muted-foreground">Users:</span> {kpis.totals.users}</p>
            <p><span className="text-muted-foreground">Orders:</span> {kpis.totals.orders}</p>
            <p><span className="text-muted-foreground">Custom Orders:</span> {kpis.totals.customOrders}</p>
          </div>
        </BentoTile>
        <BentoTile variant="soft3D">
          <h2 className="text-sm font-medium mb-1">Products</h2>
          <p className="text-xs text-muted-foreground mb-4">Add and manage tees</p>
          <Link href="/admin/products" className="inline-block">
            <Button variant="secondary">Manage products</Button>
          </Link>
        </BentoTile>
        <BentoTile span="2" rowSpan="2" variant="soft3D">
          <h2 className="text-sm text-muted-foreground mb-4">Recent Orders</h2>
          <div className="space-y-3 text-sm max-h-80 overflow-auto pr-2">
            {recent.orders.length === 0 && <p className="text-muted-foreground">No recent orders.</p>}
            {recent.orders.map((o) => (
              <div key={o.id} className="flex items-center justify-between border-b border-muted pb-2">
                <div>
                  <p className="font-medium">{formatCurrency(o.total)}</p>
                  <p className="text-xs text-muted-foreground">{new Date(o.createdAt).toLocaleString()}</p>
                </div>
                <span className="text-xs px-2 py-1 rounded bg-[--surface-alt]">{o.status}</span>
              </div>
            ))}
          </div>
          <div className="mt-4 text-right">
            <Link href="/admin/orders" className="text-xs underline hover:opacity-80">View all</Link>
          </div>
        </BentoTile>
        <BentoTile span="1" rowSpan="2" variant="soft3D">
          <h2 className="text-sm text-muted-foreground mb-4">Recent Custom Orders</h2>
          <div className="space-y-3 text-sm max-h-80 overflow-auto pr-2">
            {recent.customOrders.length === 0 && <p className="text-muted-foreground">No recent custom orders.</p>}
            {recent.customOrders.map((co) => (
              <div key={co.id} className="flex items-center justify-between border-b border-muted pb-2">
                <div>
                  <p className="font-medium">{formatCurrency(co.total || 0)}</p>
                  <p className="text-xs text-muted-foreground">{new Date(co.createdAt).toLocaleString()}</p>
                </div>
                <span className="text-xs px-2 py-1 rounded bg-[--surface-alt]">{co.status}</span>
              </div>
            ))}
          </div>
          <div className="mt-4 text-right">
            <Link href="/admin/custom-orders" className="text-xs underline hover:opacity-80">View all</Link>
          </div>
        </BentoTile>
      </BentoGrid>
    </div>
  );
}
