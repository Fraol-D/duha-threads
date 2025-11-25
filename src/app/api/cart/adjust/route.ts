import { NextResponse } from "next/server";
import { z } from "zod";
import { getCurrentUser } from "@/lib/auth/session";
import { getDb } from "@/lib/db/connection";
import { CartItemModel } from "@/lib/db/models/CartItem";

const adjustSchema = z.object({
  productId: z.string().min(1),
  size: z.string().min(1),
  color: z.string().min(1),
  delta: z.number().int().min(-1).max(1),
});

export async function POST(req: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const body = await req.json().catch(() => null);
  const parsed = adjustSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "Invalid input" }, { status: 400 });
  const { productId, size, color, delta } = parsed.data;
  await getDb();
  const existing = await CartItemModel.findOne({ userId: user.id, productId, size, color });
  if (!existing) return NextResponse.json({ error: "Item not found" }, { status: 404 });
  const nextQty = existing.quantity + delta;
  if (nextQty <= 0) {
    await CartItemModel.deleteOne({ _id: existing._id });
    return NextResponse.json({ deleted: true });
  }
  existing.quantity = nextQty;
  await existing.save();
  return NextResponse.json({ item: existing.toObject() });
}
