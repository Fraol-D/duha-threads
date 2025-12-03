"use client";
import { useEffect, useState } from 'react';
import { Card } from '@/components/ui/Card';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { Button } from '@/components/ui/Button';
import { useRouter, useSearchParams } from 'next/navigation';

interface OrderListItem {
  id: string;
  orderNumber: string;
  customerName: string | null;
  customerEmail: string | null;
  totalAmount: number;
  currency: string;
  status: string;
  createdAt: string;
  updatedAt: string;
  isCustomOrder: boolean;
  itemCount: number;
}

interface OrdersResponse {
  page: number;
  pageSize: number;
  totalCount: number;
  totalPages: number;
  orders: OrderListItem[];
}

// Show combined legacy + new pipeline statuses; emphasize new first.
const statusOptions = [
  'All',
  'PENDING','CONFIRMED','SHIPPED','COMPLETED','CANCELED',
  'Pending','Accepted','In Printing','Out for Delivery','Delivered','Cancelled'
];

const statusSelectOptions = statusOptions.map((option) => ({ label: option, value: option }));

const normalizeStatus = (value?: string) => {
  if (!value) return 'Unknown';
  return value
    .split(/[_\s]+/)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1).toLowerCase())
    .join(' ');
};

const statusTone = (value?: string) => {
  const normalized = value?.toLowerCase();
  if (!normalized) return 'bg-[--surface-alt] text-foreground';
  if (['pending','pending_review','pending approval','in printing','confirmed','accepted'].includes(normalized)) {
    return 'bg-amber-100 text-amber-900 dark:bg-amber-500/20 dark:text-amber-100';
  }
  if (['shipped','out for delivery','completed','delivered'].includes(normalized)) {
    return 'bg-emerald-100 text-emerald-900 dark:bg-emerald-500/20 dark:text-emerald-100';
  }
  if (normalized.startsWith('cancel') || normalized === 'refunded') {
    return 'bg-red-100 text-red-900 dark:bg-red-500/20 dark:text-red-100';
  }
  return 'bg-[--surface-alt] text-foreground';
};

export default function AdminOrdersClient() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [data, setData] = useState<OrdersResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [pageSize] = useState(20);
  const [status, setStatus] = useState('All');
  const [search, setSearch] = useState(searchParams.get('q') || '');
  const [typedSearch, setTypedSearch] = useState(searchParams.get('q') || '');
  const orders = data?.orders ?? [];
  const hasOrders = orders.length > 0;

  useEffect(() => {
    let active = true;
    setLoading(true);
    const params = new URLSearchParams();
    params.set('page', String(page));
    params.set('pageSize', String(pageSize));
    if (status && status !== 'All') params.set('status', status);
    if (search) params.set('q', search);
    (async () => {
      try {
        const res = await fetch(`/api/admin/orders?${params.toString()}`);
        if (!active) return;
        if (!res.ok) {
          if (res.status === 403) setError('Forbidden'); else setError('Failed to load orders');
          setData(null);
        } else {
          const json = await res.json();
          setData(json);
          setError(null);
        }
      } catch {
        if (active) { setError('Network error'); setData(null); }
      } finally {
        if (active) setLoading(false);
      }
    })();
    return () => { active = false; };
  }, [page, pageSize, status, search]);

  function applySearch() {
    const value = typedSearch.trim();
    setPage(1);
    setSearch(value);
    const params = new URLSearchParams();
    params.set('page','1');
    params.set('pageSize', String(pageSize));
    if (status && status !== 'All') params.set('status', status);
    if (value) params.set('q', value);
    router.push(`/admin/orders?${params.toString()}`);
  }

  function changeStatus(value: string) {
    setStatus(value);
    setPage(1);
  }

  const formatCurrency = (n: number) => `$${n.toFixed(2)}`;
  const formatDate = (value: string) => new Date(value).toLocaleDateString();
  const formatDateTime = (value: string) => new Date(value).toLocaleString();
  const navigateToOrder = (id?: string) => { if (!id) return; router.push(`/admin/orders/${id}`); };

  return (
    <div className="space-y-6">
      <Card variant="glass" className="p-4 space-y-4">
        <div className="flex flex-col lg:flex-row gap-4 lg:items-end">
          <div className="flex flex-col sm:flex-row gap-2 flex-1">
            <Input
              placeholder="Search email, order #, or ID"
              value={typedSearch}
              onChange={e => setTypedSearch(e.currentTarget.value)}
              onKeyDown={e => { if (e.key === 'Enter') applySearch(); }}
              className="w-full"
            />
            <Button variant="secondary" onClick={applySearch} disabled={loading} className="w-full sm:w-auto">Search</Button>
          </div>
          <div className="flex flex-col sm:flex-row gap-2 flex-1 lg:flex-none">
            <Select
              value={status}
              onChange={changeStatus}
              options={statusSelectOptions}
              className="w-full sm:min-w-[200px]"
            />
          </div>
        </div>
        <div className="text-xs text-muted-foreground">Standard Orders (new pipeline). Legacy/custom orders available under /admin/custom-orders.</div>
      </Card>

      <Card className="overflow-hidden">
        <div className="min-h-[200px] w-full">
          {loading && <div className="p-6 text-sm">Loading orders…</div>}
          {error && !loading && <div className="p-6 text-sm text-red-600">{error}</div>}
          {!loading && !error && data && orders.length === 0 && (
            <div className="p-6 text-sm text-muted-foreground">No orders found.</div>
          )}
          {!loading && !error && hasOrders && (
            <>
              <div className="hidden lg:block">
                <table className="w-full text-sm border-collapse">
                  <thead>
                    <tr className="bg-[--surface-alt] text-xs">
                      <th className="text-left font-medium p-2">Order</th>
                      <th className="text-left font-medium p-2">Customer</th>
                      <th className="text-left font-medium p-2">Total</th>
                      <th className="text-left font-medium p-2">Status</th>
                      <th className="text-left font-medium p-2">Created</th>
                      <th className="text-left font-medium p-2">Type</th>
                      <th className="text-left font-medium p-2">Items</th>
                    </tr>
                  </thead>
                  <tbody>
                    {orders.map(o => (
                      <tr
                        key={o.id || `missing-${Math.random()}`}
                        className={"border-t border-muted/40 transition-colors " + (o.id ? "cursor-pointer hover:bg-[--surface-alt]" : "bg-red-50")}
                        onClick={() => navigateToOrder(o.id)}
                        aria-label={o.id ? `View order ${o.orderNumber}` : 'Order has missing id'}
                      > 
                        <td className="p-2">
                          <div className="flex flex-col gap-0.5">
                            <span className="font-semibold">{o.orderNumber}</span>
                            <span className="text-[11px] text-muted-foreground font-mono truncate" title={o.id}>ID: {o.id}</span>
                          </div>
                        </td>
                        <td className="p-2">
                          <div className="flex flex-col">
                            <span className="truncate max-w-40" title={o.customerName || o.customerEmail || 'Customer'}>{o.customerName || o.customerEmail || 'Customer'}</span>
                            {o.customerEmail && <span className="text-[11px] text-muted-foreground truncate max-w-[180px]" title={o.customerEmail}>{o.customerEmail}</span>}
                          </div>
                        </td>
                        <td className="p-2">{formatCurrency(o.totalAmount)}</td>
                        <td className="p-2">
                          <span className={`text-xs px-2 py-1 rounded-full inline-block ${statusTone(o.status)}`}>
                            {normalizeStatus(o.status)}
                          </span>
                        </td>
                        <td className="p-2 text-xs" title={formatDateTime(o.createdAt)}>{formatDate(o.createdAt)}</td>
                        <td className="p-2 text-xs">{o.isCustomOrder ? 'Custom' : 'Standard'}</td>
                        <td className="p-2 text-xs">{o.itemCount}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="lg:hidden space-y-4">
                {orders.map((o) => (
                  <div
                    key={o.id || `missing-${Math.random()}`}
                    role="button"
                    tabIndex={o.id ? 0 : -1}
                    onClick={() => navigateToOrder(o.id)}
                    onKeyDown={(event) => { if (event.key === 'Enter') navigateToOrder(o.id); }}
                    className={`rounded-xl border border-border/60 bg-card p-4 shadow-sm transition hover:border-primary/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 ${o.id ? 'cursor-pointer' : 'opacity-60 cursor-not-allowed'}`}
                    aria-label={o.id ? `View order ${o.orderNumber}` : 'Order has missing id'}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="space-y-1">
                        <p className="text-sm font-semibold">{o.orderNumber}</p>
                        <p className="text-[11px] font-mono text-muted-foreground truncate" title={o.id}>ID: {o.id}</p>
                      </div>
                      <span className={`text-[11px] px-2 py-1 rounded-full font-semibold whitespace-nowrap ${statusTone(o.status)}`}>
                        {normalizeStatus(o.status)}
                      </span>
                    </div>
                    <div className="mt-4 grid grid-cols-2 gap-3 text-xs">
                      <div>
                        <p className="text-muted-foreground">Customer</p>
                        <p className="font-medium truncate" title={o.customerName || o.customerEmail || 'Customer'}>
                          {o.customerName || o.customerEmail || 'Customer'}
                        </p>
                        {o.customerEmail && (
                          <p className="text-[11px] text-muted-foreground truncate" title={o.customerEmail}>{o.customerEmail}</p>
                        )}
                      </div>
                      <div>
                        <p className="text-muted-foreground">Total</p>
                        <p className="font-medium">{formatCurrency(o.totalAmount)}</p>
                        <p className="text-[11px] text-muted-foreground">{o.itemCount} items</p>
                      </div>
                      <div>
                        <p className="text-muted-foreground">Type</p>
                        <p className="font-medium">{o.isCustomOrder ? 'Custom' : 'Standard'}</p>
                      </div>
                      <div>
                        <p className="text-muted-foreground">Created</p>
                        <p className="font-medium">{formatDate(o.createdAt)}</p>
                        <p className="text-[11px] text-muted-foreground" title={formatDateTime(o.createdAt)}>Updated {formatDate(o.updatedAt)}</p>
                      </div>
                    </div>
                    <div className="mt-4 text-right text-xs font-semibold text-primary">View details →</div>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
        {data && data.totalPages > 1 && (
          <div className="flex items-center justify-between p-3 border-t border-muted/40 text-xs">
            <div>Page {data.page} of {data.totalPages}</div>
            <div className="flex gap-2">
              <Button variant="secondary" disabled={page <= 1 || loading} onClick={() => setPage(p => Math.max(1, p-1))}>Prev</Button>
              <Button variant="secondary" disabled={page >= data.totalPages || loading} onClick={() => setPage(p => Math.min(data.totalPages, p+1))}>Next</Button>
            </div>
          </div>
        )}
      </Card>
    </div>
  );
}
