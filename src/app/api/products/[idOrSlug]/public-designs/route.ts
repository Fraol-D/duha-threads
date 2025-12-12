import { NextRequest, NextResponse } from "next/server";
import { Types } from "mongoose";
import { getDb } from "@/lib/db/connection";
import { CustomOrderModel } from "@/lib/db/models/CustomOrder";
import { ProductModel } from "@/lib/db/models/Product";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ idOrSlug: string }> }
) {
  try {
    await getDb();
    const { idOrSlug } = await params;
    const identifierQuery = Types.ObjectId.isValid(idOrSlug)
      ? { _id: new Types.ObjectId(idOrSlug) }
      : { slug: idOrSlug };

    const product = await ProductModel.findOne(identifierQuery)
      .select("_id")
      .lean<{ _id: Types.ObjectId }>();
    if (!product) {
      return NextResponse.json({ error: "Product not found" }, { status: 404 });
    }

    const productObjectId = product._id;

    const designs = await CustomOrderModel.find({
      publicStatus: 'approved',
      linkedProductId: productObjectId,
      previewImageUrl: { $ne: null },
    })
      .sort({ updatedAt: -1 })
      .limit(6)
      .select('publicTitle publicDescription previewImageUrl baseColor createdAt')
      .lean();

    const payload = designs.map((design) => ({
      id: design._id.toString(),
      title: design.publicTitle || 'Custom Design',
      description: design.publicDescription || null,
      previewImageUrl: design.previewImageUrl,
      baseColor: design.baseColor || null,
      createdAt: design.createdAt,
    }));

    return NextResponse.json({ designs: payload });
  } catch (error) {
    console.error('[GET] public designs error', error);
    return NextResponse.json({ error: 'Failed to load designs' }, { status: 500 });
  }
}
