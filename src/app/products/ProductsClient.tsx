"use client";
import { useEffect, useMemo, useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { Card } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
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

  return (
    <div className="py-8 space-y-6">
      <Card variant="glass" className="p-4">
        <div className="flex flex-col md:flex-row md:items-end gap-4">
          <div className="flex gap-2 flex-1">
            <Input placeholder="Category" defaultValue={params.get("category") || ""} onBlur={(e) => setParam("category", e.currentTarget.value || undefined)} />
            <Input placeholder="Color" defaultValue={params.get("color") || ""} onBlur={(e) => setParam("color", e.currentTarget.value || undefined)} />
            <Input placeholder="Size" defaultValue={params.get("size") || ""} onBlur={(e) => setParam("size", e.currentTarget.value || undefined)} />
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
                <Card interactive className="overflow-hidden group">
                  <div className="aspect-square bg-muted">
                    {p.primaryImage ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={p.primaryImage.url} alt={p.primaryImage.alt} className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105" />
                    ) : null}
                  </div>
                  <div className="p-3 space-y-1">
                    <div className="text-sm text-muted">{p.category}</div>
                    <div className="font-medium">{p.name}</div>
                    <div className="text-sm">${p.basePrice.toFixed(2)}</div>
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
