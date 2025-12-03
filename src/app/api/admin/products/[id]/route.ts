import { NextRequest, NextResponse } from 'next/server';
import { verifyAuth } from '@/lib/auth/session';
import { getDb } from '@/lib/db/connection';
import { ProductModel } from '@/lib/db/models/Product';
import { isAdmin } from '@/lib/auth/admin';
import { toPublicProduct, type ProductDocument } from '@/types/product';

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const auth = await verifyAuth(_req);
    if (!isAdmin(auth.user)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }
    await getDb();
    const { id } = await params;
    const doc = await ProductModel.findById(id);
    if (!doc) return NextResponse.json({ error: 'Not found' }, { status: 404 });
    return NextResponse.json({ product: toPublicProduct(doc as ProductDocument) });
  } catch (e) {
    console.error('Admin product GET error', e);
    return NextResponse.json({ error: 'Failed to fetch product' }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const auth = await verifyAuth(req);
    if (!isAdmin(auth.user)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }
    const { id } = await params;
    const body = await req.json();
    const {
      name,
      description,
      basePrice,
      category,
      colors,
      sizes,
      imageUrls,
      isActive,
      displayOrder,
    } = body;
    await getDb();
    const updates: Partial<ProductDocument> = {};
    if (typeof name === 'string' && name.trim()) updates.name = name.trim();
    if (typeof description === 'string') updates.description = description;
    if (typeof basePrice === 'number' && basePrice >= 0) updates.basePrice = basePrice;
    if (typeof category === 'string' && category.trim()) updates.category = category.trim();
    if (Array.isArray(colors)) updates.colors = colors;
    if (Array.isArray(sizes)) updates.sizes = sizes;
    if (typeof isActive === 'boolean') updates.isActive = isActive;
    if (Array.isArray(imageUrls) && imageUrls.length > 0) {
      updates.images = imageUrls.map((url: string, idx: number) => ({ url, alt: updates.name || name || 'Product', isPrimary: idx === 0 }));
    }
    if (typeof displayOrder === 'number' && Number.isFinite(displayOrder)) {
      updates.displayOrder = displayOrder;
    }
    const doc = await ProductModel.findByIdAndUpdate(id, updates, { new: true });
    if (!doc) return NextResponse.json({ error: 'Not found' }, { status: 404 });
    return NextResponse.json({ product: toPublicProduct(doc as ProductDocument) });
  } catch (e) {
    console.error('Admin product PATCH error', e);
    return NextResponse.json({ error: 'Failed to update product' }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const auth = await verifyAuth(req);
    if (!isAdmin(auth.user)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }
    await getDb();
    const { id } = await params;
    const res = await ProductModel.findByIdAndDelete(id);
    if (!res) return NextResponse.json({ error: 'Not found' }, { status: 404 });
    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error('Admin product DELETE error', e);
    return NextResponse.json({ error: 'Failed to delete product' }, { status: 500 });
  }
}
