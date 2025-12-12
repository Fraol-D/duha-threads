import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db/connection";
import { ProductModel } from "@/lib/db/models/Product";
import { toPublicProduct } from "@/types/product";
import { env } from "@/config/env";

function isObjectId(id: string) {
  return /^[a-fA-F0-9]{24}$/.test(id);
}

export async function GET(_req: NextRequest, context: { params: Promise<{ idOrSlug: string }> }) {
  const { idOrSlug } = await context.params;
  if (!env.MONGODB_URI || !env.MONGODB_URI.startsWith("mongodb")) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  await getDb();
  const query = isObjectId(idOrSlug)
    ? { _id: idOrSlug, isActive: true }
    : { slug: idOrSlug, isActive: true };
  const doc = await ProductModel.findOne(query).lean();
  if (!doc) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json({ product: toPublicProduct(doc as any) });
}
