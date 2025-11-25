"use client";
import { useEffect, useState } from "react";
import { ShoppingCart } from "lucide-react";
import Link from "next/link";
import Image from "next/image";
import { motion, AnimatePresence } from "framer-motion";
import { Card } from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/EmptyState";
import { MascotSlot } from "@/components/ui/MascotSlot";
import { Button } from "@/components/ui/Button";
import { fadeInUp } from "@/lib/motion";
import { useCart } from "@/components/CartProvider";

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

export default function CartPage() {
  const [items, setItems] = useState<EnrichedCartItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { refresh } = useCart();

  useEffect(() => {
    fetch("/api/cart")
      .then(async (r) => {
        if (r.status === 401) throw new Error("Please log in to view your cart.");
        if (!r.ok) throw new Error("Failed to load cart");
        return r.json();
      })
      .then((json) => setItems(json.items))
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, []);

  async function adjustQuantity(line: EnrichedCartItem, delta: number) {
    setItems(prev => prev.map(p => p._id === line._id ? { ...p, quantity: Math.max(1, p.quantity + delta) } : p));
    window.dispatchEvent(new CustomEvent('cart:updated')); // trigger badge refresh
    const res = await fetch('/api/cart/adjust', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ productId: line.productId, size: line.size, color: line.color, delta })
    });
    if (!res.ok) {
      // revert on failure by refreshing
      refresh();
    } else {
      const data = await res.json();
      if (data.deleted) {
        setItems(prev => prev.filter(p => p._id !== line._id));
        window.dispatchEvent(new CustomEvent('cart:updated'));
      } else if (data.item) {
        setItems(prev => prev.map(p => p._id === line._id ? { ...p, quantity: data.item.quantity } : p));
        window.dispatchEvent(new CustomEvent('cart:updated'));
      }
    }
  }

  function removeLine(line: EnrichedCartItem) {
    adjustQuantity(line, -line.quantity); // use adjust to delete
  }

  if (loading) return <div className="py-12 text-center">Loading cart...</div>;
  if (error) return <div className="py-12 text-center text-red-600">{error}</div>;

  if (items.length === 0) {
    return (
      <div className="py-10 space-y-6">
        <Card variant="glass" className="p-8">
          <EmptyState
            title="Your cart is empty"
            description="Looks like you haven't added anything yet."
            action={<Link href="/products" className="underline">Browse products</Link>}
          />
        </Card>
        <Card variant="soft3D" className="p-6">
          <MascotSlot variant="emptyCart" />
        </Card>
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
                          <div className="flex items-center gap-1 text-yellow-500 text-xs" aria-label="Rating placeholder">
                            {Array.from({ length: 5 }).map((_, i) => <span key={i}>★</span>)}
                            <span className="text-muted ml-1">4.8</span>
                          </div>
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
            ) : (
              <Link href="/checkout" className="w-full inline-flex items-center justify-center rounded-lg px-6 py-3 text-sm font-medium bg-black text-white hover:shadow-[0_6px_20px_rgba(0,0,0,0.3)] hover:-translate-y-0.5 active:translate-y-0 active:shadow-[0_2px_8px_rgba(0,0,0,0.2)] focus:outline-none focus:ring-2 ring-token">Continue to checkout</Link>
            )}
            <p className="text-xs text-muted">Taxes and shipping calculated at checkout.</p>
          </Card>
        </div>
      </div>
    </div>
  );
}
