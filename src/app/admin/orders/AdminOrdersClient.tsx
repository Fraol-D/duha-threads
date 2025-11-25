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

  return (
    <div className="space-y-6">
      <Card variant="glass" className="p-4 space-y-4">
        <div className="flex flex-col md:flex-row gap-4 md:items-end">
          <div className="flex gap-2 flex-1">
            <Input
              placeholder="Search email or ID"
              value={typedSearch}
              onChange={e => setTypedSearch(e.currentTarget.value)}
              onKeyDown={e => { if (e.key === 'Enter') applySearch(); }}
            />
            <Button variant="secondary" onClick={applySearch} disabled={loading}>Search</Button>
          </div>
          <div className="flex gap-2">
            <Select value={status} onChange={e => changeStatus(e.currentTarget.value)}>
              {statusOptions.map(s => <option key={s} value={s}>{s}</option>)}
            </Select>
          </div>
        </div>
        <div className="text-xs text-muted-foreground">Standard Orders (new pipeline). Legacy/custom orders available under /admin/custom-orders.</div>
      </Card>

      <Card className="overflow-hidden">
        <div className="min-h-[200px] w-full">
          {loading && <div className="p-6 text-sm">Loading orders…</div>}
          {error && !loading && <div className="p-6 text-sm text-red-600">{error}</div>}
          {!loading && !error && data && data.orders.length === 0 && (
            <div className="p-6 text-sm text-muted-foreground">No orders found.</div>
          )}
          {!loading && !error && data && data.orders.length > 0 && (
            <table className="w-full text-sm border-collapse">
              <thead>
                <tr className="bg-[--surface-alt] text-xs">
                  <th className="text-left font-medium p-2">Order #</th>
                  <th className="text-left font-medium p-2">Customer</th>
                  <th className="text-left font-medium p-2">Total</th>
                  <th className="text-left font-medium p-2">Status</th>
                  <th className="text-left font-medium p-2">Created</th>
                  <th className="text-left font-medium p-2">Type</th>
                  <th className="text-left font-medium p-2">Items</th>
                </tr>
              </thead>
              <tbody>
                {data.orders.map(o => (
                  <tr
                    key={o.id || `missing-${Math.random()}`}
                    className={"border-t border-muted/40 transition-colors " + (o.id ? "cursor-pointer hover:bg-[--surface-alt]" : "bg-red-50")}
                    onClick={() => { if (!o.id) return; router.push(`/admin/orders/${o.id}`); }}
                    aria-label={o.id ? `View order ${o.orderNumber}` : 'Order has missing id'}
                  > 
                    <td className="p-2 font-medium">{o.orderNumber}</td>
                    <td className="p-2">
                      <div className="flex flex-col">
                        <span className="truncate max-w-40" title={o.customerName || o.customerEmail || 'Customer'}>{o.customerName || o.customerEmail || 'Customer'}</span>
                        {o.customerEmail && <span className="text-[11px] text-muted-foreground truncate max-w-[180px]" title={o.customerEmail}>{o.customerEmail}</span>}
                      </div>
                    </td>
                    <td className="p-2">{formatCurrency(o.totalAmount)}</td>
                    <td className="p-2"><span className="text-xs px-2 py-1 rounded bg-[--surface-alt] inline-block">{o.status}</span></td>
                    <td className="p-2 text-xs" title={new Date(o.createdAt).toLocaleString()}>{new Date(o.createdAt).toLocaleDateString()}</td>
                    <td className="p-2 text-xs">{o.isCustomOrder ? 'Custom' : 'Standard'}</td>
                    <td className="p-2 text-xs">{o.itemCount}</td>
                  </tr>
                ))}
              </tbody>
            </table>
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
