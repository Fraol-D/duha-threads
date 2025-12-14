import { getCurrentUser } from "@/lib/auth/session";
import { getFeaturedProducts, getHeroProduct } from "@/lib/products/queries";
import { getFeaturedReviews } from "@/lib/reviews/queries";
import HomeClient from "../components/HomeClient";

export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";

export default async function RootPage() {
  // Wrap in try-catch to handle DB connection failures gracefully
  try {
    await getCurrentUser();
  } catch (err) {
    // Log but don't crash - user will be treated as logged out
    console.warn('[RootPage] Failed to get current user:', (err as Error).message);
  }
  
  /* Admin redirect removed to allow admins to view homepage */

  const heroProduct = await getHeroProduct();
  const featuredProducts = await getFeaturedProducts(8, heroProduct?.id);
  const testimonials = await getFeaturedReviews();
  return <HomeClient heroProduct={heroProduct} featuredProducts={featuredProducts} testimonials={testimonials} />;
}
