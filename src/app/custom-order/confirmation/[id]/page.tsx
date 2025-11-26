"use client";
import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { CustomOrderPreview } from '@/components/custom-order/CustomOrderPreview';
import type { CustomOrder, CustomOrderPlacement } from '@/types/custom-order';

// Legacy types retained for earlier implementation; no longer needed.

type PlacementSummaryItem = CustomOrderPlacement & { id?: string };
type CustomOrderSummary = CustomOrder & {
  status: string;
  pricing?: { basePrice: number; placementCost: number; quantityMultiplier: number; estimatedTotal: number; finalTotal?: number };
  delivery?: { address: string; phone: string; email: string };
  placements?: PlacementSummaryItem[];
};

export default function CustomOrderConfirmationPage() {
  const params = useParams();
  const router = useRouter();
  const id = params?.id as string;
  const [order, setOrder] = useState<CustomOrderSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function load() {
      if (!id) return;
      setLoading(true); setError(null);
      try {
        const res = await fetch(`/api/custom-orders/${id}`);
        if (!res.ok) {
          const d = await res.json().catch(()=>({}));
          throw new Error(d.error || 'Failed to load order');
        }
        const data = await res.json();
        setOrder(data.order);
      } catch (e: unknown) {
        setError(e instanceof Error ? e.message : 'Failed to load order');
      } finally { setLoading(false); }
    }
    load();
  }, [id]);

  if (loading) return <div className="py-12 text-center">Loading confirmation...</div>;
  if (error) return (
    <div className="py-12 text-center">
      <Card className="p-6 inline-block">
        <p className="text-red-600 mb-4">{error}</p>
        <Link href="/custom-order" className="underline">Return to builder</Link>
      </Card>
    </div>
  );
  if (!order) return (
    <div className="py-12 text-center">
      <Card className="p-6 inline-block">
        <p className="mb-4">Order not found.</p>
        <Link href="/custom-order" className="underline">Return to builder</Link>
      </Card>
    </div>
  );

  return (
    <div className="py-10 space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <h1 className="text-hero">Custom Order Confirmed</h1>
        <Badge className="px-4 py-2 text-base">{order.status.replace(/_/g,' ')}</Badge>
      </div>
      <p className="text-muted text-sm">We received your custom order. A confirmation email has been sent. Track progress under My Custom Orders.</p>

      <div className="grid lg:grid-cols-2 gap-6">
        <Card variant="soft3D" className="p-6 space-y-4">
          <h2 className="text-lg font-semibold">Summary</h2>
          <div className="space-y-2 text-sm">
            <div><span className="text-muted">Base Color:</span> {order.baseColor || 'White'}</div>
            <div><span className="text-muted">Quantity:</span> {order.quantity || 1}</div>
            {order.pricing && (
              <>
                <div><span className="text-muted">Per-Shirt:</span> ${ (order.pricing.basePrice + order.pricing.placementCost).toFixed(2) }</div>
                <div><span className="text-muted">Estimated Total:</span> ${ order.pricing.estimatedTotal.toFixed(2) }</div>
                {order.pricing.finalTotal && <div><span className="text-muted">Final Total:</span> ${ order.pricing.finalTotal.toFixed(2) }</div>}
              </>
            )}
          </div>
          <div className="pt-3 space-y-2">
            <h3 className="text-sm font-semibold">Placements</h3>
            {(order.placements && order.placements.length > 0) ? (
              <div className="space-y-2">
                {order.placements.map((p, idx) => {
                  const area = p.area ?? 'unknown_area';
                  const verticalPosition = p.verticalPosition ?? 'center';
                  const designType = p.designType ?? 'text';
                  const designText = p.designText?.trim();
                  const designFont = p.designFont ?? '—';
                  const designColor = p.designColor ?? '#000000';
                  const designImageUrl = p.designImageUrl ?? undefined;
                  const placementKey = p.id || `${area}-${verticalPosition}-${designType}-${designImageUrl ?? designText ?? idx}`;
                  return (
                    <div key={placementKey} className="border border-muted rounded p-3 text-xs flex flex-col gap-1">
                      <div className="flex justify-between">
                        <span className="font-medium">{area.replace(/_/g,' ')}</span>
                        <span>{verticalPosition}</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span>{designType === 'text' ? 'Text' : 'Image'}</span>
                        {designType === 'text' && designText && <span className="truncate max-w-40">&quot;{designText}&quot;</span>}
                        {designType === 'image' && designImageUrl && (
                          <Image src={designImageUrl} alt="Design" width={48} height={48} className="w-12 h-12 object-contain border rounded" />
                        )}
                      </div>
                      {designType === 'text' && (
                        <div className="flex items-center gap-3 text-[10px]">
                          <span>Font: {designFont}</span>
                          <span className="flex items-center gap-1">Color: <span className="inline-block w-4 h-4 rounded border" style={{ backgroundColor: designColor }} /></span>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="text-xs text-muted">No placements found.</div>
            )}
          </div>
        </Card>
        <Card className="p-6 space-y-4">
          <h2 className="text-lg font-semibold">Preview</h2>
          <CustomOrderPreview order={order} size="lg" />
        </Card>
      </div>

      <div className="flex gap-3 pt-2">
        <Button onClick={()=>router.push('/my-custom-orders')}>View My Custom Orders</Button>
        <Button variant="secondary" onClick={()=>router.push('/products')}>Back to Shop</Button>
      </div>
    </div>
  );
}
