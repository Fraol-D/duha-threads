"use client";
import Link from "next/link";
import { BentoGrid, BentoTile } from "@/components/ui/BentoGrid";
import { Button } from "@/components/ui/Button";
import { MascotSlot } from "@/components/ui/MascotSlot";
import { motion } from "framer-motion";
import { fadeInUp, staggerChildren } from "@/lib/motion";
import { useEffect, useState } from "react";

interface PopularTemplate { _id: string; name: string; usageCount: number; description?: string }

export default function HomeClient() {
  const [popular, setPopular] = useState<PopularTemplate[]>([]);
  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const res = await fetch("/api/templates?limit=6");
        if (!active) return;
        if (res.ok) {
          const json = await res.json();
          setPopular(json.templates || []);
        }
      } catch {/* ignore */}
    })();
    return () => { active = false; };
  }, []);
  return (
    <motion.div initial="initial" animate="animate" variants={staggerChildren} className="py-8 md:py-12 space-y-8">
      <BentoGrid>
        <motion.div variants={fadeInUp}>
          <BentoTile span="2" rowSpan="2" variant="glass">
            <div className="h-full flex flex-col justify-between gap-6">
              <div className="space-y-4">
                <h1 className="text-hero">Wear Your Story</h1>
                <p className="text-lg text-muted max-w-lg">Premium custom tees with bold designs. High-contrast, minimalist aesthetics. Made to order.</p>
                <div className="flex gap-3 pt-4">
                  <Link href="/products"><Button>Browse collection</Button></Link>
                  <Link href="/custom-order"><Button variant="secondary">Design your own</Button></Link>
                </div>
              </div>
            </div>
          </BentoTile>
        </motion.div>
        <motion.div variants={fadeInUp}>
          <BentoTile rowSpan="2" variant="soft3D"><MascotSlot variant="hero" /></BentoTile>
        </motion.div>
        <motion.div variants={fadeInUp}>
          <BentoTile span="2" variant="flat">
            <h2 className="text-section-title mb-2">Featured designs</h2>
            <p className="text-muted mb-4 text-sm">Explore our curated collection of best-sellers.</p>
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
