import { NextRequest, NextResponse } from 'next/server';
import { verifyAuth } from '@/lib/auth/session';
import { getDb } from '@/lib/db/connection';
import { ProductModel } from '@/lib/db/models/Product';
import { isAdmin } from '@/lib/auth/admin';
import { toProductListItem, toPublicProduct, type ProductDocument } from '@/types/product';

function slugify(name: string) {
  return name.toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/^-+|-+$/g,'');
}

export async function GET(req: NextRequest) {
  try {
    const auth = await verifyAuth(req);
    if (!isAdmin(auth.user)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }
    await getDb();
    const { searchParams } = new URL(req.url);
    const page = parseInt(searchParams.get('page') || '1', 10);
    const pageSize = parseInt(searchParams.get('pageSize') || '20', 10);
    const skip = (page - 1) * pageSize;
    const [docs, total] = await Promise.all([
      ProductModel.find({}).sort({ displayOrder: -1, createdAt: -1 }).skip(skip).limit(pageSize),
      ProductModel.countDocuments({})
    ]);
    return NextResponse.json({
      page,
      pageSize,
      total,
      totalPages: Math.ceil(total / pageSize),
      products: docs.map(d => toProductListItem(d as ProductDocument)),
    });
  } catch (e) {
    console.error('Admin products GET error', e);
    return NextResponse.json({ error: 'Failed to fetch products' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const auth = await verifyAuth(req);
    if (!isAdmin(auth.user)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }
    const body = await req.json();
    const {
      name,
      slug,
      description = '',
      basePrice,
      category = 'general',
      colors = [],
      sizes = [],
      imageUrls = [],
      isActive = true,
      sku,
      displayOrder = 0,
    } = body;
    if (!name || typeof name !== 'string') return NextResponse.json({ error: 'Name required' }, { status: 400 });
    if (typeof basePrice !== 'number' || basePrice <= 0) return NextResponse.json({ error: 'basePrice must be > 0' }, { status: 400 });
    if (!Array.isArray(imageUrls) || imageUrls.length === 0) return NextResponse.json({ error: 'imageUrls must be non-empty array' }, { status: 400 });
    if (!description || typeof description !== 'string' || !description.trim()) return NextResponse.json({ error: 'Description required' }, { status: 400 });
    await getDb();
    const finalSlug = slug ? slugify(slug) : slugify(name);
    const existing = await ProductModel.findOne({ slug: finalSlug });
    if (existing) return NextResponse.json({ error: 'Slug already exists' }, { status: 409 });
    const images = imageUrls.map((url: string, idx: number) => ({ url, alt: name, isPrimary: idx === 0 }));
    const doc = await ProductModel.create({
      name,
      slug: finalSlug,
      description: description.trim(),
      basePrice,
      category,
      colors,
      sizes,
      images,
      isActive,
      sku: sku && typeof sku === 'string' && sku.trim() ? sku.trim() : undefined,
      salesCount: 0,
      viewCount: 0,
      displayOrder: typeof displayOrder === 'number' ? displayOrder : 0,
    });
    return NextResponse.json({ product: toPublicProduct(doc as ProductDocument) });
  } catch (e) {
    console.error('Admin products POST error', e);
    return NextResponse.json({ error: 'Failed to create product' }, { status: 500 });
  }
}
