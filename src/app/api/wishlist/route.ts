import { NextResponse } from "next/server";
import { z } from "zod";
import { getCurrentUser } from "@/lib/auth/session";
import { getDb } from "@/lib/db/connection";
import { WishlistItemModel } from "@/lib/db/models/WishlistItem";
import { ProductModel } from "@/lib/db/models/Product";

const postSchema = z.object({ productId: z.string().min(1) });

export async function GET() {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  await getDb();
  const items = await WishlistItemModel.find({ userId: user.id }).lean();
  return NextResponse.json({ items });
}

export async function POST(req: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const body = await req.json().catch(() => null);
  const parsed = postSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "Invalid input" }, { status: 400 });
  await getDb();
  const prod = await ProductModel.findOne({ _id: parsed.data.productId, isActive: true });
  if (!prod) return NextResponse.json({ error: "Product not found" }, { status: 404 });
  const doc = await WishlistItemModel.findOneAndUpdate(
    { userId: user.id, productId: parsed.data.productId },
    { $setOnInsert: { userId: user.id, productId: parsed.data.productId } },
    { upsert: true, new: true }
  ).lean();
  return NextResponse.json({ item: doc });
}
