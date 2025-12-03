"use client";
import { Stepper } from '@/components/ui/Stepper';
import React, { useMemo } from 'react';

// Unified view props for both standard and custom admin/user order views
export interface OrderDetailViewProps {
  status: string;
  createdAt: string;
  updatedAt?: string;
  items?: { name: string; size: string; color: string; quantity: number; unitPrice: number }[];
  subtotal?: number;
  totalAmount: number;
  deliveryAddress?: string;
  phone?: string;
  email?: string;
  isCustomOrder?: boolean;
  customDesign?: {
    previewImageUrl?: string | null;
    designType?: string | null;
    designText?: string | null;
    designColor?: string | null;
    designImageUrl?: string | null;
    quantity?: number;
  } | null;
}

const STANDARD_FLOW = ["Pending","Accepted","In Printing","Out for Delivery","Delivered"];
const CUSTOM_FLOW = ["PENDING_REVIEW","APPROVED","IN_DESIGN","IN_PRINTING","READY_FOR_PICKUP","OUT_FOR_DELIVERY","DELIVERED"];

export function OrderDetailView({ status, createdAt, items, subtotal, totalAmount, deliveryAddress, phone, email, isCustomOrder, customDesign }: OrderDetailViewProps) {
  const flow = isCustomOrder ? CUSTOM_FLOW : STANDARD_FLOW;
  const activeIndex = useMemo(() => {
    const idx = flow.indexOf(status);
    return idx === -1 ? 0 : idx;
  }, [flow, status]);
  const steps = useMemo(() => flow.map((s, i): { key: string; label: string; status: 'completed' | 'current' | 'upcoming' } => ({
    key: s,
    label: s,
    status: i < activeIndex ? 'completed' : i === activeIndex ? 'current' : 'upcoming'
  })), [flow, activeIndex]);

  return (
    <div className="space-y-6">
      <div className="bg-[--surface] border border-muted rounded p-4 space-y-3">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <div className="text-xs text-muted-foreground">Placed</div>
            <div className="text-xs">{new Date(createdAt).toLocaleString()}</div>
          </div>
          <div className="text-sm font-semibold">Status: {status}</div>
        </div>
        <div className="mt-4">
          <Stepper steps={steps} />
        </div>
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-2">
          {items?.map((it, idx) => (
            <div
              key={idx}
              className="border rounded p-3 bg-[--surface-alt] space-y-3 sm:space-y-0 sm:flex sm:items-center sm:justify-between"
            >
              <div>
                <div className="font-medium truncate max-w-[220px]" title={it.name}>{it.name}</div>
                <div className="text-[11px] text-muted-foreground">Size: {it.size} • Color: {it.color}</div>
              </div>
              <div className="text-xs text-muted-foreground sm:text-right">
                <span className="font-semibold text-foreground">${it.unitPrice.toFixed(2)}</span>
                <span className="ml-1">× {it.quantity}</span>
              </div>
            </div>
          ))}
          {customDesign && !items && (
            <div className="border rounded p-4 bg-[--surface-alt] space-y-2">
              <div className="text-sm font-medium">Custom Order</div>
              <div className="text-[11px] text-muted-foreground">Quantity: {customDesign.quantity ?? '—'}</div>
              <div className="text-[11px] text-muted-foreground">Type: {customDesign.designType || '—'}</div>
              {customDesign.designText && <div className="text-[11px]">Text: {customDesign.designText}</div>}
              {customDesign.designColor && <div className="text-[11px]">Color: {customDesign.designColor}</div>}
              {customDesign.designImageUrl && (
                <div>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={customDesign.designImageUrl} alt="Design" className="w-full max-w-xs rounded object-cover" />
                </div>
              )}
              {customDesign.previewImageUrl && (
                <div>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={customDesign.previewImageUrl} alt="Preview" className="w-full max-w-xs rounded object-cover" />
                </div>
              )}
            </div>
          )}
        </div>
        <div className="space-y-4">
          <div className="bg-[--surface] border border-muted rounded p-4 space-y-2">
            <h2 className="text-sm font-semibold">Summary</h2>
            {typeof subtotal === 'number' && (
              <div className="flex items-center justify-between text-xs">
                <span>Subtotal</span>
                <span>${subtotal.toFixed(2)}</span>
              </div>
            )}
            <div className="flex items-center justify-between font-medium text-sm">
              <span>Total</span>
              <span>${totalAmount.toFixed(2)}</span>
            </div>
          </div>
          <div className="bg-[--surface] border border-muted rounded p-4 space-y-1 text-xs">
            <h2 className="text-sm font-semibold mb-1">Delivery</h2>
            {deliveryAddress && <div className="whitespace-pre-line">{deliveryAddress}</div>}
            {phone && <div>Phone: {phone}</div>}
            {email && <div>Email: {email}</div>}
          </div>
        </div>
      </div>
    </div>
  );
}
