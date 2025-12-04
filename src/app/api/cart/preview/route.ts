import { NextResponse } from "next/server";
import { z } from "zod";
import { getDb } from "@/lib/db/connection";
import { ProductModel } from "@/lib/db/models/Product";
import type { ProductDocument } from "@/types/product";

const schema = z.object({
  items: z.array(z.object({
    productId: z.string().min(1),
    size: z.string().min(1),
    color: z.string().min(1),
    quantity: z.number().int().min(1),
  })).max(50),
});

export async function POST(req: Request) {
  try {
    const json = await req.json().catch(() => null);
    const parsed = schema.safeParse(json);
    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid input" }, { status: 400 });
    }

    const items = parsed.data.items;
    if (items.length === 0) {
      return NextResponse.json({ items: [] });
    }

    await getDb();
    const productIds = [...new Set(items.map((i) => i.productId))];
    const products = await ProductModel.find({ _id: { $in: productIds } }).lean<ProductDocument[]>();
    const map = new Map<string, ProductDocument>(products.map((p) => [p._id.toString(), p]));

    const enriched = items.map((item, index) => {
      const product = map.get(item.productId);
      const primaryImage = product?.images?.find((img) => img.isPrimary) || product?.images?.[0] || null;
      return {
        _id: `${item.productId}-${item.size}-${item.color}-${index}`,
        productId: item.productId,
        size: item.size,
        color: item.color,
        quantity: item.quantity,
        product: product
          ? {
              id: product._id.toString(),
              name: product.name,
              slug: product.slug,
              description: product.description,
              basePrice: product.basePrice,
              images: product.images || [],
              primaryImage,
              ratingAverage: product.ratingAverage ?? null,
              ratingCount: product.ratingCount ?? null,
              colors: product.colors,
              sizes: product.sizes,
            }
          : null,
      };
    });

    return NextResponse.json({ items: enriched });
  } catch (err) {
    console.error("[/api/cart/preview]", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
