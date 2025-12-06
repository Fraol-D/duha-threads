import { NextRequest, NextResponse } from "next/server";
import { verifyAuth } from "@/lib/auth/session";
import { isAdmin } from "@/lib/auth/admin";
import { getDb } from "@/lib/db/connection";
import { ProductRatingModel } from "@/lib/db/models/ProductRating";

interface Params {
  id: string;
}

export async function PATCH(req: NextRequest, ctx: { params: Promise<Params> | Params }) {
  const params = await ctx.params;
  const auth = await verifyAuth(req);
  if (!isAdmin(auth.user)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await req.json().catch(() => ({}));
  const { featured } = body as { featured?: boolean };
  if (typeof featured !== "boolean") {
    return NextResponse.json({ error: "featured boolean required" }, { status: 400 });
  }

  await getDb();
  const doc = await ProductRatingModel.findByIdAndUpdate(
    params.id,
    { featured },
    { new: true }
  ).lean();
  if (!doc) {
    return NextResponse.json({ error: "Review not found" }, { status: 404 });
  }

  return NextResponse.json({
    ok: true,
    review: {
      id: doc._id.toString(),
      featured: doc.featured,
    },
  });
}
