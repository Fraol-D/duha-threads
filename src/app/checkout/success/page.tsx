"use client";

import { Suspense } from "react";

import { MascotSlot } from "@/components/ui/MascotSlot";
import Link from "next/link";
import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";

function CheckoutSuccessContent() {
  const searchParams = useSearchParams();
  const [verifying, setVerifying] = useState(false);
  const [verified, setVerified] = useState(false);

  useEffect(() => {
    const sessionId = searchParams.get('session_id');
    
    if (sessionId && !verified) {
      setVerifying(true);
      // Verify Stripe payment
      fetch('/api/stripe/verify-session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sessionId }),
      })
        .then(res => res.json())
        .then((data) => {
          console.log('[Success Page] Payment verified:', data);
          setVerified(true);
        })
        .catch(err => {
          console.error('[Success Page] Payment verification error:', err);
          setVerified(true); // Still show success page even if verification fails
        })
        .finally(() => setVerifying(false));
    }
  }, [searchParams, verified]);

  return (
    <div className="py-24 text-center space-y-4">
      <h1 className="text-2xl font-semibold">Order placed successfully</h1>
      {verifying && <p className="text-muted text-sm">Verifying payment...</p>}
      <p className="text-muted">Thank you for your purchase. You can track your order in Orders.</p>
      <div className="max-w-sm mx-auto"><MascotSlot variant="orderSuccess" /></div>
      <div className="space-x-3">
        <Link href="/orders" className="underline">View Orders</Link>
        <Link href="/products" className="underline">Continue Shopping</Link>
      </div>
    </div>
  );
}

export default function CheckoutSuccessPage() {
  return (
    <Suspense>
      <CheckoutSuccessContent />
    </Suspense>
  );
}
