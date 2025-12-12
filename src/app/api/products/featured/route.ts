import { NextResponse } from 'next/server';
import { getDb } from '@/lib/db/connection';
import { ProductModel } from '@/lib/db/models/Product';
import { env } from '@/config/env';
import type { ProductImageDocument } from '@/types/product';
import type { Types } from 'mongoose';

type FeaturedProductDoc = {
  _id: Types.ObjectId | string;
  slug: string;
  name: string;
  description: string;
  basePrice: number;
  images?: ProductImageDocument[];
  featuredRank?: number | null;
};

export async function GET() {
  if (!env.MONGODB_URI || !env.MONGODB_URI.startsWith('mongodb')) {
    return NextResponse.json({ products: [] });
  }
  await getDb();
  const docs = await ProductModel.find({ isFeatured: true, isActive: true })
    .sort({ featuredRank: 1, createdAt: -1 })
    .limit(8)
    .lean<FeaturedProductDoc[]>();
  const products = docs.map((d: FeaturedProductDoc) => ({
    id: String(d._id),
    slug: d.slug,
    name: d.name,
    basePrice: d.basePrice,
    description: d.description,
    primaryImage: (d.images ?? []).find((image: ProductImageDocument) => image.isPrimary) || (d.images ?? [])[0] || null,
    featuredRank: d.featuredRank ?? null,
  }));
  return NextResponse.json({ products });
}