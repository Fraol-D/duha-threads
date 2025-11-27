import { NextResponse } from "next/server";
import { z } from "zod";
import { getCurrentUser } from "@/lib/auth/session";
import { getDb } from "@/lib/db/connection";
import { CartItemModel } from "@/lib/db/models/CartItem";
import { ProductModel } from "@/lib/db/models/Product";

const postSchema = z.object({
  productId: z.string().min(1),
  size: z.string().min(1),
  color: z.string().min(1),
  quantity: z.number().int().min(1),
});

export async function GET() {
  try {
    const user = await getCurrentUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    await getDb();
    const items = await CartItemModel.find({ userId: user.id }).lean();
    const productIds = items.map(i => i.productId);
    const products = await ProductModel.find({ _id: { $in: productIds } }).lean();
    const productMap = new Map<string, any>(products.map((p: any) => [p._id.toString(), p]));
    const enriched = items.map(i => {
      const prod = productMap.get(i.productId.toString());
      return {
        ...i,
        product: prod ? {
          id: prod._id.toString(),
          name: prod.name,
          slug: prod.slug,
          description: prod.description,
          basePrice: prod.basePrice,
          images: prod.images || [],
          primaryImage: (prod.images || []).find((img: any) => img.isPrimary) || (prod.images || [])[0] || null,
          ratingAverage: prod.ratingAverage ?? null,
          ratingCount: prod.ratingCount ?? null,
        } : null,
      };
    });
    return NextResponse.json({ items: enriched });
  } catch (err) {
    console.error('[/api/cart] GET error:', err);
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
    const { productId, size, color, quantity } = parsed.data;
    await getDb();
    const prod = await ProductModel.findOne({ _id: productId, isActive: true });
    if (!prod) return NextResponse.json({ error: "Product not found" }, { status: 404 });
    const item = await CartItemModel.findOneAndUpdate(
      { userId: user.id, productId, size, color },
      { $setOnInsert: { userId: user.id, productId, size, color }, $inc: { quantity } },
      { upsert: true, new: true }
    ).lean();
    return NextResponse.json({ item });
  } catch (err) {
    console.error('[/api/cart] POST error:', err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
