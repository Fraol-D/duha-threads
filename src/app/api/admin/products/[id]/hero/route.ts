import { NextRequest, NextResponse } from "next/server";
import { verifyAuth } from "@/lib/auth/session";
import { isAdmin } from "@/lib/auth/admin";
import { getDb } from "@/lib/db/connection";
import { ProductModel } from "@/lib/db/models/Product";

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
  const { isHero } = body as { isHero?: boolean };
  if (typeof isHero !== "boolean") {
    return NextResponse.json({ error: "isHero boolean required" }, { status: 400 });
  }

  await getDb();
  if (isHero) {
    await ProductModel.updateMany({ _id: { $ne: params.id }, isHero: true }, { isHero: false });
  }

  const doc = await ProductModel.findByIdAndUpdate(params.id, { isHero }, { new: true }).lean<{
    _id: { toString(): string } | string;
    isHero?: boolean | null;
  }>();
  if (!doc) {
    return NextResponse.json({ error: "Product not found" }, { status: 404 });
  }

  return NextResponse.json({
    ok: true,
    product: {
      id: doc._id.toString(),
      isHero: doc.isHero ?? false,
    },
  });
}
