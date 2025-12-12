"use client";

import { motion } from "framer-motion";
import { BentoGrid, BentoTile } from "@/components/ui/BentoGrid";
import { fadeInUp, staggerChildren } from "@/lib/motion";
import { Quote } from "lucide-react";
import Image from "next/image";

const testimonials = [
  {
    quote: "The quality of the cotton is insane. Best custom tee I've ever ordered.",
    author: "Alex M.",
    role: "Designer",
    image: null
  },
  {
    quote: "Finally a builder that actually works on mobile. Love the interface.",
    author: "Sarah K.",
    role: "Artist",
    image: null
  },
  {
    quote: "Fast shipping and the print quality is retail-grade. Highly recommend.",
    author: "James L.",
    role: "Brand Owner",
    image: null
  }
];

export function SocialProof() {
  return (
    <section className="py-12 md:py-20">
      <div className="mx-auto max-w-7xl px-4">
        <motion.div 
          initial="initial"
          whileInView="animate"
          viewport={{ once: true }}
          variants={staggerChildren}
          className="space-y-10"
        >
          <motion.div variants={fadeInUp} className="text-center max-w-2xl mx-auto">
            <h2 className="text-section-title mb-4">Community Love</h2>
            <p className="text-muted-foreground">
              See what creators are saying about Duha Threads.
            </p>
          </motion.div>

          <div className="grid md:grid-cols-3 gap-6">
            {testimonials.map((t, i) => (
              <motion.div 
                key={i} 
                variants={fadeInUp}
                className="p-6 rounded-2xl bg-[--surface] border border-muted/50 relative"
              >
                <div className="space-y-4">
                  <p className="text-lg font-medium leading-relaxed">"{t.quote}"</p>
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-gray-200 to-gray-400 flex items-center justify-center text-xs font-bold text-gray-600">
                      {t.author.charAt(0)}
                    </div>
                    <div>
                      <div className="font-bold text-sm">{t.author}</div>
                      <div className="text-xs text-muted-foreground">{t.role}</div>
                    </div>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        </motion.div>
      </div>
    </section>
  );
}
