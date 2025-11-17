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
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  await getDb();
  const items = await CartItemModel.find({ userId: user.id }).lean();
  return NextResponse.json({ items });
}

export async function POST(req: Request) {
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
}
