"use client";
import { createContext, useContext, useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { signIn, useSession } from "next-auth/react";

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
  const { status } = useSession();
  const [authPromptOpen, setAuthPromptOpen] = useState(false);
  const [authPromptEmail, setAuthPromptEmail] = useState("");
  const [authPromptSending, setAuthPromptSending] = useState(false);
  const [authPromptError, setAuthPromptError] = useState<string | null>(null);
  const [authPromptSuccess, setAuthPromptSuccess] = useState<string | null>(null);

  const productIds = new Set(items.map(i => i.productId));
  const count = items.length;

  useEffect(() => {
    if (status === "authenticated" && authPromptOpen) {
      setAuthPromptOpen(false);
    }
  }, [status, authPromptOpen]);

  const load = useCallback(async () => {
    if (status !== "authenticated") {
      setItems([]);
      setLoading(false);
      return;
    }
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
  }, [status]);

  useEffect(() => {
    if (status === "loading") return;
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
  }, [load, status]);

  function requireAuth() {
    if (status === "authenticated") return true;
    setAuthPromptOpen(true);
    setAuthPromptEmail("");
    setAuthPromptError(null);
    setAuthPromptSuccess(null);
    return false;
  }

  async function addToWishlist(productId: string) {
    if (!requireAuth()) return;
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
    if (!requireAuth()) return;
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
    if (!requireAuth()) return;
    if (productIds.has(productId)) {
      await removeFromWishlist(productId);
    } else {
      await addToWishlist(productId);
    }
  }

  const refresh = load;
  const reset = () => setItems([]);

  async function handleEmailSignIn(e: React.FormEvent) {
    e.preventDefault();
    if (!authPromptEmail) {
      setAuthPromptError("Enter your email to receive a magic link.");
      return;
    }
    setAuthPromptError(null);
    setAuthPromptSuccess(null);
    setAuthPromptSending(true);
    const callbackUrl = typeof window !== "undefined" ? window.location.href : "/";
    const result = await signIn("email", { email: authPromptEmail, redirect: false, callbackUrl });
    setAuthPromptSending(false);
    if (result?.error) {
      setAuthPromptError("Unable to send magic link. Please try again.");
    } else {
      setAuthPromptSuccess("Check your inbox for a sign-in link.");
    }
  }

  function handleGoogleSignIn() {
    const callbackUrl = typeof window !== "undefined" ? window.location.href : "/";
    signIn("google", { callbackUrl });
  }

  return (
    <>
      <WishlistContext.Provider value={{ items, productIds, count, loading, addToWishlist, removeFromWishlist, toggleWishlist, refresh, reset }}>
        {children}
      </WishlistContext.Provider>
      {authPromptOpen && (
        <div className="fixed inset-0 z-60 flex items-center justify-center bg-black/60 backdrop-blur" role="dialog" aria-modal="true">
          <div className="w-full max-w-md rounded-2xl border border-white/10 bg-[--surface]/95 p-6 shadow-2xl space-y-5">
            <div className="space-y-1 text-center">
              <p className="text-xs uppercase tracking-[0.3em] text-muted-foreground">Wishlist</p>
              <h2 className="text-2xl font-semibold">Sign in to save favorites</h2>
              <p className="text-sm text-muted-foreground">Use Google or request a magic link to continue.</p>
            </div>
            <div className="space-y-3">
              <button
                type="button"
                onClick={handleGoogleSignIn}
                className="w-full inline-flex items-center justify-center rounded-lg px-4 py-3 text-sm font-medium bg-black text-white hover:opacity-90"
              >
                Continue with Google
              </button>
              <div className="text-center text-xs text-muted-foreground">or</div>
              <form className="space-y-3" onSubmit={handleEmailSignIn}>
                <input
                  type="email"
                  required
                  value={authPromptEmail}
                  onChange={(e) => setAuthPromptEmail(e.target.value)}
                  placeholder="you@example.com"
                  className="w-full rounded-lg border border-white/10 bg-white/80 px-3 py-2 text-sm text-black"
                />
                <button
                  type="submit"
                  disabled={authPromptSending}
                  className="w-full inline-flex items-center justify-center rounded-lg px-4 py-2 text-sm font-medium border border-white/30 hover:bg-white/10 disabled:opacity-50"
                >
                  {authPromptSending ? "Sending..." : "Email me a link"}
                </button>
              </form>
              {authPromptError && <p className="text-xs text-red-500 text-center">{authPromptError}</p>}
              {authPromptSuccess && <p className="text-xs text-emerald-500 text-center">{authPromptSuccess}</p>}
              <button
                type="button"
                onClick={() => setAuthPromptOpen(false)}
                className="w-full text-xs text-muted-foreground hover:text-foreground"
              >
                Maybe later
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

export function useWishlist() {
  const ctx = useContext(WishlistContext);
  if (!ctx) throw new Error("useWishlist must be used within WishlistProvider");
  return ctx;
}