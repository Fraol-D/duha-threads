import { NextResponse } from 'next/server';
import { getDb } from '@/lib/db/connection';
import { ProductModel } from '@/lib/db/models/Product';
import { env } from '@/config/env';

export async function GET() {
  if (!env.MONGODB_URI || !env.MONGODB_URI.startsWith('mongodb')) {
    return NextResponse.json({ products: [] });
  }
  await getDb();
  const docs = await ProductModel.find({ isFeatured: true, isActive: true })
    .sort({ featuredRank: 1, createdAt: -1 })
    .limit(8)
    .lean();
  const products = docs.map(d => ({
    id: String(d._id),
    slug: d.slug,
    name: d.name,
    basePrice: d.basePrice,
    description: d.description,
    primaryImage: (d.images || []).find((i: any) => i.isPrimary) || (d.images || [])[0] || null,
    featuredRank: d.featuredRank ?? null,
  }));
  return NextResponse.json({ products });
}