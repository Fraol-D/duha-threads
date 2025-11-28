"use client";

import Link from "next/link";
import Image from "next/image";
import { motion } from "framer-motion";
import { BentoGrid, BentoTile } from "@/components/ui/BentoGrid";
import { Button } from "@/components/ui/Button";
import { cardMotion, fadeInUp } from "@/lib/motion";
import { ArrowRight, Star } from "lucide-react";

interface FeaturedProduct {
  id: string;
  slug: string;
  name: string;
  basePrice: number;
  description: string;
  primaryImage?: { url: string; alt: string } | null;
  featuredRank: number | null;
}

interface FeaturedSectionProps {
  products: FeaturedProduct[];
}

export function FeaturedSection({ products }: FeaturedSectionProps) {
  if (products.length === 0) return null;

  return (
    <section className="py-12 md:py-20">
      <div className="mx-auto max-w-7xl px-4 space-y-8">
        <div className="flex items-end justify-between">
          <div className="space-y-2">
            <h2 className="text-section-title">Featured Drops</h2>
            <p className="text-muted-foreground max-w-md">
              Our latest and greatest. Limited runs, premium materials.
            </p>
          </div>
          <Link href="/products" className="hidden md:flex items-center text-sm font-medium hover:text-primary transition-colors">
            View all products <ArrowRight className="ml-1 w-4 h-4" />
          </Link>
        </div>

        <BentoGrid>
          {products.slice(0, 3).map((product, index) => (
            <motion.div
              key={product.id}
              variants={fadeInUp}
              initial="initial"
              whileInView="animate"
              viewport={{ once: true, margin: "-50px" }}
              transition={{ delay: index * 0.1 }}
              className={index === 0 ? "md:col-span-2 md:row-span-2" : "md:col-span-1 md:row-span-1"}
            >
              <Link href={`/products/${product.slug}`} className="block h-full">
                <motion.div
                  variants={cardMotion}
                  initial="rest"
                  whileHover="hover"
                  className="group relative h-full rounded-2xl overflow-hidden bg-[--surface] border border-muted/50"
                >
                  <div className="absolute inset-0 z-10 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-60 transition-opacity group-hover:opacity-70" />

                  <div className={`relative ${index === 0 ? 'aspect-[4/3] md:h-full' : 'aspect-square'} overflow-hidden bg-muted`}>
                    {product.primaryImage ? (
                      <Image
                        src={product.primaryImage.url}
                        alt={product.primaryImage.alt || product.name}
                        fill
                        sizes={index === 0 ? "(max-width: 768px) 100vw, 66vw" : "(max-width: 768px) 50vw, 33vw"}
                        className="object-cover transition-transform duration-500 group-hover:scale-105"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center bg-muted">
                        <span className="text-muted-foreground">No Image</span>
                      </div>
                    )}
                  </div>

                  <div className="absolute bottom-0 left-0 right-0 z-20 p-6 text-white">
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        {index === 0 && (
                          <span className="inline-block px-2 py-1 mb-2 text-[10px] font-bold uppercase tracking-wider bg-white/20 backdrop-blur-md rounded-md border border-white/10">
                            Best Seller
                          </span>
                        )}
                        <h3 className={`font-bold ${index === 0 ? 'text-2xl md:text-3xl' : 'text-lg'}`}>
                          {product.name}
                        </h3>
                        {index === 0 && (
                          <p className="mt-2 text-sm text-white/80 line-clamp-2 max-w-md">
                            {product.description}
                          </p>
                        )}
                      </div>
                      <div className="text-right">
                        <div className="font-bold text-lg">${product.basePrice.toFixed(2)}</div>
                        <div className="flex items-center justify-end gap-1 text-xs text-yellow-400 mt-1">
                          <Star className="w-3 h-3 fill-current" />
                          <span className="text-white/90">4.9</span>
                        </div>
                      </div>
                    </div>

                    <div className="mt-4 overflow-hidden h-0 opacity-0 transition-all duration-300 group-hover:h-10 group-hover:opacity-100">
                      <Button size="sm" className="w-full bg-white text-black hover:bg-white/90">
                        View Details
                      </Button>
                    </div>
                  </div>
                </motion.div>
              </Link>
            </motion.div>
          ))}
        </BentoGrid>

        <div className="md:hidden flex justify-center">
          <Link href="/products">
            <Button variant="outline">View all products</Button>
          </Link>
        </div>
      </div>
    </section>
  );
}
