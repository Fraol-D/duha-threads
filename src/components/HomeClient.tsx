"use client";

import { useEffect, useState } from "react";
import { HeroSection } from "@/components/home/HeroSection";
import { FeaturedSection } from "@/components/home/FeaturedSection";
import { BuilderSpotlight } from "@/components/home/BuilderSpotlight";
import { SocialProof } from "@/components/home/SocialProof";
import { WhyDuha } from "@/components/home/WhyDuha";

interface FeaturedProduct { 
  id: string; 
  slug: string; 
  name: string; 
  basePrice: number; 
  description: string; 
  primaryImage?: { url: string; alt: string } | null; 
  featuredRank: number | null 
}

export default function HomeClient() {
  const [featured, setFeatured] = useState<FeaturedProduct[]>([]);

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const featuredRes = await fetch("/api/products/featured");
        if (!active) return;
        if (featuredRes.ok) {
          const json = await featuredRes.json();
          setFeatured(json.products || []);
        }
      } catch { /* ignore */ }
    })();
    return () => { active = false; };
  }, []);

  return (
    <div className="flex flex-col min-h-screen">
      <HeroSection />
      <WhyDuha />
      <FeaturedSection products={featured} />
      <BuilderSpotlight />
      <SocialProof />
    </div>
  );
}

