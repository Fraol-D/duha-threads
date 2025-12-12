"use client";

import type { FeaturedProduct, HeroProduct } from "@/lib/products/queries";
import type { FeaturedReview } from "@/lib/reviews/queries";
import { HeroSection } from "@/components/home/HeroSection";
import { FeaturedSection } from "@/components/home/FeaturedSection";
import { BuilderSpotlight } from "@/components/home/BuilderSpotlight";
import { SocialProof } from "@/components/home/SocialProof";
import { WhyDuha } from "@/components/home/WhyDuha";

type HomeClientProps = {
  heroProduct: HeroProduct | null;
  featuredProducts: FeaturedProduct[];
  testimonials: FeaturedReview[];
};

export default function HomeClient({ heroProduct, featuredProducts, testimonials }: HomeClientProps) {
  return (
    <div className="flex flex-col min-h-screen">
      <HeroSection heroProduct={heroProduct} />
      <WhyDuha />
      <FeaturedSection products={featuredProducts} />
      <BuilderSpotlight />
      <SocialProof testimonials={testimonials} />
    </div>
  );
}

