"use client";
import { useEffect, useState } from 'react';
import Image from 'next/image';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';

interface UserOrderItem {
  id: string;
  status: string;
  baseColor?: 'white'|'black';
  placement?: string;
  verticalPosition?: string;
  designType?: 'text'|'image';
  designText?: string | null;
  designImageUrl?: string | null;
  quantity?: number;
  previewImageUrl?: string | null;
  createdAt: string;
}

function placementLabel(p?: string) {
  if (!p) return '—';
  return p.replace(/_/g,' ');
}
function verticalLabel(p?: string, placement?: string) {
  if (!p) return '—';
  if (placement === 'front') {
    if (p === 'upper') return 'Upper chest';
    if (p === 'center') return 'Center';
    if (p === 'lower') return 'Lower';
  } else if (placement === 'back') {
    if (p === 'upper') return 'Upper back';
    if (p === 'center') return 'Center back';
    if (p === 'lower') return 'Lower back';
  }
  return p;
}

export default function MyCustomOrdersPage() {
  const [orders, setOrders] = useState<UserOrderItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<string>('');
  const [designTypeFilter, setDesignTypeFilter] = useState<string>('');

  useEffect(() => {
    async function load() {
      setLoading(true); setError(null);
      try {
        const res = await fetch('/api/custom-orders');
        if (!res.ok) throw new Error('Failed to load orders');
        const data = await res.json();
        setOrders(data.orders || []);
      } catch (e: unknown) {
        setError(e instanceof Error ? e.message : 'Failed to load orders');
      } finally { setLoading(false); }
    }
    load();
  }, []);

  const filtered = orders.filter(o => {
    if (statusFilter && o.status !== statusFilter) return false;
    if (designTypeFilter && o.designType !== designTypeFilter) return false;
    return true;
  });

  return (
    <div className="py-8 space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <h1 className="text-hero">My Custom Orders</h1>
        <Button variant="secondary" onClick={()=>window.location.href='/custom-order'}>Create New</Button>
      </div>
      <div className="flex gap-3 flex-wrap">
        <select value={statusFilter} onChange={e=>setStatusFilter(e.target.value)} className="border rounded px-2 py-1 text-sm">
          <option value="">All Statuses</option>
          {['PENDING_REVIEW','APPROVED','IN_DESIGN','IN_PRINTING','READY_FOR_PICKUP','OUT_FOR_DELIVERY','DELIVERED','CANCELLED'].map(s => <option key={s} value={s}>{s.replace(/_/g,' ')}</option>)}
        </select>
        <select value={designTypeFilter} onChange={e=>setDesignTypeFilter(e.target.value)} className="border rounded px-2 py-1 text-sm">
          <option value="">All Design Types</option>
          <option value="text">Text</option>
          <option value="image">Image</option>
        </select>
      </div>
      {loading && <div>Loading custom orders...</div>}
      {error && <div className="text-red-600 text-sm">{error}</div>}
      {!loading && !error && filtered.length === 0 && (
        <Card className="p-6"><p className="text-sm">No custom orders yet.</p></Card>
      )}
      <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-4">
        {filtered.map(o => (
          <Card key={o.id} variant="glass" className="p-4 space-y-3 hover:ring-2 ring-token transition cursor-pointer" onClick={()=>window.location.href=`/custom-order/confirmation/${o.id}`}>            
            <div className="flex justify-between items-center">
              <div className="text-xs text-muted">{new Date(o.createdAt).toLocaleDateString()}</div>
              <Badge>{o.status.replace(/_/g,' ')}</Badge>
            </div>
            <div className="flex gap-3">
              {o.previewImageUrl || o.designImageUrl ? (
                <Image src={o.previewImageUrl || o.designImageUrl!} alt="Preview" width={96} height={128} className="w-24 h-32 object-cover rounded border" />
              ) : (
                <div className="w-24 h-32 flex items-center justify-center text-xs text-muted bg-[--surface] rounded border">No Preview</div>
              )}
              <div className="flex-1 space-y-1 text-sm">
                <div><span className="text-muted">Base:</span> {o.baseColor || '—'}</div>
                <div><span className="text-muted">Placement:</span> {placementLabel(o.placement)}</div>
                <div><span className="text-muted">Vertical:</span> {verticalLabel(o.verticalPosition, o.placement)}</div>
                <div><span className="text-muted">Design:</span> {o.designType === 'text' ? (o.designText?.slice(0,18) || 'Text') : o.designType === 'image' ? 'Image design' : '—'}</div>
                <div><span className="text-muted">Qty:</span> {o.quantity || 1}</div>
              </div>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}
