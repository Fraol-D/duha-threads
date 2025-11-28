"use client";

import { HeroSection } from "@/components/home/HeroSection";
import { FeaturedSection } from "@/components/home/FeaturedSection";
import { BuilderSpotlight } from "@/components/home/BuilderSpotlight";
import { SocialProof } from "@/components/home/SocialProof";
import { WhyDuha } from "@/components/home/WhyDuha";

export default function HomeClient() {
  return (
    <div className="flex flex-col min-h-screen">
      <HeroSection />
      <WhyDuha />
      <FeaturedSection />
      <BuilderSpotlight />
      <SocialProof />
    </div>
  );
}

