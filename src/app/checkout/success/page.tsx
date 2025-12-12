import { MascotSlot } from "@/components/ui/MascotSlot";
import Link from "next/link";

export default function CheckoutSuccessPage() {
  return (
    <div className="py-24 text-center space-y-4">
      <h1 className="text-2xl font-semibold">Order placed successfully</h1>
      <p className="text-muted">Thank you for your purchase. You can track your order in Orders.</p>
      <div className="max-w-sm mx-auto"><MascotSlot variant="orderSuccess" /></div>
      <div className="space-x-3">
        <Link href="/orders" className="underline">View Orders</Link>
        <Link href="/products" className="underline">Continue Shopping</Link>
      </div>
    </div>
  );
}
