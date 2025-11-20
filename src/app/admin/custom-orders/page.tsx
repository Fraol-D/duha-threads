"use client";
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import { Badge } from '@/components/ui/Badge';
import { Card } from '@/components/ui/Card';
import { Select } from '@/components/ui/Select';

interface AdminOrderItem {
  id: string;
  userId?: string | null;
  baseColor?: string;
  placement?: string;
  verticalPosition?: string;
  designType?: 'text'|'image';
  designText?: string | null;
  designImageUrl?: string | null;
  previewImageUrl?: string | null;
  quantity?: number;
  status: string;
  createdAt: string;
}

function placementLabel(p?: string) { return p ? p.replace(/_/g,' ') : '—'; }
function verticalLabel(p?: string, placement?: string) {
  if (!p) return '—';
  if (placement === 'front') return p==='upper'?'Upper chest':p==='center'?'Center':p==='lower'?'Lower':'';
  if (placement === 'back') return p==='upper'?'Upper back':p==='center'?'Center back':p==='lower'?'Lower back':'';
  return p;
}

export default function AdminCustomOrdersPage() {
  const [orders, setOrders] = useState<AdminOrderItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<string>('');
  const [designTypeFilter, setDesignTypeFilter] = useState<string>('');
  const [search, setSearch] = useState<string>('');
  const router = useRouter();

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function load() {
    setLoading(true); setError(null);
    try {
      const url = new URL('/api/admin/custom-orders', window.location.origin);
      if (statusFilter) url.searchParams.set('status', statusFilter);
      if (search) url.searchParams.set('q', search);
      const res = await fetch(url.toString());
      if (res.status === 403) throw new Error('Forbidden');
      if (!res.ok) throw new Error('Failed to load orders');
      const data = await res.json();
      setOrders(data.orders || []);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Failed to load orders');
    } finally { setLoading(false); }
  }

  const filtered = orders.filter(o => {
    if (statusFilter && o.status !== statusFilter) return false;
    if (designTypeFilter && o.designType !== designTypeFilter) return false;
    return true;
  });

  return (
    <div className="max-w-7xl mx-auto p-6 md:p-10 space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <h1 className="text-3xl font-semibold tracking-tight">Custom Orders (Admin)</h1>
        <div className="flex gap-2">
          <Select value={statusFilter} onChange={(e)=>{ setStatusFilter(e.currentTarget.value); }}>
            <option value="">All Statuses</option>
            {['PENDING_REVIEW','APPROVED','IN_DESIGN','IN_PRINTING','READY_FOR_PICKUP','OUT_FOR_DELIVERY','DELIVERED','CANCELLED'].map(s => <option key={s} value={s}>{s.replace(/_/g,' ')}</option>)}
          </Select>
          <Select value={designTypeFilter} onChange={(e)=>setDesignTypeFilter(e.currentTarget.value)}>
            <option value="">All Types</option>
            <option value="text">Text</option>
            <option value="image">Image</option>
          </Select>
          <input
            value={search}
            onChange={(e)=>setSearch(e.target.value)}
            onKeyDown={(e)=>{ if (e.key==='Enter') load(); }}
            placeholder="Search email/phone"
            className="border rounded px-2 py-1 text-sm"
          />
          <button onClick={load} className="px-3 py-1.5 rounded bg-[--accent] text-white text-sm">Filter</button>
        </div>
      </div>
      {loading && <div>Loading orders...</div>}
      {error && <div className="text-red-600 text-sm">{error}</div>}
      {!loading && !error && filtered.length === 0 && (
        <Card className="p-6"><p className="text-sm">No matching custom orders.</p></Card>
      )}
      <div className="overflow-auto border rounded-md">
        <table className="min-w-full text-sm">
          <thead className="bg-[--surface]">
            <tr className="text-left">
              <th className="p-2 font-medium">Created</th>
              <th className="p-2 font-medium">User</th>
              <th className="p-2 font-medium">Base</th>
              <th className="p-2 font-medium">Placement</th>
              <th className="p-2 font-medium">Vertical</th>
              <th className="p-2 font-medium">Design</th>
              <th className="p-2 font-medium">Qty</th>
              <th className="p-2 font-medium">Status</th>
              <th className="p-2 font-medium">Preview</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map(o => (
              <tr key={o.id} className="border-t hover:bg-[--surface] cursor-pointer" onClick={()=>router.push(`/admin/custom-orders/${o.id}`)}>                
                <td className="p-2 whitespace-nowrap">{new Date(o.createdAt).toLocaleDateString()}</td>
                <td className="p-2 max-w-40 truncate" title={o.userId || ''}>{o.userId ? o.userId.slice(-6) : '—'}</td>
                <td className="p-2">{o.baseColor || '—'}</td>
                <td className="p-2">{placementLabel(o.placement)}</td>
                <td className="p-2">{verticalLabel(o.verticalPosition, o.placement)}</td>
                <td className="p-2">{o.designType === 'text' ? (o.designText?.slice(0,14) || 'Text') : o.designType === 'image' ? 'Image' : '—'}</td>
                <td className="p-2">{o.quantity || 1}</td>
                <td className="p-2"><Badge>{o.status.replace(/_/g,' ')}</Badge></td>
                <td className="p-2">
                  {o.previewImageUrl || o.designImageUrl ? (
                    <Image src={o.previewImageUrl || o.designImageUrl!} alt="Preview" width={40} height={56} className="w-10 h-14 object-cover rounded border" />
                  ) : <span className="text-xs text-muted">—</span>}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
