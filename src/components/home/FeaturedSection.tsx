"use client";

import Image from "next/image";
import Link from "next/link";
import { motion } from "framer-motion";
import { ArrowRight, Star } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { fadeInUp } from "@/lib/motion";
import type { FeaturedProduct } from "@/lib/products/queries";

type FeaturedSectionProps = {
  products: FeaturedProduct[];
};

const currency = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
});

export function FeaturedSection({ products }: FeaturedSectionProps) {
  return (
    <section className="py-14 md:py-24">
      <div className="mx-auto max-w-7xl px-4 space-y-8">
        <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
          <div className="space-y-2">
            <p className="text-xs font-semibold uppercase tracking-[0.3em] text-muted-foreground">Featured Drops</p>
            <h2 className="text-section-title">The pieces everyone is asking for</h2>
              <p className="max-w-2xl text-muted-foreground text-lg">
              Curated by our studio. Marked as featured by the team so you can see what’s trending without scrolling forever.
            </p>
          </div>
          <Link href="/products" className="hidden md:inline-flex items-center text-sm font-medium hover:text-primary">
            View all products
            <ArrowRight className="ml-2 h-4 w-4" />
          </Link>
        </div>

        {products.length > 0 ? (
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {products.map((product, index) => (
              <Link key={product.id} href={`/products/${product.slug}`} className="group block h-full">
                <motion.article
                  variants={fadeInUp}
                  initial="initial"
                  whileInView="animate"
                  viewport={{ once: true, margin: "-80px" }}
                  transition={{ delay: index * 0.05 }}
                  className="relative flex h-full flex-col rounded-2xl border border-white/10 bg-[--surface] p-4 shadow-[0_20px_60px_rgba(0,0,0,0.2)] transition-transform duration-300 hover:-translate-y-1"
                >
                  <div className="relative mb-4 aspect-square w-full overflow-hidden rounded-xl border border-white/10 bg-[--bg]">
                    {product.primaryImage ? (
                      <Image
                        src={product.primaryImage.url}
                        alt={product.primaryImage.alt || product.name}
                        fill
                        className="object-cover transition-transform duration-700 group-hover:scale-[1.05]"
                      />
                    ) : (
                      <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
                        Photo coming soon
                      </div>
                    )}
                  </div>

                  <div className="flex flex-1 flex-col gap-3">
                    <div className="flex items-center justify-between text-xs text-muted-foreground">
                      <span>Featured #{index + 1}</span>
                      <RatingPill rating={product.ratingAverage} count={product.ratingCount} />
                    </div>
                      <h3 className="text-base font-medium text-foreground line-clamp-1">{product.name}</h3>
                      <p className="text-sm text-muted-foreground line-clamp-2">{product.description}</p>
                    <div className="flex items-center justify-between pt-2">
                      <span className="text-sm font-semibold text-foreground">
                        {currency.format(product.basePrice)}
                      </span>
                      <span className="inline-flex items-center text-xs font-medium uppercase tracking-wide text-primary">
                        View tee
                        <ArrowRight className="ml-1 h-3.5 w-3.5" />
                      </span>
                    </div>
                  </div>
                </motion.article>
              </Link>
            ))}
          </div>
        ) : (
          <div className="rounded-2xl border border-dashed border-muted/60 bg-[--surface] p-10 text-center">
            <p className="text-lg font-semibold text-foreground">Featured drops coming soon</p>
            <p className="mt-2 text-sm text-muted-foreground">We’re curating the next wave of tees. Browse all products while you wait.</p>
            <div className="mt-6 flex justify-center">
              <Link href="/products">
                <Button variant="outline">Browse products</Button>
              </Link>
            </div>
          </div>
        )}

        <div className="md:hidden flex justify-center">
          <Link href="/products">
            <Button variant="ghost" className="text-sm">
              View all products
            </Button>
          </Link>
        </div>
      </div>
    </section>
  );
}

type RatingPillProps = {
  rating?: number;
  count?: number;
};

function RatingPill({ rating, count }: RatingPillProps) {
  if (!rating || rating <= 0 || !count) {
    return <span className="rounded-full border border-muted/40 px-2 py-0.5 text-[11px] uppercase tracking-wide text-muted-foreground">New</span>;
  }
  return (
    <span className="inline-flex items-center gap-1 rounded-full border border-amber-500/40 bg-amber-500/10 px-2 py-0.5 text-[11px] font-medium text-amber-400">
      <Star className="h-3 w-3 fill-current" />
      {rating.toFixed(1)} · {count}
    </span>
  );
}
