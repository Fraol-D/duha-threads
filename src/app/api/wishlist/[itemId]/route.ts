import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/session";
import { getDb } from "@/lib/db/connection";
import { WishlistItemModel } from "@/lib/db/models/WishlistItem";

export async function DELETE(_req: NextRequest, context: { params: Promise<{ itemId: string }> }) {
  const { itemId } = await context.params;
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  await getDb();
  const res = await WishlistItemModel.deleteOne({ _id: itemId, userId: user.id });
  if (res.deletedCount === 0) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json({ ok: true });
}
