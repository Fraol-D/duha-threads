import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getCurrentUser } from "@/lib/auth/session";
import { getDb } from "@/lib/db/connection";
import { CartItemModel } from "@/lib/db/models/CartItem";

const patchSchema = z.object({
  quantity: z.number().int().min(1).optional(),
  size: z.string().min(1).optional(),
  color: z.string().min(1).optional(),
});

export async function PATCH(req: NextRequest, context: { params: Promise<{ itemId: string }> }) {
  const { itemId } = await context.params;
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const body = await req.json().catch(() => null);
  const parsed = patchSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "Invalid input" }, { status: 400 });
  await getDb();
  const doc = await CartItemModel.findOneAndUpdate(
    { _id: itemId, userId: user.id },
    { $set: parsed.data },
    { new: true }
  ).lean();
  if (!doc) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json({ item: doc });
}

export async function DELETE(_req: NextRequest, context: { params: Promise<{ itemId: string }> }) {
  const { itemId } = await context.params;
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  await getDb();
  const res = await CartItemModel.deleteOne({ _id: itemId, userId: user.id });
  if (res.deletedCount === 0) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json({ ok: true });
}
