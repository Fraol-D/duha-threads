"use client";
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import { Card } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import { Textarea } from "@/components/ui/Textarea";
import { Button } from "@/components/ui/Button";

interface EnrichedCartItem {
  _id: string;
  productId: string;
  size: string;
  color: string;
  quantity: number;
  product?: {
    id: string;
    name: string;
    slug: string;
    description: string;
    basePrice: number;
    images: { url: string; alt: string; isPrimary?: boolean }[];
    primaryImage: { url: string; alt: string; isPrimary?: boolean } | null;
  } | null;
}

export default function CheckoutPage() {
  const router = useRouter();
  const [items, setItems] = useState<EnrichedCartItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [deliveryName, setDeliveryName] = useState("");
  const [deliveryAddress, setDeliveryAddress] = useState("");
  const [phone, setPhone] = useState("");
  const [notes, setNotes] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const total = useMemo(() => items.reduce((sum, i) => sum + (i.product?.basePrice || 0) * i.quantity, 0), [items]);

  useEffect(() => {
    (async () => {
      try {
        const r = await fetch("/api/cart");
        if (r.status === 401) throw new Error("Please log in to checkout.");
        if (!r.ok) throw new Error("Failed to load cart");
        const data = await r.json();
        // items already enriched by updated /api/cart route
        setItems(data.items);
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
    if (!deliveryName || !deliveryAddress || !phone) {
      setError("Please fill required delivery fields.");
      return;
    }
    setSubmitting(true);
    try {
      const res = await fetch("/api/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: deliveryName,
            phone,
            address: deliveryAddress,
            notes: notes || undefined,
        }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setError(data.error || "Order placement failed");
        return;
      }
      const data = await res.json();
      if (process.env.NODE_ENV !== 'production') {
        console.log('Checkout created order response', data);
        console.log('Checkout redirecting to', `/orders/${data.id}`);
      }
      router.push(`/orders/${data.id}`);
    } catch {
      setError("Network error placing order");
    } finally {
      setSubmitting(false);
    }
  }

  if (loading) return <div className="py-12 text-center">Loading checkout...</div>;
  if (error) return <div className="py-12 text-center text-red-600">{error}</div>;

  return (
    <div className="py-8 grid grid-cols-1 lg:grid-cols-3 gap-8">
      <div className="lg:col-span-2 space-y-6">
        <h1 className="text-2xl font-semibold tracking-tight">Checkout</h1>
        <div className="space-y-4">
          {items.map(line => {
            const img = line.product?.primaryImage;
            return (
              <Card key={line._id} className="p-4">
                <div className="flex gap-4">
                  <div className="w-16 h-16 rounded overflow-hidden bg-muted shrink-0 relative">
                    {img && (
                      <Image src={img.url} alt={img.alt || line.product?.name || 'Product'} fill sizes="70px" className="object-cover" />
                    )}
                  </div>
                  <div className="flex-1 flex flex-col sm:flex-row gap-4 justify-between">
                    <div className="space-y-1">
                      <Link href={`/products/${line.product?.slug}`} className="font-medium hover:underline">
                        {line.product?.name || 'Product'}
                      </Link>
                      {line.product?.description && (
                        <p className="text-xs text-muted line-clamp-2 max-w-prose">{line.product.description}</p>
                      )}
                      <div className="flex items-center gap-1 text-yellow-500 text-[10px]" aria-label="Rating placeholder">
                        {Array.from({ length: 5 }).map((_, i) => <span key={i}>★</span>)}
                        <span className="text-muted ml-1">4.8</span>
                      </div>
                      <div className="text-xs text-muted">Size: {line.size} • Color: {line.color}</div>
                    </div>
                    <div className="flex flex-col items-end gap-1 min-w-[130px]">
                      <div className="text-sm">Unit: ${(line.product?.basePrice || 0).toFixed(2)}</div>
                      <div className="text-xs text-muted">Qty: {line.quantity}</div>
                      <div className="text-sm font-semibold">Subtotal: ${((line.product?.basePrice || 0) * line.quantity).toFixed(2)}</div>
                    </div>
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      </div>
      <div className="space-y-6">
        <Card variant="glass" className="p-6 space-y-4">
          <h2 className="text-xl font-semibold">Delivery</h2>
          <form onSubmit={placeOrder} className="space-y-4">
            <Input required placeholder="Full Name" value={deliveryName} onChange={(e) => setDeliveryName(e.currentTarget.value)} />
            <Input required placeholder="Phone" value={phone} onChange={(e) => setPhone(e.currentTarget.value)} />
            <Textarea required placeholder="Delivery Address" value={deliveryAddress} onChange={(e) => setDeliveryAddress(e.currentTarget.value)} />
            <Textarea placeholder="Notes (optional)" value={notes} onChange={(e) => setNotes(e.currentTarget.value)} />
            <div className="flex items-center justify-between font-medium pt-2 border-t border-token">
              <span>Total</span>
              <span className="text-xl">${total.toFixed(2)}</span>
            </div>
            <Button type="submit" className="w-full" disabled={submitting}>{submitting ? 'Placing…' : 'Place Order'}</Button>
            {error && <p className="text-red-600 text-sm">{error}</p>}
          </form>
        </Card>
      </div>
    </div>
  );
}
