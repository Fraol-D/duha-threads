"use client";

import Link from "next/link";
import Image from "next/image";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/Button";
import { fadeInUp, staggerChildren } from "@/lib/motion";
import { Shirt, Palette, Truck, ArrowRight } from "lucide-react";

const steps = [
  {
    icon: Shirt,
    title: "Pick Your Base",
    description: "Choose from our premium heavyweight cotton tees in black or white.",
  },
  {
    icon: Palette,
    title: "Create Your Design",
    description: "Upload art or add text. Place it on the front, back, or chest pocket.",
  },
  {
    icon: Truck,
    title: "We Handle the Rest",
    description: "We print, pack, and ship your custom creation directly to your door.",
  },
];

export function BuilderSpotlight() {
  return (
    <section className="py-12 md:py-20 bg-[--surface] relative overflow-hidden">
      <div className="absolute inset-0 bg-[url('/grid-pattern.svg')] opacity-[0.03]" />
      
      <div className="mx-auto max-w-7xl px-4 relative z-10">
        <div className="grid md:grid-cols-2 gap-12 items-center">
          <motion.div 
            initial="initial"
            whileInView="animate"
            viewport={{ once: true }}
            variants={staggerChildren}
            className="space-y-8"
          >
            <motion.div variants={fadeInUp}>
              <h2 className="text-section-title mb-4">Create Something Unique</h2>
              <p className="text-muted-foreground text-lg">
                Our custom builder gives you the freedom to design professional-quality apparel in minutes. No design skills required.
              </p>
            </motion.div>

            <div className="space-y-6">
              {steps.map((step, i) => (
                <motion.div key={i} variants={fadeInUp} className="flex gap-4">
                  <div className="shrink-0 w-12 h-12 rounded-full bg-[--bg] border border-muted flex items-center justify-center shadow-sm">
                    <step.icon className="w-5 h-5 text-foreground" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-lg">{step.title}</h3>
                    <p className="text-muted-foreground text-sm">{step.description}</p>
                  </div>
                </motion.div>
              ))}
            </div>

            <motion.div variants={fadeInUp} className="pt-4">
              <Link href="/custom-order">
                <Button size="lg" className="px-8 shadow-lg shadow-primary/10">
                  Launch Custom Builder <ArrowRight className="ml-2 w-4 h-4" />
                </Button>
              </Link>
            </motion.div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, x: 50 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
            className="relative"
          >
            {/* Visual representation of the builder */}
            <Link
              href="/custom-order"
              aria-label="Open custom builder"
              className="group block focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-foreground/40 rounded-2xl"
            >
              <div className="relative aspect-4/3 rounded-2xl overflow-hidden shadow-2xl bg-[--bg] transition-transform duration-300 group-hover:scale-[1.01]">
                 <Image 
                   src="/assets/builder-preview-mock.jpeg" 
                   alt="Custom Builder Preview" 
                   fill 
                   className="object-cover"
                 />
                 
                 {/* Floating Badge */}
                 <div className="absolute bottom-6 right-6 bg-foreground text-background px-4 py-2 rounded-full text-sm font-bold shadow-xl">
                    Try it now
                 </div>
              </div>
            </Link>
          </motion.div>
        </div>
      </div>
    </section>
  );
}
