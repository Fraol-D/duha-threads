import { NextResponse } from "next/server";
import { z } from "zod";
import { getCurrentUser } from "@/lib/auth/session";
import { getDb } from "@/lib/db/connection";
import { CartItemModel } from "@/lib/db/models/CartItem";

const itemSchema = z.object({
  productId: z.string().min(1),
  size: z.string().min(1),
  color: z.string().min(1),
  quantity: z.number().int().min(1),
});

const payloadSchema = z.object({
  items: z.array(itemSchema).min(1),
});

export async function POST(req: Request) {
  try {
    const user = await getCurrentUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const json = await req.json().catch(() => null);
    const parsed = payloadSchema.safeParse(json);
    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid input" }, { status: 400 });
    }

    const items = parsed.data.items;
    await getDb();
    await Promise.all(items.map(item =>
      CartItemModel.findOneAndUpdate(
        { userId: user.id, productId: item.productId, size: item.size, color: item.color },
        { $setOnInsert: { userId: user.id, productId: item.productId, size: item.size, color: item.color }, $inc: { quantity: item.quantity } },
        { upsert: true }
      )
    ));

    return NextResponse.json({ merged: items.length });
  } catch (err) {
    console.error("[/api/cart/merge]", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
