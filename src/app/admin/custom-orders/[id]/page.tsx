"use client";
import { useEffect, useState, useCallback } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Select } from "@/components/ui/Select";
import { Input } from "@/components/ui/Input";
import { Textarea } from "@/components/ui/Textarea";
import { Stepper } from "@/components/ui/Stepper";
import { CustomOrderPreview } from "@/components/custom-order/CustomOrderPreview";
import type { CustomOrder as BaseCustomOrder } from "@/types/custom-order";

interface AdminCustomOrder extends BaseCustomOrder {
  id: string;
  userId: string | null;
  status: string;
  baseShirt: {
    productId: string;
    color: string;
    size: string;
    quantity: number;
  };
  quantity?: number;
  baseColor?: 'black' | 'white';
  placement?: 'front' | 'back' | 'chest_left' | 'chest_right';
  verticalPosition?: 'upper' | 'center' | 'lower';
  previewImageUrl?: string | null;
  designType?: 'text' | 'image';
  designText?: string | null;
  designFont?: string | null;
  designColor?: string | null;
  designImageUrl?: string | null;
  sides?: {
    front: {
      enabled: boolean;
      placement: 'front';
      verticalPosition: 'upper' | 'center' | 'lower';
      designType: 'text' | 'image';
      designText?: string | null;
      designFont?: string | null;
      designColor?: string | null;
      designImageUrl?: string | null;
    };
    back: {
      enabled: boolean;
      placement: 'back';
      verticalPosition: 'upper' | 'center' | 'lower';
      designType: 'text' | 'image';
      designText?: string | null;
      designFont?: string | null;
      designColor?: string | null;
      designImageUrl?: string | null;
    };
  };
  legacyPlacements: Array<{ placementKey: string; label: string }>;
  placements?: Array<{ id: string; area: 'front' | 'back' | 'left_chest' | 'right_chest'; verticalPosition: 'upper' | 'center' | 'lower'; designType: 'text' | 'image'; designText?: string | null; designFont?: string | null; designColor?: string | null; designImageUrl?: string | null; }>;
  designAssets: Array<{
    placementKey: string;
    type: "image" | "text";
    sourceType: string;
    imageUrl?: string;
    text?: string;
    font?: string;
    fontSize?: number;
    textBoxWidth?: 'narrow' | 'standard' | 'wide';
    color?: string;
  }>;
  notes: string;
  delivery: {
    email: string;
    phone: string;
    address: string;
  };
  isPublic?: boolean;
  publicStatus?: 'private' | 'pending' | 'approved' | 'rejected';
  publicTitle?: string | null;
  publicDescription?: string | null;
  linkedProductId?: string | null;
  pricing: {
    basePrice: number;
    placementCost: number;
    quantityMultiplier: number;
    estimatedTotal: number;
    finalTotal?: number;
  };
  paymentMethod?: 'chapa' | 'pay_on_delivery';
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
  "APPROVED",
  "IN_DESIGN",
  "IN_PRINTING",
  "READY_FOR_PICKUP",
  "OUT_FOR_DELIVERY",
  "DELIVERED",
];

export default function AdminCustomOrderDetailPage() {
  const { id } = useParams() as { id: string };
  const [order, setOrder] = useState<AdminCustomOrder | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [updating, setUpdating] = useState(false);

  const [newStatus, setNewStatus] = useState<string>("");
  const [newFinalTotal, setNewFinalTotal] = useState<string>("");
  const [formError, setFormError] = useState<string>("");
  const [adminNoteDraft, setAdminNoteDraft] = useState<string>("");
  const [adminNotes, setAdminNotes] = useState<string>("");
  const [publicStatusDraft, setPublicStatusDraft] = useState<string>('private');
  const [publicTitleDraft, setPublicTitleDraft] = useState<string>('');
  const [publicDescriptionDraft, setPublicDescriptionDraft] = useState<string>('');
  const [linkedProductInput, setLinkedProductInput] = useState<string>('');

  const adminStatusOptions = [
    { label: 'Pending Review', value: 'PENDING_REVIEW' },
    { label: 'Approved', value: 'APPROVED' },
    { label: 'Accepted', value: 'ACCEPTED' },
    { label: 'In Design', value: 'IN_DESIGN' },
    { label: 'In Printing', value: 'IN_PRINTING' },
    { label: 'Ready for Pickup', value: 'READY_FOR_PICKUP' },
    { label: 'Out for Delivery', value: 'OUT_FOR_DELIVERY' },
    { label: 'Delivered', value: 'DELIVERED' },
    { label: 'Cancelled', value: 'CANCELLED' },
  ];

  const shareStatusOptions = [
    { label: 'Private', value: 'private' },
    { label: 'Pending', value: 'pending' },
    { label: 'Approved', value: 'approved' },
    { label: 'Rejected', value: 'rejected' },
  ];

  const loadOrder = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const res = await fetch(`/api/admin/custom-orders/${id}`);
      if (res.status === 403) {
        throw new Error("You do not have admin permissions");
      }
      if (!res.ok) throw new Error("Failed to load order");

      const data = await res.json();
      setOrder(data.order);
      setNewStatus(data.order.status);
      setNewFinalTotal(data.order.pricing.finalTotal?.toString() || "");
      setPublicStatusDraft(data.order.publicStatus || (data.order.isPublic ? 'approved' : 'private'));
      setPublicTitleDraft(data.order.publicTitle || '');
      setPublicDescriptionDraft(data.order.publicDescription || '');
      setLinkedProductInput(data.order.linkedProductId || '');
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to load order";
      setError(msg);
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    if (!id) return; // wait for params
    loadOrder();
  }, [id, loadOrder]);

  async function handleUpdate() {
    if (!order) return;

    // Validate required fields
    if (!newStatus) {
      setFormError("Status is required.");
      return;
    }
    if (!newFinalTotal || isNaN(Number(newFinalTotal))) {
      setFormError("Final Total is required and must be a valid number.");
      return;
    }
    setFormError("");
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
      const normalizedPublicStatus = order.publicStatus || (order.isPublic ? 'approved' : 'private');
      if (publicStatusDraft !== normalizedPublicStatus) {
        payload.publicStatus = publicStatusDraft;
      }
      const trimmedTitle = publicTitleDraft.trim();
      if (trimmedTitle !== (order.publicTitle || '')) {
        payload.publicTitle = trimmedTitle || null;
      }
      const trimmedDescription = publicDescriptionDraft.trim();
      if (trimmedDescription !== (order.publicDescription || '')) {
        payload.publicDescription = trimmedDescription || null;
      }
      if (linkedProductInput.trim() !== (order.linkedProductId || '')) {
        payload.linkedProductReference = linkedProductInput.trim() || null;
      }
      if (adminNotes.trim()) {
        payload.adminNotes = adminNotes.trim();
      }
      if (adminNoteDraft.trim()) {
        payload.adminNotes = (payload.adminNotes ? payload.adminNotes + '\n' : '') + adminNoteDraft.trim();
      }

      const res = await fetch(`/api/admin/custom-orders/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!res.ok) throw new Error("Failed to update order");

      await loadOrder();
      setAdminNotes("");
      setAdminNoteDraft("");
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

  const normalizedStatus = order.status === 'ACCEPTED' ? 'APPROVED' : order.status;
  const currentStatusIndex = STATUS_ORDER.indexOf(normalizedStatus);
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
    <div className="max-w-6xl mx-auto px-4 py-8 space-y-6 sm:px-6 lg:px-8">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <Link href="/admin/custom-orders" className="text-sm underline hover:no-underline mb-2 inline-flex items-center gap-1">
            <span aria-hidden="true">←</span> Back to Admin Orders
          </Link>
          <h1 className="text-3xl font-semibold tracking-tight">Order Management</h1>
        </div>
        <div className="flex items-center gap-2 self-start md:self-auto">
          <Badge className="text-sm md:text-base px-4 py-2">
            {order.status.replace(/_/g, " ")}
          </Badge>
          <Badge variant="secondary" className="text-sm md:text-base px-4 py-2">
            {order.paymentMethod === 'pay_on_delivery' ? '💵 Pay on Delivery' : '💳 Chapa'}
          </Badge>
        </div>
      </div>

      <Card variant="glass" className="p-6 space-y-4">
        <h2 className="text-lg md:text-xl font-semibold">Update Order</h2>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <div className="space-y-2">
            <label className="text-sm font-medium">Status <span className="text-red-600">*</span></label>
            <Select value={newStatus} onChange={setNewStatus} options={adminStatusOptions} required />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium">Final Total ($) <span className="text-red-600">*</span></label>
            <Input
              type="number"
              step="0.01"
              value={newFinalTotal}
              onChange={(e) => setNewFinalTotal(e.currentTarget.value)}
              placeholder={order.pricing.estimatedTotal.toFixed(2)}
              required
            />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium">Admin Notes</label>
            <Textarea
              value={adminNotes}
              onChange={(e) => setAdminNotes(e.currentTarget.value)}
              placeholder="Add internal note..."
              rows={2}
            />
          </div>
        </div>
        {formError && <div className="text-red-600 text-sm mb-2">{formError}</div>}
        <div className="space-y-2">
          <label className="text-sm font-medium">New Note</label>
          <Textarea
            value={adminNoteDraft}
            onChange={(e) => setAdminNoteDraft(e.currentTarget.value)}
            placeholder="Add a new admin note"
            rows={2}
          />
        </div>
        <Button onClick={handleUpdate} disabled={updating} className="w-full sm:w-auto">
          {updating ? "Updating..." : "Update Order"}
        </Button>
        {error && <p className="text-sm text-red-600">{error}</p>}
      </Card>

      <Card variant="glass" className="p-6 space-y-4">
        <h2 className="text-lg md:text-xl font-semibold">Public Showcase</h2>
        <div className="grid gap-4 md:grid-cols-2">
          <div className="space-y-2">
            <label className="text-sm font-medium">Share Status</label>
            <Select value={publicStatusDraft} onChange={setPublicStatusDraft} options={shareStatusOptions} />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium">Linked Product (slug or ID)</label>
            <Input
              value={linkedProductInput}
              onChange={(e) => setLinkedProductInput(e.currentTarget.value)}
              placeholder="e.g. neon-aurora"
            />
            <p className="text-[11px] text-muted">Leave blank to detach the design from any product.</p>
          </div>
        </div>
        <div className="grid gap-4 md:grid-cols-2">
          <div className="space-y-2">
            <label className="text-sm font-medium">Display Title</label>
            <Input value={publicTitleDraft} onChange={(e) => setPublicTitleDraft(e.currentTarget.value)} maxLength={80} />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium">Short Description</label>
            <Textarea
              rows={2}
              maxLength={400}
              value={publicDescriptionDraft}
              onChange={(e) => setPublicDescriptionDraft(e.currentTarget.value)}
            />
          </div>
        </div>
      </Card>

      <Card className="p-4">
        <h2 className="text-lg md:text-xl font-semibold mb-3">Preview</h2>
        <CustomOrderPreview order={order} size="lg" />
      </Card>

      <Card variant="glass" className="p-6">
        <h2 className="text-lg md:text-xl font-semibold mb-4">Status Timeline</h2>
        <div className="overflow-x-auto">
          <Stepper steps={statusSteps} />
        </div>
      </Card>
      <div className="grid gap-4 md:grid-cols-2">
        <Card className="p-6 space-y-4">
          <h2 className="text-lg md:text-xl font-semibold">Base Shirt</h2>
          <div className="space-y-2 text-sm">
            <div>
              <span className="text-muted">Color:</span> {order.baseShirt.color}
            </div>
            <div>
              <span className="text-muted">Size:</span> {order.baseShirt.size}
            </div>
            <div>
              <span className="text-muted">Quantity:</span> {order.quantity || order.baseShirt.quantity}
            </div>
          </div>
        </Card>

        <Card className="p-6 space-y-4">
          <h2 className="text-lg md:text-xl font-semibold">Pricing</h2>
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
        <h2 className="text-lg md:text-xl font-semibold">Design Overview</h2>
        {order.sides && (
          <div className="space-y-4 mb-4">
            <div className="grid gap-4 md:grid-cols-2">
              <Card className="p-4 space-y-2">
                <h3 className="text-sm font-semibold">Front Print</h3>
                <div className="text-xs"><span className="text-muted">Enabled:</span> {order.sides.front.enabled ? 'Yes' : 'No'}</div>
                {order.sides.front.enabled && (
                  <>
                    <div className="text-xs"><span className="text-muted">Vertical Position:</span> {order.sides.front.verticalPosition}</div>
                    <div className="text-xs"><span className="text-muted">Design Type:</span> {order.sides.front.designType}</div>
                    {order.sides.front.designType==='text' ? (
                      <div className="space-y-1 text-xs">
                        <div><span className="text-muted">Text:</span> {order.sides.front.designText || '—'}</div>
                        <div><span className="text-muted">Font:</span> {order.sides.front.designFont || '—'}</div>
                        <div className="flex items-center gap-2"><span className="text-muted">Color:</span><span className="inline-block w-4 h-4 rounded border" style={{ backgroundColor: order.sides.front.designColor || '#000' }} /></div>
                      </div>
                    ) : (
                      <div className="text-xs flex items-center gap-2">
                        <span className="text-muted">Image:</span>
                        {order.sides.front.designImageUrl ? <Image src={order.sides.front.designImageUrl} alt="Front design" width={64} height={64} className="w-16 h-16 object-contain border rounded" /> : '—'}
                      </div>
                    )}
                  </>
                )}
              </Card>
              <Card className="p-4 space-y-2">
                <h3 className="text-sm font-semibold">Back Print</h3>
                <div className="text-xs"><span className="text-muted">Enabled:</span> {order.sides.back.enabled ? 'Yes' : 'No'}</div>
                {order.sides.back.enabled && (
                  <>
                    <div className="text-xs"><span className="text-muted">Vertical Position:</span> {order.sides.back.verticalPosition}</div>
                    <div className="text-xs"><span className="text-muted">Design Type:</span> {order.sides.back.designType}</div>
                    {order.sides.back.designType==='text' ? (
                      <div className="space-y-1 text-xs">
                        <div><span className="text-muted">Text:</span> {order.sides.back.designText || '—'}</div>
                        <div><span className="text-muted">Font:</span> {order.sides.back.designFont || '—'}</div>
                        <div className="flex items-center gap-2"><span className="text-muted">Color:</span><span className="inline-block w-4 h-4 rounded border" style={{ backgroundColor: order.sides.back.designColor || '#000' }} /></div>
                      </div>
                    ) : (
                      <div className="text-xs flex items-center gap-2">
                        <span className="text-muted">Image:</span>
                        {order.sides.back.designImageUrl ? <Image src={order.sides.back.designImageUrl} alt="Back design" width={64} height={64} className="w-16 h-16 object-contain border rounded" /> : '—'}
                      </div>
                    )}
                  </>
                )}
              </Card>
            </div>
          </div>
        )}
        <div className="grid gap-3 text-sm md:grid-cols-2">
          <div><span className="text-muted">Base Color:</span> {order.baseColor || order.baseShirt.color}</div>
          <div><span className="text-muted">Placement:</span> {order.placement ? order.placement.replace(/_/g,' ') : (order.legacyPlacements?.[0]?.label || order.legacyPlacements?.[0]?.placementKey || '—')}</div>
          <div><span className="text-muted">Vertical Position:</span> {order.verticalPosition ? order.verticalPosition.replace(/_/g,' ') : '—'}</div>
          <div><span className="text-muted">Design Type:</span> {order.designType || order.designAssets[0]?.type || '—'}</div>
          {(order.designType === 'text' || order.designAssets[0]?.type === 'text') && (
            <>
              <div className="md:col-span-2"><span className="text-muted">Text:</span> {order.designText || order.designAssets[0]?.text || '—'}</div>
              <div><span className="text-muted">Font:</span> {order.designFont || order.designAssets[0]?.font || '—'}</div>
              <div className="flex items-center gap-2"><span className="text-muted">Color:</span> <span className="inline-block w-5 h-5 rounded border" style={{ backgroundColor: order.designColor || order.designAssets[0]?.color || '#000' }} /></div>
            </>
          )}
          {(order.designType === 'image' || order.designAssets[0]?.type === 'image') && (
            <div className="md:col-span-2 flex items-center gap-3">
              <span className="text-muted">Image:</span>
              {order.designImageUrl || order.designAssets[0]?.imageUrl ? <Image src={(order.designImageUrl || order.designAssets[0]?.imageUrl)!} alt="Design" width={96} height={96} className="w-24 h-24 object-contain border rounded" /> : '—'}
            </div>
          )}
        </div>
      </Card>

      {Array.isArray(order.placements) && order.placements.length > 0 && (order.placements[0] as { area?: string }).area && (
        <Card className="p-6 space-y-4">
          <h2 className="text-lg md:text-xl font-semibold">Placements (Advanced)</h2>
          <div className="space-y-3">
            {order.placements.map((p: { id?: string; area?: string; verticalPosition?: string; designType?: string; designText?: string | null; designFont?: string | null; designColor?: string | null; designImageUrl?: string | null }) => p && p.area ? (
              <div key={p.id || p.area} className="border border-muted rounded p-3 text-xs grid gap-2 sm:grid-cols-2 lg:grid-cols-6 items-start">
                <div className="font-medium md:col-span-1">{p.area.replace(/_/g,' ')}</div>
                <div className="md:col-span-1">{p.verticalPosition}</div>
                <div className="md:col-span-1">{p.designType}</div>
                {p.designType==='text' ? (
                  <div className="md:col-span-3 flex flex-col gap-1">
                    <span className="truncate">{p.designText || '—'}</span>
                    <span className="text-[10px] text-muted">Font: {p.designFont || '—'}</span>
                    <span className="flex items-center gap-1 text-[10px]">Color: <span className="inline-block w-4 h-4 rounded border" style={{ backgroundColor: p.designColor || '#000' }} /></span>
                  </div>
                ) : (
                  <div className="md:col-span-3 flex items-center gap-2">
                    {p.designImageUrl ? <Image src={p.designImageUrl} alt="Design" width={64} height={64} className="w-16 h-16 object-contain border rounded" /> : '—'}
                  </div>
                )}
              </div>
            ) : null)}
          </div>
        </Card>
      )}

      {order.legacyPlacements && order.legacyPlacements.length > 0 && (
        <Card className="p-6 space-y-4">
          <h2 className="text-lg md:text-xl font-semibold">Legacy Placements</h2>
          <div className="flex gap-2 flex-wrap">
            {order.legacyPlacements.map((p, i) => (
              <span key={i} className="soft-3d px-4 py-2 rounded-full text-sm">
                {p.label}
              </span>
            ))}
          </div>
        </Card>
      )}

      {order.designAssets.length > 0 && (
        <Card className="p-6 space-y-4">
          <h2 className="text-lg md:text-xl font-semibold">Design Assets</h2>
          <div className="space-y-4">
            {order.designAssets.map((asset, i) => (
              <div key={i} className="border border-muted rounded-lg p-4 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-medium">
                    {order.legacyPlacements.find((p) => p.placementKey === asset.placementKey)?.label || asset.placementKey}
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
          <h2 className="text-lg md:text-xl font-semibold">Customer Notes</h2>
          <p className="text-sm whitespace-pre-wrap">{order.notes}</p>
        </Card>
      )}

      <Card className="p-6 space-y-4">
        <h2 className="text-lg md:text-xl font-semibold">Delivery Information</h2>
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
          <h2 className="text-lg md:text-xl font-semibold">Status History</h2>
          <div className="space-y-2">
            {order.statusHistory.map((entry, i) => (
              <div key={i} className="text-sm flex flex-col gap-1 border-b border-muted pb-2 sm:flex-row sm:items-center sm:justify-between">
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
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <span>Order Created:</span>
          <span>{new Date(order.createdAt).toLocaleString()}</span>
        </div>
        <div className="mt-2 flex flex-col gap-2 sm:mt-0 sm:flex-row sm:items-center sm:justify-between">
          <span>Last Updated:</span>
          <span>{new Date(order.updatedAt).toLocaleString()}</span>
        </div>
      </Card>
    </div>
  );
}
