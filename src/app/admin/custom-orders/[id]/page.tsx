"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Select } from "@/components/ui/Select";
import { Input } from "@/components/ui/Input";
import { Textarea } from "@/components/ui/Textarea";
import { Stepper } from "@/components/ui/Stepper";

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
  designAssets: Array<{
    placementKey: string;
    type: "image" | "text";
    sourceType: string;
    imageUrl?: string;
    text?: string;
    font?: string;
    color?: string;
  }>;
  notes: string;
  delivery: {
    email: string;
    phone: string;
    address: string;
  };
  pricing: {
    basePrice: number;
    placementCost: number;
    quantityMultiplier: number;
    estimatedTotal: number;
    finalTotal?: number;
  };
  statusHistory: Array<{
    status: string;
    changedAt: string;
    changedBy: string;
  }>;
  createdAt: string;
  updatedAt: string;
}

const STATUS_ORDER = [
  "PENDING_REVIEW",
  "ACCEPTED",
  "IN_DESIGN",
  "IN_PRINTING",
  "OUT_FOR_DELIVERY",
  "DELIVERED",
];

export default function AdminCustomOrderDetailPage({ params }: { params: { id: string } }) {
  const [order, setOrder] = useState<CustomOrder | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [updating, setUpdating] = useState(false);

  const [newStatus, setNewStatus] = useState<string>("");
  const [newFinalTotal, setNewFinalTotal] = useState<string>("");
  const [adminNotes, setAdminNotes] = useState<string>("");

  useEffect(() => {
    loadOrder();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function loadOrder() {
    setLoading(true);
    setError(null);

    try {
      const res = await fetch(`/api/admin/custom-orders/${params.id}`);
      if (res.status === 403) {
        throw new Error("You do not have admin permissions");
      }
      if (!res.ok) throw new Error("Failed to load order");

      const data = await res.json();
      setOrder(data.order);
      setNewStatus(data.order.status);
      setNewFinalTotal(data.order.pricing.finalTotal?.toString() || "");
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to load order";
      setError(msg);
    } finally {
      setLoading(false);
    }
  }

  async function handleUpdate() {
    if (!order) return;

    setUpdating(true);
    setError(null);

    try {
      const payload: Record<string, unknown> = {};
      if (newStatus !== order.status) {
        payload.status = newStatus;
        payload.addStatusHistory = true;
      }
      if (newFinalTotal && parseFloat(newFinalTotal) !== order.pricing.finalTotal) {
        payload.finalTotal = parseFloat(newFinalTotal);
      }
      if (adminNotes.trim()) {
        payload.adminNotes = adminNotes.trim();
      }

      const res = await fetch(`/api/admin/custom-orders/${params.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!res.ok) throw new Error("Failed to update order");

      await loadOrder();
      setAdminNotes("");
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to update order";
      setError(msg);
    } finally {
      setUpdating(false);
    }
  }

  if (loading) return <div className="py-12 text-center">Loading order...</div>;

  if (error || !order) {
    return (
      <div className="py-12 text-center">
        <Card variant="glass" className="p-8 inline-block">
          <p className="text-red-600 mb-4">{error || "Order not found"}</p>
          <Link href="/admin/custom-orders" className="underline">
            Back to Orders
          </Link>
        </Card>
      </div>
    );
  }

  const currentStatusIndex = STATUS_ORDER.indexOf(order.status);
  type StepStatus = 'completed' | 'current' | 'upcoming';
  const statusSteps = STATUS_ORDER.map((status, index): { key: string; label: string; status: StepStatus } => ({
    key: status,
    label: status.replace(/_/g, ' '),
    status: (index < currentStatusIndex
      ? 'completed'
      : index === currentStatusIndex
      ? 'current'
      : 'upcoming') as StepStatus,
  }));

  return (
    <div className="py-8 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <Link href="/admin/custom-orders" className="text-sm underline hover:no-underline mb-2 inline-block">
            ← Back to Admin Orders
          </Link>
          <h1 className="text-hero">Order Management</h1>
        </div>
        <Badge className="text-base px-4 py-2">
          {order.status.replace(/_/g, " ")}
        </Badge>
      </div>

      <Card variant="glass" className="p-6 space-y-4">
        <h2 className="text-xl font-semibold">Update Order</h2>
        <div className="grid md:grid-cols-3 gap-4">
          <div className="space-y-2">
            <label className="text-sm font-medium">Status</label>
            <Select value={newStatus} onChange={(e) => setNewStatus(e.currentTarget.value)}>
              <option value="PENDING_REVIEW">Pending Review</option>
              <option value="ACCEPTED">Accepted</option>
              <option value="IN_DESIGN">In Design</option>
              <option value="IN_PRINTING">In Printing</option>
              <option value="OUT_FOR_DELIVERY">Out for Delivery</option>
              <option value="DELIVERED">Delivered</option>
              <option value="CANCELLED">Cancelled</option>
            </Select>
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium">Final Total ($)</label>
            <Input
              type="number"
              step="0.01"
              value={newFinalTotal}
              onChange={(e) => setNewFinalTotal(e.currentTarget.value)}
              placeholder={order.pricing.estimatedTotal.toFixed(2)}
            />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium">Admin Notes</label>
            <Textarea
              value={adminNotes}
              onChange={(e) => setAdminNotes(e.currentTarget.value)}
              placeholder="Add internal note..."
              rows={1}
            />
          </div>
        </div>
        <Button onClick={handleUpdate} disabled={updating}>
          {updating ? "Updating..." : "Update Order"}
        </Button>
        {error && <p className="text-sm text-red-600">{error}</p>}
      </Card>

      <Card variant="glass" className="p-6">
        <h2 className="text-xl font-semibold mb-4">Status Timeline</h2>
        <Stepper steps={statusSteps} />
      </Card>

      <div className="grid md:grid-cols-2 gap-6">
        <Card className="p-6 space-y-4">
          <h2 className="text-xl font-semibold">Base Shirt</h2>
          <div className="space-y-2 text-sm">
            <div>
              <span className="text-muted">Color:</span> {order.baseShirt.color}
            </div>
            <div>
              <span className="text-muted">Size:</span> {order.baseShirt.size}
            </div>
            <div>
              <span className="text-muted">Quantity:</span> {order.baseShirt.quantity}
            </div>
          </div>
        </Card>

        <Card className="p-6 space-y-4">
          <h2 className="text-xl font-semibold">Pricing</h2>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-muted">Base Price:</span>
              <span>${order.pricing.basePrice.toFixed(2)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted">Placement Cost:</span>
              <span>${order.pricing.placementCost.toFixed(2)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted">Quantity:</span>
              <span>×{order.pricing.quantityMultiplier}</span>
            </div>
            <div className="border-t pt-2 flex justify-between font-semibold">
              <span>Estimated Total:</span>
              <span>${order.pricing.estimatedTotal.toFixed(2)}</span>
            </div>
            {order.pricing.finalTotal && (
              <div className="flex justify-between font-bold text-lg">
                <span>Final Total:</span>
                <span>${order.pricing.finalTotal.toFixed(2)}</span>
              </div>
            )}
          </div>
        </Card>
      </div>

      <Card className="p-6 space-y-4">
        <h2 className="text-xl font-semibold">Placements</h2>
        <div className="flex gap-2 flex-wrap">
          {order.placements.map((p, i) => (
            <span key={i} className="soft-3d px-4 py-2 rounded-full text-sm">
              {p.label}
            </span>
          ))}
        </div>
      </Card>

      {order.designAssets.length > 0 && (
        <Card className="p-6 space-y-4">
          <h2 className="text-xl font-semibold">Design Assets</h2>
          <div className="space-y-4">
            {order.designAssets.map((asset, i) => (
              <div key={i} className="border border-muted rounded-lg p-4 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-medium">
                    {order.placements.find((p) => p.placementKey === asset.placementKey)?.label || asset.placementKey}
                  </span>
                  <Badge>{asset.type}</Badge>
                </div>
                {asset.type === "image" && asset.imageUrl && (
                  <Image
                    src={asset.imageUrl}
                    alt={`Design for ${asset.placementKey}`}
                    width={128}
                    height={128}
                    className="w-32 h-32 object-cover rounded"
                  />
                )}
                {asset.type === "text" && (
                  <div className="text-sm space-y-1">
                    <div>
                      <span className="text-muted">Text:</span> &quot;{asset.text}&quot;
                    </div>
                    {asset.font && (
                      <div>
                        <span className="text-muted">Font:</span> {asset.font}
                      </div>
                    )}
                    {asset.color && (
                      <div className="flex items-center gap-2">
                        <span className="text-muted">Color:</span>
                        <span
                          className="inline-block w-6 h-6 rounded border"
                          style={{ backgroundColor: asset.color }}
                        />
                        {asset.color}
                      </div>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        </Card>
      )}

      {order.notes && (
        <Card className="p-6 space-y-4">
          <h2 className="text-xl font-semibold">Customer Notes</h2>
          <p className="text-sm whitespace-pre-wrap">{order.notes}</p>
        </Card>
      )}

      <Card className="p-6 space-y-4">
        <h2 className="text-xl font-semibold">Delivery Information</h2>
        <div className="space-y-2 text-sm">
          <div>
            <span className="text-muted">Email:</span> {order.delivery.email}
          </div>
          <div>
            <span className="text-muted">Phone:</span> {order.delivery.phone}
          </div>
          <div>
            <span className="text-muted">Address:</span>
            <p className="mt-1 whitespace-pre-wrap">{order.delivery.address}</p>
          </div>
        </div>
      </Card>

      {order.statusHistory.length > 0 && (
        <Card className="p-6 space-y-4">
          <h2 className="text-xl font-semibold">Status History</h2>
          <div className="space-y-2">
            {order.statusHistory.map((entry, i) => (
              <div key={i} className="text-sm flex justify-between border-b border-muted pb-2">
                <div>
                  <Badge className="mr-2">
                    {entry.status.replace(/_/g, " ")}
                  </Badge>
                  <span className="text-muted">by {entry.changedBy}</span>
                </div>
                <span className="text-muted">{new Date(entry.changedAt).toLocaleString()}</span>
              </div>
            ))}
          </div>
        </Card>
      )}

      <Card variant="soft3D" className="p-4 text-sm text-muted">
        <div className="flex justify-between">
          <span>Order Created:</span>
          <span>{new Date(order.createdAt).toLocaleString()}</span>
        </div>
        <div className="flex justify-between">
          <span>Last Updated:</span>
          <span>{new Date(order.updatedAt).toLocaleString()}</span>
        </div>
      </Card>
    </div>
  );
}
