"use client";
import { useEffect, useMemo, useState } from "react";
import { Shirt, Filter } from "lucide-react";
import { useSearchParams, useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { Heart } from "lucide-react";
import { useWishlist } from "@/components/WishlistProvider";
import { Card } from "@/components/ui/Card";
import { Select } from "@/components/ui/Select";
import { Button } from "@/components/ui/Button";
import { fadeInUp, staggerChildren } from "@/lib/motion";

interface ProductListItem {
  id: string;
  name: string;
  slug: string;
  basePrice: number;
  category: string;
  salesCount: number;
  primaryImage?: { url: string; alt: string; isPrimary: boolean };
  colors?: string[];
  sizes?: string[];
  ratingAverage?: number;
  ratingCount?: number;
  displayOrder?: number | null;
}

interface ProductListResponse {
  products: ProductListItem[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

const pageSizeOptions = [12, 24, 36];
const sortOptions = [
  { value: "newest", label: "Newest" },
  { value: "price_asc", label: "Price: Low to High" },
  { value: "price_desc", label: "Price: High to Low" },
  { value: "best_selling", label: "Best Selling" },
];

export default function ProductsClient() {
  const router = useRouter();
  const params = useSearchParams();
  const [data, setData] = useState<ProductListResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [addingId, setAddingId] = useState<string | null>(null);
  const [addedIds, setAddedIds] = useState<Set<string>>(new Set());
  const { productIds, toggleWishlist } = useWishlist();

  const query = useMemo(() => {
    const q = new URLSearchParams(params.toString());
    if (!q.get("page")) q.set("page", "1");
    if (!q.get("pageSize")) q.set("pageSize", "12");
    if (!q.get("sort")) q.set("sort", "newest");
    return q;
  }, [params]);

  useEffect(() => {
    let cancelled = false;
    const run = async () => {
      // Defer to next microtask to avoid synchronous state update inside effect
      await Promise.resolve();
      if (cancelled) return;
      setLoading(true);
      try {
        const r = await fetch(`/api/products?${query.toString()}`);
        const json = await r.json();
        if (cancelled) return;
        setData(json);
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    run();
    return () => {
      cancelled = true;
    };
  }, [query]);

  function setParam(key: string, value?: string) {
    const q = new URLSearchParams(query.toString());
    if (value) q.set(key, value);
    else q.delete(key);
    q.set("page", "1"); // reset page when filters change
    router.push(`/products?${q.toString()}`);
  }

  function goToPage(page: number) {
    const q = new URLSearchParams(query.toString());
    q.set("page", String(page));
    router.push(`/products?${q.toString()}`);
  }

  async function quickAddToCart(p: ProductListItem) {
    if (addingId) return; // prevent parallel adds
    const size = (p.sizes && p.sizes[0]) || "Default";
    const color = (p.colors && p.colors[0]) || "Default";
    setAddingId(p.id);
    try {
      const res = await fetch("/api/cart", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ productId: p.id, size, color, quantity: 1 }),
      });
      if (res.status === 401) {
        router.push("/login");
        return;
      }
      if (!res.ok) {
        // failure: silently ignore; could surface toast later
        return;
      }
      setAddedIds(prev => {
        const next = new Set(prev);
        next.add(p.id);
        return next;
      });
      window.dispatchEvent(new CustomEvent('cart:updated', { detail: { type: 'optimistic-add', productId: p.id, size, color, quantity: 1 } }));
      // revert "Added!" label after short delay
      setTimeout(() => {
        setAddedIds(prev => {
          const next = new Set(prev);
          next.delete(p.id);
          return next;
        });
      }, 1500);
    } finally {
      setAddingId(null);
    }
  }

  return (
    <div className="py-10 space-y-6 max-w-7xl mx-auto">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div className="flex items-center gap-2">
          <Shirt className="h-5 w-5 text-muted-foreground" />
          <h1 className="text-2xl font-semibold tracking-tight">Products</h1>
        </div>
        <div className="text-xs text-muted-foreground">Browse catalog & filter styles</div>
      </div>
      <Card variant="glass" className="p-4 space-y-4">
        <div className="flex flex-col md:flex-row md:items-end gap-4">
          <div className="flex gap-2 flex-1 items-end">
            <div className="flex flex-1 gap-2">
              <Select value={params.get("category") || ""} onChange={(e) => setParam("category", e.currentTarget.value || undefined)}>
                <option value="">All categories</option>
                <option value="minimal">Minimal</option>
                <option value="anime">Anime</option>
                <option value="typography">Typography</option>
                <option value="abstract">Abstract</option>
              </Select>
              <Select value={params.get("color") || ""} onChange={(e) => setParam("color", e.currentTarget.value || undefined)}>
                <option value="">All colors</option>
                <option value="black">Black</option>
                <option value="white">White</option>
                <option value="other">Other</option>
              </Select>
              <Select value={params.get("size") || ""} onChange={(e) => setParam("size", e.currentTarget.value || undefined)}>
                <option value="">All sizes</option>
                <option value="S">S</option>
                <option value="M">M</option>
                <option value="L">L</option>
                <option value="XL">XL</option>
              </Select>
            </div>
            <div className="flex gap-2">
              <Select value={params.get("sort") || "newest"} onChange={(e) => setParam("sort", e.currentTarget.value)}>
                {sortOptions.map((o) => (
                  <option key={o.value} value={o.value}>{o.label}</option>
                ))}
              </Select>
              <Select value={params.get("pageSize") || "12"} onChange={(e) => setParam("pageSize", e.currentTarget.value)}>
                {pageSizeOptions.map((n) => (
                  <option key={n} value={n}>{n} / page</option>
                ))}
              </Select>
            </div>
          </div>
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <Filter className="h-4 w-4" />
            <span>Adjust filters to refine results</span>
          </div>
        </div>
      </Card>

      {loading && <div className="text-center py-12 text-muted">Loading products...</div>}
      {!loading && data && (
        <>
          <motion.div 
            className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4"
            initial="hidden"
            animate="show"
            variants={staggerChildren}
          >
            {data.products.map((p) => (
              <motion.a key={p.id} href={`/products/${p.slug}`} variants={fadeInUp}>
                <Card interactive className="overflow-hidden group relative">
                  <div className="aspect-square bg-muted">
                    {p.primaryImage ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={p.primaryImage.url} alt={p.primaryImage.alt} className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105" />
                    ) : null}
                  </div>
                  {/* Wishlist heart */}
                  <button
                    type="button"
                    onClick={(e) => { e.preventDefault(); e.stopPropagation(); toggleWishlist(p.id); }}
                    aria-label={productIds.has(p.id) ? `Remove ${p.name} from wishlist` : `Add ${p.name} to wishlist`}
                    className="absolute top-2 right-2 rounded-full backdrop-blur bg-black/40 text-white p-2 transition-all duration-200 hover:scale-110 focus:outline-none focus:ring-2 ring-white/50"
                  >
                    <Heart className={`h-4 w-4 ${productIds.has(p.id) ? 'fill-red-500 text-red-500' : 'text-white'}`} />
                  </button>
                  <div className="p-3 space-y-1">
                    <div className="font-medium line-clamp-1" title={p.name}>{p.name}</div>
                    {/* Rating display */}
                    {p.ratingAverage != null && p.ratingCount != null && p.ratingCount > 0 ? (
                      <div className="flex items-center gap-1 text-xs text-yellow-500" aria-label={`Rating ${p.ratingAverage} out of 5`}>
                        {Array.from({ length: 5 }).map((_, i) => {
                          const ratingValue = p.ratingAverage ?? 0; // ensure number for Math.round
                          return <span key={i}>{i < Math.round(ratingValue) ? '★' : '☆'}</span>;
                        })}
                        <span className="text-muted ml-1">{(p.ratingAverage ?? 0).toFixed(1)} ({p.ratingCount})</span>
                      </div>
                    ) : (
                      <div className="flex items-center gap-1 text-xs text-muted" aria-label="No ratings yet">
                        {Array.from({ length: 5 }).map((_, i) => (
                          <span key={i} className="text-yellow-500">☆</span>
                        ))}
                        <span className="ml-1">No ratings yet</span>
                      </div>
                    )}
                    {/* Price */}
                    <div className="text-sm font-semibold">${p.basePrice.toFixed(2)}</div>
                    {/* Hover Add to Cart button (desktop), always visible on mobile */}
                    <div className="pt-1 min-h-9">
                      <button
                        onClick={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          quickAddToCart(p);
                        }}
                        aria-label={`Add ${p.name} to cart`}
                        className="w-full text-xs rounded bg-black text-white px-3 py-2 transition-all duration-200 opacity-100 md:opacity-0 md:translate-y-1 md:pointer-events-none md:group-hover:opacity-100 md:group-hover:translate-y-0 md:group-hover:pointer-events-auto hover:shadow-md active:shadow-sm disabled:opacity-50"
                        disabled={addingId === p.id}
                      >
                        {addedIds.has(p.id) ? 'Added!' : (addingId === p.id ? 'Adding…' : 'Add to Cart')}
                      </button>
                    </div>
                  </div>
                </Card>
              </motion.a>
            ))}
          </motion.div>

          <div className="flex items-center justify-center gap-3 pt-6">
            <Button variant="secondary" disabled={data.page <= 1} onClick={() => goToPage(data.page - 1)}>Prev</Button>
            <div className="text-sm">Page {data.page} of {data.totalPages}</div>
            <Button variant="secondary" disabled={data.page >= data.totalPages} onClick={() => goToPage(data.page + 1)}>Next</Button>
          </div>
        </>
      )}
    </div>
  );
}
