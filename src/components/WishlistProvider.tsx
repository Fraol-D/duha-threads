"use client";
import { createContext, useContext, useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";

interface WishlistProduct {
  id: string;
  name: string;
  slug: string;
  basePrice: number;
  description?: string;
  images: { url: string; alt: string; isPrimary?: boolean }[];
  primaryImage: { url: string; alt: string; isPrimary?: boolean } | null;
  colors?: string[];
  sizes?: string[];
  ratingAverage?: number | null;
  ratingCount?: number | null;
}

interface WishlistItem {
  _id: string;
  productId: string;
  product: WishlistProduct | null;
}

interface WishlistContextValue {
  items: WishlistItem[];
  productIds: Set<string>;
  count: number;
  loading: boolean;
  addToWishlist: (productId: string) => Promise<void>;
  removeFromWishlist: (productId: string) => Promise<void>;
  toggleWishlist: (productId: string) => Promise<void>;
  refresh: () => Promise<void>;
  reset: () => void;
}

const WishlistContext = createContext<WishlistContextValue | undefined>(undefined);

export function WishlistProvider({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const [items, setItems] = useState<WishlistItem[]>([]);
  const [loading, setLoading] = useState(true);

  const productIds = new Set(items.map(i => i.productId));
  const count = items.length;

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/wishlist", { cache: "no-store" });
      if (res.status === 401) {
        setItems([]);
        return;
      }
      if (!res.ok) return; // silent fail
      const json = await res.json();
      setItems(json.items || []);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
    const handler = (e: Event) => {
      const detail = (e as CustomEvent).detail as { productId?: string; type?: string } | undefined;
      if (detail?.type === 'optimistic-add' && typeof detail.productId === 'string') {
        const productId = detail.productId;
        // Optimistic add
        setItems(prev => prev.some(i => i.productId === productId)
          ? prev
          : [...prev, { _id: `optim-${productId}`, productId, product: null }]);
      } else if (detail?.type === 'optimistic-remove' && detail.productId) {
        setItems(prev => prev.filter(i => i.productId !== detail.productId));
      } else if (detail?.type === 'reset') {
        setItems([]);
      } else {
        load();
      }
    };
    const authHandler = (e: Event) => {
      const detail = (e as CustomEvent).detail as { state?: 'login'|'logout' } | undefined;
      if (detail?.state === 'login') load();
      if (detail?.state === 'logout') setItems([]);
    };
    window.addEventListener("wishlist:updated", handler);
    window.addEventListener("auth:state", authHandler);
    return () => {
      window.removeEventListener("wishlist:updated", handler);
      window.removeEventListener("auth:state", authHandler);
    };
  }, [load]);

  async function addToWishlist(productId: string) {
    if (productIds.has(productId)) return; // already
    // Optimistic add
    window.dispatchEvent(new CustomEvent("wishlist:updated", { detail: { type: 'optimistic-add', productId } }));
    const res = await fetch("/api/wishlist", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ productId }),
    });
    if (res.status === 401) {
      // rollback on auth failure
      window.dispatchEvent(new CustomEvent("wishlist:updated", { detail: { type: 'optimistic-remove', productId } }));
      router.push("/login");
      return;
    }
    if (!res.ok) {
      // rollback on API fail
      window.dispatchEvent(new CustomEvent("wishlist:updated", { detail: { type: 'optimistic-remove', productId } }));
      return;
    }
    // final refresh to sync real data
    window.dispatchEvent(new CustomEvent("wishlist:updated"));
  }

  async function removeFromWishlist(productId: string) {
    if (!productIds.has(productId)) return;
    // Optimistic remove
    window.dispatchEvent(new CustomEvent("wishlist:updated", { detail: { type: 'optimistic-remove', productId } }));
    const res = await fetch("/api/wishlist", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ productId }),
    });
    if (res.status === 401) {
      // rollback not needed (already removed locally) but refresh after redirect maybe
      router.push("/login");
      return;
    }
    if (!res.ok) {
      // rollback by reloading server state
      window.dispatchEvent(new CustomEvent("wishlist:updated"));
      return;
    }
    window.dispatchEvent(new CustomEvent("wishlist:updated"));
  }

  async function toggleWishlist(productId: string) {
    if (productIds.has(productId)) {
      await removeFromWishlist(productId);
    } else {
      await addToWishlist(productId);
    }
  }

  const refresh = load;
  const reset = () => setItems([]);

  return (
    <WishlistContext.Provider value={{ items, productIds, count, loading, addToWishlist, removeFromWishlist, toggleWishlist, refresh, reset }}>
      {children}
    </WishlistContext.Provider>
  );
}

export function useWishlist() {
  const ctx = useContext(WishlistContext);
  if (!ctx) throw new Error("useWishlist must be used within WishlistProvider");
  return ctx;
}