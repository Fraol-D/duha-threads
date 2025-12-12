"use client";

import Link from "next/link";
import Image from "next/image";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/Button";
import { BentoGrid, BentoTile } from "@/components/ui/BentoGrid";
import { fadeInUp, staggerChildren, hoverLift, textReveal } from "@/lib/motion";
import { ArrowRight, Sparkles } from "lucide-react";

export function HeroSection() {
  return (
    <section className="relative pt-24 pb-12 md:pt-32 md:pb-20 overflow-hidden">
      {/* Background decoration */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full h-full max-w-7xl pointer-events-none z-[-1]">
        <div className="absolute top-20 left-10 w-64 h-64 bg-blue-500/10 rounded-full blur-3xl opacity-50 mix-blend-multiply animate-blob" />
        <div className="absolute top-20 right-10 w-64 h-64 bg-purple-500/10 rounded-full blur-3xl opacity-50 mix-blend-multiply animate-blob animation-delay-2000" />
      </div>

      <div className="mx-auto max-w-7xl px-4">
        <BentoGrid className="md:grid-cols-12 gap-6">
          {/* Hero Content */}
          <BentoTile span="full" className="md:col-span-7 flex flex-col justify-center min-h-[500px] p-0 bg-transparent border-none shadow-none">
            <motion.div 
              initial="initial" 
              animate="animate" 
              variants={staggerChildren} 
              className="space-y-6 md:space-y-8 pr-4"
            >
              <motion.div variants={fadeInUp} className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[--surface] border border-muted/50 text-xs font-medium text-muted-foreground">
                <Sparkles className="w-3 h-3 text-amber-500" />
                <span>Premium Custom Apparel</span>
              </motion.div>
              
              <motion.h1 variants={textReveal} className="text-hero tracking-tight text-foreground">
                Design your own <br />
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-foreground to-foreground/60">
                  tee in minutes.
                </span>
              </motion.h1>
              
              <motion.p variants={fadeInUp} className="text-lg md:text-xl text-muted-foreground max-w-lg leading-relaxed">
                Premium quality, sustainable cotton, and a powerful builder to bring your ideas to life. No minimums.
              </motion.p>
              
              <motion.div variants={fadeInUp} className="flex flex-wrap gap-4 pt-2">
                <Link href="/custom-order">
                  <Button size="lg" className="h-12 px-8 text-base shadow-xl shadow-primary/20 hover:shadow-primary/30 transition-all">
                    Start Custom Design
                    <ArrowRight className="ml-2 w-4 h-4" />
                  </Button>
                </Link>
                <Link href="/products">
                  <Button variant="secondary" size="lg" className="h-12 px-8 text-base bg-[--surface] border border-muted hover:bg-muted/50">
                    Browse Collection
                  </Button>
                </Link>
              </motion.div>

              <motion.div variants={fadeInUp} className="flex items-center gap-4 pt-4 text-sm text-muted-foreground">
                <div className="flex -space-x-2">
                  {[1, 2, 3, 4].map((i) => (
                    <div key={i} className="w-8 h-8 rounded-full border-2 border-[--bg] bg-muted flex items-center justify-center overflow-hidden">
                       {/* Placeholder avatars */}
                       <div className="w-full h-full bg-gradient-to-br from-gray-200 to-gray-300" />
                    </div>
                  ))}
                </div>
                <p>Trusted by 10,000+ creators</p>
              </motion.div>
            </motion.div>
          </BentoTile>

          {/* Hero Visual */}
          <BentoTile span="full" className="md:col-span-5 relative min-h-[400px] md:min-h-[600px] p-0 overflow-visible bg-transparent border-none shadow-none">
             <motion.div 
               initial={{ opacity: 0, scale: 0.9, rotate: 5 }}
               animate={{ opacity: 1, scale: 1, rotate: 0 }}
               transition={{ duration: 0.8, ease: "easeOut", delay: 0.2 }}
               className="relative w-full h-full"
             >
                <div className="absolute inset-0 bg-gradient-to-tr from-blue-500/5 to-purple-500/5 rounded-3xl transform rotate-3 scale-95 blur-sm" />
                <div className="relative h-full w-full rounded-2xl overflow-hidden border border-white/10 shadow-2xl bg-white/5 backdrop-blur-sm">
                  {/* Abstract representation of the builder or a hero image */}
                   <div className="absolute inset-0 flex items-center justify-center bg-gradient-to-b from-transparent to-black/5">
                      <div className="relative w-64 h-80 md:w-80 md:h-96">
                        {/* Hero Image */}
                         <div className="absolute inset-0">
                            <Image 
                              src="/assets/hero-visual.jpeg" 
                              alt="Duha Threads Hero" 
                              fill 
                              className="object-contain drop-shadow-2xl"
                              priority
                            />
                         </div>
                         
                         {/* Floating UI Elements */}
                         <motion.div 
                           variants={hoverLift}
                           initial="rest"
                           whileHover="hover"
                           className="absolute -right-4 top-10 p-3 rounded-xl bg-white/90 dark:bg-black/90 backdrop-blur-md shadow-lg border border-white/20 dark:border-white/10 max-w-[140px]"
                         >
                           <div className="flex items-center gap-2 mb-2">
                             <div className="w-2 h-2 rounded-full bg-green-500" />
                             <span className="text-[10px] font-bold uppercase tracking-wider">In Stock</span>
                           </div>
                           <div className="text-xs font-medium">Premium Heavyweight Cotton</div>
                         </motion.div>

                         <motion.div 
                           variants={hoverLift}
                           initial="rest"
                           whileHover="hover"
                           className="absolute -left-4 bottom-20 p-3 rounded-xl bg-white/90 dark:bg-black/90 backdrop-blur-md shadow-lg border border-white/20 dark:border-white/10"
                         >
                            <div className="flex items-center gap-3">
                               <div className="w-8 h-8 rounded-full bg-blue-500 flex items-center justify-center text-white text-xs font-bold">
                                  <Sparkles className="w-4 h-4" />
                               </div>
                               <div>
                                  <div className="text-xs font-bold">Custom Print</div>
                                  <div className="text-[10px] text-muted-foreground">Front & Back</div>
                               </div>
                            </div>
                         </motion.div>
                      </div>
                   </div>
                </div>
             </motion.div>
          </BentoTile>
        </BentoGrid>
      </div>
    </section>
  );
}
