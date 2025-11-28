"use client";
import { useEffect, useMemo, useState } from "react";
import { Shirt, Heart } from "lucide-react";
import { useSearchParams, useRouter } from "next/navigation";
import { motion } from "framer-motion";
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

// Fix 4: Updated labels
const colorOptions = [
  { value: "", label: "Colors" },
  { value: "black", label: "Black" },
  { value: "white", label: "White" },
  { value: "other", label: "Other" },
];

const sizeOptions = [
  { value: "", label: "Sizes" },
  { value: "S", label: "S" },
  { value: "M", label: "M" },
  { value: "L", label: "L" },
  { value: "XL", label: "XL" },
];

const pageSizeOptions = [
  { value: "12", label: "12 / page" },
  { value: "24", label: "24 / page" },
  { value: "36", label: "36 / page" },
];

const sortOptions = [
  { value: "newest", label: "Newest" },
  { value: "price_asc", label: "Price: Low to High" },
  { value: "price_desc", label: "Price: High to Low" },
  { value: "best_selling", label: "Best Selling" },
];

const categoryOptions = [
  { value: "", label: "All categories" },
  { value: "minimal", label: "Minimal" },
  { value: "anime", label: "Anime" },
  { value: "typography", label: "Typography" },
  { value: "abstract", label: "Abstract" },
];

export default function ProductsClient() {
  const router = useRouter();
  const params = useSearchParams();
  const [data, setData] = useState<ProductListResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [addingId, setAddingId] = useState<string | null>(null);
  const [addedIds, setAddedIds] = useState<Set<string>>(new Set());
  const { productIds, toggleWishlist } = useWishlist();
  const [view, setView] = useState<'grid' | 'list'>('grid');
  
  // Fix 6: Scroll detection for hiding/showing filter bar
  const [isFilterVisible, setIsFilterVisible] = useState(true);
  const [lastScrollY, setLastScrollY] = useState(0);

  useEffect(() => {
    const handleScroll = () => {
      const currentScrollY = window.scrollY;
      
      if (currentScrollY > lastScrollY && currentScrollY > 50) {
        // Scrolling down - hide filters
        setIsFilterVisible(false);
      } else if (currentScrollY < lastScrollY) {
        // Scrolling up - show filters instantly
        setIsFilterVisible(true);
      }
      
      setLastScrollY(currentScrollY);
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, [lastScrollY]);

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
    q.set("page", "1");
    router.push(`/products?${q.toString()}`);
  }

  function goToPage(page: number) {
    const q = new URLSearchParams(query.toString());
    q.set("page", String(page));
    router.push(`/products?${q.toString()}`);
  }

  async function quickAddToCart(p: ProductListItem) {
    if (addingId) return;
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
      if (!res.ok) return;
      
      setAddedIds(prev => {
        const next = new Set(prev);
        next.add(p.id);
        return next;
      });
      window.dispatchEvent(new CustomEvent('cart:updated', { detail: { type: 'optimistic-add', productId: p.id, size, color, quantity: 1 } }));
      
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
    <div className="min-h-screen pb-20">
      {/* Header & Filters - Fix 5: No border, Fix 6: Scroll hide/show */}
      <div 
        className="bg-[--surface]/80 backdrop-blur-md sticky top-16 z-30 transition-all duration-300"
        style={{
          transform: isFilterVisible ? 'translateY(0)' : 'translateY(-100%)',
          opacity: isFilterVisible ? 1 : 0
        }}
      >
        <div className="mx-auto max-w-7xl px-4 py-4 space-y-4">
          {/* Fix 3: View controller moved to top */}
          <div className="flex flex-col md:flex-row gap-4 items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-black text-white rounded-lg shadow-lg shadow-black/20">
                <Shirt className="h-5 w-5" />
              </div>
              <div>
                <h1 className="text-xl font-bold tracking-tight">All Products</h1>
                <p className="text-xs text-muted-foreground">{data?.total || 0} items found</p>
              </div>
            </div>
            
            {/* View Controller */}
            <div className="flex items-center gap-2">
              <span className="text-xs text-muted-foreground hidden sm:inline">View:</span>
              <div className="flex bg-[--surface] p-1 rounded-lg border border-muted/20">
                <button onClick={()=>setView('grid')} className={`p-1.5 rounded transition-all ${view==='grid'?'bg-white shadow-sm text-black':'text-muted-foreground hover:text-foreground'}`}>
                  <div className="grid grid-cols-2 gap-0.5 w-3 h-3">
                    <div className="bg-current rounded-[1px]" />
                    <div className="bg-current rounded-[1px]" />
                    <div className="bg-current rounded-[1px]" />
                    <div className="bg-current rounded-[1px]" />
                  </div>
                </button>
                <button onClick={()=>setView('list')} className={`p-1.5 rounded transition-all ${view==='list'?'bg-white shadow-sm text-black':'text-muted-foreground hover:text-foreground'}`}>
                  <div className="flex flex-col gap-0.5 w-3 h-3">
                    <div className="bg-current h-0.5 w-full rounded-[1px]" />
                    <div className="bg-current h-0.5 w-full rounded-[1px]" />
                    <div className="bg-current h-0.5 w-full rounded-[1px]" />
                  </div>
                </button>
              </div>
            </div>
          </div>
          
          {/* Filters Row - Category and Sort By first, then Color/Size/Per-page */}
          <div className="flex flex-wrap items-center gap-2">
            {/* Fix 2: Category and Sort By - using custom Select like Color/Size */}
            <Select
              label="Category"
              value={params.get("category") || ""}
              onChange={(val) => setParam("category", val || undefined)}
              options={categoryOptions}
              className="min-w-[140px]"
            />
            <Select
              label="Sort By"
              value={params.get("sort") || "newest"}
              onChange={(val) => setParam("sort", val)}
              options={sortOptions}
              className="min-w-40"
            />
            
            {/* Fix 1: DO NOT MODIFY - Color, Size, Per-page dropdowns (reference implementation) */}
            <Select
              value={params.get("color") || ""}
              onChange={(val) => setParam("color", val || undefined)}
              placeholder="Color"
              options={colorOptions}
              className="w-32"
            />
            <Select
              value={params.get("size") || ""}
              onChange={(val) => setParam("size", val || undefined)}
              placeholder="Size"
              options={sizeOptions}
              className="w-24"
            />
            <Select
              value={params.get("pageSize") || "12"}
              onChange={(val) => setParam("pageSize", val)}
              options={pageSizeOptions}
              className="w-32"
            />
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-7xl px-4 py-8">
        {loading && <div className="text-center py-12 text-muted">Loading products...</div>}
        {!loading && data && (
          <>
            <motion.div 
              className={view === 'grid' ? "grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4" : "space-y-4"}
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
                      {p.ratingAverage != null && p.ratingCount != null && p.ratingCount > 0 ? (
                        <div className="flex items-center gap-1 text-xs text-yellow-500" aria-label={`Rating ${p.ratingAverage} out of 5`}>
                          {Array.from({ length: 5 }).map((_, i) => {
                            const ratingValue = p.ratingAverage ?? 0;
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
                      <div className="text-sm font-semibold">${p.basePrice.toFixed(2)}</div>
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
    </div>
  );
}
