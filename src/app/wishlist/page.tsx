"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { EmptyState } from "@/components/ui/EmptyState";
import { MascotSlot } from "@/components/ui/MascotSlot";

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
      <div className="py-10">
        <EmptyState
          title="Your wishlist is empty"
          description="Save products you love and revisit later."
          action={<a href="/products" className="underline">Browse products</a>}
        />
        <div className="mt-6">
          <MascotSlot variant="emptyWishlist" />
        </div>
      </div>
    );
  }

  return (
    <div className="py-8 space-y-6">
      <h1 className="text-2xl font-semibold">Wishlist</h1>
      <div className="space-y-3">
        {items.map((i) => (
          <div key={i._id} className="flex items-center justify-between border rounded p-3 bg-white">
            <div>Product {i.productId}</div>
            <div className="flex gap-2">
              <button className="text-sm underline" onClick={() => addToCart(i.productId)}>Add to Cart</button>
              <button className="text-sm underline" onClick={() => remove(i._id)}>Remove</button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
