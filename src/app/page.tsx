"use client";
import Link from "next/link";
import { motion } from "framer-motion";
import { BentoGrid, BentoTile } from "@/components/ui/BentoGrid";
import { Button } from "@/components/ui/Button";
import { MascotSlot } from "@/components/ui/MascotSlot";
import { fadeInUp, staggerChildren } from "@/lib/motion";

export default function Home() {
  return (
    <motion.div
      initial="initial"
      animate="animate"
      variants={staggerChildren}
      className="py-8 md:py-12 space-y-8"
    >
      <BentoGrid>
        {/* Hero Tile */}
        <motion.div variants={fadeInUp}>
          <BentoTile span="2" rowSpan="2" variant="glass">
            <div className="h-full flex flex-col justify-between gap-6">
              <div className="space-y-4">
                <h1 className="text-hero">
                  Wear Your Story
                </h1>
                <p className="text-lg text-muted max-w-lg">
                  Premium custom tees with bold designs. High-contrast, minimalist aesthetics. Made to order.
                </p>
                <div className="flex gap-3 pt-2">
                  <Link href="/products">
                    <Button>Browse Collection</Button>
                  </Link>
                  <Link href="/custom">
                    <Button variant="secondary">Custom Order</Button>
                  </Link>
                </div>
              </div>
            </div>
          </BentoTile>
        </motion.div>

        {/* Mascot Tile */}
        <motion.div variants={fadeInUp}>
          <BentoTile rowSpan="2" variant="soft3D">
            <MascotSlot variant="hero" />
          </BentoTile>
        </motion.div>

        {/* Featured Products Tile */}
        <motion.div variants={fadeInUp}>
          <BentoTile span="2" variant="flat">
            <h2 className="text-section-title mb-4">Featured Designs</h2>
            <p className="text-muted mb-4">
              Explore our curated collection of best-selling tees.
            </p>
            <Link href="/products" className="underline text-sm">
              View all products →
            </Link>
          </BentoTile>
        </motion.div>

        {/* Custom Builder Teaser */}
        <motion.div variants={fadeInUp}>
          <BentoTile variant="glass">
            <h3 className="text-xl font-bold mb-2">Custom Builder</h3>
            <p className="text-sm text-muted mb-4">
              Design your own. Zero friction.
            </p>
            <Link href="/custom">
              <Button variant="secondary" className="w-full">
                Start Designing
              </Button>
            </Link>
          </BentoTile>
        </motion.div>

        {/* Brand Story Tile */}
        <motion.div variants={fadeInUp}>
          <BentoTile span="full" variant="soft3D">
            <div className="max-w-3xl mx-auto text-center space-y-3">
              <h2 className="text-2xl md:text-3xl font-bold">
                Minimalist Tees, Maximum Impact
              </h2>
              <p className="text-muted">
                Every piece is crafted with intention. Bold typography, clean lines, premium cotton.
              </p>
            </div>
          </BentoTile>
        </motion.div>
      </BentoGrid>
    </motion.div>
  );
}
