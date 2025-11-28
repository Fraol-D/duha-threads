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
  revenue: '#10b981', // emerald-500
  orders: '#3b82f6', // blue-500
  quantity: '#8b5cf6', // violet-500
  grid: '#e5e7eb', // gray-200 (light mode)
  statuses: {
    pending: '#f59e0b',
    pending_review: '#f59e0b',
    processing: '#3b82f6',
    completed: '#10b981',
    fulfilled: '#10b981',
    shipped: '#10b981',
    cancelled: '#ef4444',
    refunded: '#ef4444',
  } as Record<string, string>,
  fallback: ['#0ea5e9', '#22d3ee', '#a855f7', '#f97316', '#34d399'],
};

const tooltipStyle = {
  backgroundColor: 'rgba(255, 255, 255, 0.95)',
  borderColor: '#e5e7eb',
  borderRadius: 8,
  color: '#111827',
  fontSize: '0.8rem',
  padding: '8px 12px',
  boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
};

const statusColorFor = (status: string, index: number) => {
  const key = status?.toLowerCase();
  return chartPalette.statuses[key] ?? chartPalette.fallback[index % chartPalette.fallback.length] ?? '#6b7280';
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
      } catch {
        if (active) setError('Network error');
      } finally {
        if (active) setLoading(false);
      }
    })();
    return () => { active = false; };
  }, []);

  if (loading) return <div className="py-12 text-center text-sm text-muted-foreground">Loading analytics…</div>;
  if (error) return <div className="py-12 text-center text-sm text-red-600">{error}</div>;
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
        <Card variant="glass" className="p-5 space-y-2 border-none shadow-sm hover:shadow-md transition-shadow">
          <h3 className="text-xs uppercase tracking-wider text-muted-foreground font-medium">Revenue (30d)</h3>
          <p className="text-2xl font-bold bg-linear-to-r from-green-600 to-emerald-600 bg-clip-text text-transparent">
            {formatCurrency(data.totals.totalRevenueLast30Days)}
          </p>
        </Card>
        <Card variant="glass" className="p-5 space-y-2 border-none shadow-sm hover:shadow-md transition-shadow">
          <h3 className="text-xs uppercase tracking-wider text-muted-foreground font-medium">Orders (30d)</h3>
          <p className="text-2xl font-bold text-blue-600">{data.totals.totalOrdersLast30Days}</p>
        </Card>
        <Card variant="glass" className="p-5 space-y-2 border-none shadow-sm hover:shadow-md transition-shadow">
          <h3 className="text-xs uppercase tracking-wider text-muted-foreground font-medium">Custom Orders (30d)</h3>
          <p className="text-2xl font-bold text-purple-600">{data.totals.totalCustomOrdersLast30Days}</p>
        </Card>
      </div>
      
      <Card variant="soft3D" className="p-6 space-y-4 border-none shadow-sm">
        <h3 className="text-sm font-semibold">Revenue & Orders (Last 30 Days)</h3>
        {data.salesByDay.every(d => d.totalRevenue === 0 && d.totalOrders === 0) ? (
          <p className="text-sm text-muted-foreground py-12 text-center">No data yet – chart will appear once orders arrive.</p>
        ) : (
          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={data.salesByDay} margin={{ top: 10, right: 20, bottom: 10, left: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" opacity={0.5} />
                <XAxis 
                  dataKey="date" 
                  tick={{ fontSize: 11, fill: '#6b7280' }} 
                  minTickGap={20}
                  stroke="#9ca3af"
                />
                <YAxis 
                  yAxisId="rev" 
                  tick={{ fontSize: 11, fill: '#6b7280' }}
                  stroke="#9ca3af"
                />
                <YAxis 
                  yAxisId="ord" 
                  orientation="right" 
                  tick={{ fontSize: 11, fill: '#6b7280' }}
                  stroke="#9ca3af"
                />
                <Tooltip formatter={tooltipFormatter} contentStyle={tooltipStyle} />
                <Legend wrapperStyle={{ paddingTop: '20px' }} />
                <Line 
                  yAxisId="rev" 
                  type="monotone" 
                  dataKey="totalRevenue" 
                  stroke={chartPalette.revenue} 
                  strokeWidth={3} 
                  dot={{ fill: chartPalette.revenue, r: 4 }}
                  activeDot={{ r: 6 }}
                  name="Revenue" 
                />
                <Line 
                  yAxisId="ord" 
                  type="monotone" 
                  dataKey="totalOrders" 
                  stroke={chartPalette.orders} 
                  strokeWidth={3} 
                  dot={{ fill: chartPalette.orders, r: 4 }}
                  activeDot={{ r: 6 }}
                  name="Orders" 
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        )}
      </Card>
      
      <div className="grid md:grid-cols-2 gap-6">
        <Card variant="soft3D" className="p-6 space-y-4 border-none shadow-sm">
          <h3 className="text-sm font-semibold">Top Products (Last 30 Days)</h3>
          {data.topProducts.length === 0 ? (
            <p className="text-sm text-muted-foreground py-12 text-center">No product sales yet.</p>
          ) : (
            <div className="h-80">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={data.topProducts} margin={{ top: 10, right: 10, bottom: 60, left: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" opacity={0.5} />
                  <XAxis 
                    dataKey="name" 
                    interval={0} 
                    angle={-45} 
                    textAnchor="end" 
                    height={80} 
                    tick={{ fontSize: 10, fill: '#6b7280' }}
                    stroke="#9ca3af"
                  />
                  <YAxis tick={{ fontSize: 11, fill: '#6b7280' }} stroke="#9ca3af" />
                  <Tooltip formatter={tooltipFormatter} contentStyle={tooltipStyle} />
                  <Legend wrapperStyle={{ paddingTop: '10px' }} />
                  <Bar 
                    dataKey="totalQuantitySold" 
                    name="Qty Sold" 
                    fill={chartPalette.quantity}
                    radius={[8, 8, 0, 0]}
                  />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </Card>
        
        <Card variant="soft3D" className="p-6 space-y-4 border-none shadow-sm">
          <h3 className="text-sm font-semibold">Order Status Breakdown</h3>
          {data.orderStatusBreakdown.length === 0 ? (
            <p className="text-sm text-muted-foreground py-12 text-center">No orders yet.</p>
          ) : (
            <div className="h-80">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={data.orderStatusBreakdown}
                    dataKey="count"
                    nameKey="status"
                    cx="50%"
                    cy="50%"
                    outerRadius={120}
                    label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                    labelLine={{ stroke: '#9ca3af' }}
                  >
                    {data.orderStatusBreakdown.map((entry, index) => (
                      <Cell key={`cell-${entry.status}-${index}`} fill={statusColorFor(entry.status, index)} />
                    ))}
                  </Pie>
                  <Tooltip contentStyle={tooltipStyle} />
                  <Legend wrapperStyle={{ paddingTop: '10px' }} />
                </PieChart>
              </ResponsiveContainer>
            </div>
          )}
        </Card>
      </div>
    </div>
  );
}
