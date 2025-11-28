"use client";
import { useEffect, useState } from 'react';
import { Brush } from 'lucide-react';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { OrderListCard } from '@/components/orders/OrderListCard';
import { MascotState } from '@/components/ui/MascotState';
import type { CustomOrder } from '@/types/custom-order';

type UserOrderItem = CustomOrder & {
  status: string;
  createdAt: string;
  areas?: string[];
  totalAmount?: number;
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
function summarizeAreas(areas?: string[] | null, fallbackPlacement?: string | null) {
  if (Array.isArray(areas) && areas.length > 0) {
    const unique = Array.from(new Set(areas.filter(Boolean)));
    return unique.map(a => formatArea(a)).join(' + ');
  }
  if (fallbackPlacement) return formatArea(fallbackPlacement);
  return 'No placements specified';
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
    <div className="py-10 space-y-6 max-w-6xl mx-auto">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div className="flex items-center gap-2">
          <Brush className="h-5 w-5 text-muted-foreground" />
          <h1 className="text-2xl font-semibold tracking-tight">My custom orders</h1>
        </div>
        <Button variant="secondary" onClick={()=>window.location.href='/custom-order'}>Create new</Button>
      </div>
      <Card variant="glass" className="p-4 space-y-4">
        <div className="flex gap-3 flex-wrap">
          <select value={statusFilter} onChange={e=>setStatusFilter(e.target.value)} className="border rounded px-2 py-1 text-sm">
            <option value="">All statuses</option>
            {['PENDING_REVIEW','APPROVED','IN_DESIGN','IN_PRINTING','READY_FOR_PICKUP','OUT_FOR_DELIVERY','DELIVERED','CANCELLED'].map(s => <option key={s} value={s}>{s.replace(/_/g,' ')}</option>)}
          </select>
          <select value={designTypeFilter} onChange={e=>setDesignTypeFilter(e.target.value)} className="border rounded px-2 py-1 text-sm">
            <option value="">All design types</option>
            <option value="text">Text</option>
            <option value="image">Image</option>
          </select>
        </div>
        {loading && <MascotState variant="loading" message="Loading custom orders" className="py-4" />}
        {error && (
          <MascotState
            variant="error"
            message={error}
            actionLabel="Retry"
            onActionClick={() => window.location.reload()}
            className="py-4"
          />
        )}
        {!loading && !error && filtered.length === 0 && (
          <MascotState
            variant="empty"
            message="No custom designs yet. Try creating your first custom tee."
            actionLabel="Start designing"
            onActionClick={() => window.location.assign('/custom-order')}
            className="py-4"
          />
        )}
      </Card>
      {filtered.length > 0 && (
      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {filtered.map(o => {
          const placementsCount = Array.isArray(o.areas) ? new Set(o.areas).size : (Array.isArray(o.placements) ? o.placements.length : (o.placement ? 1 : 0));
          const title = o.designType === 'text' && o.designText ? o.designText.slice(0,28) : o.designType === 'image' ? 'Image design' : `Custom design (${placementsCount} placement${placementsCount === 1 ? '' : 's'})`;
          const subtitleParts: string[] = [];
          subtitleParts.push(summarizeAreas(o.areas, o.placement));
          if (o.baseColor) subtitleParts.push(`Base ${o.baseColor}`);
          subtitleParts.push(new Date(o.createdAt).toLocaleDateString());
          if (o.quantity) subtitleParts.push(`Qty ${o.quantity}`);
          const subtitle = subtitleParts.filter(Boolean).join(' · ');
          return (
            <OrderListCard
              key={o.id}
              id={o.id}
              orderNumber={o.orderNumber}
              type="custom"
              createdAt={o.createdAt}
              status={o.status}
              title={title}
              subtitle={subtitle}
              totalAmount={typeof o.totalAmount === 'number' ? o.totalAmount : undefined}
              customOrder={o}
            />
          );
        })}
      </div>
      )}
    </div>
  );
}
