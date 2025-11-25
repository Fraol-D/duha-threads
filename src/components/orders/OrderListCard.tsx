"use client";
import Link from "next/link";
import Image from "next/image";
import { Card } from "@/components/ui/Card";
import { getOrderStatusClasses, normalizeStatusLabel } from "@/lib/orderStatusStyles";

export type OrderListCardProps = {
  id: string; // orderNumber or _id used for navigation
  type: "standard" | "custom";
  createdAt?: string | Date;
  status?: string;
  title: string;
  subtitle?: string;
  thumbnailUrl?: string | null;
  totalAmount?: number;
};

function formatDate(d?: string | Date) {
  if (!d) return "";
  const date = typeof d === "string" ? new Date(d) : d;
  if (Number.isNaN(date.getTime())) return "";
  return date.toLocaleDateString();
}

// Deprecated local mapping replaced by centralized helper

export function OrderListCard(props: OrderListCardProps) {
  const {
    id,
    type,
    createdAt,
    status,
    title,
    subtitle,
    thumbnailUrl,
    totalAmount,
  } = props;

  // Route: standard -> /orders/[id]; custom -> /custom-order/confirmation/[id] (preserve dedicated confirmation UI)
  const href = type === "standard" ? `/orders/${id}` : `/custom-order/confirmation/${id}`;

  return (
    <Link href={href} className="block focus:outline-none focus:ring-2 focus:ring-foreground/40 rounded-xl">
      <Card variant="glass" className="p-4 space-y-3 hover:ring-2 ring-token transition cursor-pointer">
        <div className="flex justify-between items-center text-xs">
          <div className="text-muted">{formatDate(createdAt)}</div>
          <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-medium ${getOrderStatusClasses(status)}`}>{normalizeStatusLabel(status)}</span>
        </div>
        <div className="flex gap-3 flex-col xs:flex-row">
          {thumbnailUrl ? (
            <Image src={thumbnailUrl} alt={title} width={96} height={128} className="w-24 h-32 object-cover rounded border self-start" />
          ) : (
            <div className="w-24 h-32 flex items-center justify-center text-[11px] text-muted bg-[--surface] rounded border self-start">No Preview</div>
          )}
          <div className="flex-1 space-y-1 text-sm">
            <div className="font-medium leading-tight">{title}</div>
            {subtitle && <div className="text-muted-foreground text-xs leading-tight">{subtitle}</div>}
            {typeof totalAmount === "number" && (
              <div className="text-xs"><span className="text-muted-foreground">Total:</span> ${totalAmount.toFixed(2)}</div>
            )}
            <div className="text-[11px] text-muted-foreground">{type === "custom" ? "Custom order" : "Standard order"}</div>
          </div>
        </div>
      </Card>
    </Link>
  );
}
