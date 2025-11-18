"use client";
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Card } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import { Textarea } from "@/components/ui/Textarea";
import { Button } from "@/components/ui/Button";

interface CartItem { _id: string; productId: string; size: string; color: string; quantity: number }
interface Product { id: string; name: string; basePrice: number }

export default function CheckoutPage() {
  const router = useRouter();
  const [items, setItems] = useState<CartItem[]>([]);
  const [prices, setPrices] = useState<Record<string, Product>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [deliveryAddress, setDeliveryAddress] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const total = useMemo(() => items.reduce((sum, i) => sum + (prices[i.productId]?.basePrice || 0) * i.quantity, 0), [items, prices]);

  useEffect(() => {
    (async () => {
      try {
        const r = await fetch("/api/cart");
        if (r.status === 401) throw new Error("Please log in to checkout.");
        if (!r.ok) throw new Error("Failed to load cart");
        const data = await r.json();
        setItems(data.items);
        const unique = Array.from(new Set<string>(data.items.map((i: CartItem) => i.productId)));
        // Fetch product prices
        const prods = await Promise.all(unique.map(async (id) => {
          const res = await fetch(`/api/products/${id}`);
          if (!res.ok) return null;
          const { product } = await res.json();
          return { id: product.id || product._id, name: product.name, basePrice: product.basePrice } as Product;
        }));
        const map: Record<string, Product> = {};
        for (const p of prods) if (p) map[p.id] = p;
        setPrices(map);
      } catch (e: unknown) {
        const msg = e instanceof Error ? e.message : "Failed to load";
        setError(msg);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  async function placeOrder(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    const res = await fetch("/api/checkout", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ deliveryAddress, phone, email }),
    });
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setError(data.error || "Checkout failed");
      return;
    }
    const data = await res.json();
    router.push(`/orders/${data.orderId}`);
  }

  if (loading) return <div className="py-12 text-center">Loading checkout...</div>;
  if (error) return <div className="py-12 text-center text-red-600">{error}</div>;

  return (
    <div className="py-8 grid grid-cols-1 lg:grid-cols-3 gap-8">
      <div className="lg:col-span-2 space-y-6">
        <h1 className="text-section-title">Checkout</h1>
        <div className="space-y-4">
          {items.map((i) => (
            <Card key={i._id} className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <div className="font-medium">Product {i.productId}</div>
                  <div className="text-sm text-muted">Size: {i.size} • Color: {i.color}</div>
                </div>
                <div className="text-sm font-medium">
                  ${(prices[i.productId]?.basePrice || 0).toFixed(2)} × {i.quantity}
                </div>
              </div>
            </Card>
          ))}
        </div>
      </div>
      <div className="space-y-6">
        <Card variant="glass" className="p-6 space-y-4">
          <h2 className="text-xl font-semibold">Delivery</h2>
          <form onSubmit={placeOrder} className="space-y-4">
            <Input required placeholder="Email" type="email" value={email} onChange={(e) => setEmail(e.currentTarget.value)} />
            <Input required placeholder="Phone" value={phone} onChange={(e) => setPhone(e.currentTarget.value)} />
            <Textarea required placeholder="Delivery Address" value={deliveryAddress} onChange={(e) => setDeliveryAddress(e.currentTarget.value)} />
            <div className="flex items-center justify-between font-medium pt-2 border-t border-token">
              <span>Total</span>
              <span className="text-xl">${total.toFixed(2)}</span>
            </div>
            <Button type="submit" className="w-full">Place Order</Button>
            {error && <p className="text-red-600 text-sm">{error}</p>}
          </form>
        </Card>
      </div>
    </div>
  );
}
