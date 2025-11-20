"use client";
import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { DesignPreview } from '@/components/DesignPreview';

type PlacementKey = 'front'|'back'|'chest_left'|'chest_right';
type VerticalPos = 'upper'|'center'|'lower';

interface CustomOrderSummary {
  id: string;
  status: string;
  baseColor?: 'white'|'black';
  placement?: string;
  verticalPosition?: string;
  designType?: 'text'|'image';
  designText?: string | null;
  designFont?: string | null;
  designColor?: string | null;
  designImageUrl?: string | null;
  quantity?: number;
  previewImageUrl?: string | null;
}

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
            <div><span className="text-muted">Base Color:</span> {order.baseColor || (order.designImageUrl ? '—' : 'White')}</div>
            <div><span className="text-muted">Placement:</span> {order.placement?.replace(/_/g,' ') || '—'}</div>
            <div><span className="text-muted">Vertical Position:</span> {order.verticalPosition ? order.verticalPosition.replace(/_/g,' ') : '—'}</div>
            <div><span className="text-muted">Design Type:</span> {order.designType || '—'}</div>
            <div><span className="text-muted">Quantity:</span> {order.quantity || 1}</div>
          </div>
          {order.designType === 'text' && (
            <div className="pt-2 text-sm space-y-1">
              <div><span className="text-muted">Text:</span> {order.designText || '—'}</div>
              <div><span className="text-muted">Font:</span> {order.designFont || '—'}</div>
              <div className="flex items-center gap-2"><span className="text-muted">Color:</span>{order.designColor && <span className="inline-block w-5 h-5 rounded border" style={{backgroundColor: order.designColor}}/>}</div>
            </div>
          )}
          {order.designType === 'image' && order.designImageUrl && (
            <div className="pt-2">
              <Image src={order.designImageUrl} alt="Uploaded design" width={128} height={128} className="w-32 h-32 object-contain border rounded" />
            </div>
          )}
        </Card>
        <Card className="p-6 space-y-4">
          <h2 className="text-lg font-semibold">Preview</h2>
          {order.previewImageUrl ? (
            <Image src={order.previewImageUrl} alt="Preview" width={480} height={640} className="w-full max-w-md h-auto rounded" />
          ) : (
            <DesignPreview
              baseColor={order.baseColor || 'white'}
              overlayPlacementKey={(order.placement as PlacementKey) || 'front'}
              overlayType={order.designType === 'text' ? 'text' : order.designType === 'image' ? 'image' : null}
              overlayText={order.designType === 'text' ? order.designText || undefined : undefined}
              overlayImageUrl={order.designType === 'image' ? order.designImageUrl || undefined : undefined}
              overlayColor={order.designColor || '#000'}
              overlayFont={order.designFont || 'Inter, system-ui, sans-serif'}
              overlayVerticalPosition={(order.verticalPosition as VerticalPos) || 'upper'}
            />
          )}
        </Card>
      </div>

      <div className="flex gap-3 pt-2">
        <Button onClick={()=>router.push('/my-custom-orders')}>View My Custom Orders</Button>
        <Button variant="secondary" onClick={()=>router.push('/products')}>Back to Shop</Button>
      </div>
    </div>
  );
}
