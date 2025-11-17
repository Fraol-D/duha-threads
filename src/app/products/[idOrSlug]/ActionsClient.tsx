"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";

export default function ActionsClient({ productId, sizes, colors }: { productId: string; sizes: string[]; colors: string[] }) {
  const router = useRouter();
  const [size, setSize] = useState<string>(sizes[0] || "Default");
  const [color, setColor] = useState<string>(colors[0] || "Default");
  const [loading, setLoading] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function addToCart() {
    setError(null);
    setLoading("cart");
    const res = await fetch("/api/cart", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ productId, size, color, quantity: 1 }),
    });
    setLoading(null);
    if (res.status === 401) return router.push("/login");
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setError(data.error || "Failed to add to cart");
      return;
    }
    router.push("/cart");
  }

  async function addToWishlist() {
    setError(null);
    setLoading("wishlist");
    const res = await fetch("/api/wishlist", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ productId }),
    });
    setLoading(null);
    if (res.status === 401) return router.push("/login");
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setError(data.error || "Failed to add to wishlist");
      return;
    }
    router.push("/wishlist");
  }

  return (
    <div className="space-y-3">
      <div className="flex gap-3">
        <select className="border rounded px-2 py-1" value={size} onChange={(e) => setSize(e.target.value)}>
          {(sizes.length ? sizes : ["Default"]).map((s) => (
            <option key={s} value={s}>{s}</option>
          ))}
        </select>
        <select className="border rounded px-2 py-1" value={color} onChange={(e) => setColor(e.target.value)}>
          {(colors.length ? colors : ["Default"]).map((c) => (
            <option key={c} value={c}>{c}</option>
          ))}
        </select>
      </div>
      <div className="flex gap-2 pt-2">
        <button onClick={addToCart} disabled={loading === "cart"} className="bg-black text-white px-4 py-2 rounded disabled:opacity-50">
          {loading === "cart" ? "Adding..." : "Add to Cart"}
        </button>
        <button onClick={addToWishlist} disabled={loading === "wishlist"} className="border px-4 py-2 rounded disabled:opacity-50">
          {loading === "wishlist" ? "Adding..." : "Add to Wishlist"}
        </button>
      </div>
      {error && <p className="text-sm text-red-600">{error}</p>}
    </div>
  );
}
