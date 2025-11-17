"use client";
import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

interface Order {
  _id: string;
  status: string;
  total: number;
  createdAt: string;
}

export default function OrdersPage() {
  const router = useRouter();
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      try {
        const r = await fetch("/api/orders");
        if (r.status === 401) return router.push("/login");
        if (!r.ok) throw new Error("Failed to load orders");
        const data = await r.json();
        setOrders(data.orders || []);
      } catch (e: unknown) {
        const msg = e instanceof Error ? e.message : "Failed to load";
        setError(msg);
      } finally {
        setLoading(false);
      }
    })();
  }, [router]);

  if (loading) return <div className="py-12 text-center">Loading orders...</div>;
  if (error) return <div className="py-12 text-center text-red-600">{error}</div>;

  return (
    <div className="py-8">
      <h1 className="text-2xl font-semibold mb-4">Your Orders</h1>
      {orders.length === 0 ? (
        <p>No orders yet. <Link href="/products" className="underline">Shop now</Link>.</p>
      ) : (
        <div className="space-y-3">
          {orders.map((o) => (
            <Link key={o._id} href={`/orders/${o._id}`} className="block border rounded p-4 bg-white hover:bg-gray-50">
              <div className="flex items-center justify-between">
                <div>
                  <div className="font-medium">Order #{o._id.slice(-6)}</div>
                  <div className="text-sm text-gray-600">{new Date(o.createdAt).toLocaleString()}</div>
                </div>
                <div className="text-right">
                  <div className="text-sm">{o.status}</div>
                  <div className="font-semibold">${" "}{(o.total ?? 0).toFixed(2)}</div>
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
