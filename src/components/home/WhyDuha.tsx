"use client";

import { motion } from "framer-motion";
import { fadeInUp, staggerChildren } from "@/lib/motion";
import { ShieldCheck, Zap, HeartHandshake } from "lucide-react";

const pillars = [
  {
    icon: ShieldCheck,
    title: "Premium Quality",
    description: "Heavyweight, sustainably sourced cotton built to last."
  },
  {
    icon: Zap,
    title: "Instant Customization",
    description: "Powerful tools to visualize your design in real-time."
  },
  {
    icon: HeartHandshake,
    title: "Customer First",
    description: "Dedicated support and satisfaction guarantee on every order."
  }
];

export function WhyDuha() {
  return (
    <section className="py-12 bg-[--bg]">
      <div className="mx-auto max-w-7xl px-4">
        <motion.div 
          initial="initial"
          whileInView="animate"
          viewport={{ once: true }}
          variants={staggerChildren}
          className="grid md:grid-cols-3 gap-8 divide-y md:divide-y-0 md:divide-x divide-muted/30"
        >
          {pillars.map((p, i) => (
            <motion.div key={i} variants={fadeInUp} className="flex flex-col items-center text-center px-4 pt-8 md:pt-0">
              <div className="mb-4 p-3 rounded-full bg-[--surface] text-foreground">
                <p.icon className="w-6 h-6" />
              </div>
              <h3 className="font-bold text-lg mb-2">{p.title}</h3>
              <p className="text-sm text-muted-foreground max-w-xs">{p.description}</p>
            </motion.div>
          ))}
        </motion.div>
      </div>
    </section>
  );
}
