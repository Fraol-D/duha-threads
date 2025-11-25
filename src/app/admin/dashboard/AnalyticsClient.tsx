"use client";
import { useEffect, useState } from 'react';
import { Card } from '@/components/ui/Card';
import {
  LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Legend,
  BarChart, Bar, PieChart, Pie, Cell
} from 'recharts';

interface SalesDay { date: string; totalRevenue: number; totalOrders: number }
interface TopProduct { productId: string; name: string; totalQuantitySold: number; totalRevenue: number }
interface StatusBreakdown { status: string; count: number }

interface AnalyticsPayload {
  salesByDay: SalesDay[];
  topProducts: TopProduct[];
  orderStatusBreakdown: StatusBreakdown[];
  totals: {
    totalRevenueAllTime: number;
    totalRevenueLast30Days: number;
    totalOrdersAllTime: number;
    totalOrdersLast30Days: number;
    totalCustomOrders: number;
    totalCustomOrdersLast30Days: number;
  };
}

export default function AnalyticsClient() {
  const [data, setData] = useState<AnalyticsPayload | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const res = await fetch('/api/admin/analytics');
        if (!active) return;
        if (res.ok) {
          const json = await res.json();
            setData(json);
        } else if (res.status === 403) {
          setError('Forbidden');
        } else {
          setError('Failed to load analytics');
        }
      } catch (e) {
        if (active) setError('Network error');
      } finally {
        if (active) setLoading(false);
      }
    })();
    return () => { active = false; };
  }, []);

  if (loading) return <div className="py-6 text-sm">Loading analytics…</div>;
  if (error) return <div className="py-6 text-sm text-red-600">{error}</div>;
  if (!data) return null;

  const formatCurrency = (n: number) => `$${n.toFixed(2)}`;

  const COLORS = ['#111111','#333333','#555555','#777777','#999999','#bbbbbb','#dddddd'];
  return (
    <div className="space-y-6">
      <div className="grid md:grid-cols-3 gap-4">
        <Card className="p-4 space-y-1">
          <h3 className="text-sm font-medium">Revenue (30d)</h3>
          <p className="text-2xl font-semibold">{formatCurrency(data.totals.totalRevenueLast30Days)}</p>
        </Card>
        <Card className="p-4 space-y-1">
          <h3 className="text-sm font-medium">Orders (30d)</h3>
          <p className="text-2xl font-semibold">{data.totals.totalOrdersLast30Days}</p>
        </Card>
        <Card className="p-4 space-y-1">
          <h3 className="text-sm font-medium">Custom Orders (30d)</h3>
          <p className="text-2xl font-semibold">{data.totals.totalCustomOrdersLast30Days}</p>
        </Card>
      </div>
      <Card className="p-4 space-y-3">
        <h3 className="text-sm font-medium">Revenue & Orders (Last 30 Days)</h3>
        {data.salesByDay.every(d => d.totalRevenue === 0 && d.totalOrders === 0) ? (
          <p className="text-xs text-muted">No data yet – chart will appear once orders arrive.</p>
        ) : (
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={data.salesByDay} margin={{ top: 10, right: 20, bottom: 10, left: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                <XAxis dataKey="date" tick={{ fontSize: 10 }} minTickGap={20} />
                <YAxis yAxisId="rev" tick={{ fontSize: 10 }} />
                <YAxis yAxisId="ord" orientation="right" tick={{ fontSize: 10 }} />
                <Tooltip formatter={(v:any, n:any)=> n==='totalRevenue'? formatCurrency(v): v} />
                <Legend />
                <Line yAxisId="rev" type="monotone" dataKey="totalRevenue" stroke="var(--foreground)" strokeWidth={2} dot={false} name="Revenue" />
                <Line yAxisId="ord" type="monotone" dataKey="totalOrders" stroke="var(--foreground)" strokeOpacity={0.5} strokeWidth={2} dot={false} name="Orders" />
              </LineChart>
            </ResponsiveContainer>
          </div>
        )}
      </Card>
      <div className="grid md:grid-cols-2 gap-4">
        <Card className="p-4 space-y-3">
          <h3 className="text-sm font-medium">Top Products (Last 30 Days)</h3>
          {data.topProducts.length === 0 ? (
            <p className="text-xs text-muted">No product sales yet.</p>
          ) : (
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={data.topProducts} margin={{ top: 10, right: 10, bottom: 20, left: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                  <XAxis dataKey="name" interval={0} angle={-30} textAnchor="end" height={60} tick={{ fontSize: 10 }} />
                  <YAxis tick={{ fontSize: 10 }} />
                  <Tooltip formatter={(v:any, n:any)=> n==='totalRevenue'? formatCurrency(v): v} />
                  <Legend />
                  <Bar dataKey="totalQuantitySold" name="Qty Sold" fill="var(--foreground)" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </Card>
        <Card className="p-4 space-y-3">
          <h3 className="text-sm font-medium">Order Status Breakdown</h3>
          {data.orderStatusBreakdown.length === 0 ? (
            <p className="text-xs text-muted">No orders yet.</p>
          ) : (
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={data.orderStatusBreakdown} dataKey="count" nameKey="status" outerRadius={110} label={({name, percent}) => `${name} ${(percent*100).toFixed(0)}%`}>
                    {data.orderStatusBreakdown.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            </div>
          )}
        </Card>
      </div>
    </div>
  );
}
