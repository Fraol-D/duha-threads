import { env } from "@/config/env";
import { getDb } from "@/lib/db/connection";
import { ProductRatingModel, type ProductRatingDocument } from "@/lib/db/models/ProductRating";

export type FeaturedReview = {
  id: string;
  message: string;
  rating: number;
  author: string;
  productName?: string;
};

type ReviewWithRefs = {
  _id: { toString(): string } | string;
  rating: ProductRatingDocument["rating"];
  comment: ProductRatingDocument["comment"];
  userId: { name?: string } | null;
  productId: { name?: string; slug?: string } | null;
};

export async function getFeaturedReviews(limit = 4): Promise<FeaturedReview[]> {
  if (!env.MONGODB_URI || !env.MONGODB_URI.startsWith("mongodb")) {
    return [];
  }

  await getDb();
  const docs = await ProductRatingModel.find({ featured: true })
    .sort({ updatedAt: -1 })
    .limit(limit)
    .populate([
      { path: "userId", select: "name" },
      { path: "productId", select: "name slug" },
    ])
    .lean<ReviewWithRefs[]>();

  return docs.map((doc) => ({
    id: doc._id.toString(),
    message: doc.comment || "",
    rating: doc.rating,
    author: doc.userId?.name || "Verified customer",
    productName: doc.productId?.name,
  }));
}
