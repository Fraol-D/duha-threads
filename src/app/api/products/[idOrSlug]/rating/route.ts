import { NextRequest, NextResponse } from "next/server";
import { Types } from "mongoose";
import { z } from "zod";
import { verifyAuth } from "@/lib/auth/session";
import { getDb } from "@/lib/db/connection";
import { ProductModel } from "@/lib/db/models/Product";
import { ProductRatingModel } from "@/lib/db/models/ProductRating";

const RatingSchema = z.object({
  rating: z.coerce.number().int().min(1).max(5),
  comment: z.string().max(500).optional().nullable(),
});

async function recomputeProductRating(productId: Types.ObjectId) {
  const [stats] = await ProductRatingModel.aggregate<{
    _id: Types.ObjectId;
    avg: number;
    count: number;
  }>([
    { $match: { productId } },
    { $group: { _id: "$productId", avg: { $avg: "$rating" }, count: { $sum: 1 } } },
  ]);

  const ratingAverage = stats ? Number(stats.avg) : 0;
  const ratingCount = stats ? Number(stats.count) : 0;
  await ProductModel.updateOne({ _id: productId }, { ratingAverage, ratingCount });
  return { ratingAverage, ratingCount };
}

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ idOrSlug: string }> }
) {
  try {
    const auth = await verifyAuth(req);
    await getDb();
    const { idOrSlug } = await params;
    const identifierQuery = Types.ObjectId.isValid(idOrSlug)
      ? { _id: new Types.ObjectId(idOrSlug) }
      : { slug: idOrSlug };

    const product = await ProductModel.findOne(identifierQuery)
      .select("_id ratingAverage ratingCount")
      .lean<{ _id: Types.ObjectId; ratingAverage?: number; ratingCount?: number }>();
    if (!product) {
      return NextResponse.json({ error: "Product not found" }, { status: 404 });
    }

    const productObjectId = product._id;

    const userRatingDoc = auth.user
      ? await ProductRatingModel.findOne({ productId: productObjectId, userId: auth.user.id }).lean()
      : null;
    const recent = await ProductRatingModel.find({ productId: productObjectId })
      .sort({ updatedAt: -1 })
      .limit(5)
      .lean();

    return NextResponse.json({
      ratingAverage: product.ratingAverage ?? 0,
      ratingCount: product.ratingCount ?? 0,
      userRating: userRatingDoc
        ? {
            rating: userRatingDoc.rating,
            comment: userRatingDoc.comment || null,
            updatedAt: userRatingDoc.updatedAt,
          }
        : null,
      recentRatings: recent.map((r) => ({
        id: r._id.toString(),
        rating: r.rating,
        comment: r.comment || null,
        updatedAt: r.updatedAt,
      })),
    });
  } catch (error) {
    console.error("[GET] product rating error", error);
    return NextResponse.json({ error: "Failed to load ratings" }, { status: 500 });
  }
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ idOrSlug: string }> }
) {
  try {
    const auth = await verifyAuth(req);
    if (!auth.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const body = await req.json().catch(() => null);
    const parsed = RatingSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid rating" }, { status: 400 });
    }
    const { rating, comment } = parsed.data;

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

    const trimmedComment = comment?.trim() || null;
    const existing = await ProductRatingModel.findOne({ productId: productObjectId, userId: auth.user.id });
    if (existing) {
      existing.rating = rating;
      existing.comment = trimmedComment;
      await existing.save();
    } else {
      await ProductRatingModel.create({
        productId: productObjectId,
        userId: auth.user.id,
        rating,
        comment: trimmedComment,
      });
    }

    const stats = await recomputeProductRating(productObjectId);

    return NextResponse.json({
      ratingAverage: stats.ratingAverage,
      ratingCount: stats.ratingCount,
      userRating: { rating, comment: trimmedComment },
    });
  } catch (error) {
    console.error("[POST] product rating error", error);
    return NextResponse.json({ error: "Failed to save rating" }, { status: 500 });
  }
}
