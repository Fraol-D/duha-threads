"use client";
import { useEffect, useState, useCallback } from "react";
import { Package, Brush, ArrowRight, Layers } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Card } from "@/components/ui/Card";
import { MascotState } from "@/components/ui/MascotState";

type CountResponse = { orders?: unknown[]; customOrders?: unknown[] };

export default function MyOrdersHubPage() {
  const router = useRouter();
  const [authChecked, setAuthChecked] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [standardCount, setStandardCount] = useState<number>(0);
  const [customCount, setCustomCount] = useState<number>(0);

  // Auth guard (client-side)
  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const res = await fetch("/api/user/me", { cache: "no-store" });
        if (!active) return;
        if (res.status === 401) {
          router.replace("/login");
          return;
        }
      } catch {
        // If error, still attempt orders fetch; fallback behavior
      } finally {
        if (active) setAuthChecked(true);
      }
    })();
    return () => { active = false; };
  }, [router]);

  const loadCounts = useCallback(async () => {
    setLoading(true); setError(null);
    try {
      const [standardRes, customRes] = await Promise.all([
        fetch("/api/orders"),
        fetch("/api/custom-orders"),
      ]);
      if (standardRes.status === 401 || customRes.status === 401) { router.replace("/login"); return; }
      if (!standardRes.ok) throw new Error("Failed to load standard orders count");
      if (!customRes.ok) throw new Error("Failed to load custom orders count");
      const standardJson: CountResponse = await standardRes.json();
      const customJson: CountResponse = await customRes.json();
      setStandardCount(Array.isArray(standardJson.orders) ? standardJson.orders.length : 0);
      const customArray = Array.isArray(customJson.orders) ? customJson.orders : Array.isArray(customJson.customOrders) ? customJson.customOrders : [];
      setCustomCount(customArray.length);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Failed to load counts");
    } finally { setLoading(false); }
  }, [router]);

  useEffect(() => { if (authChecked) loadCounts(); }, [authChecked, loadCounts]);

  if (!authChecked || loading) {
    return (
      <div className="py-10">
        <MascotState variant="loading" message="Loading your orders overview" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="py-10">
        <MascotState
          variant="error"
          message={error}
          actionLabel="Retry"
          onActionClick={loadCounts}
        />
      </div>
    );
  }

  const totalOrders = standardCount + customCount;
  if (totalOrders === 0) {
    return (
      <div className="py-10">
        <MascotState
          variant="empty"
          message="You haven't placed any standard or custom orders yet."
          actionLabel="Browse products"
          onActionClick={() => router.push("/products")}
        />
      </div>
    );
  }

  return (
    <div className="py-10">
      <div className="mx-auto max-w-4xl space-y-8">
        <header className="space-y-2">
          <h1 className="text-3xl font-semibold tracking-tight">My orders</h1>
          <p className="text-sm text-muted-foreground max-w-prose">View your standard and custom T-shirt orders in one place. Use the options below to see full lists and details.</p>
        </header>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <Card className="p-5 flex items-start gap-3">
            <div className="p-2 rounded-md bg-[--surface-alt]"><Package className="h-5 w-5" /></div>
            <div className="flex-1">
              <div className="text-xs uppercase tracking-wide text-muted-foreground">Standard</div>
              <div className="text-2xl font-semibold mt-1">{loading ? '…' : standardCount}</div>
              <div className="text-[11px] text-muted-foreground mt-1">Catalog product orders</div>
            </div>
          </Card>
          <Card className="p-5 flex items-start gap-3">
            <div className="p-2 rounded-md bg-[--surface-alt]"><Brush className="h-5 w-5" /></div>
            <div className="flex-1">
              <div className="text-xs uppercase tracking-wide text-muted-foreground">Custom</div>
              <div className="text-2xl font-semibold mt-1">{loading ? '…' : customCount}</div>
              <div className="text-[11px] text-muted-foreground mt-1">Designed with builder</div>
            </div>
          </Card>
          <Card className="p-5 flex items-start gap-3 lg:block">
            <div className="p-2 rounded-md bg-[--surface-alt]"><Layers className="h-5 w-5" /></div>
            <div className="flex-1">
              <div className="text-xs uppercase tracking-wide text-muted-foreground">Total</div>
              <div className="text-2xl font-semibold mt-1">{loading ? '…' : (standardCount + customCount)}</div>
              <div className="text-[11px] text-muted-foreground mt-1">All orders combined</div>
            </div>
          </Card>
        </div>
        <div className="grid gap-4 md:grid-cols-2">
          <Link href="/orders" className="group">
            <Card className="p-6 h-full flex flex-col justify-between hover:ring-2 ring-token transition">
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <Package className="h-5 w-5 text-muted-foreground group-hover:text-foreground" />
                  <h2 className="text-base font-medium">Standard orders</h2>
                </div>
                <p className="text-xs text-muted-foreground">Browse all catalog product orders.</p>
              </div>
              <div className="mt-4 inline-flex items-center gap-1 text-sm font-medium text-[--accent] group-hover:underline">
                View standard orders <ArrowRight className="h-4 w-4" />
              </div>
            </Card>
          </Link>
          <Link href="/my-custom-orders" className="group">
            <Card className="p-6 h-full flex flex-col justify-between hover:ring-2 ring-token transition">
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <Brush className="h-5 w-5 text-muted-foreground group-hover:text-foreground" />
                  <h2 className="text-base font-medium">Custom orders</h2>
                </div>
                <p className="text-xs text-muted-foreground">Track your personalized design orders.</p>
              </div>
              <div className="mt-4 inline-flex items-center gap-1 text-sm font-medium text-[--accent] group-hover:underline">
                View custom orders <ArrowRight className="h-4 w-4" />
              </div>
            </Card>
          </Link>
        </div>
        <p className="text-[11px] text-muted-foreground">Need help? Contact support from any order detail page.</p>
      </div>
    </div>
  );
}
