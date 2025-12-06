import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth/session";
import { getFeaturedProducts, getHeroProduct } from "@/lib/products/queries";
import { getFeaturedReviews } from "@/lib/reviews/queries";
import HomeClient from "../components/HomeClient";

export default async function RootPage() {
  // Wrap in try-catch to handle DB connection failures gracefully
  let user = null;
  try {
    user = await getCurrentUser();
  } catch (err) {
    // Log but don't crash - user will be treated as logged out
    console.warn('[RootPage] Failed to get current user:', (err as Error).message);
  }
  
  if (user?.role === "admin") {
    redirect("/admin/dashboard");
  }

  const heroProduct = await getHeroProduct();
  const featuredProducts = await getFeaturedProducts(8, heroProduct?.id);
  const testimonials = await getFeaturedReviews();
  return <HomeClient heroProduct={heroProduct} featuredProducts={featuredProducts} testimonials={testimonials} />;
}
