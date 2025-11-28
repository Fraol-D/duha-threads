"use client";

import Link from "next/link";
import { motion, type Variants, type Transition } from "framer-motion";
import { BentoGrid } from "@/components/ui/BentoGrid";
import { Button } from "@/components/ui/Button";
import { fadeInUp } from "@/lib/motion";
import { ArrowRight } from "lucide-react";

type FeaturedDrop = {
  id: string;
  label: string;
  title: string;
  description: string;
  href: string;
  badge?: string;
  accentGradient: string;
  motif?: string;
  spotlight?: boolean;
};

const cardTransition: Transition = {
  duration: 0.25,
  ease: [0.16, 1, 0.3, 1],
};

const cardMotion: Variants = {
  rest: {
    y: 0,
    boxShadow: "0 0 0 rgba(0,0,0,0)",
    transition: cardTransition,
  },
  hover: {
    y: -4,
    boxShadow: "0 24px 60px rgba(0,0,0,0.35)",
    transition: cardTransition,
  },
};

const featuredDrops: FeaturedDrop[] = [
  {
    id: "sunrise-glow",
    label: "Signature Drop",
    title: "Sunrise Glow Tee",
    description: "A clean everyday tee inspired by DUHA’s morning light aesthetic.",
    href: "/products",
    badge: "New",
    accentGradient: "from-amber-500/50 via-rose-500/40 to-orange-400/40",
    motif: "after:absolute after:inset-0 after:bg-[radial-gradient(circle_at_top,_rgba(255,255,255,0.3),_transparent_60%)] after:opacity-70",
    spotlight: true,
  },
  {
    id: "minimal-pack",
    label: "Everyday Essential",
    title: "Minimal Essentials Pack",
    description: "A set of versatile tees that pair with anything — engineered for daily wear.",
    href: "/products",
    badge: "Popular",
    accentGradient: "from-slate-900/70 via-slate-800/60 to-slate-900/70",
    motif: "after:absolute after:inset-0 after:bg-[radial-gradient(circle_at_bottom,_rgba(255,255,255,0.15),_transparent_65%)]",
  },
  {
    id: "atelier-program",
    label: "Studio Capsule",
    title: "Atelier Program",
    description: "Limited artist collaborations, produced in micro batches with archival inks.",
    href: "/products",
    accentGradient: "from-indigo-600/40 via-purple-500/30 to-cyan-400/30",
    motif: "after:absolute after:inset-0 after:bg-[radial-gradient(circle_at_center,_rgba(255,255,255,0.25),_transparent_70%)]",
  },
  {
    id: "heritage-classics",
    label: "Seasonless Favorite",
    title: "Heritage Classics",
    description: "Vintage-washed tees with subtle embroidery inspired by Addis street culture.",
    href: "/products",
    accentGradient: "from-emerald-500/35 via-lime-500/25 to-cyan-400/35",
  },
];

export function FeaturedSection() {
  if (featuredDrops.length === 0) return null;

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
          {featuredDrops.map((drop, index) => (
            <motion.div
              key={drop.id}
              variants={fadeInUp}
              initial="initial"
              whileInView="animate"
              viewport={{ once: true, margin: "-50px" }}
              transition={{ delay: index * 0.1 }}
              className={drop.spotlight ? "md:col-span-2 md:row-span-2" : "md:col-span-1"}
            >
              <Link href={drop.href} className="block h-full">
                <motion.div
                  variants={cardMotion}
                  initial="rest"
                  whileHover="hover"
                  className="group relative h-full rounded-2xl overflow-hidden border border-white/10 bg-[--surface]"
                >
                  <div className={`absolute inset-0 bg-linear-to-br ${drop.accentGradient} opacity-80 transition-opacity duration-500 group-hover:opacity-100`} />
                  {drop.motif && <div className={`absolute inset-0 pointer-events-none ${drop.motif}`} />}
                  <div className="absolute inset-0 bg-linear-to-t from-black/40 via-black/10 to-transparent opacity-60" />

                  <div className="relative z-10 flex flex-col h-full p-6 text-white">
                    <div className="space-y-3 flex-1">
                      <span className="inline-flex items-center text-[11px] font-semibold uppercase tracking-[0.2em] text-white/70">
                        {drop.label}
                      </span>
                      <div className="flex flex-wrap items-center gap-3">
                        <h3 className={`font-bold leading-tight ${drop.spotlight ? 'text-3xl md:text-[2.75rem]' : 'text-xl'}`}>
                          {drop.title}
                        </h3>
                        {drop.badge && (
                          <span className="px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide bg-white/20 rounded-full border border-white/30">
                            {drop.badge}
                          </span>
                        )}
                      </div>
                      <p className={`text-sm text-white/80 ${drop.spotlight ? 'max-w-xl' : 'max-w-sm'}`}>
                        {drop.description}
                      </p>
                    </div>

                    <div className="pt-6 flex items-center justify-between">
                      <Button size="sm" variant="outline" className="bg-white/90 text-black border-white hover:bg-white">
                        Explore drop
                      </Button>
                      <ArrowRight className="w-4 h-4 text-white/80 group-hover:translate-x-1 transition-transform" />
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
