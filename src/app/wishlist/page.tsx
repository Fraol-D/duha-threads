"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { motion } from "framer-motion";
import { Card } from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/EmptyState";
import { MascotSlot } from "@/components/ui/MascotSlot";
import { fadeInUp, staggerChildren } from "@/lib/motion";

interface WishlistItem { _id: string; productId: string }

export default function WishlistPage() {
  const router = useRouter();
  const [items, setItems] = useState<WishlistItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/wishlist")
      .then(async (r) => {
        if (r.status === 401) throw new Error("Please log in to view your wishlist.");
        if (!r.ok) throw new Error("Failed to load wishlist");
        return r.json();
      })
      .then((json) => setItems(json.items))
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, []);

  function remove(id: string) {
    fetch(`/api/wishlist/${id}`, { method: "DELETE" })
      .then(() => setItems((prev) => prev.filter((i) => i._id !== id)));
  }

  function addToCart(productId: string) {
    router.push(`/products/${productId}`);
  }

  if (loading) return <div className="py-12 text-center">Loading wishlist...</div>;
  if (error) return <div className="py-12 text-center text-red-600">{error}</div>;
  if (items.length === 0) {
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

  return (
    <motion.div 
      className="py-8 space-y-6"
      initial="hidden"
      animate="show"
      variants={staggerChildren}
    >
      <h1 className="text-section-title">Wishlist</h1>
      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {items.map((i) => (
          <motion.div key={i._id} variants={fadeInUp}>
            <Card interactive className="p-4 space-y-3">
              <Link href={`/products/${i.productId}`} className="block font-medium hover:underline">
                Product {i.productId}
              </Link>
              <div className="flex gap-2">
                <button className="text-sm underline hover:no-underline" onClick={() => addToCart(i.productId)}>Add to Cart</button>
                <button className="text-sm underline hover:no-underline" onClick={() => remove(i._id)}>Remove</button>
              </div>
            </Card>
          </motion.div>
        ))}
      </div>
    </motion.div>
  );
}
