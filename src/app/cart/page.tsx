"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { Card } from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/EmptyState";
import { MascotSlot } from "@/components/ui/MascotSlot";
import { Button } from "@/components/ui/Button";
import { fadeInUp } from "@/lib/motion";

interface CartItem {
  _id: string;
  productId: string;
  size: string;
  color: string;
  quantity: number;
}

export default function CartPage() {
  const [items, setItems] = useState<CartItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

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

  function updateItem(id: string, patch: Partial<CartItem>) {
    fetch(`/api/cart/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(patch),
    })
      .then((r) => r.json())
      .then((json) => {
        setItems((prev) => prev.map((i) => (i._id === id ? json.item : i)));
      });
  }

  function removeItem(id: string) {
    fetch(`/api/cart/${id}`, { method: "DELETE" })
      .then(() => setItems((prev) => prev.filter((i) => i._id !== id)));
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

  return (
    <div className="py-8 space-y-6">
      <h1 className="text-section-title">Your Cart</h1>
      <div className="space-y-4">
        {items.map((i) => (
          <motion.div key={i._id} variants={fadeInUp}>
            <Card interactive className="p-4">
              <div className="flex items-center justify-between">
                <div className="space-y-1">
                  <div className="font-medium">Product {i.productId}</div>
                  <div className="text-sm text-muted">Size: {i.size} • Color: {i.color}</div>
                </div>
                <div className="flex items-center gap-3">
                  <input 
                    type="number" 
                    min={1} 
                    className="w-20 border border-muted rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 ring-token" 
                    value={i.quantity} 
                    onChange={(e) => updateItem(i._id, { quantity: Number(e.target.value) })} 
                  />
                  <button className="text-sm underline hover:no-underline" onClick={() => removeItem(i._id)}>Remove</button>
                </div>
              </div>
            </Card>
          </motion.div>
        ))}
      </div>
      <Link href="/checkout">
        <Button className="w-full md:w-auto">Checkout</Button>
      </Link>
    </div>
  );
}
