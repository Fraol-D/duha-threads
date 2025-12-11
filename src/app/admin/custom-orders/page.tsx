"use client";
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Badge } from '@/components/ui/Badge';
import { Card } from '@/components/ui/Card';
import { Select } from '@/components/ui/Select';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { CustomOrderPreview } from '@/components/custom-order/CustomOrderPreview';
import type { CustomOrder } from '@/types/custom-order';

type AdminOrderItem = CustomOrder & {
  userId?: string | null;
  userName?: string;
  status: string;
  createdAt: string;
  areas?: string[];
  estimatedTotal?: number;
  publicStatus?: string;
  isPublic?: boolean;
  delivery?: { email?: string | null };
};

function formatArea(area?: string | null) {
  if (!area) return '—';
  switch (area) {
    case 'front': return 'Front';
    case 'back': return 'Back';
    case 'left_chest': return 'Left chest';
    case 'right_chest': return 'Right chest';
    default: return (area ?? '').toString().replace(/_/g,' ');
  }
}
function formatVertical(pos?: string | null, placement?: string | null) {
  if (!pos) return '—';
  if (placement === 'front') return pos==='upper'?'Upper chest':pos==='center'?'Center':pos==='lower'?'Lower':'';
  if (placement === 'back') return pos==='upper'?'Upper back':pos==='center'?'Center back':pos==='lower'?'Lower back':'';
  return pos;
}
function summarizeAreas(areas?: string[] | null, fallbackPlacement?: string | null) {
  if (Array.isArray(areas) && areas.length > 0) {
    const unique = Array.from(new Set(areas.filter(Boolean)));
    return unique.map(a => formatArea(a)).join(' + ');
  }
  if (fallbackPlacement) return formatArea(fallbackPlacement);
  return 'No placements';
}

export default function AdminCustomOrdersPage() {
  const [orders, setOrders] = useState<AdminOrderItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<string>('');
  const [designTypeFilter, setDesignTypeFilter] = useState<string>('');
  const [publicStatusFilter, setPublicStatusFilter] = useState<string>('');
  const [search, setSearch] = useState<string>('');
  const router = useRouter();

  const statusOptions = [
    { label: 'All Statuses', value: '' },
    ...['PENDING_REVIEW','APPROVED','IN_DESIGN','IN_PRINTING','READY_FOR_PICKUP','OUT_FOR_DELIVERY','DELIVERED','CANCELLED']
      .map((s) => ({ label: s.replace(/_/g, ' '), value: s }))
  ];

  const designTypeOptions = [
    { label: 'All Types', value: '' },
    { label: 'Text', value: 'text' },
    { label: 'Image', value: 'image' },
  ];

  const publicStatusOptions = [
    { label: 'All Share States', value: '' },
    { label: 'Pending Share', value: 'pending' },
    { label: 'Approved Share', value: 'approved' },
    { label: 'Rejected Share', value: 'rejected' },
    { label: 'Private', value: 'private' },
  ];

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function load(overrides?: { status?: string; publicStatus?: string; search?: string }) {
    setLoading(true); setError(null);
    try {
      const url = new URL('/api/admin/custom-orders', window.location.origin);
      const statusValue = overrides?.status ?? statusFilter;
      const publicValue = overrides?.publicStatus ?? publicStatusFilter;
      const searchValue = overrides?.search ?? search;
      // Only send API-supported filters
      if (statusValue) url.searchParams.set('status', statusValue);
      if (publicValue) url.searchParams.set('publicStatus', publicValue);
      if (searchValue) url.searchParams.set('q', searchValue);
      const res = await fetch(url.toString());
      if (res.status === 403) throw new Error('Forbidden');
      if (!res.ok) throw new Error('Failed to load orders');
      const data = await res.json();
      setOrders(data.orders || []);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Failed to load orders');
    } finally { setLoading(false); }
  }

  // Client-side filtering for designType (not supported by API)
  const filtered = orders.filter(o => {
    if (designTypeFilter && o.designType !== designTypeFilter) return false;
    return true;
  });

  return (
    <div className="max-w-7xl mx-auto p-6 md:p-10 space-y-6">
      <div className="space-y-4">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <h1 className="text-3xl font-semibold tracking-tight">Custom Orders (Admin)</h1>
          <p className="text-sm text-muted-foreground">Review and track builder requests</p>
        </div>
        <Card variant="glass" className="p-4 space-y-3">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            <Select value={statusFilter} onChange={setStatusFilter} options={statusOptions} className="w-full" />
            <Select value={designTypeFilter} onChange={setDesignTypeFilter} options={designTypeOptions} className="w-full" />
            <Select value={publicStatusFilter} onChange={setPublicStatusFilter} options={publicStatusOptions} className="w-full" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') load(); }}
              placeholder="Search email, order #, or ID"
              className="w-full"
            />
          </div>
          <div className="flex flex-col sm:flex-row gap-2">
            <Button onClick={() => load()} className="w-full sm:w-auto">Apply filters</Button>
            <Button
              variant="secondary"
              onClick={() => {
                setStatusFilter('');
                setDesignTypeFilter('');
                setPublicStatusFilter('');
                setSearch('');
                load({ status: '', publicStatus: '', search: '' });
              }}
              className="w-full sm:w-auto"
            >
              Reset
            </Button>
          </div>
        </Card>
      </div>
      {loading && <div>Loading orders...</div>}
      {error && <div className="text-red-600 text-sm">{error}</div>}
      {!loading && !error && filtered.length === 0 && (
        <Card className="p-6"><p className="text-sm">No matching custom orders.</p></Card>
      )}
      <div className="hidden md:block overflow-auto border rounded-md">
        <table className="min-w-full text-sm">
          <thead className="bg-[--surface]">
            <tr className="text-left">
              <th className="p-2 font-medium">Preview</th>
              <th className="p-2 font-medium">Order</th>
              <th className="p-2 font-medium">Created</th>
              <th className="p-2 font-medium">Customer</th>
              <th className="p-2 font-medium">Base</th>
              <th className="p-2 font-medium">Design Details</th>
              <th className="p-2 font-medium">Qty</th>
              <th className="p-2 font-medium">Status</th>
              <th className="p-2 font-medium">Share</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map(o => (
              <tr key={o.id} className="border-t hover:bg-[--surface] cursor-pointer" onClick={()=>router.push(`/admin/custom-orders/${o.id}`)}>                
                <td className="p-2">
                  <div className="w-full max-w-[140px]">
                    <CustomOrderPreview order={o} size="sm" />
                  </div>
                </td>
                <td className="p-2">
                  <div className="flex flex-col gap-0.5">
                    <span className="font-semibold">{o.orderNumber || o.id.slice(-6)}</span>
                  </div>
                </td>
                <td className="p-2 whitespace-nowrap">{new Date(o.createdAt).toLocaleDateString()}</td>
                <td className="p-2 max-w-40 truncate" title={o.userName || o.userId || ''}>{o.userName || (o.userId ? o.userId.slice(-6) : '—')}</td>
                <td className="p-2">{o.baseColor || '—'}</td>
                <td className="p-2">
                  <div className="flex flex-col gap-0.5 text-xs">
                    <span className="font-medium">{summarizeAreas(o.areas, o.placement)}</span>
                    <span className="text-muted-foreground">{formatVertical(o.verticalPosition, o.placement)}</span>
                    <span className="text-muted-foreground italic">{o.designType === 'text' ? (o.designText?.slice(0,14) || 'Text') : o.designType === 'image' ? 'Image' : '—'}</span>
                  </div>
                </td>
                <td className="p-2">{o.quantity || 1}</td>
                <td className="p-2"><Badge>{o.status.replace(/_/g,' ')}</Badge></td>
                <td className="p-2 text-xs capitalize">{(o.publicStatus || (o.isPublic ? 'approved' : 'private')).replace(/_/g,' ')}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="md:hidden space-y-4">
        {filtered.map((o) => (
          <Card key={o.id} className="p-4 space-y-3 cursor-pointer hover:bg-[--surface] transition-colors" onClick={()=>router.push(`/admin/custom-orders/${o.id}`)}>
            <div className="flex gap-3">
              <div className="w-24">
                <CustomOrderPreview order={o} size="sm" />
              </div>
              <div className="flex-1">
                <p className="font-semibold text-base">{o.orderNumber || o.id.slice(-6)}</p>
                <p className="text-xs text-muted-foreground">{new Date(o.createdAt).toLocaleDateString()}</p>
                <p className="text-sm mt-1">{o.userName || (o.userId ? o.userId.slice(-6) : '—')}</p>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div>
                <p className="text-muted-foreground text-xs uppercase">Base</p>
                <p className="font-medium">{o.baseColor || '—'}</p>
              </div>
              <div>
                <p className="text-muted-foreground text-xs uppercase">Quantity</p>
                <p className="font-medium">{o.quantity || 1}</p>
              </div>
              <div className="col-span-2">
                <p className="text-muted-foreground text-xs uppercase">Design</p>
                <p className="font-medium">{summarizeAreas(o.areas, o.placement)}</p>
                <p className="text-xs text-muted-foreground">{formatVertical(o.verticalPosition, o.placement)}</p>
              </div>
            </div>
            <div className="flex flex-wrap gap-2 items-center">
              <Badge>{o.status.replace(/_/g,' ')}</Badge>
              <Badge className="text-xs">{(o.publicStatus || (o.isPublic ? 'approved' : 'private')).replace(/_/g,' ')}</Badge>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}
