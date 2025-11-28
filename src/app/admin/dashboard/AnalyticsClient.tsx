"use client";
import { useEffect, useState } from 'react';
import { Card } from '@/components/ui/Card';
import {
  LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Legend,
  BarChart, Bar, PieChart, Pie, Cell,
} from 'recharts';
import type { TooltipProps } from 'recharts';

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

const chartPalette = {
  revenue: 'var(--chart-revenue)',
  orders: 'var(--chart-orders)',
  quantity: 'var(--chart-quantity)',
  grid: 'var(--chart-grid)',
  statuses: {
    pending: 'var(--chart-status-pending)',
    pending_review: 'var(--chart-status-pending)',
    processing: 'var(--chart-status-pending)',
    completed: 'var(--chart-status-completed)',
    fulfilled: 'var(--chart-status-completed)',
    shipped: 'var(--chart-status-completed)',
    cancelled: 'var(--chart-status-cancelled)',
    refunded: 'var(--chart-status-cancelled)',
  } as Record<string, string>,
  fallback: ['#0ea5e9', '#22d3ee', '#a855f7', '#f97316', '#34d399'],
};

const tooltipStyle = {
  backgroundColor: 'var(--surface)',
  borderColor: 'var(--muted-border)',
  borderRadius: 8,
  color: 'var(--fg)',
  fontSize: '0.8rem',
};

const statusColorFor = (status: string, index: number) => {
  const key = status?.toLowerCase();
  return chartPalette.statuses[key] ?? chartPalette.fallback[index % chartPalette.fallback.length] ?? 'var(--chart-status-default)';
};

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

  const toNumber = (value?: number) => (typeof value === 'number' && Number.isFinite(value) ? value : 0);
  const formatCurrency = (value?: number) => new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
  }).format(toNumber(value));

  const tooltipFormatter: TooltipProps<number, string>['formatter'] = (value, name) => {
    const numericValue = typeof value === 'number' ? value : Number(value ?? 0);
    const normalized = name?.toLowerCase() ?? '';
    if (normalized.includes('revenue')) {
      return [formatCurrency(numericValue), 'Revenue'];
    }
    if (normalized.includes('order')) {
      return [numericValue, 'Orders'];
    }
    if (normalized.includes('quantity')) {
      return [numericValue, 'Qty Sold'];
    }
    return [numericValue, name];
  };

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
                <CartesianGrid strokeDasharray="3 3" stroke={chartPalette.grid} />
                <XAxis dataKey="date" tick={{ fontSize: 10, fill: 'var(--fg)' }} minTickGap={20} />
                <YAxis yAxisId="rev" tick={{ fontSize: 10, fill: 'var(--fg)' }} />
                <YAxis yAxisId="ord" orientation="right" tick={{ fontSize: 10, fill: 'var(--fg)' }} />
                <Tooltip formatter={tooltipFormatter} contentStyle={tooltipStyle} labelStyle={{ color: 'var(--fg)' }} />
                <Legend wrapperStyle={{ color: 'var(--fg)' }} />
                <Line yAxisId="rev" type="monotone" dataKey="totalRevenue" stroke={chartPalette.revenue} strokeWidth={2} dot={false} name="Revenue" />
                <Line yAxisId="ord" type="monotone" dataKey="totalOrders" stroke={chartPalette.orders} strokeWidth={2} dot={false} name="Orders" />
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
                  <CartesianGrid strokeDasharray="3 3" stroke={chartPalette.grid} />
                  <XAxis dataKey="name" interval={0} angle={-30} textAnchor="end" height={60} tick={{ fontSize: 10, fill: 'var(--fg)' }} />
                  <YAxis tick={{ fontSize: 10, fill: 'var(--fg)' }} />
                  <Tooltip formatter={tooltipFormatter} contentStyle={tooltipStyle} labelStyle={{ color: 'var(--fg)' }} />
                  <Legend wrapperStyle={{ color: 'var(--fg)' }} />
                  <Bar dataKey="totalQuantitySold" name="Qty Sold" fill={chartPalette.quantity} />
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
                  <Pie
                    data={data.orderStatusBreakdown}
                    dataKey="count"
                    nameKey="status"
                    outerRadius={110}
                    label={{ fill: 'var(--fg)', fontSize: 12 }}
                  >
                    {data.orderStatusBreakdown.map((entry, index) => (
                      <Cell key={`cell-${entry.status}-${index}`} fill={statusColorFor(entry.status, index)} />
                    ))}
                  </Pie>
                  <Tooltip contentStyle={tooltipStyle} labelStyle={{ color: 'var(--fg)' }} />
                  <Legend wrapperStyle={{ color: 'var(--fg)' }} />
                </PieChart>
              </ResponsiveContainer>
            </div>
          )}
        </Card>
      </div>
    </div>
  );
}
