"use client";
import { useEffect, useState } from 'react';
import { Card } from '@/components/ui/Card';
import { Select } from '@/components/ui/Select';
import { Button } from '@/components/ui/Button';
import Link from 'next/link';
import { OrderDetailView } from '@/components/orders/OrderDetailView';

interface LineItem {
  productId?: string | null;
  name: string;
  size: string;
  color: string;
  quantity: number;
  unitPrice: number;
  subtotal: number;
  imageUrl?: string | null;
}

interface CustomDesignSides {
  front?: {
    enabled?: boolean;
    placement?: string;
    verticalPosition?: string;
    designType?: string;
    designText?: string | null;
    designFont?: string | null;
    designColor?: string | null;
    designImageUrl?: string | null;
  };
  back?: {
    enabled?: boolean;
    placement?: string;
    verticalPosition?: string;
    designType?: string;
    designText?: string | null;
    designFont?: string | null;
    designColor?: string | null;
    designImageUrl?: string | null;
  };
}

interface OrderDetail {
  id: string;
  isCustomOrder: boolean;
  orderNumber: string;
  status: string;
  totalAmount: number;
  subtotal?: number;
  currency: string;
  email?: string;
  phone?: string;
  deliveryAddress?: string;
  createdAt: string;
  updatedAt: string;
  lineItems?: LineItem[];
  customDesign?: {
    quantity: number;
    previewImageUrl?: string | null;
    sides?: CustomDesignSides | null;
    designType?: string | null;
    designText?: string | null;
    designColor?: string | null;
    designImageUrl?: string | null;
  } | null;
}

const ADMIN_STATUS_VALUES = [
  // Canonical states
  'PENDING_REVIEW','APPROVED','IN_DESIGN','IN_PRINTING','READY_FOR_PICKUP','OUT_FOR_DELIVERY','DELIVERED','CANCELLED',
  // Legacy aliases (kept for compatibility but deduped in UI)
  'Pending','Accepted','In Printing','Out for Delivery','Delivered','Cancelled',
];

const humanizeStatus = (statusValue: string) =>
  statusValue
    .replace(/_/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .toLowerCase()
    .replace(/(^|\s)\S/g, (c) => c.toUpperCase());

const adminOrderStatusOptions = Array.from(
  new Map(
    ADMIN_STATUS_VALUES.map((value) => {
      const label = humanizeStatus(value);
      const key = label.toLowerCase().replace(/\s+/g, '_');
      return [key, { label, value }];
    })
  ).values()
);

export default function OrderDetailClient({ orderId }: { orderId: string }) {
  const [detail, setDetail] = useState<OrderDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [updating, setUpdating] = useState(false);
  const [status, setStatus] = useState('');
  interface DebugShape {
    start?: number;
    end?: number;
    durationMs?: number;
    orderIdProp?: string;
    fallbackId?: string;
    earlyAbort?: boolean;
    nonOk?: { status: number; bodyText: string };
    malformed?: unknown;
    success?: { id: string; status: string };
    catch?: string;
  }
  const [debugInfo, setDebugInfo] = useState<DebugShape | null>(null);

  // Derive a fallback ID from the URL if the prop is missing (defensive against param propagation issues)
  const derivedId = typeof window !== 'undefined'
    ? (() => {
        const parts = window.location.pathname.split('/').filter(Boolean);
        return parts[parts.length - 1] || '';
      })()
    : '';
  const effectiveId = orderId || derivedId;

  useEffect(() => {
    let active = true;
    async function load() {
      // Reset transient state before fetch
      setError(null);
      setDetail(null);
      setDebugInfo({ start: Date.now(), orderIdProp: orderId, fallbackId: derivedId });
      if (!effectiveId) {
        setError('Order ID missing after fallback parsing');
        setLoading(false);
        setDebugInfo(d => ({ ...(d||{}), earlyAbort: true }));
        return;
      }
      try {
        const res = await fetch(`/api/admin/orders/${effectiveId}`);
        if (!active) return;
        if (!res.ok) {
          let bodyText = '';
          try { bodyText = await res.text(); } catch {}
          if (res.status === 403) {
            setError('Forbidden – admin access required');
          } else if (res.status === 404) {
            setError('Order not found');
          } else {
            setError(`Failed to load order (HTTP ${res.status})`);
          }
          console.error('[ADMIN_ORDER_DETAIL_FETCH_NON_OK]', { status: res.status, bodyText });
          setDebugInfo(d => ({ ...(d||{}), nonOk: { status: res.status, bodyText } }));
        } else {
          const json = await res.json();
          if (!json || !json.order) {
            setError('Malformed response: missing order payload');
            setDebugInfo(d => ({ ...(d||{}), malformed: json }));
          } else {
            setDetail(json.order);
            const incomingStatus = json.order.status;
            const hasStatusInOptions = adminOrderStatusOptions.some((opt) => opt.value === incomingStatus);
            if (incomingStatus && !hasStatusInOptions) {
              adminOrderStatusOptions.unshift({ label: humanizeStatus(incomingStatus), value: incomingStatus });
            }
            setStatus(incomingStatus);
            setError(null);
            console.debug('[ADMIN_ORDER_DETAIL_FETCH_SUCCESS]', json.order.id);
            setDebugInfo(d => ({ ...(d||{}), success: { id: json.order.id, status: json.order.status } }));
          }
        }
      } catch (err) {
        console.error('[ADMIN_ORDER_DETAIL_FETCH_ERROR]', err);
        if (active) setError('Network error');
        setDebugInfo(d => ({ ...(d||{}), catch: String(err) }));
      } finally {
        if (active) setLoading(false);
        setDebugInfo(d => ({ ...(d||{}), end: Date.now(), durationMs: d?.start ? Date.now() - (d.start as number) : undefined }));
      }
    }
    load();
    return () => { active = false; };
  }, [effectiveId, orderId, derivedId]);

  async function updateStatus() {
    if (!detail) return;
    setUpdating(true);
    try {
      const res = await fetch(`/api/admin/orders/${detail.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status })
      });
      if (res.ok) {
        const json = await res.json();
        setDetail(d => d ? { ...d, status: json.order.status, updatedAt: json.order.updatedAt } : d);
      }
    } finally {
      setUpdating(false);
    }
  }

  if (loading) return <div className="py-8 text-sm">Loading order…<DebugPanel info={debugInfo} /></div>;
  if (error) return <div className="py-8 text-sm text-red-600 space-y-4"><div>{error}</div><DebugPanel info={debugInfo} /></div>;
  if (!detail) return <div className="py-8 text-sm">No detail loaded.<DebugPanel info={debugInfo} /></div>;

  // Removed unused local formatting vars; formatting handled in shared view or action section.

  const sharedProps = {
    status: detail.status,
    createdAt: detail.createdAt,
    items: !detail.isCustomOrder && detail.lineItems ? detail.lineItems.map(li => ({ name: li.name, size: li.size, color: li.color, quantity: li.quantity, unitPrice: li.unitPrice })) : undefined,
    subtotal: detail.subtotal,
    totalAmount: detail.totalAmount,
    deliveryAddress: detail.deliveryAddress,
    phone: detail.phone,
    email: detail.email,
    isCustomOrder: detail.isCustomOrder,
    customDesign: detail.isCustomOrder ? {
      previewImageUrl: detail.customDesign?.previewImageUrl,
      designType: detail.customDesign?.designType,
      designText: detail.customDesign?.designText,
      designColor: detail.customDesign?.designColor,
      designImageUrl: detail.customDesign?.designImageUrl,
      quantity: detail.customDesign?.quantity,
    } : null,
  };
  return (
    <div className="space-y-8">
      <div className="space-y-2">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <h1 className="text-2xl md:text-3xl font-semibold tracking-tight">Order {detail.orderNumber}</h1>
          <Link
            href="/admin/orders"
            className="inline-flex items-center justify-center rounded-full border border-border/60 px-4 py-1 text-xs font-medium hover:border-primary/60"
          >
            ← Back to orders
          </Link>
        </div>
        <p className="text-[11px] text-muted-foreground break-all">
          Mongo ID: <code className="font-mono text-[11px]">{detail.id}</code>
        </p>
      </div>
      <OrderDetailView {...sharedProps} />
      <Card variant="glass" className="p-4 space-y-3">
        <h3 className="text-xs font-medium">Admin Actions</h3>
        <div className="flex flex-col sm:flex-row gap-2 sm:items-end">
          <Select
            value={status}
            onChange={setStatus}
            options={adminOrderStatusOptions}
            className="text-xs w-full sm:max-w-xs"
          />
          <Button
            variant="secondary"
            disabled={updating || status === detail.status}
            onClick={updateStatus}
            className="w-full sm:w-auto"
          >
            {updating ? 'Saving…' : 'Save Status'}
          </Button>
        </div>
      </Card>
      {detail.isCustomOrder && (
        <Card variant="soft3D" className="p-4 space-y-2 text-xs">
          <Link href={`/admin/custom-orders/${detail.id}`} className="underline hover:opacity-80">Open full custom order</Link>
        </Card>
      )}
    </div>
  );
}

// Re-use the same DebugShape interface outside main component scope
interface DebugShapeExternal {
  start?: number; end?: number; durationMs?: number; orderIdProp?: string; earlyAbort?: boolean;
  nonOk?: { status: number; bodyText: string }; malformed?: unknown; success?: { id: string; status: string }; catch?: string;
}
function DebugPanel({ info }: { info: DebugShapeExternal | null }) {
  if (!info) return null;
  return (
    <pre className="mt-4 max-h-60 overflow-auto rounded bg-black/5 p-2 text-[10px] leading-tight whitespace-pre-wrap">
      {JSON.stringify(info, null, 2)}
    </pre>
  );
}
