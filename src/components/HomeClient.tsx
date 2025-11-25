"use client";
import Link from "next/link";
import Image from "next/image";
import { BentoGrid, BentoTile } from "@/components/ui/BentoGrid";
import { Button } from "@/components/ui/Button";
import { MascotSlot } from "@/components/ui/MascotSlot";
import { motion } from "framer-motion";
import { fadeInUp, staggerChildren } from "@/lib/motion";
import { useEffect, useState } from "react";

interface PopularTemplate { _id: string; name: string; usageCount: number; description?: string }
interface FeaturedProduct { id: string; slug: string; name: string; basePrice: number; description: string; primaryImage?: { url: string; alt: string } | null; featuredRank: number | null }

export default function HomeClient() {
  const [popular, setPopular] = useState<PopularTemplate[]>([]);
  const [featured, setFeatured] = useState<FeaturedProduct[]>([]);
  const [activeIndex, setActiveIndex] = useState(0);
  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const [templatesRes, featuredRes] = await Promise.all([
          fetch("/api/templates?limit=6"),
          fetch("/api/products/featured")
        ]);
        if (!active) return;
        if (templatesRes.ok) {
          const json = await templatesRes.json();
          setPopular(json.templates || []);
        }
        if (featuredRes.ok) {
          const json = await featuredRes.json();
          setFeatured(json.products || []);
        }
      } catch { /* ignore */ }
    })();
    return () => { active = false; };
  }, []);
  return (
    <motion.div initial="initial" animate="animate" variants={staggerChildren} className="py-8 md:py-12 space-y-8">
      <BentoGrid>
        {/* Hero Main Featured */}
        <motion.div variants={fadeInUp}>
          <BentoTile span="2" rowSpan="2" variant="glass" className="relative overflow-hidden">
            {featured.length > 0 ? (
              <div className="h-full flex flex-col gap-6">
                <div className="flex-1 grid md:grid-cols-2 gap-6">
                  <div className="relative aspect-square md:aspect-auto rounded-lg overflow-hidden bg-muted">
                    {featured[activeIndex]?.primaryImage && (
                      <Image src={featured[activeIndex]!.primaryImage!.url} alt={featured[activeIndex]!.primaryImage!.alt || featured[activeIndex]!.name} fill sizes="(max-width:768px) 90vw, 480px" className="object-cover" />
                    )}
                  </div>
                  <div className="flex flex-col justify-center space-y-4">
                    <h1 className="text-3xl md:text-4xl font-semibold leading-tight">{featured[activeIndex].name}</h1>
                    <p className="text-sm text-muted max-w-md line-clamp-4">{featured[activeIndex].description}</p>
                    <div className="text-lg font-medium">${featured[activeIndex].basePrice.toFixed(2)}</div>
                    <div className="flex gap-3 pt-2">
                      <Link href={`/products/${featured[activeIndex].slug}`}><Button>View product</Button></Link>
                      <Link href="/products"><Button variant="secondary">Browse all</Button></Link>
                    </div>
                    <div className="flex gap-2 pt-2">
                      {featured.map((_, i) => (
                        <button
                          key={i}
                          onClick={() => setActiveIndex(i)}
                          aria-label={`Show featured product ${i+1}`}
                          className={`h-2 w-8 rounded-full transition ${i === activeIndex ? 'bg-foreground' : 'bg-muted hover:bg-foreground/50'}`}
                        />
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              <div className="h-full flex flex-col justify-between gap-6">
                <div className="space-y-4">
                  <h1 className="text-hero">Wear Your Story</h1>
                  <p className="text-lg text-muted max-w-lg">Premium custom tees with bold designs. High-contrast, minimalist aesthetics. Made to order.</p>
                  <div className="flex gap-3 pt-4">
                    <Link href="/products"><Button>Browse collection</Button></Link>
                    <Link href="/custom-order"><Button variant="secondary">Design your own</Button></Link>
                  </div>
                  <p className="text-[11px] text-muted pt-2">No featured products configured yet.</p>
                </div>
              </div>
            )}
          </BentoTile>
        </motion.div>
        <motion.div variants={fadeInUp}>
          <BentoTile rowSpan="2" variant="soft3D"><MascotSlot variant="hero" /></BentoTile>
        </motion.div>
        <motion.div variants={fadeInUp}>
          <BentoTile span="2" variant="flat">
            <h2 className="text-section-title mb-2">More featured</h2>
            <p className="text-muted mb-4 text-sm">Explore the rest of the spotlight picks.</p>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3 mb-4">
              {featured.slice(1,5).map(fp => (
                <Link key={fp.id} href={`/products/${fp.slug}`} className="group rounded-lg border border-muted/40 p-3 bg-[--surface]/40 hover:bg-[--surface]/70 transition flex flex-col gap-2">
                  <div className="relative aspect-square rounded overflow-hidden bg-muted">
                    {fp.primaryImage && (
                      <Image src={fp.primaryImage.url} alt={fp.primaryImage.alt || fp.name} fill sizes="180px" className="object-cover group-hover:scale-105 transition-transform" />
                    )}
                  </div>
                  <div className="text-xs font-medium line-clamp-1" title={fp.name}>{fp.name}</div>
                  <div className="text-[11px] opacity-60">${fp.basePrice.toFixed(2)}</div>
                </Link>
              ))}
              {featured.length <= 1 && <div className="text-xs opacity-60">No additional featured products.</div>}
            </div>
            <Link href="/products" className="underline text-xs">View all products →</Link>
          </BentoTile>
        </motion.div>
        <motion.div variants={fadeInUp}>
          <BentoTile span="2" variant="glass">
            <h2 className="text-section-title mb-2">Popular templates</h2>
            <p className="text-muted mb-4 text-sm">Kick-start with community favorites.</p>
            <div className="grid sm:grid-cols-2 gap-3 mb-4">
              {popular.map(t => (
                <div key={t._id} className="rounded-lg border border-muted/50 p-3 bg-[--surface]/40">
                  <div className="text-sm font-medium truncate" title={t.name}>{t.name}</div>
                  <div className="text-[11px] opacity-60">{t.usageCount} uses</div>
                </div>
              ))}
              {popular.length === 0 && <div className="text-xs opacity-60">No templates yet.</div>}
            </div>
            <div className="grid grid-cols-2 gap-3 text-xs">
              <Link href="/wishlist" className="rounded-md soft-3d px-3 py-2 flex items-center justify-center hover:ring-2 ring-token transition">My wishlist</Link>
              <Link href="/my-custom-orders" className="rounded-md soft-3d px-3 py-2 flex items-center justify-center hover:ring-2 ring-token transition">My custom orders</Link>
            </div>
          </BentoTile>
        </motion.div>
        <motion.div variants={fadeInUp}>
          <BentoTile variant="glass">
            <h3 className="text-xl font-bold mb-2">Quality & ethos</h3>
            <p className="text-sm text-muted mb-2">Responsibly sourced cotton. Print processes tuned for clarity and longevity.</p>
            <Link href="/products" className="text-xs underline">Learn more →</Link>
          </BentoTile>
        </motion.div>
        <motion.div variants={fadeInUp}>
          <BentoTile span="full" variant="soft3D">
            <div className="max-w-3xl mx-auto text-center space-y-3">
              <h2 className="text-2xl md:text-3xl font-bold">Minimalist Tees, Maximum Impact</h2>
              <p className="text-muted">Every piece is crafted with intention. Bold typography, clean lines, premium cotton.</p>
            </div>
          </BentoTile>
        </motion.div>
      </BentoGrid>
    </motion.div>
  );
}
