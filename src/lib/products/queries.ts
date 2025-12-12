import { Types } from "mongoose";
import { env } from "@/config/env";
import { getDb } from "@/lib/db/connection";
import { ProductModel } from "@/lib/db/models/Product";
import type { ProductImageDocument } from "@/types/product";

export type FeaturedProduct = {
  id: string;
  slug: string;
  name: string;
  description: string;
  basePrice: number;
  primaryImage?: ProductImageDocument;
  ratingAverage?: number;
  ratingCount?: number;
};

export type HeroProduct = FeaturedProduct;

type FeaturedProductDoc = {
  _id: Types.ObjectId;
  slug: string;
  name: string;
  description: string;
  basePrice: number;
  images?: ProductImageDocument[];
  ratingAverage?: number;
  ratingCount?: number;
};

export async function getHeroProduct(): Promise<HeroProduct | null> {
  if (!env.MONGODB_URI || !env.MONGODB_URI.startsWith("mongodb")) {
    return null;
  }

  await getDb();
  const doc = await ProductModel.findOne({ isActive: true, isHero: true })
    .sort({ updatedAt: -1 })
    .lean<FeaturedProductDoc | null>();

  if (!doc) return null;

  return {
    id: doc._id.toString(),
    slug: doc.slug,
    name: doc.name,
    description: doc.description,
    basePrice: doc.basePrice,
    primaryImage: doc.images?.find((img) => img.isPrimary) ?? doc.images?.[0],
    ratingAverage: doc.ratingAverage ?? 0,
    ratingCount: doc.ratingCount ?? 0,
  };
}

export async function getFeaturedProducts(limit = 8, excludeProductId?: string): Promise<FeaturedProduct[]> {
  if (!env.MONGODB_URI || !env.MONGODB_URI.startsWith("mongodb")) {
    return [];
  }

  await getDb();
  const query: Record<string, unknown> = { isActive: true, isFeatured: true };
  if (excludeProductId && Types.ObjectId.isValid(excludeProductId)) {
    query._id = { $ne: new Types.ObjectId(excludeProductId) };
  }

  const docs = await ProductModel.find(query)
    .sort({ featuredRank: 1, createdAt: -1 })
    .limit(limit)
    .lean<FeaturedProductDoc[]>();

  return docs.map((doc) => ({
    id: doc._id.toString(),
    slug: doc.slug,
    name: doc.name,
    description: doc.description,
    basePrice: doc.basePrice,
    primaryImage: doc.images?.find((img) => img.isPrimary) ?? doc.images?.[0],
    ratingAverage: doc.ratingAverage ?? 0,
    ratingCount: doc.ratingCount ?? 0,
  }));
}
