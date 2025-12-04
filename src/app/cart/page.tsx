"use client";
import { useCallback, useEffect, useState } from "react";
import { ShoppingCart } from "lucide-react";
import Link from "next/link";
import Image from "next/image";
import { motion, AnimatePresence } from "framer-motion";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { MascotState } from "@/components/ui/MascotState";
import { fadeInUp } from "@/lib/motion";
import { useCart } from "@/components/CartProvider";
import { readGuestCart, updateGuestCartItem } from "@/lib/cart/guestCart";

interface EnrichedCartItem {
  _id: string;
  productId: string;
  size: string;
  color: string;
  quantity: number;
  source?: "guest" | "user";
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

export default function CartPage() {
  const [items, setItems] = useState<EnrichedCartItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { refresh } = useCart();
  const router = useRouter();
  const { status } = useSession();
  const isAuthenticated = status === "authenticated";

  const loadGuestCart = useCallback(async () => {
    const guest = readGuestCart();
    if (!guest.length) {
      setItems([]);
      return;
    }
    const res = await fetch("/api/cart/preview", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ items: guest }),
    });
    if (!res.ok) {
      setItems([]);
      return;
    }
    const data = await res.json();
    setItems((data.items || []).map((line: EnrichedCartItem) => ({ ...line, source: "guest" })));
  }, []);

  useEffect(() => {
    if (status === "loading") return;
    let cancelled = false;
    const run = async () => {
      if (cancelled) return;
      setLoading(true);
      setError(null);
      try {
        if (status === "authenticated") {
          const r = await fetch("/api/cart");
          if (!r.ok) throw new Error("Failed to load cart");
          const json = await r.json();
          if (!cancelled) {
            setItems((json.items || []).map((line: EnrichedCartItem) => ({ ...line, source: "user" })));
          }
        } else {
          await loadGuestCart();
        }
      } catch (e: unknown) {
        if (!cancelled) setError(e instanceof Error ? e.message : "Failed to load cart");
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    void run();
    return () => {
      cancelled = true;
    };
  }, [status, loadGuestCart]);

  async function adjustQuantity(line: EnrichedCartItem, delta: number) {
    if (line.source === "guest") {
      updateGuestCartItem({ productId: line.productId, size: line.size, color: line.color, quantity: line.quantity }, delta);
      await loadGuestCart();
      window.dispatchEvent(new CustomEvent('cart:updated'));
      return;
    }
    setItems(prev => prev.map(p => p._id === line._id ? { ...p, quantity: Math.max(1, p.quantity + delta) } : p));
    window.dispatchEvent(new CustomEvent('cart:updated'));
    const res = await fetch('/api/cart/adjust', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ productId: line.productId, size: line.size, color: line.color, delta })
    });
    if (!res.ok) {
      refresh();
    } else {
      const data = await res.json();
      if (data.deleted) {
        setItems(prev => prev.filter(p => p._id !== line._id));
      } else if (data.item) {
        setItems(prev => prev.map(p => p._id === line._id ? { ...p, quantity: data.item.quantity } : p));
      }
    }
  }

  function removeLine(line: EnrichedCartItem) {
    if (line.source === "guest") {
      updateGuestCartItem({ productId: line.productId, size: line.size, color: line.color, quantity: line.quantity }, -line.quantity);
      void loadGuestCart();
      window.dispatchEvent(new CustomEvent('cart:updated', { detail: { type: 'optimistic-remove', productId: line.productId, size: line.size, color: line.color, quantity: line.quantity } }));
      return;
    }
    adjustQuantity(line, -line.quantity);
  }

  if (loading) return <div className="py-12"><MascotState variant="loading" message="Loading your cart" /></div>;
  if (error) return (
    <div className="py-12">
      <MascotState variant="error" message={error} actionLabel="Retry" onActionClick={() => window.location.reload()} />
    </div>
  );

  if (items.length === 0) {
    return (
      <div className="py-10">
        <MascotState
          variant="empty"
          message="Your cart is empty. Let's fix that."
          actionLabel="Browse products"
          onActionClick={() => window.location.assign('/products')}
        />
      </div>
    );
  }

  const totalItems = items.reduce((sum, i) => sum + i.quantity, 0);
  const subtotal = items.reduce((sum, i) => sum + (i.product?.basePrice || 0) * i.quantity, 0);

  return (
    <div className="py-10 space-y-8">
      <div className="flex items-center gap-2">
        <ShoppingCart className="h-5 w-5 text-muted-foreground" />
        <h1 className="text-2xl font-semibold tracking-tight">Your cart</h1>
      </div>
      <div className="grid lg:grid-cols-3 gap-8 items-start">
        <div className="lg:col-span-2 space-y-4">
          <AnimatePresence>
            {items.map(line => {
              const img = line.product?.primaryImage;
              return (
                <motion.div key={line._id} variants={fadeInUp} initial="hidden" animate="show" exit="hidden">
                  <Card className="p-4">
                    <div className="flex gap-4">
                      <div className="w-20 h-20 rounded overflow-hidden bg-muted shrink-0 relative">
                        {img && (
                          <Image src={img.url} alt={img.alt || line.product?.name || 'Product'} fill sizes="100px" className="object-cover" />
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
                              className="flex items-center gap-1 text-yellow-500 text-xs"
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
                        <div className="flex flex-col items-end justify-between gap-2 min-w-[140px]">
                          <div className="text-sm font-semibold">${(line.product?.basePrice || 0).toFixed(2)}</div>
                          <div className="flex items-center gap-2" aria-label={`Quantity of ${line.product?.name}`}> 
                            <Button variant="secondary" aria-label={`Decrease quantity of ${line.product?.name}`} disabled={line.quantity <= 1} onClick={() => adjustQuantity(line, -1)} className="h-7 px-2 py-0 text-xs">-</Button>
                            <div className="text-sm w-8 text-center" aria-live="polite">{line.quantity}</div>
                            <Button variant="secondary" aria-label={`Increase quantity of ${line.product?.name}`} onClick={() => adjustQuantity(line, 1)} className="h-7 px-2 py-0 text-xs">+</Button>
                          </div>
                          <div className="text-xs text-muted">Line subtotal: ${( (line.product?.basePrice || 0) * line.quantity ).toFixed(2)}</div>
                          <button onClick={() => removeLine(line)} className="text-[11px] text-red-600 hover:underline" aria-label={`Remove ${line.product?.name} from cart`}>Remove</button>
                        </div>
                      </div>
                    </div>
                  </Card>
                </motion.div>
              );
            })}
          </AnimatePresence>
        </div>
        <div className="space-y-4">
          <Card className="p-6 space-y-4 sticky top-24">
            <h2 className="text-lg font-medium">Order Summary</h2>
            <div className="flex justify-between text-sm">
              <span>Subtotal ({totalItems} {totalItems === 1 ? 'item' : 'items'})</span>
              <span className="font-semibold">${subtotal.toFixed(2)}</span>
            </div>
            {items.length === 0 ? (
              <Button disabled className="w-full">Continue to checkout</Button>
            ) : isAuthenticated ? (
              <Link href="/checkout" className="w-full inline-flex items-center justify-center rounded-lg px-6 py-3 text-sm font-medium bg-black text-white hover:shadow-[0_6px_20px_rgba(0,0,0,0.3)] hover:-translate-y-0.5 active:translate-y-0 active:shadow-[0_2px_8px_rgba(0,0,0,0.2)] focus:outline-none focus:ring-2 ring-token">Continue to checkout</Link>
            ) : (
              <Button className="w-full" onClick={() => router.push(`/login?callbackUrl=${encodeURIComponent('/checkout')}`)}>Sign in to checkout</Button>
            )}
            <p className="text-xs text-muted">Taxes and shipping calculated at checkout.</p>
          </Card>
        </div>
      </div>
    </div>
  );
}
