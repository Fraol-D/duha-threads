"use client";

import Link from "next/link";
import Image from "next/image";
import { motion } from "framer-motion";
import { ArrowRight, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { fadeInUp, staggerChildren, textReveal } from "@/lib/motion";
import type { HeroProduct } from "@/lib/products/queries";

type HeroSectionProps = {
  heroProduct: HeroProduct | null;
};

export function HeroSection({ heroProduct }: HeroSectionProps) {
  return (
    <section className="relative overflow-hidden pb-16 pt-20 md:pb-24 md:pt-24">
      <div className="pointer-events-none absolute inset-x-0 top-0 mx-auto h-full max-w-6xl opacity-70 blur-3xl">
        <div className="absolute left-0 top-8 h-48 w-48 rounded-full bg-primary/10" />
        <div className="absolute right-0 top-32 h-56 w-56 rounded-full bg-amber-400/10" />
      </div>

      <div className="mx-auto flex max-w-6xl flex-col gap-12 px-4 lg:grid lg:grid-cols-2 lg:items-center lg:gap-16">
        <motion.div initial="initial" animate="animate" variants={staggerChildren} className="space-y-6">
          <motion.span
            variants={fadeInUp}
            className="inline-flex items-center gap-2 rounded-full border border-muted/60 bg-[--surface] px-3 py-1 text-xs font-semibold uppercase tracking-[0.3em] text-muted-foreground"
          >
            <Sparkles className="h-3 w-3 text-amber-500" />
            Custom T-Shirts, Made Simple
          </motion.span>

          <motion.h1 variants={textReveal} className="text-section-title">
            Design Your Own Tee in Minutes
          </motion.h1>

          <motion.p variants={fadeInUp} className="text-muted-foreground text-lg">
            Tap into Duha’s builder, lab-grade prints, and Addis-based fulfillment for fast local turnaround. Upload your art or
            build from scratch—no minimum order required.
          </motion.p>

          <motion.div variants={fadeInUp} className="flex flex-wrap gap-4 pt-2">
            <Link href="/custom-order">
              <Button size="lg" className="h-12 px-8 text-base shadow-primary/30">
                Start Custom Design
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </Link>
            <Link href="/products">
              <Button variant="secondary" size="lg" className="h-12 px-8 text-base border-muted bg-transparent hover:bg-[--surface]">
                Browse Products
              </Button>
            </Link>
          </motion.div>

          <motion.div variants={fadeInUp} className="flex flex-wrap gap-6 text-sm text-muted-foreground">
            <div>
              <p className="text-2xl font-semibold text-foreground">10K+</p>
              <p>Orders shipped with care</p>
            </div>
            <div>
              <p className="text-2xl font-semibold text-foreground">48hr</p>
              <p>Average local turnaround</p>
            </div>
          </motion.div>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 24 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true, margin: "-100px" }}>
          {heroProduct ? <HeroProductCard product={heroProduct} /> : <HeroEmptyState />}
        </motion.div>
      </div>
    </section>
  );
}

function HeroProductCard({ product }: { product: HeroProduct }) {
  return (
    <Link href={`/products/${product.slug}`} className="group block focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-foreground/40 rounded-4xl">
      <div className="relative rounded-4xl border border-white/10 bg-[--surface] p-6 shadow-2xl shadow-black/10 transition-transform duration-300 group-hover:-translate-y-1">
        <div className="absolute inset-3 rounded-[28px] bg-linear-to-br from-primary/5 via-transparent to-amber-400/5" />
        <div className="relative space-y-6">
          <div className="rounded-2xl bg-[--bg] p-6">
            <div className="relative mx-auto aspect-3/4 w-56 sm:w-64">
              {product.primaryImage ? (
                <Image src={product.primaryImage.url} alt={product.primaryImage.alt || product.name} fill sizes="(max-width: 768px) 80vw, 380px" className="object-contain drop-shadow-2xl" />
              ) : (
                <div className="flex h-full items-center justify-center text-sm text-muted-foreground">Hero photo coming soon</div>
              )}
            </div>
          </div>
          <div className="space-y-3">
            <p className="text-xs font-semibold uppercase tracking-[0.3em] text-muted-foreground">Hero Product</p>
            <h3 className="text-2xl font-semibold text-foreground">{product.name}</h3>
            <p className="text-muted-foreground text-sm line-clamp-3">{product.description}</p>
            <div className="flex items-center justify-end pt-2 text-sm text-muted-foreground">
              <span className="inline-flex items-center text-xs font-semibold uppercase tracking-wide text-primary">
                View this tee
                <ArrowRight className="ml-1 h-3.5 w-3.5" />
              </span>
            </div>
          </div>
        </div>
      </div>
    </Link>
  );
}

function HeroEmptyState() {
  return (
    <div className="rounded-4xl border border-dashed border-muted/60 bg-[--surface] p-8 text-center shadow-2xl shadow-black/10">
      <p className="text-sm font-semibold text-muted-foreground">No hero product selected</p>
      <p className="mt-2 text-sm text-muted-foreground">Choose a hero item in the admin to showcase it here.</p>
    </div>
  );
}

/**
 * HERO ASSET SPEC (for designer)
 * - File path: public/hero/duha-hero-orb.png
 * - Type: Transparent PNG (or WebP) with alpha channel
 * - Size: ~1400x1100px @2x for retina clarity
 * - Content: DUHA sunrise orb character holding a custom tee with subtle builder UI floating elements
 * - Style: Clean gradients, soft shadows; works on both warm and cool backgrounds
 */
