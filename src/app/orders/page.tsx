"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { OrderListCard } from "@/components/orders/OrderListCard";
import { Package } from "lucide-react";
import { MascotState } from "@/components/ui/MascotState";

interface OrderListItem {
  id: string;
  status: string;
  totalAmount: number;
  createdAt: string;
  orderNumber: string;
  items?: Array<{ name?: string; size?: string; color?: string; quantity?: number; imageUrl?: string | null }>;
}

export default function OrdersPage() {
  const router = useRouter();
  const [orders, setOrders] = useState<OrderListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      try {
        const r = await fetch("/api/orders");
        if (r.status === 401) { router.push("/login"); return; }
        if (!r.ok) throw new Error("Failed to load orders");
        const data = await r.json();
        const normalized: OrderListItem[] = (data.orders || []).map((raw: unknown) => {
          if (typeof raw !== 'object' || raw === null) {
            return {
              id: '',
              status: '',
              totalAmount: 0,
              createdAt: new Date().toISOString(),
              orderNumber: '',
              items: [],
            };
          }
          const r = raw as Record<string, unknown>;
          const id = String(r.id || r._id || "");
          const totalCandidate = (r.totalAmount ?? r.total ?? 0) as unknown;
          const totalNum = typeof totalCandidate === 'number' ? totalCandidate : Number(totalCandidate);
          return {
            id,
            status: String(r.status || ''),
            totalAmount: Number.isFinite(totalNum) ? totalNum : 0,
            createdAt: String(r.createdAt || new Date().toISOString()),
            orderNumber: String(r.orderNumber || id.slice(-6)),
            items: Array.isArray(r.items) ? (r.items as Array<unknown>).slice(0,1).map((itRaw: unknown) => {
              if (typeof itRaw !== 'object' || itRaw === null) return {};
              const it = itRaw as Record<string, unknown>;
              return {
                name: typeof it.name === 'string' ? it.name : undefined,
                size: typeof it.size === 'string' ? it.size : undefined,
                color: typeof it.color === 'string' ? it.color : undefined,
                quantity: typeof it.quantity === 'number' ? it.quantity : undefined,
                imageUrl: typeof it.imageUrl === 'string' ? it.imageUrl : null,
              };
            }) : [],
          };
        });
        setOrders(normalized);
      } catch (e: unknown) {
        const msg = e instanceof Error ? e.message : "Failed to load";
        setError(msg);
      } finally {
        setLoading(false);
      }
    })();
  }, [router]);

  if (loading) return <div className="py-12"><MascotState variant="loading" message="Loading your orders" /></div>;
  if (error) return (
    <div className="py-12">
      <MascotState variant="error" message={error} actionLabel="Retry" onActionClick={() => router.refresh()} />
    </div>
  );

  return (
    <div className="py-10 mx-auto max-w-4xl space-y-6">
      <div className="flex items-center gap-2">
        <Package className="h-5 w-5 text-muted-foreground" />
        <h1 className="text-2xl font-semibold tracking-tight">Standard orders</h1>
      </div>
      {orders.length === 0 ? (
        <MascotState
          variant="empty"
          message="No standard orders yet. Browse products to get started."
          actionLabel="Browse products"
          onActionClick={() => router.push("/products")}
        />
      ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {orders.map(o => {
            const first = o.items && o.items[0];
            const subtitleParts: string[] = [];
            if (first?.size) subtitleParts.push(first.size);
            if (first?.color) subtitleParts.push(first.color);
            subtitleParts.push(new Date(o.createdAt).toLocaleDateString());
            subtitleParts.push(`Total ${o.totalAmount.toFixed(2)}`);
            const subtitle = subtitleParts.join(' · ');
            return (
              <OrderListCard
                key={o.id}
                id={o.id}
                orderNumber={o.orderNumber}
                type="standard"
                createdAt={o.createdAt}
                status={o.status}
                title={first?.name || `Order ${o.orderNumber}`}
                subtitle={subtitle}
                thumbnailUrl={first?.imageUrl || null}
                totalAmount={o.totalAmount}
              />
            );
          })}
        </div>
      )}
    </div>
  );
}
