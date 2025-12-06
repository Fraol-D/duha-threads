import { NextRequest, NextResponse } from "next/server";
import { verifyAuth } from "@/lib/auth/session";
import { isAdmin } from "@/lib/auth/admin";
import { getDb } from "@/lib/db/connection";
import { ProductRatingModel } from "@/lib/db/models/ProductRating";

export async function GET(req: NextRequest) {
  const auth = await verifyAuth(req);
  if (!isAdmin(auth.user)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  await getDb();
  const { searchParams } = new URL(req.url);
  const limit = Math.min(parseInt(searchParams.get("limit") || "50", 10), 100);

  const docs = await ProductRatingModel.find({})
    .sort({ updatedAt: -1 })
    .limit(limit)
    .populate([
      { path: "userId", select: "name email" },
      { path: "productId", select: "name" },
    ])
    .lean();

  const reviews = docs.map((doc) => ({
    id: doc._id.toString(),
    rating: doc.rating,
    comment: doc.comment || "",
    featured: !!doc.featured,
    updatedAt: doc.updatedAt,
    user: {
      name: (doc.userId as { name?: string } | null)?.name || "Unknown",
    },
    product: {
      name: (doc.productId as { name?: string } | null)?.name || "Unknown product",
    },
  }));

  return NextResponse.json({ reviews });
}
