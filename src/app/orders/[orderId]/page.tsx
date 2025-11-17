"use client";
import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Stepper } from "@/components/ui/Stepper";

interface OrderItem { name: string; size: string; color: string; quantity: number; price: number; }
interface OrderDoc {
  _id: string;
  status: OrderStatus;
  items: OrderItem[];
  deliveryAddress: string;
  phone: string;
  email: string;
  subtotal: number;
  total: number;
  createdAt: string;
}

type OrderStatus = "Pending" | "Accepted" | "In Printing" | "Out for Delivery" | "Delivered" | "Cancelled";
const STATUS_FLOW: OrderStatus[] = ["Pending", "Accepted", "In Printing", "Out for Delivery", "Delivered"];

export default function OrderDetailPage({ params }: { params: { orderId: string } }) {
  const { orderId } = params;
  const router = useRouter();
  const [order, setOrder] = useState<OrderDoc | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      try {
        const r = await fetch(`/api/orders/${orderId}`);
        if (r.status === 401) return router.push("/login");
        if (r.status === 404) throw new Error("Order not found");
        if (!r.ok) throw new Error("Failed to load order");
        const data = await r.json();
        setOrder(data.order);
      } catch (e: unknown) {
        const msg = e instanceof Error ? e.message : "Failed to load";
        setError(msg);
      } finally {
        setLoading(false);
      }
    })();
  }, [orderId, router]);

  const activeIndex = useMemo(() => {
    if (!order) return 0;
    const idx = STATUS_FLOW.indexOf(order.status);
    return idx === -1 ? 0 : idx;
  }, [order]);

  if (loading) return <div className="py-12 text-center">Loading order...</div>;
  if (error) return <div className="py-12 text-center text-red-600">{error}</div>;
  if (!order) return <div className="py-12 text-center">No order found.</div>;

  return (
    <div className="py-8 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Order #{order._id.slice(-6)}</h1>
        <Link href="/orders" className="underline">Back to Orders</Link>
      </div>

      <div className="bg-[--surface] border border-muted rounded p-4">
        <div className="flex items-center justify-between">
          <div>
            <div className="text-sm text-gray-600">Placed</div>
            <div className="text-sm">{new Date(order.createdAt).toLocaleString()}</div>
          </div>
          <div className="font-semibold">Status: {order.status}</div>
        </div>
        <div className="mt-4">
          <Stepper steps={STATUS_FLOW} activeIndex={activeIndex} />
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-2">
          {order.items.map((it, idx) => (
            <div key={idx} className="flex items-center justify-between border rounded p-3 bg-white">
              <div>
                <div className="font-medium">{it.name}</div>
                <div className="text-sm text-gray-600">Size: {it.size} • Color: {it.color}</div>
              </div>
              <div className="text-sm">{it.price.toFixed(2)} × {it.quantity}</div>
            </div>
          ))}
        </div>
        <div className="space-y-2">
          <div className="bg-white border rounded p-4">
            <h2 className="font-semibold mb-2">Summary</h2>
            <div className="flex items-center justify-between text-sm">
              <span>Subtotal</span>
              <span>${" "}{order.subtotal.toFixed(2)}</span>
            </div>
            <div className="flex items-center justify-between font-medium">
              <span>Total</span>
              <span>${" "}{order.total.toFixed(2)}</span>
            </div>
          </div>
          <div className="bg-white border rounded p-4">
            <h2 className="font-semibold mb-2">Delivery</h2>
            <div className="text-sm text-gray-700 whitespace-pre-line">{order.deliveryAddress}</div>
            <div className="text-sm">Phone: {order.phone}</div>
            <div className="text-sm">Email: {order.email}</div>
          </div>
        </div>
      </div>
    </div>
  );
}
