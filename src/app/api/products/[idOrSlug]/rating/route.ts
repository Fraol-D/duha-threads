import { NextRequest, NextResponse } from "next/server";
import { Types } from "mongoose";
import { z } from "zod";
import { verifyAuth } from "@/lib/auth/session";
import { getDb } from "@/lib/db/connection";
import { ProductModel } from "@/lib/db/models/Product";
import { ProductRatingModel, type ProductRatingDocument } from "@/lib/db/models/ProductRating";
import { OrderModel } from "@/lib/db/models/Order";
import { DELIVERED_STATUSES, isDeliveredStatus } from "@/lib/orders/status";

const deliveredStatusRegexes = DELIVERED_STATUSES.map((status) => new RegExp(`^${status}$`, "i"));

const RatingSchema = z.object({
  rating: z.coerce.number().int().min(1).max(5),
  comment: z.string().max(500).optional().nullable(),
  orderId: z.string().regex(/^[a-f\d]{24}$/i, "Invalid order reference").optional().nullable(),
});

type ReviewWithUser = {
  _id: { toString(): string } | string;
  rating: ProductRatingDocument["rating"];
  comment: ProductRatingDocument["comment"];
  updatedAt: ProductRatingDocument["updatedAt"];
  featured?: boolean;
  userId: { _id?: Types.ObjectId; name?: string | null } | Types.ObjectId | null;
};

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

    const reviews = await ProductRatingModel.find({ productId: productObjectId })
      .sort({ updatedAt: -1 })
      .limit(20)
      .populate([{ path: "userId", select: "name" }])
      .lean<ReviewWithUser[]>();

    const normalizedReviews = reviews.map((doc) => {
      const userRef = doc.userId;
      const reviewerName = userRef && typeof userRef === "object" && "name" in userRef ? userRef.name : null;
      const reviewerId =
        userRef && typeof userRef === "object" && "_id" in userRef && userRef._id
          ? (userRef._id as Types.ObjectId).toString()
          : null;
      return {
        id: doc._id.toString(),
        rating: doc.rating,
        comment: doc.comment || null,
        updatedAt: doc.updatedAt,
        author: reviewerName || "Verified customer",
        featured: !!doc.featured,
        isOwner: !!(auth.user && reviewerId && reviewerId === auth.user.id),
      };
    });

    const deliveredOrder = auth.user
      ? await OrderModel.findOne({
          userId: auth.user.id,
          status: { $in: deliveredStatusRegexes },
          "items.productId": productObjectId,
        })
          .select("_id orderNumber status")
          .sort({ updatedAt: -1 })
          .lean<{ _id: Types.ObjectId; orderNumber?: string | null; status?: string | null }>()
      : null;

    const reviewEligibility = deliveredOrder && isDeliveredStatus(deliveredOrder.status)
      ? {
          eligible: true,
          orderId: deliveredOrder._id.toString(),
          orderNumber: deliveredOrder.orderNumber || null,
        }
      : { eligible: false, orderId: null, orderNumber: null };

    return NextResponse.json({
      ratingAverage: product.ratingAverage ?? 0,
      ratingCount: product.ratingCount ?? 0,
      userRating: userRatingDoc
        ? {
            rating: userRatingDoc.rating,
            comment: userRatingDoc.comment || null,
            updatedAt: userRatingDoc.updatedAt,
            orderId: userRatingDoc.orderId ? userRatingDoc.orderId.toString() : null,
          }
        : null,
      reviews: normalizedReviews,
      reviewEligibility,
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
    const { rating, comment, orderId } = parsed.data;

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
    const trimmedComment = typeof comment === "string" ? comment.trim() : null;
    let linkedOrderId: Types.ObjectId | null = null;
    if (orderId) {
      const orderObjectId = new Types.ObjectId(orderId);
      const order = await OrderModel.findOne({
        _id: orderObjectId,
        userId: auth.user.id,
        "items.productId": productObjectId,
      })
        .select("_id status")
        .lean<{ _id: Types.ObjectId; status?: string | null }>();
      if (!order) {
        return NextResponse.json({ error: "Order not found for review" }, { status: 400 });
      }
      if (!isDeliveredStatus(order.status)) {
        return NextResponse.json({ error: "Order has not been delivered yet" }, { status: 400 });
      }
      linkedOrderId = order._id;
    }

    const existing = await ProductRatingModel.findOne({ productId: productObjectId, userId: auth.user.id });
    const savedRating = existing
      ? await (async () => {
          existing.rating = rating;
          existing.comment = trimmedComment;
          if (linkedOrderId) {
            existing.orderId = linkedOrderId;
          }
          return existing.save();
        })()
      : await ProductRatingModel.create({
          productId: productObjectId,
          userId: auth.user.id,
          rating,
          comment: trimmedComment,
          orderId: linkedOrderId,
        });

    const stats = await recomputeProductRating(productObjectId);

    return NextResponse.json({
      ratingAverage: stats.ratingAverage,
      ratingCount: stats.ratingCount,
      userRating: {
        rating: savedRating.rating,
        comment: savedRating.comment || null,
        orderId: savedRating.orderId ? savedRating.orderId.toString() : null,
      },
    });
  } catch (error) {
    console.error("[POST] product rating error", error);
    return NextResponse.json({ error: "Failed to save rating" }, { status: 500 });
  }
}
