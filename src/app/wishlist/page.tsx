"use client";
import Link from "next/link";
import { motion } from "framer-motion";
import { Heart } from "lucide-react";
import { Card } from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/EmptyState";
import { MascotSlot } from "@/components/ui/MascotSlot";
import { fadeInUp, staggerChildren } from "@/lib/motion";
import { useWishlist } from "@/components/WishlistProvider";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { Button } from "@/components/ui/Button";

export default function WishlistPage() {
  const { items, count, removeFromWishlist } = useWishlist();
  const router = useRouter();

  if (count === 0) {
    return (
      <div className="py-10 space-y-6">
        <Card variant="glass" className="p-8">
          <EmptyState
            title="Your wishlist is empty"
            description="Save products you love and revisit later."
            action={<Link href="/products" className="underline">Browse products</Link>}
          />
        </Card>
        <Card variant="soft3D" className="p-6">
          <MascotSlot variant="emptyWishlist" />
        </Card>
      </div>
    );
  }

  function addToCart(productId: string, colors?: string[], sizes?: string[]) {
    // Quick add with first color/size then stay on page
    const size = sizes && sizes[0] ? sizes[0] : "Default";
    const color = colors && colors[0] ? colors[0] : "Default";
    fetch("/api/cart", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ productId, size, color, quantity: 1 })
    }).then(res => {
      if (res.status === 401) router.push('/login');
      if (res.ok) {
        window.dispatchEvent(new CustomEvent('cart:updated', { detail: { type: 'optimistic-add', productId, size, color, quantity: 1 } }));
      }
    });
  }

  return (
    <motion.div
      className="py-10 space-y-6"
      initial="hidden"
      animate="show"
      variants={staggerChildren}
    >
      <div className="flex items-center gap-2">
        <Heart className="h-5 w-5 text-muted-foreground" />
        <h1 className="text-2xl font-semibold tracking-tight">Wishlist</h1>
      </div>
      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {items.map((i) => {
          const p = i.product;
          return (
            <motion.div key={i._id} variants={fadeInUp}>
              <Card interactive className="p-3 space-y-3 relative">
                <Link href={p ? `/products/${p.slug}` : '#'} className="block group">
                  <div className="aspect-square bg-muted rounded overflow-hidden relative">
                    {p?.primaryImage && (
                      <Image src={p.primaryImage.url} alt={p.primaryImage.alt || p.name} fill sizes="220px" className="object-cover group-hover:scale-105 transition-transform" />
                    )}
                  </div>
                  <div className="mt-2 font-medium line-clamp-1" title={p?.name}>{p?.name || 'Unavailable'}</div>
                </Link>
                <div className="space-y-1 text-xs">
                  {p ? (
                    <>
                      <div className="flex items-center gap-1 text-yellow-500" aria-label="Rating placeholder">
                        {Array.from({ length: 5 }).map((_, idx) => <span key={idx}>★</span>)}
                        <span className="text-muted ml-1">4.8</span>
                      </div>
                      <div className="text-sm font-semibold">${p.basePrice.toFixed(2)}</div>
                    </>
                  ) : (
                    <div className="text-muted">Product unavailable</div>
                  )}
                </div>
                <div className="flex gap-2 pt-2">
                  {p && (
                    <Button variant="secondary" onClick={() => addToCart(p.id, p.colors, p.sizes)} className="text-xs px-3 py-2">Add to Cart</Button>
                  )}
                  <Button variant="ghost" onClick={() => removeFromWishlist(i.productId)} className="text-xs px-3 py-2">Remove</Button>
                </div>
              </Card>
            </motion.div>
          );
        })}
      </div>
    </motion.div>
  );
}
