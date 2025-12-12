"use client";
import Image from 'next/image';
import { Stepper } from '@/components/ui/Stepper';
import React, { useMemo } from 'react';

interface UserOrderDetailProps {
  orderNumber?: string;
  id: string;
  status: string;
  createdAt: string;
  items: {
    name: string;
    size?: string | null;
    color?: string | null;
    quantity: number;
    unitPrice: number;
    imageUrl?: string | null;
    subtotal: number;
  }[];
  subtotal: number;
  totalAmount: number;
  currency: string;
  deliveryInfo?: { name?: string; phone?: string; address?: string; notes?: string };
  isCustomOrder?: boolean;
  customPreviewImageUrl?: string | null;
}

const STANDARD_FLOW = ["Pending","Accepted","In Printing","Out for Delivery","Delivered","PENDING","CONFIRMED","SHIPPED","COMPLETED","CANCELED"];

const STATUS_COLORS: Record<string, string> = {
  Pending: 'bg-gray-200 text-gray-700',
  Accepted: 'bg-blue-200 text-blue-700',
  'In Printing': 'bg-orange-200 text-orange-700',
  'Out for Delivery': 'bg-purple-200 text-purple-700',
  Delivered: 'bg-green-200 text-green-700',
  Cancelled: 'bg-red-200 text-red-700',
  PENDING: 'bg-gray-200 text-gray-700',
  CONFIRMED: 'bg-blue-200 text-blue-700',
  SHIPPED: 'bg-purple-200 text-purple-700',
  COMPLETED: 'bg-green-200 text-green-700',
  CANCELED: 'bg-red-200 text-red-700'
};

export function UserOrderDetail({ orderNumber, id, status, createdAt, items, subtotal, totalAmount, currency, deliveryInfo, isCustomOrder, customPreviewImageUrl }: UserOrderDetailProps) {
  const primary = items[0];
  const additionalCount = items.length > 1 ? items.length - 1 : 0;
  const statusColor = STATUS_COLORS[status] || 'bg-gray-200 text-gray-700';
  const displayNumber = orderNumber || id.slice(-6);

  const flow = useMemo(() => {
    // Use a condensed flow for new statuses if present
    if (["PENDING","CONFIRMED","SHIPPED","COMPLETED","CANCELED"].includes(status)) {
      return ["PENDING","CONFIRMED","SHIPPED","COMPLETED","CANCELED"];
    }
    return ["Pending","Accepted","In Printing","Out for Delivery","Delivered","Cancelled"];
  }, [status]);
  const activeIndex = useMemo(() => {
    const idx = flow.indexOf(status);
    return idx === -1 ? 0 : idx;
  }, [flow, status]);
  type StepStatus = 'completed' | 'current' | 'upcoming';
  const steps = useMemo<Array<{ key: string; label: string; status: StepStatus }>>(() => flow.map((s, i) => ({
    key: s,
    label: s.replace(/_/g,' '),
    status: (i < activeIndex ? 'completed' : i === activeIndex ? 'current' : 'upcoming') as StepStatus,
  })), [flow, activeIndex]);

  const formattedDate = useMemo(() => {
    try { return new Date(createdAt).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' }); } catch { return createdAt; }
  }, [createdAt]);

  return (
    <div className="mx-auto max-w-4xl space-y-8">
      {/* Header */}
      <div className="flex flex-col gap-1">
        <p className="text-xs uppercase tracking-wide text-muted-foreground">Order</p>
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-2">
          <h1 className="text-2xl font-semibold tracking-tight">Order {displayNumber}</h1>
          <div className="text-xs text-muted-foreground">Placed on {formattedDate}</div>
        </div>
      </div>

      {/* Status Card */}
      <div className="bg-[--surface] border border-muted rounded p-4 space-y-4">
        <div className="flex items-center justify-between">
          <div className="space-y-1">
            <div className="text-xs font-medium text-muted-foreground">Order status</div>
            <span className={`inline-block px-3 py-1 rounded-full text-xs font-semibold ${statusColor}`}>{status.replace(/_/g,' ')}</span>
          </div>
          <div className="hidden md:block w-full max-w-md">
            <Stepper steps={steps} />
          </div>
        </div>
        <div className="md:hidden">
          <Stepper steps={steps} />
        </div>
      </div>

      {/* Summary Card */}
      <div className="bg-[--surface] border border-muted rounded p-6 flex flex-col md:flex-row gap-6">
        {/* Thumbnail */}
        <div className="w-full md:w-40 md:h-40 flex items-center justify-center bg-[--surface-alt] border rounded overflow-hidden">
          {primary?.imageUrl ? (
            <Image src={primary.imageUrl} alt={primary.name} width={160} height={160} className="object-cover w-full h-full" />
          ) : customPreviewImageUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={customPreviewImageUrl} alt="Custom design" className="object-cover w-full h-full" />
          ) : (
            <div className="text-xs text-muted-foreground">No Image</div>
          )}
        </div>
        {/* Details */}
        <div className="flex-1 space-y-3">
          <div>
            <div className="font-medium text-sm md:text-base truncate" title={primary?.name}>{primary?.name || 'Item'}</div>
            {primary && (
              <div className="text-xs text-muted-foreground mt-1">
                {primary.color && <>Color: {primary.color} · </>}
                {primary.size && <>Size: {primary.size} · </>}
                Qty: {primary.quantity}
              </div>
            )}
            {additionalCount > 0 && (
              <div className="text-xs text-muted-foreground mt-1">+ {additionalCount} more item{additionalCount > 1 ? 's' : ''}</div>
            )}
          </div>
          <div className="border-t pt-3 text-sm flex flex-col gap-1 max-w-sm">
            <div className="flex items-center justify-between text-xs">
              <span>Items total</span>
              <span>{currency} {subtotal.toFixed(2)}</span>
            </div>
            <div className="flex items-center justify-between font-semibold">
              <span>Total paid</span>
              <span>{currency} {totalAmount.toFixed(2)}</span>
            </div>
          </div>
        </div>
      </div>

      <div className="text-[11px] text-muted-foreground">
        Reference ID: <code className="font-mono text-[11px]">{id}</code>
      </div>

      {/* Delivery Info */}
      {(deliveryInfo?.address || deliveryInfo?.phone || deliveryInfo?.notes) && (
        <div className="bg-[--surface] border border-muted rounded p-5 space-y-2">
          <h2 className="text-sm font-semibold">Delivery</h2>
          {deliveryInfo.address && <div className="text-xs whitespace-pre-line">{deliveryInfo.address}</div>}
          {deliveryInfo.phone && <div className="text-xs">Phone: {deliveryInfo.phone}</div>}
          {deliveryInfo.notes && <div className="text-xs text-muted-foreground">Notes: {deliveryInfo.notes}</div>}
        </div>
      )}
    </div>
  );
}