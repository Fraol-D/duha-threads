"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Select } from "@/components/ui/Select";
import { fadeInUp, staggerChildren } from "@/lib/motion";

interface CustomOrder {
  id: string;
  userId: string | null;
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
  delivery: {
    email: string;
    phone: string;
    address: string;
  };
}

export default function AdminCustomOrdersPage() {
  const [orders, setOrders] = useState<CustomOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<string>("");
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  useEffect(() => {
    loadOrders();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [statusFilter, page]);

  async function loadOrders() {
    setLoading(true);
    setError(null);

    try {
      const params = new URLSearchParams({
        page: String(page),
        pageSize: "20",
      });
      if (statusFilter) params.set("status", statusFilter);

      const res = await fetch(`/api/admin/custom-orders?${params.toString()}`);
      if (res.status === 403) {
        throw new Error("You do not have admin permissions");
      }
      if (!res.ok) throw new Error("Failed to load orders");

      const data = await res.json();
      setOrders(data.orders || []);
      setTotalPages(data.totalPages || 1);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to load orders";
      setError(msg);
    } finally {
      setLoading(false);
    }
  }

  if (loading && orders.length === 0) {
    return <div className="py-12 text-center">Loading custom orders...</div>;
  }

  if (error) {
    return (
      <div className="py-12 text-center">
        <Card variant="glass" className="p-8 inline-block">
          <p className="text-red-600 mb-4">{error}</p>
          <Link href="/" className="underline">
            Go Home
          </Link>
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
      <h1 className="text-hero">Admin: Custom Orders</h1>

      <Card variant="glass" className="p-4">
        <div className="flex items-center gap-4">
          <label className="text-sm font-medium">Filter by Status:</label>
          <Select
            value={statusFilter}
            onChange={(e) => {
              setStatusFilter(e.currentTarget.value);
              setPage(1);
            }}
          >
            <option value="">All Statuses</option>
            <option value="PENDING_REVIEW">Pending Review</option>
            <option value="ACCEPTED">Accepted</option>
            <option value="IN_DESIGN">In Design</option>
            <option value="IN_PRINTING">In Printing</option>
            <option value="OUT_FOR_DELIVERY">Out for Delivery</option>
            <option value="DELIVERED">Delivered</option>
            <option value="CANCELLED">Cancelled</option>
          </Select>
        </div>
      </Card>

      {orders.length === 0 ? (
        <Card variant="glass" className="p-8 text-center">
          <p className="text-muted">No custom orders found</p>
        </Card>
      ) : (
        <>
          <div className="space-y-4">
            {orders.map((order) => (
              <motion.div key={order.id} variants={fadeInUp}>
                <Link href={`/admin/custom-orders/${order.id}`}>
                  <Card interactive className="p-6">
                    <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
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
                          {order.placements.length} placement{order.placements.length !== 1 ? "s" : ""} •{" "}
                          {order.delivery.email}
                        </div>
                      </div>
                      <div className="text-right space-y-1">
                        <div className="text-sm text-muted">
                          {order.finalTotal ? "Final" : "Estimated"}
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

          <div className="flex items-center justify-center gap-3">
            <button
              className="px-4 py-2 soft-3d rounded-lg disabled:opacity-50"
              disabled={page <= 1}
              onClick={() => setPage((p) => p - 1)}
            >
              Previous
            </button>
            <span className="text-sm">
              Page {page} of {totalPages}
            </span>
            <button
              className="px-4 py-2 soft-3d rounded-lg disabled:opacity-50"
              disabled={page >= totalPages}
              onClick={() => setPage((p) => p + 1)}
            >
              Next
            </button>
          </div>
        </>
      )}
    </motion.div>
  );
}
