"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/EmptyState";
import { MascotSlot } from "@/components/ui/MascotSlot";
import { fadeInUp, staggerChildren } from "@/lib/motion";

interface CustomOrder {
  id: string;
  status: string;
  baseShirt: {
    productId: string;
    color: string;
    size: string;
    quantity: number;
  };
  placements: Array<{ placementKey: string; label: string }>;
  estimatedTotal: number;
  finalTotal?: number;
  createdAt: string;
}

export default function CustomOrdersPage() {
  const [orders, setOrders] = useState<CustomOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/custom-orders")
      .then(async (r) => {
        if (r.status === 401) throw new Error("Please log in to view your custom orders.");
        if (!r.ok) throw new Error("Failed to load custom orders");
        return r.json();
      })
      .then((json) => setOrders(json.orders || []))
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="py-12 text-center">Loading custom orders...</div>;
  if (error) return <div className="py-12 text-center text-red-600">{error}</div>;

  if (orders.length === 0) {
    return (
      <div className="py-10 space-y-6">
        <Card variant="glass" className="p-8">
          <EmptyState
            title="No custom orders yet"
            description="Start building your unique custom T-shirt!"
            action={
              <Link href="/custom-order">
                <Button>Create Custom Order</Button>
              </Link>
            }
          />
        </Card>
        <Card variant="soft3D" className="p-6">
          <MascotSlot variant="emptyCart" />
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
      <div className="flex items-center justify-between">
        <h1 className="text-section-title">Your Custom Orders</h1>
        <Link href="/custom-order">
          <Button>Create New</Button>
        </Link>
      </div>

      <div className="space-y-4">
        {orders.map((order) => (
          <motion.div key={order.id} variants={fadeInUp}>
            <Link href={`/custom-orders/${order.id}`}>
              <Card interactive className="p-6">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <Badge>
                        {order.status.replace(/_/g, " ")}
                      </Badge>
                      <span className="text-sm text-muted">
                        {new Date(order.createdAt).toLocaleDateString()}
                      </span>
                    </div>
                    <div className="font-medium">
                      {order.baseShirt.color} {order.baseShirt.size} • Qty: {order.baseShirt.quantity}
                    </div>
                    <div className="text-sm text-muted">
                      {order.placements.length} placement{order.placements.length !== 1 ? "s" : ""}:{" "}
                      {order.placements.map((p) => p.label).join(", ")}
                    </div>
                  </div>
                  <div className="text-right space-y-1">
                    <div className="text-sm text-muted">
                      {order.finalTotal ? "Final" : "Estimated"} Total
                    </div>
                    <div className="text-2xl font-bold">
                      ${(order.finalTotal || order.estimatedTotal).toFixed(2)}
                    </div>
                  </div>
                </div>
              </Card>
            </Link>
          </motion.div>
        ))}
      </div>
    </motion.div>
  );
}
