"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { Quote, Star } from "lucide-react";
import { fadeInUp, staggerChildren } from "@/lib/motion";
import type { FeaturedReview } from "@/lib/reviews/queries";

type SocialProofProps = {
  testimonials: FeaturedReview[];
};

export function SocialProof({ testimonials }: SocialProofProps) {
  const hasTestimonials = testimonials.length > 0;

  return (
    <section className="py-14 md:py-24">
      <div className="mx-auto max-w-7xl px-4">
        <motion.div
          initial="initial"
          whileInView="animate"
          viewport={{ once: true, margin: "-100px" }}
          variants={staggerChildren}
          className="space-y-10"
        >
          <motion.div variants={fadeInUp} className="mx-auto max-w-2xl text-center space-y-3">
            <p className="text-xs font-semibold uppercase tracking-[0.4em] text-muted-foreground">Testimonials</p>
            <h2 className="text-section-title">Makers who trust Duha</h2>
            <p className="text-muted-foreground text-lg">Real teams, indie brands, and community groups sharing launches powered by our shop.</p>
          </motion.div>

          {hasTestimonials ? (
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
              {testimonials.map((testimonial, index) => (
                <motion.article
                  key={testimonial.id}
                  variants={fadeInUp}
                  transition={{ delay: index * 0.05 }}
                  className="relative flex h-full flex-col gap-5 rounded-2xl border border-white/10 bg-[--surface] p-6 shadow-[0_20px_50px_rgba(0,0,0,0.25)]"
                >
                  <Quote className="h-6 w-6 text-muted-foreground" />
                  <p className="flex-1 text-base leading-relaxed text-foreground">{testimonial.message || "Rated our tees five stars."}</p>
                  <div className="space-y-1 border-t border-white/5 pt-4 text-sm">
                    <p className="font-semibold text-foreground">{testimonial.author}</p>
                    {testimonial.productName && <p className="text-xs text-muted-foreground">{testimonial.productName}</p>}
                    {testimonial.rating && testimonial.rating > 0 && (
                      <div className="flex items-center gap-1 text-xs text-amber-400">
                        <Star className="h-3.5 w-3.5 fill-current" />
                        {testimonial.rating.toFixed(1)} / 5
                      </div>
                    )}
                  </div>
                </motion.article>
              ))}
            </div>
          ) : (
            <motion.div
              variants={fadeInUp}
              className="rounded-2xl border border-dashed border-muted/60 bg-[--surface] p-10 text-center"
            >
              <p className="text-lg font-semibold text-foreground">No featured reviews yet</p>
              <p className="mt-2 text-sm text-muted-foreground">Be the first to leave a review after your next custom drop.</p>
              <Link href="/products" className="mt-4 inline-flex text-sm font-medium text-primary">
                Shop products
                <span className="ml-1" aria-hidden>
                  →
                </span>
              </Link>
            </motion.div>
          )}
        </motion.div>
      </div>
    </section>
  );
}
