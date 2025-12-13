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
    ratingAverage?: number | null;
    ratingCount?: number | null;
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
  const [paymentMethod, setPaymentMethod] = useState<'chapa' | 'pay_on_delivery'>('chapa');
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

  async function handlePayment(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!deliveryName || !deliveryAddress || !phone) {
      setError("Please fill required delivery fields.");
      return;
    }
    setSubmitting(true);
    try {
      if (paymentMethod === 'pay_on_delivery') {
        // Create order directly without Chapa payment
        const res = await fetch("/api/checkout", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            deliveryName,
            deliveryAddress,
            phone,
            notes,
            paymentMethod: 'pay_on_delivery',
          }),
        });
        const data = await res.json();
        if (!res.ok) {
          setError(data.error || "Failed to create order");
          return;
        }
        // Redirect to success page
        router.push(`/checkout/success?orderId=${data.orderId}`);
        return;
      }

      // Chapa payment flow
      const tx_ref = `duha-${Date.now()}`;
      const res = await fetch("/api/chapa/initialize", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          amount: total.toFixed(2),
          currency: "ETB",
          email: "test@example.com", // TODO: replace with real user email if available
          first_name: deliveryName.split(" ")[0] || deliveryName,
          last_name: deliveryName.split(" ").slice(1).join(" ") || deliveryName,
          phone_number: phone,
          tx_ref,
          callback_url: `${window.location.origin}/api/chapa/callback`,
          return_url: `${window.location.origin}/checkout/success?tx_ref=${tx_ref}`,
          customization: {
            title: "Duha Threads Payment",
            description: "Checkout payment for Duha Threads order",
          },
        }),
      });
      const data = await res.json();
      if (!res.ok || !data.checkout_url) {
        setError(data.error || "Failed to initialize payment");
        return;
      }
      window.location.href = data.checkout_url;
    } catch {
      setError("Network error processing payment");
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
                      {line.product && (
                        <div
                          className="flex items-center gap-1 text-yellow-500 text-[10px]"
                          aria-label={line.product.ratingCount && line.product.ratingCount > 0
                            ? `Average rating ${(line.product.ratingAverage ?? 0).toFixed(1)} out of 5`
                            : 'No ratings yet'}
                        >
                          {Array.from({ length: 5 }).map((_, i) => {
                            const avg = line.product?.ratingAverage ?? 0;
                            return <span key={i}>{i < Math.round(avg) ? '★' : '☆'}</span>;
                          })}
                          <span className="text-muted ml-1">
                            {line.product.ratingCount && line.product.ratingCount > 0
                              ? `${(line.product.ratingAverage ?? 0).toFixed(1)} (${line.product.ratingCount})`
                              : 'No ratings yet'}
                          </span>
                        </div>
                      )}
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
          <form onSubmit={handlePayment} className="space-y-4">
            <Input required placeholder="Full Name" value={deliveryName} onChange={(e) => setDeliveryName(e.currentTarget.value)} />
            <Input required placeholder="Phone" value={phone} onChange={(e) => setPhone(e.currentTarget.value)} />
            <Textarea required placeholder="Delivery Address" value={deliveryAddress} onChange={(e) => setDeliveryAddress(e.currentTarget.value)} />
            <Textarea placeholder="Notes (optional)" value={notes} onChange={(e) => setNotes(e.currentTarget.value)} />
            
            <div className="space-y-3 pt-2 border-t border-token">
              <h3 className="font-medium">Payment Method</h3>
              <div className="flex items-center gap-4">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="radio"
                    name="paymentMethod"
                    value="chapa"
                    checked={paymentMethod === 'chapa'}
                    onChange={(e) => setPaymentMethod(e.target.value as 'chapa' | 'pay_on_delivery')}
                    className="w-4 h-4"
                  />
                  <span className="text-sm">Pay with Chapa</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="radio"
                    name="paymentMethod"
                    value="pay_on_delivery"
                    checked={paymentMethod === 'pay_on_delivery'}
                    onChange={(e) => setPaymentMethod(e.target.value as 'chapa' | 'pay_on_delivery')}
                    className="w-4 h-4"
                  />
                  <span className="text-sm">Pay on Delivery</span>
                </label>
              </div>
            </div>

            <div className="flex items-center justify-between font-medium pt-2 border-t border-token">
              <span>Total</span>
              <span className="text-xl">${total.toFixed(2)}</span>
            </div>
            <Button type="submit" className="w-full" disabled={submitting}>
              {submitting ? 'Processing…' : paymentMethod === 'chapa' ? 'Pay with Chapa' : 'Place Order'}
            </Button>
            {error && <p className="text-red-600 text-sm">{error}</p>}
          </form>
        </Card>
      </div>
    </div>
  );
}
