"use client";
import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { UserOrderDetail } from "@/components/orders/UserOrderDetail";

interface OrderItem { name: string; size?: string | null; color?: string | null; quantity: number; unitPrice: number; subtotal: number; imageUrl?: string | null; }
interface OrderDoc {
  id: string;
  orderNumber?: string;
  status: string;
  paymentMethod?: 'chapa' | 'stripe' | 'pay_on_delivery';
  items: OrderItem[];
  subtotal: number;
  totalAmount: number;
  currency: string;
  deliveryInfo: { name?: string; phone?: string; address?: string; notes?: string };
  createdAt: string;
  updatedAt: string;
}

export default function OrderDetailPage() {
  const params = useParams<{ id?: string }>();
  const id = params?.id;
  if (process.env.NODE_ENV !== 'production') {
    console.log('Order detail page (id) params', params);
    console.log('Order detail page (id) id', id);
  }
  const router = useRouter();
  const [order, setOrder] = useState<OrderDoc | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!id) {
      setError('Missing id');
      setLoading(false);
      return;
    }
    (async () => {
      try {
        const r = await fetch(`/api/orders/${id}`);
        if (r.status === 401) return router.push('/login');
        if (r.status === 404) throw new Error('Order not found');
        if (!r.ok) throw new Error('Failed to load order');
        const o = await r.json(); // new minimal API returns raw order payload not wrapped
        const normalized: OrderDoc = {
          id: o.id,
          orderNumber: typeof o.orderNumber === 'string' ? o.orderNumber : undefined,
          status: o.status,
          paymentMethod: o.paymentMethod || 'chapa',
          items: Array.isArray(o.items) ? o.items.map((raw: unknown) => {
            const it = raw as Record<string, unknown>;
            const unit = typeof it.unitPrice === 'number' ? it.unitPrice : (typeof it.price === 'number' ? it.price : 0);
            const qty = typeof it.quantity === 'number' ? it.quantity : 0;
            const subtotal = typeof it.subtotal === 'number' ? it.subtotal : unit * qty;
            return {
              name: String(it.name || ''),
              size: (typeof it.size === 'string' ? it.size : null),
              color: (typeof it.color === 'string' ? it.color : null),
              quantity: qty,
              unitPrice: unit,
              subtotal,
              imageUrl: (typeof it.imageUrl === 'string' ? it.imageUrl : null)
            };
          }) : [],
          subtotal: o.subtotal ?? 0,
          totalAmount: o.totalAmount ?? o.subtotal ?? 0,
          currency: o.currency || 'USD',
          deliveryInfo: o.deliveryInfo || {},
          createdAt: o.createdAt,
          updatedAt: o.updatedAt,
        };
        setOrder(normalized);
      } catch (e: unknown) {
        setError(e instanceof Error ? e.message : 'Failed to load');
      } finally {
        setLoading(false);
      }
    })();
  }, [id, router]);

  const detailProps = useMemo(() => {
    if (!order) return null;
    return {
      orderNumber: order.orderNumber,
      id: order.id,
      status: order.status,
      paymentMethod: order.paymentMethod,
      createdAt: order.createdAt,
      items: order.items,
      subtotal: order.subtotal,
      totalAmount: order.totalAmount,
      currency: order.currency,
      deliveryInfo: order.deliveryInfo,
      isCustomOrder: false,
      customPreviewImageUrl: undefined,
    };
  }, [order]);

  if (loading) return <div className="py-12 text-center">Loading order...</div>;
  if (error) return <div className="py-12 text-center text-red-600">{error}</div>;
  if (!order) return <div className="py-12 text-center">No order found.</div>;

  return (
    <div className="py-8">
      <div className="mb-4">
        <Link href="/orders" className="text-xs text-muted-foreground hover:underline">← Back to orders</Link>
      </div>
      {detailProps && <UserOrderDetail {...detailProps} />}
    </div>
  );
}
