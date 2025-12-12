import { NextResponse } from "next/server";
import { z } from "zod";
import { getCurrentUser } from "@/lib/auth/session";
import { getDb } from "@/lib/db/connection";
import { WishlistItemModel } from "@/lib/db/models/WishlistItem";
import { ProductModel } from "@/lib/db/models/Product";
import type { Types } from "mongoose";

type LeanWishlistDoc = {
  _id: Types.ObjectId;
  productId: Types.ObjectId;
  createdAt: Date;
};

const postSchema = z.object({ productId: z.string().min(1) });

export async function GET() {
  try {
    const user = await getCurrentUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    await getDb();
    const docs = await WishlistItemModel
      .find<LeanWishlistDoc>({ userId: user.id })
      .lean();
    const productIds = docs.map(d => d.productId);
    const products = await ProductModel.find({ _id: { $in: productIds } }).lean();
    const productMap = new Map<string, any>(products.map((p: any) => [String(p._id), p]));
    const items = docs.map(d => {
      const prod = productMap.get(d.productId.toString());
      return {
        _id: String(d._id),
        productId: String(d.productId),
        createdAt: d.createdAt,
        product: prod ? {
          id: String(prod._id),
          name: prod.name,
          slug: prod.slug,
          basePrice: prod.basePrice,
          description: prod.description,
          images: prod.images || [],
          primaryImage: (prod.images || []).find((img: any) => img.isPrimary) || (prod.images || [])[0] || null,
          colors: prod.colors || [],
          sizes: prod.sizes || [],
          ratingAverage: prod.ratingAverage ?? null,
          ratingCount: prod.ratingCount || null,
        } : null,
      };
    });
    return NextResponse.json({ items });
  } catch (err) {
    console.error('[/api/wishlist] GET error:', err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const user = await getCurrentUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const body = await req.json().catch(() => null);
    const parsed = postSchema.safeParse(body);
    if (!parsed.success) return NextResponse.json({ error: "Invalid input" }, { status: 400 });
    await getDb();
    const prod = await ProductModel.findOne({ _id: parsed.data.productId, isActive: true });
    if (!prod) return NextResponse.json({ error: "Product not found" }, { status: 404 });
    const doc = await WishlistItemModel.findOneAndUpdate<LeanWishlistDoc>(
      { userId: user.id, productId: parsed.data.productId },
      { $setOnInsert: { userId: user.id, productId: parsed.data.productId } },
      { upsert: true, new: true }
    ).lean();
    if (!doc) {
      return NextResponse.json({ error: "Unable to update wishlist" }, { status: 500 });
    }
    const item = {
      _id: String(doc._id),
      productId: String(doc.productId),
    };
    return NextResponse.json({ item });
  } catch (err) {
    console.error('[/api/wishlist] POST error:', err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

// DELETE body { productId }
export async function DELETE(req: Request) {
  try {
    const user = await getCurrentUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const body = await req.json().catch(() => null);
    const parsed = postSchema.safeParse(body);
    if (!parsed.success) return NextResponse.json({ error: "Invalid input" }, { status: 400 });
    await getDb();
    const res = await WishlistItemModel.deleteOne({ userId: user.id, productId: parsed.data.productId });
    if (res.deletedCount === 0) return NextResponse.json({ error: "Not found" }, { status: 404 });
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error('[/api/wishlist] DELETE error:', err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
